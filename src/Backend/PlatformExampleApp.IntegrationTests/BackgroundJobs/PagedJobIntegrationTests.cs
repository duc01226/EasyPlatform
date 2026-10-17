#region

using Easy.Platform.Application.BackgroundJob;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TextSnippet.Application.BackgroundJob;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;

#endregion

namespace PlatformExampleApp.IntegrationTests.BackgroundJobs;

/// <summary>
/// Integration tests for <see cref="DemoPagedBackgroundJobExecutor"/> — a paged background job.
///
/// <para>
/// <strong>POC Reference — Paged Background Job Pattern (CRITICAL):</strong>
/// Paged jobs extend <c>PlatformApplicationPagedBackgroundJobExecutor&lt;TParam&gt;</c>.
/// You MUST use <c>ExecuteBackgroundJobWithParamAsync</c> with explicit <c>Skip</c> and <c>Take</c> values.
/// Without Skip/Take, the master job schedules child jobs into Hangfire which never execute in test context.
/// </para>
///
/// <para>
/// <strong>Correct pattern:</strong>
/// <code>
/// var pagedParam = new PlatformApplicationPagedBackgroundJobParam&lt;TParam&gt;
/// {
///     Skip = 0,
///     Take = 200, // process up to 200 entities inline
///     Param = new TParam { ... }
/// };
/// await ExecuteBackgroundJobWithParamAsync&lt;TJob&gt;(pagedParam);
/// </code>
/// </para>
///
/// <para>
/// <strong>WRONG pattern (will silently do nothing):</strong>
/// <code>
/// await ExecuteBackgroundJobAsync&lt;DemoPagedBackgroundJobExecutor&gt;();
/// // This triggers master-job mode which schedules child jobs into Hangfire — they never run!
/// </code>
/// </para>
/// </summary>
[Collection(PagedJobIntegrationTestCollection.Name)]
[Trait("Category", "BackgroundJob")]
public class PagedJobIntegrationTests : TextSnippetIntegrationTestBase<PagedJobIntegrationTestModule>
{
    /// <summary>
    /// OptimizeData mode: populates empty FullText fields with optimized content.
    /// Direct repository setup is required because the save command cannot produce empty FullText.
    /// Proves the entity belongs to the requested page, then verifies its persisted optimized content.
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-005")]
    public async Task PagedJob_OptimizeData_ShouldPopulateEmptyFullText()
    {
        // Arrange — seed an entity with empty FullText (matches OptimizeData filter)
        var entityId = Ulid.NewUlid().ToString();
        var snippetText = IntegrationTestHelper.UniqueName("PagedOptimize");

        await ExecuteWithServicesAsync(async sp =>
        {
            var repo = sp.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            await repo.CreateOrUpdateAsync(TextSnippetEntity.Create(entityId, snippetText, ""));

            sp.GetRequiredService<TextSnippetDbContext>().Database.DatabaseNamespace.DatabaseName
                .Should().StartWith("BravoSuite_Paged_", "paged jobs must not select shared-suite data");
            var page = await repo.GetAllAsync(query => query
                .Where(entity => !string.IsNullOrEmpty(entity.SnippetText) &&
                    (string.IsNullOrEmpty(entity.FullText) || entity.FullText.Length < entity.SnippetText.Length))
                .OrderBy(entity => entity.CreatedDate).ThenBy(entity => entity.Id).Take(200));
            page.Select(entity => entity.Id).Should().Contain(entityId,
                "the empty record must belong to the explicit page before execution");
        });

        // Act — run paged job with OptimizeData mode and explicit Skip/Take
        var pagedParam = new PlatformApplicationPagedBackgroundJobParam<DemoPagedParam>
        {
            Skip = 0,
            Take = 200,
            Param = new DemoPagedParam { ProcessingMode = PagedProcessingMode.OptimizeData },
        };
        await ExecuteBackgroundJobWithParamAsync<DemoPagedBackgroundJobExecutor>(pagedParam);

        // Assert — FullText should now contain optimized content
        await AssertEntityMatchesAsync<TextSnippetEntity>(entityId, entity =>
        {
            entity.FullText.Should().Contain("Optimized content",
                "OptimizeData mode should populate empty FullText with optimized content");
        });
    }

    /// <summary>
    /// ValidateData mode must preserve valid records and mark a selected legacy whitespace record invalid.
    /// Direct repository setup supplies the corrupt stored state that the save command rejects.
    /// The positive invalid-record outcome prevents a no-op job from passing the preservation assertions.
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-006")]
    public async Task PagedJob_ValidateData_ShouldPreserveValidEntitiesWithoutCorruption()
    {
        // Arrange — seed two entities both LONGER than MinTextLength so both are selected
        // by BuildQueryForProcessingMode and processed by the validation pipeline.
        var entityId1 = Ulid.NewUlid().ToString();
        var entityId2 = Ulid.NewUlid().ToString();
        var snippetText1 = IntegrationTestHelper.UniqueName("ValidateData_FirstLongSnippet");
        var snippetText2 = IntegrationTestHelper.UniqueName("ValidateData_SecondLongSnippet");
        var invalidEntityId = Ulid.NewUlid().ToString();

        await ExecuteWithServicesAsync(async sp =>
        {
            var repo = sp.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            await repo.CreateOrUpdateAsync(TextSnippetEntity.Create(entityId1, snippetText1, ""));
            await repo.CreateOrUpdateAsync(TextSnippetEntity.Create(entityId2, snippetText2, ""));
            // Deliberate legacy/corruption setup: commands reject whitespace-only text, but the repair job
            // must mark such stored data invalid. Its length still passes the job's selection predicate.
            await repo.CreateOrUpdateAsync(TextSnippetEntity.Create(invalidEntityId, new string(' ', 10), ""));

            var page = await repo.GetAllAsync(query => query
                .Where(entity => !string.IsNullOrEmpty(entity.SnippetText) && entity.SnippetText.Length > 5)
                .OrderBy(entity => entity.CreatedDate).ThenBy(entity => entity.Id).Take(200));
            page.Select(entity => entity.Id).Should().Contain([entityId1, entityId2, invalidEntityId],
                "the explicit page must contain both valid records and the legacy invalid record");
        });

        // Act — run paged job with ValidateData mode + small MinTextLength (both entities pass filter)
        var pagedParam = new PlatformApplicationPagedBackgroundJobParam<DemoPagedParam>
        {
            Skip = 0,
            Take = 200,
            Param = new DemoPagedParam
            {
                ProcessingMode = PagedProcessingMode.ValidateData,
                MinTextLength = 5,
            },
        };
        await ExecuteBackgroundJobWithParamAsync<DemoPagedBackgroundJobExecutor>(pagedParam);

        // Assert — both entities must still exist with their original SnippetText preserved
        // exactly and NEITHER may be marked [ValidationFailed]. The invalid record's
        // positive marker below proves that the selected page actually ran.
        await AssertEntityMatchesAsync<TextSnippetEntity>(entityId1, entity =>
        {
            entity.SnippetText.Should().Be(snippetText1,
                "ValidateData should not mutate SnippetText on valid entities");
            entity.FullText.Should().NotContain("ValidationFailed",
                "Valid entity must not be marked failed");
        });
        await AssertEntityMatchesAsync<TextSnippetEntity>(entityId2, entity =>
        {
            entity.SnippetText.Should().Be(snippetText2,
                "ValidateData should not mutate SnippetText on valid entities");
            entity.FullText.Should().NotContain("ValidationFailed",
                "Valid entity must not be marked failed");
        });
        await AssertEntityMatchesAsync<TextSnippetEntity>(invalidEntityId, entity =>
        {
            entity.FullText.Should().Contain("ValidationFailed",
                "the selected legacy invalid record must be repaired, so a no-op job cannot pass");
        });
    }
}
