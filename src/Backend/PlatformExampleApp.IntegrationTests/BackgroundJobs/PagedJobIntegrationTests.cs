#region

using Easy.Platform.Application.BackgroundJob;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TextSnippet.Application.BackgroundJob;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

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
[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "BackgroundJob")]
public class PagedJobIntegrationTests : TextSnippetIntegrationTestBase
{
    /// <summary>
    /// OptimizeData mode: populates empty FullText fields with optimized content.
    /// Seeds an entity with empty FullText, runs the job, verifies FullText was populated.
    /// </summary>
    [Fact]
    public async Task PagedJob_OptimizeData_ShouldPopulateEmptyFullText()
    {
        // Arrange — seed an entity with empty FullText (matches OptimizeData filter)
        var entityId = Ulid.NewUlid().ToString();
        var snippetText = IntegrationTestHelper.UniqueName("PagedOptimize");

        await ExecuteWithServicesAsync(async sp =>
        {
            var repo = sp.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            await repo.CreateOrUpdateAsync(TextSnippetEntity.Create(entityId, snippetText, ""));
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
    /// ValidateData mode: selects entities with SnippetText longer than MinTextLength,
    /// then validates them. Entities that pass validation remain unchanged.
    ///
    /// <para>
    /// <strong>POC Note — Query Filter Alignment:</strong>
    /// The job's <c>BuildQueryForProcessingMode</c> selects entities where
    /// <c>SnippetText.Length &gt; MinTextLength</c>. The process logic then
    /// marks entities as <c>[ValidationFailed]</c> only if they're shorter than MinTextLength.
    /// Since the query already filters for long entities, passing entities remain valid.
    /// This test verifies the paged job executes the ValidateData pipeline without error.
    /// </para>
    /// </summary>
    [Fact]
    public async Task PagedJob_ValidateData_ShouldExecuteWithoutError()
    {
        // Arrange — seed an entity with SnippetText longer than MinTextLength
        // so it passes the query filter in BuildQueryForProcessingMode
        var entityId = Ulid.NewUlid().ToString();
        var snippetText = IntegrationTestHelper.UniqueName("ValidateDataTest_LongEnoughSnippetTextForValidation");

        await ExecuteWithServicesAsync(async sp =>
        {
            var repo = sp.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            await repo.CreateOrUpdateAsync(TextSnippetEntity.Create(entityId, snippetText, ""));
        });

        // Act — run paged job with ValidateData mode + low MinTextLength (entity passes filter)
        var pagedParam = new PlatformApplicationPagedBackgroundJobParam<DemoPagedParam>
        {
            Skip = 0,
            Take = 200,
            Param = new DemoPagedParam
            {
                ProcessingMode = PagedProcessingMode.ValidateData,
                MinTextLength = 5, // Entity's SnippetText is longer, so it passes query filter
            },
        };
        await ExecuteBackgroundJobWithParamAsync<DemoPagedBackgroundJobExecutor>(pagedParam);

        // Assert — entity passes validation (SnippetText >= MinTextLength), so FullText stays empty
        await AssertEntityMatchesAsync<TextSnippetEntity>(entityId, entity =>
        {
            entity.FullText.Should().NotContain("ValidationFailed",
                "Entity with SnippetText longer than MinTextLength should pass validation");
        });
    }
}
