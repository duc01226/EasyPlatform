#region

using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Cqrs;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.ValueObjects;

#endregion

namespace PlatformExampleApp.IntegrationTests.TextSnippets;

[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "Query")]
public class SearchSnippetTextQueryIntegrationTests : TextSnippetIntegrationTestBase
{
    /// <summary>
    /// Literal punctuation is valid autocomplete input. Direct setup is required because the public DTO cannot
    /// assign creators; a unique reader owns the literal and decoy rows, and a second reader owns a matching row.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-SEARCH-072")]
    public async Task Search_ParenthesisPrefix_ReturnsOnlyTheReadersLiteralPrefixMatches()
    {
        var owner = TextSnippetTestUserContextFactory.CreateUser(IntegrationTestHelper.UniqueName("LiteralOwner"));
        var other = TextSnippetTestUserContextFactory.CreateUser(IntegrationTestHelper.UniqueName("LiteralOther"));
        var marker = IntegrationTestHelper.UniqueName("LiteralPrefix");
        var ids = Enumerable.Range(0, 3).Select(_ => Ulid.NewUlid().ToString()).ToArray();
        await ExecuteWithServicesAsync(async services =>
        {
            var repository = services.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            for (var index = 0; index < ids.Length; index++)
            {
                var entity = TextSnippetEntity.Create(ids[index], index == 1 ? "ordinary " + marker : "(" + marker, "different body");
                entity.CreatedByUserId = index == 2 ? other.UserId : owner.UserId;
                await repository.CreateOrUpdateAsync(entity, dismissSendEvent: true);
            }
        });

        await IntegrationTestHelper.WaitUntilAsync(async () =>
        {
            var result = await ExecuteQueryAsync(new SearchSnippetTextQuery { SearchText = "(" }, owner);
            result.Items.Select(item => item.Id).Should().Equal(ids[0]);
            result.TotalCount.Should().Be(1);
            var others = await ExecuteQueryAsync(new SearchSnippetTextQuery { SearchText = "(" }, other);
            others.Items.Select(item => item.Id).Should().Equal(ids[2]);
            others.TotalCount.Should().Be(1);
        });
    }

    /// <summary>
    /// Search ownership must constrain both rows and totals in every text branch. Direct repository seed is
    /// required because TextSnippetEntityDto cannot set CreatedByUserId (same constraint as TC-EXAMPLE-025).
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-SEARCH-071")]
    public async Task Search_WithOrWithoutText_PreservesOwnerScopeForItemsAndCount()
    {
        var owner = TextSnippetTestUserContextFactory.CreateUser(IntegrationTestHelper.UniqueName("SearchOwner"));
        var other = TextSnippetTestUserContextFactory.CreateUser(IntegrationTestHelper.UniqueName("OtherOwner"));
        var text = IntegrationTestHelper.UniqueName("OwnershipSearch");
        var street = IntegrationTestHelper.UniqueName("OwnerStreet");
        var ownerId = Ulid.NewUlid().ToString();
        var otherId = Ulid.NewUlid().ToString();
        await ExecuteWithServicesAsync(async services =>
        {
            var repository = services.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            foreach (var (id, user, suffix) in new[] { (ownerId, owner.UserId, "A"), (otherId, other.UserId, "B") })
            {
                var entity = TextSnippetEntity.Create(id, text + suffix, text);
                entity.CreatedByUserId = user;
                entity.Address = new ExampleAddressValueObject { Street = street };
                await repository.CreateOrUpdateAsync(entity);
            }
        });

        await IntegrationTestHelper.WaitUntilAsync(async () =>
        {
            var owned = await ExecuteQueryAsync(new SearchSnippetTextQuery { SearchText = text }, owner);
            owned.Items.Select(item => item.Id).Should().Equal(ownerId);
            owned.TotalCount.Should().Be(1);
            var others = await ExecuteQueryAsync(new SearchSnippetTextQuery { SearchText = text }, other);
            others.Items.Select(item => item.Id).Should().Equal(otherId);
            others.TotalCount.Should().Be(1);
        });

        foreach (var searchText in new[] { "", text })
        {
            var allowed = await ExecuteQueryAsync(new SearchSnippetTextQuery
            {
                SearchText = searchText, SearchId = ownerId, SearchSingleAddress = street,
            }, owner);
            allowed.Items.Select(item => item.Id).Should().Equal(ownerId);
            allowed.TotalCount.Should().Be(1);
            var denied = await ExecuteQueryAsync(new SearchSnippetTextQuery
            {
                SearchText = searchText, SearchId = ownerId, SearchSingleAddress = street,
            }, other);
            denied.Items.Should().BeEmpty();
            denied.TotalCount.Should().Be(0);
        }
    }

    /// <summary>
    /// Guard real Mongo text-only, prefix-only and overlapping matches as one private set. The DTO cannot
    /// set controlled creators, so setup uses the documented real-repository exception. The base fixture
    /// defaults null identities to a named user; the anonymous query explicitly clears that scoped context.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-MONGO-SEARCH-001")]
    public async Task Search_TextAndPrefixUnion_PreservesDistinctRowsTotalsOwnersAndEveryAddressRestriction()
    {
        var owner = TextSnippetTestUserContextFactory.CreateUser(IntegrationTestHelper.UniqueName("UnionOwner"));
        var other = TextSnippetTestUserContextFactory.CreateUser(IntegrationTestHelper.UniqueName("UnionOther"));
        var marker = IntegrationTestHelper.UniqueName("UnionNeedle").Replace("_", "");
        var street = IntegrationTestHelper.UniqueName("UnionStreet");
        var ids = Enumerable.Range(0, 5).Select(_ => Ulid.NewUlid().ToString()).ToArray();
        await ExecuteWithServicesAsync(async services =>
        {
            var repository = services.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            var shortTexts = new[] { IntegrationTestHelper.UniqueName("TextOnly"), marker + "tail", marker + " overlap", marker + "foreign", marker + "public" };
            for (var index = 0; index < ids.Length; index++)
            {
                var entity = TextSnippetEntity.Create(ids[index], shortTexts[index], index == 1 ? "different body" : marker);
                entity.CreatedByUserId = index < 3 ? owner.UserId : index == 3 ? other.UserId : null;
                entity.Address = new ExampleAddressValueObject { Street = street };
                entity.Addresses = [new ExampleAddressValueObject { Street = street }];
                entity.AddressStrings = [street];
                await repository.CreateOrUpdateAsync(entity, dismissSendEvent: true);
            }
        });

        await IntegrationTestHelper.WaitUntilAsync(async () =>
        {
            var result = await ExecuteQueryAsync(new SearchSnippetTextQuery { SearchText = marker }, owner);
            result.Items.Select(item => item.Id).Should().BeEquivalentTo(ids.Take(3));
            result.TotalCount.Should().Be(3, "the overlap belongs to the result set only once");
            var foreign = await ExecuteQueryAsync(new SearchSnippetTextQuery { SearchText = marker }, other);
            foreign.Items.Select(item => item.Id).Should().Equal(ids[3]);
            foreign.TotalCount.Should().Be(1);
        });

        SearchSnippetTextQuery RestrictedQuery() => new()
        {
            SearchText = marker, SearchId = ids[1], SearchAddress = street,
            SearchSingleAddress = street, SearchAddressString = street,
        };
        var restricted = await ExecuteQueryAsync(RestrictedQuery(), owner);
        restricted.Items.Select(item => item.Id).Should().ContainSingle("the prefix-only row remains discoverable with all filters").Which.Should().Be(ids[1]);
        restricted.TotalCount.Should().Be(1);
        foreach (var exclude in new Action<SearchSnippetTextQuery>[]
                 {
                     query => query.SearchId = ids[3],
                     query => query.SearchAddress = street + " missing",
                     query => query.SearchSingleAddress = street + " missing",
                     query => query.SearchAddressString = street + " missing",
                 })
        {
            var query = RestrictedQuery();
            exclude(query);
            var denied = await ExecuteQueryAsync(query, owner);
            denied.Items.Should().BeEmpty();
            denied.TotalCount.Should().Be(0);
        }

        var anonymous = await ExecuteWithServicesAsync(async services =>
        {
            services.GetRequiredService<IPlatformApplicationRequestContextAccessor>().Current.SetUserId(null!);
            return await services.GetRequiredService<IPlatformCqrs>().SendQuery(new SearchSnippetTextQuery { SearchText = marker });
        });
        anonymous.Items.Select(item => item.Id).Should().Equal(ids[4]);
        anonymous.TotalCount.Should().Be(1);
    }

    [Fact]
    [Trait("TestSpec", "TC-SEARCH-001")]
    public async Task Search_WithoutText_ReturnsOwnSnippetAndScopedTotal()
    {
        var scenario = await SeedSearchScenarioAsync();
        var result = await ExecuteQueryAsync(new SearchSnippetTextQuery(), scenario.Owner);
        result.Items.Select(item => item.Id).Should().Equal(scenario.Id);
        result.TotalCount.Should().Be(1);
    }

    [Fact]
    [Trait("TestSpec", "TC-SEARCH-002")]
    public async Task Search_WithText_ReturnsMatchingOwnSnippetAndScopedTotal()
    {
        var scenario = await SeedSearchScenarioAsync();
        await IntegrationTestHelper.WaitUntilAsync(async () =>
        {
            var result = await ExecuteQueryAsync(new SearchSnippetTextQuery { SearchText = scenario.Text }, scenario.Owner);
            result.Items.Select(item => item.Id).Should().Equal(scenario.Id);
            result.TotalCount.Should().Be(1);
        });
    }

    [Fact]
    [Trait("TestSpec", "TC-SEARCH-003")]
    public async Task Search_IdAndAddressFilters_RetainMatchingOwnResult()
    {
        var scenario = await SeedSearchScenarioAsync();
        var result = await ExecuteQueryAsync(new SearchSnippetTextQuery { SearchId = scenario.Id, SearchSingleAddress = scenario.Street }, scenario.Owner);
        result.Items.Select(item => item.Id).Should().Equal(scenario.Id);
        result.TotalCount.Should().Be(1);
    }

    [Fact]
    [Trait("TestSpec", "TC-SEARCH-004")]
    public async Task Search_NonexistentIdentity_ReturnsEmptyResultAndZeroTotal()
    {
        var scenario = await SeedSearchScenarioAsync();
        var result = await ExecuteQueryAsync(new SearchSnippetTextQuery { SearchId = Ulid.NewUlid().ToString() }, scenario.Owner);
        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
    }

    [Fact]
    [Trait("TestSpec", "TC-SEARCH-021")]
    public async Task Search_OtherOwnerIdentity_ReturnsNoPrivateRowOrCount()
    {
        var scenario = await SeedSearchScenarioAsync();
        var other = TextSnippetTestUserContextFactory.CreateUser(IntegrationTestHelper.UniqueName("OtherSearchReader"));
        var result = await ExecuteQueryAsync(new SearchSnippetTextQuery { SearchId = scenario.Id }, other);
        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
    }

    [Fact]
    [Trait("TestSpec", "TC-SEARCH-024")]
    public async Task Search_NonmatchingAddress_DoesNotIgnoreTheAdditionalFilter()
    {
        var scenario = await SeedSearchScenarioAsync();
        var result = await ExecuteQueryAsync(new SearchSnippetTextQuery
        {
            SearchId = scenario.Id, SearchSingleAddress = IntegrationTestHelper.UniqueName("OtherStreet"),
        }, scenario.Owner);
        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
    }

    /// <summary>The public save DTO cannot assign a controlled creator; the real repository seed is the TC-EXAMPLE-025 exception.</summary>
    private async Task<(string Id, string Text, string Street, TextSnippetTestUserContext Owner)> SeedSearchScenarioAsync()
    {
        var owner = TextSnippetTestUserContextFactory.CreateUser(IntegrationTestHelper.UniqueName("SearchReader"));
        var id = Ulid.NewUlid().ToString();
        var text = IntegrationTestHelper.UniqueName("VisibleSearch");
        var street = IntegrationTestHelper.UniqueName("SearchStreet");
        await ExecuteWithServicesAsync(async services =>
        {
            var entity = TextSnippetEntity.Create(id, text, text);
            entity.CreatedByUserId = owner.UserId;
            entity.Address = new ExampleAddressValueObject { Street = street };
            await services.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>().CreateOrUpdateAsync(entity);
        });
        return (id, text, street, owner);
    }

    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-016")]
    public async Task SearchSnippetText_WhenQuerying_ShouldReturnPagedResults()
    {
        // Arrange
        var query = new SearchSnippetTextQuery
        {
            SkipCount = 0,
            MaxResultCount = 10,
        };

        // Act
        var result = await ExecuteQueryAsync(query);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().NotBeNull();
        result.TotalCount.Should().BeGreaterThanOrEqualTo(0);
        result.PageSize.Should().Be(10);
    }

    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-017")]
    public async Task SearchSnippetText_WhenNamedReaderSearchesPublicUnownedSnippet_ReturnsNoRowsOrCount()
    {
        // Arrange — Create a snippet with unique text
        var snippetText = IntegrationTestHelper.UniqueName("Searchable");
        var created = await ExecuteCommandAsync(new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto
            {
                SnippetText = snippetText,
                FullText = IntegrationTestHelper.UniqueName("Full text for search test"),
                Address = new ExampleAddressValueObject { Street = "789 Search Street" },
            },
        });

        await AssertEntityMatchesAsync<TextSnippetEntity>(created.SavedData.Id,
            entity => entity.CreatedByUserId.Should().BeNull("the public DTO does not assign business ownership"));

        // Act — the default named admin has no discovery bypass for an unowned snippet.
        var result = await ExecuteQueryAsync(new SearchSnippetTextQuery
        {
            SearchText = snippetText,
            SearchId = created.SavedData.Id,
            SkipCount = 0,
            MaxResultCount = 10,
        });

        // BR-SEARCH-01 applies to administrators as well as ordinary named readers.
        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
    }
}
