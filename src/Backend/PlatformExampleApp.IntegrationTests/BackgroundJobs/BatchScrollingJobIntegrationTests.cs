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
/// Integration tests for <see cref="DemoBatchScrollingBackgroundJobExecutor"/> — a batch scrolling background job.
///
/// <para>
/// <strong>POC Reference — Batch Scrolling Background Job Pattern (CRITICAL):</strong>
/// Batch scrolling jobs extend <c>PlatformApplicationBatchScrollingBackgroundJobExecutor&lt;TEntity, TBatchKey, TParam&gt;</c>.
/// You MUST use <c>ExecuteBackgroundJobWithParamAsync</c> with an explicit <c>BatchKey</c>.
/// Without BatchKey, the master job discovers batch keys and schedules child jobs into Hangfire — they never run in tests.
/// </para>
///
/// <para>
/// <strong>Correct pattern:</strong>
/// <code>
/// var batchParam = new PlatformBatchScrollingJobParam&lt;string, TParam&gt;
/// {
///     BatchKey = "T", // process only entities in batch "T"
///     Param = new TParam { ... }
/// };
/// await ExecuteBackgroundJobWithParamAsync&lt;TJob&gt;(batchParam);
/// </code>
/// </para>
///
/// <para>
/// <strong>WRONG pattern (will silently do nothing):</strong>
/// <code>
/// await ExecuteBackgroundJobAsync&lt;DemoBatchScrollingBackgroundJobExecutor&gt;();
/// // This triggers master-job mode which discovers batch keys and schedules — they never run!
/// </code>
/// </para>
/// </summary>
[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "BackgroundJob")]
public class BatchScrollingJobIntegrationTests : TextSnippetIntegrationTestBase
{
    /// <summary>
    /// UpdateFullText mode: processes entities for a specific batch key (first letter of SnippetText).
    /// Seeds entities starting with "T", runs the job with BatchKey="T",
    /// verifies FullText was updated with [BatchProcessed] marker.
    /// </summary>
    [Fact]
    public async Task BatchScrollingJob_UpdateFullText_ShouldProcessEntitiesForBatchKey()
    {
        // Arrange — seed 2 entities with SnippetText starting with "T"
        var entityId1 = Ulid.NewUlid().ToString();
        var entityId2 = Ulid.NewUlid().ToString();
        var snippet1 = IntegrationTestHelper.UniqueName("T_BatchTest1");
        var snippet2 = IntegrationTestHelper.UniqueName("T_BatchTest2");

        await ExecuteWithServicesAsync(async sp =>
        {
            var repo = sp.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            await repo.CreateOrUpdateAsync(TextSnippetEntity.Create(entityId1, snippet1, ""));
            await repo.CreateOrUpdateAsync(TextSnippetEntity.Create(entityId2, snippet2, ""));
        });

        // Act — run batch scrolling job for BatchKey="T" with UpdateFullText mode
        var batchParam = new PlatformBatchScrollingJobParam<string, DemoBatchScrollingParam>
        {
            BatchKey = "T",
            Param = new DemoBatchScrollingParam { ProcessingMode = BatchProcessingMode.UpdateFullText },
        };
        await ExecuteBackgroundJobWithParamAsync<DemoBatchScrollingBackgroundJobExecutor>(batchParam);

        // Assert — both entities should have [BatchProcessed] in FullText
        await AssertEntityMatchesAsync<TextSnippetEntity>(entityId1, entity =>
        {
            entity.FullText.Should().Contain("BatchProcessed",
                "UpdateFullText mode should append [BatchProcessed] marker to FullText");
        });

        await AssertEntityMatchesAsync<TextSnippetEntity>(entityId2, entity =>
        {
            entity.FullText.Should().Contain("BatchProcessed",
                "Both entities in the batch should be processed");
        });
    }

    /// <summary>
    /// Batch isolation: processing BatchKey="X" should NOT modify entities in BatchKey="Y".
    /// This verifies the batch key filtering logic works correctly.
    /// </summary>
    [Fact]
    public async Task BatchScrollingJob_ShouldNotProcessEntitiesOutsideBatchKey()
    {
        // Arrange — seed entity in batch "X" and entity in batch "Y"
        var entityIdX = Ulid.NewUlid().ToString();
        var entityIdY = Ulid.NewUlid().ToString();
        var snippetX = IntegrationTestHelper.UniqueName("X_IsolationTest");
        var snippetY = IntegrationTestHelper.UniqueName("Y_IsolationTest");

        await ExecuteWithServicesAsync(async sp =>
        {
            var repo = sp.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            await repo.CreateOrUpdateAsync(TextSnippetEntity.Create(entityIdX, snippetX, ""));
            await repo.CreateOrUpdateAsync(TextSnippetEntity.Create(entityIdY, snippetY, ""));
        });

        // Act — run batch scrolling job for BatchKey="X" only
        var batchParam = new PlatformBatchScrollingJobParam<string, DemoBatchScrollingParam>
        {
            BatchKey = "X",
            Param = new DemoBatchScrollingParam { ProcessingMode = BatchProcessingMode.UpdateFullText },
        };
        await ExecuteBackgroundJobWithParamAsync<DemoBatchScrollingBackgroundJobExecutor>(batchParam);

        // Assert — "X" entity should be processed, "Y" entity should be untouched
        await AssertEntityMatchesAsync<TextSnippetEntity>(entityIdX, entity =>
        {
            entity.FullText.Should().Contain("BatchProcessed",
                "Entity in BatchKey 'X' should be processed");
        });

        await AssertEntityMatchesAsync<TextSnippetEntity>(entityIdY, entity =>
        {
            entity.FullText.Should().BeNullOrEmpty(
                "Entity in BatchKey 'Y' should NOT be processed when running BatchKey='X'");
        });
    }
}
