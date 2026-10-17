using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Infrastructures.Caching;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TextSnippet.Application.Caching;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.IntegrationTests.WebAppFactory;

/// <summary>
/// Real HTTP authentication→request context→cache→CQRS→Postgres guards. Controlled owner seed is necessary
/// because the save DTO has no CreatedByUserId. Direct SetAsync changes only fixture state to distinguish
/// a warm cache hit from a fresh read; normal public save then proves invalidation visibility. Setup creation
/// events are suppressed so their detached cache clears cannot contaminate the later public-save proof.
/// </summary>
[Collection(TextSnippetWebAppFactoryCollection.Name)]
[Trait("Category", "WebAppFactory")]
public class TextSnippetSearchCacheIsolationTests(TextSnippetWebAppFactoryFixture fixture)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = null,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() },
    };

    [Fact]
    [Trait("TestSpec", "TC-SEARCH-022")]
    public Task Search_WarmCache_IsolatesOwnersAnonymousAndLegacyEntries() => VerifyPrivateSearchJourneyAsync(false);

    [Fact]
    [Trait("TestSpec", "TC-SEARCH-023")]
    public Task Search_OwnerSave_RefreshesPrivateResultsWithoutLeakingToAnotherReader() => VerifyPrivateSearchJourneyAsync(true);

    private async Task VerifyPrivateSearchJourneyAsync(bool verifySaveVisibility)
    {
        var owner = IntegrationTestHelper.UniqueName("CacheOwner");
        var other = IntegrationTestHelper.UniqueName("CacheOther");
        var id = Ulid.NewUlid().ToString();
        var initial = IntegrationTestHelper.UniqueName("CachedOriginal");
        using var scope = fixture.Services.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
        var entity = TextSnippetEntity.Create(id, IntegrationTestHelper.UniqueName("PrivateSnippet"), initial);
        entity.CreatedByUserId = owner;
        await repository.CreateOrUpdateAsync(entity, dismissSendEvent: true);
        var query = new SearchSnippetTextQuery { SearchId = id, MaxResultCount = 10 };
        var cache = scope.ServiceProvider.GetRequiredService<IPlatformCacheRepositoryProvider>().GetCollection<TextSnippetCollectionCacheKeyProvider>();
        var privateResult = new SearchSnippetTextQueryResult([new TextSnippetEntityDto(entity)], 1, query);
        await cache.SetAsync(privateResult, cacheOptions: null, requestKeyParts: IPlatformCqrsRequest.BuildCacheRequestKeyParts(query, null!, null!));
        using var ownerClient = ClientFor(owner);
        using var otherClient = ClientFor(other);
        using var anonymousClient = fixture.CreateClient();
        anonymousClient.DefaultRequestHeaders.Add("UserId", owner); // Untrusted identity header must remain ignored.
        var url = $"/api/TextSnippet/search?SearchId={id}&MaxResultCount=10";

        var ownerResult = await Search(ownerClient, url);
        ownerResult.Items.Select(item => item.Id).Should().Equal(id);
        ownerResult.TotalCount.Should().Be(1);
        var otherResult = await Search(otherClient, url);
        otherResult.Items.Should().BeEmpty();
        otherResult.TotalCount.Should().Be(0);
        var anonymous = await Search(anonymousClient, url);
        anonymous.Items.Should().BeEmpty("anonymous requests must not hit old shared entries containing private rows");
        anonymous.TotalCount.Should().Be(0);

        if (!verifySaveVisibility) return;

        var bypassedChange = IntegrationTestHelper.UniqueName("UncachedFixtureChange");
        entity.FullText = bypassedChange;
        await repository.SetAsync(entity);
        (await Search(ownerClient, url)).Items.Single().FullText.Should().Be(initial, "the same owner has a real warm hit");
        var savedText = IntegrationTestHelper.UniqueName("PublicSavedContent");
        using var save = await ownerClient.PostAsJsonAsync("/api/TextSnippet/save", new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto(entity) { FullText = savedText },
        }, JsonOptions);
        save.StatusCode.Should().Be(HttpStatusCode.OK);
        var savedResult = await save.Content.ReadFromJsonAsync<SaveSnippetTextCommandResult>(JsonOptions);
        savedResult.Should().NotBeNull();
        savedResult!.SavedData.Should().NotBeNull();
        savedResult.SavedData.Id.Should().Be(id);
        savedResult.SavedData.FullText.Should().Contain(savedText).And.NotBe(initial);
        var expectedSavedText = savedResult.SavedData.FullText;
        await IntegrationTestHelper.WaitUntilAsync(async () =>
        {
            using var persistedScope = fixture.Services.CreateScope();
            var persistedRepository = persistedScope.ServiceProvider.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            var persisted = await persistedRepository.FirstOrDefaultAsync(p => p.Id == id);
            persisted.Should().NotBeNull();
            persisted!.CreatedByUserId.Should().Be(owner, "both writes in the public save must preserve the stored creator");
            persisted.FullText.Should().Be(expectedSavedText);
        });
        await IntegrationTestHelper.WaitUntilAsync(async () =>
            (await Search(ownerClient, url)).Items.Single().FullText.Should().Be(expectedSavedText));
        var otherAfterSave = await Search(otherClient, url);
        otherAfterSave.Items.Should().BeEmpty();
        otherAfterSave.TotalCount.Should().Be(0);
        var anonymousAfterSave = await Search(anonymousClient, url);
        anonymousAfterSave.Items.Should().BeEmpty("saving a private snippet must not make it anonymously discoverable");
        anonymousAfterSave.TotalCount.Should().Be(0);
    }

    /// <summary>
    /// The public create path produces an unowned snippet even for an identified actor. Updating it must
    /// preserve that stored null creator rather than assigning the current actor during the detached upsert.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-SNIPPET-SAVE-OWNERSHIP-001")]
    public async Task Save_UnownedSnippet_PreservesNullCreatorAndAnonymousVisibility()
    {
        using var client = ClientFor(IntegrationTestHelper.UniqueName("UnownedEditor"));
        using var create = await client.PostAsJsonAsync("/api/TextSnippet/save", new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto
            {
                SnippetText = IntegrationTestHelper.UniqueName("UnownedSnippet"),
                FullText = IntegrationTestHelper.UniqueName("UnownedOriginal"),
            },
        }, JsonOptions);
        create.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await create.Content.ReadFromJsonAsync<SaveSnippetTextCommandResult>(JsonOptions);
        created.Should().NotBeNull();
        created!.SavedData.Should().NotBeNull();
        created.SavedData.Id.Should().NotBeNullOrEmpty();
        var id = created.SavedData.Id;
        var changedText = IntegrationTestHelper.UniqueName("UnownedUpdated");
        created.SavedData.FullText = changedText;

        using var save = await client.PostAsJsonAsync("/api/TextSnippet/save", new SaveSnippetTextCommand
        {
            Data = created.SavedData,
        }, JsonOptions);
        save.StatusCode.Should().Be(HttpStatusCode.OK);
        var saved = await save.Content.ReadFromJsonAsync<SaveSnippetTextCommandResult>(JsonOptions);
        saved.Should().NotBeNull();
        saved!.SavedData.Should().NotBeNull();
        saved.SavedData.Id.Should().Be(id);
        saved.SavedData.FullText.Should().Contain(changedText);
        var expectedSavedText = saved.SavedData.FullText;
        await IntegrationTestHelper.WaitUntilAsync(async () =>
        {
            using var persistedScope = fixture.Services.CreateScope();
            var repository = persistedScope.ServiceProvider.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            var persisted = await repository.FirstOrDefaultAsync(p => p.Id == id);
            persisted.Should().NotBeNull();
            persisted!.CreatedByUserId.Should().BeNull("a save preserves ownership instead of assigning the editing actor");
            persisted.FullText.Should().Be(expectedSavedText);
        });
        using var anonymousClient = fixture.CreateClient();
        var anonymous = await Search(anonymousClient, $"/api/TextSnippet/search?SearchId={id}&MaxResultCount=10");
        anonymous.Items.Select(item => item.Id).Should().Equal(id);
        anonymous.Items.Single().FullText.Should().Be(expectedSavedText);
        anonymous.TotalCount.Should().Be(1);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-APP-PAGING-012")]
    public async Task Search_InvalidWindow_IsRejectedEvenWhenAnEntryAlreadyExists()
    {
        var id = IntegrationTestHelper.UniqueName("InvalidCachedQuery");
        var invalid = new SearchSnippetTextQuery { SearchId = id, MaxResultCount = 0 };
        using var scope = fixture.Services.CreateScope();
        var cache = scope.ServiceProvider.GetRequiredService<IPlatformCacheRepositoryProvider>().GetCollection<TextSnippetCollectionCacheKeyProvider>();
        await cache.SetAsync(new SearchSnippetTextQueryResult([], 0, new SearchSnippetTextQuery()), cacheOptions: null,
            requestKeyParts: SearchSnippetTextQuery.BuildCacheRequestKeyParts(invalid, null!, null!));
        using var client = fixture.CreateClient();

        using var response = await client.GetAsync($"/api/TextSnippet/search?SearchId={Uri.EscapeDataString(id)}&MaxResultCount=0");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest, "a cache hit cannot bypass the public page contract");
    }

    [Theory]
    [InlineData("/api/TextSnippet/search?MaxResultCount=201")]
    [InlineData("/api/TaskItem/list?MaxResultCount=0")]
    [InlineData("/api/TaskItem/list?SkipCount=-1")]
    [Trait("TechnicalSpec", "TC-APP-PAGING-012")]
    public async Task List_InvalidWindow_Returns400(string url)
    {
        using var client = fixture.CreateClient();
        using var response = await client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private HttpClient ClientFor(string userId)
    {
        var client = fixture.CreateClient();
        client.DefaultRequestHeaders.Add(TestUserAuthenticationHandler.UserHeader, userId);
        return client;
    }

    private static async Task<SearchSnippetTextQueryResult> Search(HttpClient client, string url)
    {
        using var response = await client.GetAsync(url);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await response.Content.ReadFromJsonAsync<SearchSnippetTextQueryResult>(JsonOptions))!;
    }
}
