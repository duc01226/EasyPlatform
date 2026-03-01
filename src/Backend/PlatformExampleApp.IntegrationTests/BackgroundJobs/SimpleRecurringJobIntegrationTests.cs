#region

using FluentAssertions;
using PlatformExampleApp.TextSnippet.Application.BackgroundJob;
using PlatformExampleApp.TextSnippet.Domain.Entities;

#endregion

namespace PlatformExampleApp.IntegrationTests.BackgroundJobs;

/// <summary>
/// Integration tests for <see cref="TestRecurringBackgroundJobExecutor"/> — a simple recurring background job.
///
/// <para>
/// <strong>POC Reference — Simple Background Job Pattern:</strong>
/// Use <c>ExecuteBackgroundJobAsync&lt;TJob&gt;()</c> for jobs that extend <c>PlatformApplicationBackgroundJobExecutor</c>.
/// The platform helper calls <c>ProcessAsync(null)</c> inline, bypassing the Hangfire scheduler.
/// </para>
///
/// <para>
/// <strong>What the job does:</strong>
/// 1. Upserts a <c>TextSnippetEntity</c> with a hardcoded ID
/// 2. Sends a CQRS command (<c>DemoSendFreeFormatEventBusMessageCommand</c>)
/// 3. Sends 2 free-format bus messages
/// </para>
/// </summary>
[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "BackgroundJob")]
public class SimpleRecurringJobIntegrationTests : TextSnippetIntegrationTestBase
{
    /// <summary>
    /// Smoke test: the recurring job should execute without error through the full platform pipeline.
    /// Verifies DI resolution, repository access, and bus message sending all work.
    /// </summary>
    [Fact]
    public async Task SimpleRecurringJob_ShouldExecuteWithoutError()
    {
        // Act & Assert — job should complete without throwing
        var act = () => ExecuteBackgroundJobAsync<TestRecurringBackgroundJobExecutor>();
        await act.Should().NotThrowAsync(
            "Simple recurring job should execute without error through the full platform pipeline");
    }

    /// <summary>
    /// The recurring job upserts a TextSnippetEntity with a hardcoded ID.
    /// After execution, verify the entity exists in the database with the expected content.
    ///
    /// <para>
    /// <strong>POC Pattern:</strong> Use <c>AssertEntityMatchesAsync</c> to poll the database
    /// until the entity matches expectations. This handles eventual consistency from async
    /// entity event handlers.
    /// </para>
    /// </summary>
    [Fact]
    public async Task SimpleRecurringJob_ShouldUpsertEntityWithHardcodedId()
    {
        // Arrange — the job uses this hardcoded ID (see TestRecurringBackgroundJobExecutor.ProcessAsync)
        var expectedEntityId = Ulid.Parse("01J0P1BYG30CNTMDRG6540WEGQ").ToString();

        // Act
        await ExecuteBackgroundJobAsync<TestRecurringBackgroundJobExecutor>();

        // Assert — entity should exist with expected SnippetText
        await AssertEntityMatchesAsync<TextSnippetEntity>(expectedEntityId, entity =>
        {
            entity.SnippetText.Should().Contain("TestRecurringBackgroundJob",
                "The recurring job sets SnippetText to 'TestRecurringBackgroundJob' + timestamp");
        });
    }
}
