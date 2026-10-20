#region

using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.UseCaseEvents.Snippet;

/// <summary>
/// Event handler that sends notification when a snippet is published.
/// Demonstrates platform patterns:
/// - PlatformCqrsEntityEventApplicationHandler for entity events
/// - FindFieldUpdatedEvent to detect specific property changes
/// - HandleWhen for filtering events
/// - Side effects triggered by entity changes (NOT in command handler)
/// </summary>
internal sealed class SendNotificationOnPublishSnippetEventHandler
    : PlatformCqrsEntityEventApplicationHandler<TextSnippetEntity>
{
    public SendNotificationOnPublishSnippetEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider)
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
    }

    /// <summary>
    /// Filter: Only handle when status changed to Published.
    /// Demonstrates FindFieldUpdatedEvent pattern for detecting specific property changes.
    /// </summary>
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<TextSnippetEntity> @event)
    {
        // Skip if this is test data seeding
        if (@event.RequestContext.IsSeedingTestingData())
            return false;

        // Only handle when status field was updated
        var statusChange = @event.FindFieldUpdatedEvent(e => e.Status);

        if (statusChange == null)
            return false;

        // Only handle when new status is Published
        var newStatus = statusChange.NewValue;

        return newStatus is SnippetStatus.Published;
    }

    /// <summary>
    /// Handle the event by sending notification.
    /// In real application, this would call a notification service.
    /// </summary>
    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<TextSnippetEntity> @event,
        CancellationToken cancellationToken)
    {
        var snippet = @event.EntityData;
        var statusChange = @event.FindFieldUpdatedEvent(e => e.Status)!;

        // Log the notification (in real app, would send email/push notification)
        CreateGlobalLogger().LogInformation(
            "NOTIFICATION: Snippet '{SnippetText}' (ID: {SnippetId}) was published. " +
            "Previous status: {PreviousStatus}. Published by: {UserId}. " +
            "Category: {CategoryId}",
            snippet.SnippetText?.TakeTop(50),
            snippet.Id,
            statusChange.OriginalValue as SnippetStatus?,
            @event.RequestContext.UserId(),
            snippet.CategoryId ?? "None");

        // Simulate sending notification (in real app, inject INotificationService)
        // await notificationService.SendSnippetPublishedNotificationAsync(new NotificationRequest
        // {
        //     SnippetId = snippet.Id,
        //     Title = snippet.SnippetText,
        //     PublishedBy = @event.RequestContext.UserId()
        // });

        await Task.CompletedTask;
    }
}
