#region

using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Timing;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.UseCaseEvents.Snippet;

/// <summary>
/// Event handler that updates category statistics when snippets are created or deleted.
/// Demonstrates platform patterns:
/// - Cross-entity side effects (snippet change affects category)
/// - HandleWhen for filtering by CrudAction
/// - Repository injection in event handler
/// - dismissSendEvent: true to prevent event loops
/// </summary>
internal sealed class UpdateCategoryStatsOnSnippetChangeEventHandler
    : PlatformCqrsEntityEventApplicationHandler<TextSnippetEntity>
{
    private readonly ITextSnippetRootRepository<TextSnippetCategory> categoryRepository;
    private readonly ITextSnippetRootRepository<TextSnippetEntity> snippetRepository;

    public UpdateCategoryStatsOnSnippetChangeEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        ITextSnippetRootRepository<TextSnippetCategory> categoryRepository,
        ITextSnippetRootRepository<TextSnippetEntity> snippetRepository)
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        this.categoryRepository = categoryRepository;
        this.snippetRepository = snippetRepository;
    }

    /// <summary>
    /// Disable inbox event bus message for this handler (sync execution).
    /// Set to false when you need the side effect to complete before returning to user.
    /// </summary>
    public override bool EnableInboxEventBusMessage => false;

    /// <summary>
    /// Filter: Only handle Created and Deleted events, or when CategoryId changed.
    /// </summary>
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<TextSnippetEntity> @event)
    {
        // Skip test data seeding
        if (@event.RequestContext.IsSeedingTestingData())
            return false;

        // Handle Create and Delete events
        if (@event.CrudAction is PlatformCqrsEntityEventCrudAction.Created
            or PlatformCqrsEntityEventCrudAction.Deleted)
        {
            // Only if snippet has a category
            return @event.EntityData.CategoryId.IsNotNullOrEmpty();
        }

        // Handle Update events when CategoryId changed
        if (@event.CrudAction == PlatformCqrsEntityEventCrudAction.Updated)
        {
            var categoryIdChange = @event.FindFieldUpdatedEvent(e => e.CategoryId);
            return categoryIdChange != null;
        }

        return false;
    }

    /// <summary>
    /// Handle the event by updating affected category's LastUpdatedDate.
    /// This demonstrates cross-entity side effects pattern.
    /// </summary>
    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<TextSnippetEntity> @event,
        CancellationToken cancellationToken)
    {
        var affectedCategoryIds = GetAffectedCategoryIds(@event);

        // Use ParallelAsync to avoid awaiting in loop (EASY_PLATFORM_ANALYZERS_PERF002)
        await affectedCategoryIds
            .Where(id => id.IsNotNullOrEmpty())
            .ParallelAsync(async categoryId =>
                await UpdateCategoryStats(categoryId!, @event.CrudAction, cancellationToken));
    }

    /// <summary>
    /// Get all category IDs affected by this snippet change.
    /// </summary>
    private static List<string?> GetAffectedCategoryIds(PlatformCqrsEntityEvent<TextSnippetEntity> @event)
    {
        var categoryIds = new List<string?> { @event.EntityData.CategoryId };
        // If category was changed, also update the old category
        var categoryIdChange = @event.FindFieldUpdatedEvent(e => e.CategoryId);

        if (categoryIdChange != null)
        {
            categoryIds.Add(categoryIdChange.OriginalValue?.ToString());
        }

        return categoryIds.Distinct().ToList();
    }

    /// <summary>
    /// Update category statistics after snippet change.
    /// </summary>
    private async Task UpdateCategoryStats(
        string categoryId,
        PlatformCqrsEntityEventCrudAction crudAction,
        CancellationToken cancellationToken)
    {
        var category = await categoryRepository.FirstOrDefaultAsync(
            c => c.Id == categoryId,
            cancellationToken);

        if (category == null)
        {
            CreateGlobalLogger().LogWarning(
                "Category not found for stats update: {CategoryId}",
                categoryId);
            return;
        }

        // Get current snippet count for logging
        var snippetCount = await snippetRepository.CountAsync(
            TextSnippetEntity.OfCategoryExpr(categoryId),
            cancellationToken);

        // Update category's last updated timestamp
        category.LastUpdatedDate = Clock.UtcNow;

        // Save with dismissSendEvent: true to prevent event loops
        await categoryRepository.UpdateAsync(
            category,
            dismissSendEvent: true, // Important: prevent cascading events
            cancellationToken: cancellationToken);

        CreateGlobalLogger().LogInformation(
            "Category '{CategoryName}' (ID: {CategoryId}) stats updated after snippet {CrudAction}. " +
            "Current snippet count: {SnippetCount}",
            category.Name,
            category.Id,
            crudAction,
            snippetCount);
    }
}
