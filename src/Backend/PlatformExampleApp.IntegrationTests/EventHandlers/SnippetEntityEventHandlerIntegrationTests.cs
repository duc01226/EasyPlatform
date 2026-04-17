#region

using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands.Category;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands.Snippet;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.IntegrationTests.EventHandlers;

/// <summary>
/// Integration tests for entity event handlers.
///
/// <para>
/// <strong>POC Reference — Entity Event Handler Pattern:</strong>
/// Entity event handlers extend <c>PlatformCqrsEntityEventApplicationHandler&lt;TEntity&gt;</c>.
/// Handlers with <c>EnableInboxEventBusMessage = false</c> execute synchronously before the
/// command returns. This means DB assertions do not need long polling — a short WaitUntilAsync
/// is sufficient to handle any micro-delay in the event dispatch pipeline.
/// </para>
///
/// <para>
/// <strong>Handler under test:</strong>
/// <c>UpdateCategoryStatsOnSnippetChangeEventHandler</c> — Updates category.LastUpdatedDate
/// when a snippet is created, deleted, or has its CategoryId changed.
/// <c>SendNotificationOnPublishSnippetEventHandler</c> — Logs a notification when a snippet
/// transitions to Published status.
/// </para>
/// </summary>
[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "EventHandler")]
public class SnippetEntityEventHandlerIntegrationTests : TextSnippetIntegrationTestBase
{
    /// <summary>
    /// Creates a snippet assigned to a category → verifies UpdateCategoryStatsOnSnippetChangeEventHandler
    /// fires and updates category.LastUpdatedDate.
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-018")]
    public async Task CreateSnippet_WithCategoryId_ShouldUpdateCategoryLastUpdatedDate()
    {
        // Arrange — create a category to track
        var categoryName = IntegrationTestHelper.UniqueName("EventHandlerCat");
        var categoryResult = await ExecuteCommandAsync(new SaveSnippetCategoryCommand
        {
            Category = new TextSnippetCategoryDto { Name = categoryName }
        });
        var categoryId = categoryResult.SavedCategory.Id;

        var before = DateTime.UtcNow.AddSeconds(-1);

        // Act — create snippet with CategoryId → triggers UpdateCategoryStatsOnSnippetChangeEventHandler (Created branch)
        await ExecuteCommandAsync(new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto
            {
                SnippetText = IntegrationTestHelper.UniqueName("CategoryEventTest"),
                FullText = "",
                CategoryId = categoryId,
            },
        });

        // Assert — handler is synchronous (EnableInboxEventBusMessage=false), LastUpdatedDate must be set
        await AssertEntityMatchesAsync<TextSnippetCategory>(categoryId, category =>
        {
            category.LastUpdatedDate.Should().NotBeNull(
                "UpdateCategoryStatsOnSnippetChangeEventHandler must set LastUpdatedDate on snippet Create");
            category.LastUpdatedDate!.Value.Should().BeAfter(before,
                "LastUpdatedDate must reflect the time after snippet creation");
        });
    }

    /// <summary>
    /// BulkUpdateSnippetStatusCommand transitioning a snippet to Published verifies:
    /// - Status transitions to Published
    /// - PublishedDate is auto-set by the command handler
    /// - SendNotificationOnPublishSnippetEventHandler fires without error
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-019")]
    public async Task BulkUpdateSnippetStatus_ToPublished_ShouldSetPublishedDateAndFireNotificationHandler()
    {
        // Arrange — create a snippet in Draft status (default)
        var snippetText = IntegrationTestHelper.UniqueName("BulkPublishHandlerTest");
        var createResult = await ExecuteCommandAsync(new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto { SnippetText = snippetText, FullText = "content" },
        });
        var snippetId = createResult.SavedData.Id;

        // Act — bulk update to Published: triggers SendNotificationOnPublishSnippetEventHandler
        await ExecuteCommandAsync(new BulkUpdateSnippetStatusCommand
        {
            SnippetIds = [snippetId],
            NewStatus = SnippetStatus.Published,
            SkipInvalidItems = false,
        });

        // Assert — status and PublishedDate reflect the change
        await AssertEntityMatchesAsync<TextSnippetEntity>(snippetId, entity =>
        {
            entity.Status.Should().Be(SnippetStatus.Published,
                "BulkUpdateSnippetStatusCommand must transition Status to Published");
            entity.PublishedDate.Should().NotBeNull(
                "PublishedDate must be set by BulkUpdateSnippetStatusCommand when transitioning to Published");
        });
    }

    /// <summary>
    /// Changing a snippet's CategoryId via direct repository update fires
    /// UpdateCategoryStatsOnSnippetChangeEventHandler for the NEW category's LastUpdatedDate.
    ///
    /// <para>
    /// <strong>Why direct repo update (not SaveSnippetTextCommand):</strong>
    /// TextSnippetEntityDto.MapToEntity does not update CategoryId in MapToUpdateExistingEntity
    /// mode. Direct repo update (loadEntity → change field → UpdateAsync) is the correct
    /// way to trigger the CategoryId-changed domain event for this POC.
    /// </para>
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-020")]
    public async Task UpdateSnippet_ChangeCategoryId_ShouldUpdateNewCategoryLastUpdatedDate()
    {
        // Arrange — create two categories (A and B) and a snippet assigned to A
        var catAResult = await ExecuteCommandAsync(new SaveSnippetCategoryCommand
        {
            Category = new TextSnippetCategoryDto { Name = IntegrationTestHelper.UniqueName("CatA") }
        });
        var catBResult = await ExecuteCommandAsync(new SaveSnippetCategoryCommand
        {
            Category = new TextSnippetCategoryDto { Name = IntegrationTestHelper.UniqueName("CatB") }
        });
        var catAId = catAResult.SavedCategory.Id;
        var catBId = catBResult.SavedCategory.Id;

        var createResult = await ExecuteCommandAsync(new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto
            {
                SnippetText = IntegrationTestHelper.UniqueName("CategoryChangeTest"),
                FullText = "content for category change",
                CategoryId = catAId,
            },
        });
        var snippetId = createResult.SavedData.Id;

        // Wait for initial category A update from the Created event to settle
        await AssertEntityMatchesAsync<TextSnippetCategory>(catAId,
            c => c.LastUpdatedDate.Should().NotBeNull("Category A should be updated on snippet create"));

        var beforeCatBUpdate = DateTime.UtcNow.AddSeconds(-1);

        // Act — load entity and change CategoryId from A → B via direct repo update
        // This fires TrackFieldUpdatedDomainEvent for CategoryId, triggering the handler's Updated branch
        await ExecuteWithServicesAsync(async sp =>
        {
            var repo = sp.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            var entity = await repo.GetByIdAsync(snippetId);
            entity!.CategoryId = catBId;
            await repo.UpdateAsync(entity);
        });

        // Assert — category B LastUpdatedDate must be updated after CategoryId changed to it
        await AssertEntityMatchesAsync<TextSnippetCategory>(catBId, category =>
        {
            category.LastUpdatedDate.Should().NotBeNull(
                "Category B must have LastUpdatedDate set after a snippet was moved to it");
            category.LastUpdatedDate!.Value.Should().BeAfter(beforeCatBUpdate,
                "Category B LastUpdatedDate must be updated when snippet.CategoryId changed to category B's ID");
        });
    }
}
