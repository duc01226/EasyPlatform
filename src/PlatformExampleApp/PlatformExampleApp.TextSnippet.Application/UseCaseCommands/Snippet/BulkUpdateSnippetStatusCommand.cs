#region

using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Timing;
using Easy.Platform.Domain.Exceptions.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.Repositories.Extensions;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.UseCaseCommands.Snippet;

/// <summary>
/// Command for bulk updating snippet status.
/// Demonstrates platform patterns:
/// - Bulk operations with UpdateManyAsync
/// - EnsureFoundAllBy validation pattern
/// - Status transition validation
/// - Auto-setting related fields (PublishedDate) on status change
/// </summary>
public sealed class BulkUpdateSnippetStatusCommand : PlatformCqrsCommand<BulkUpdateSnippetStatusCommandResult>
{
    /// <summary>
    /// List of snippet IDs to update
    /// </summary>
    public List<string> SnippetIds { get; set; } = [];

    /// <summary>
    /// New status to apply to all snippets
    /// </summary>
    public SnippetStatus NewStatus { get; set; }

    /// <summary>
    /// Optional: Skip validation errors and continue with valid items
    /// </summary>
    public bool SkipInvalidItems { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => SnippetIds.IsNotNullOrEmpty(), "At least one snippet ID is required")
            .And(_ => SnippetIds.Count <= 100, "Cannot update more than 100 snippets at once");
    }
}

public sealed class BulkUpdateSnippetStatusCommandResult : PlatformCqrsCommandResult
{
    /// <summary>
    /// Number of successfully updated snippets
    /// </summary>
    public int UpdatedCount { get; set; }

    /// <summary>
    /// IDs of snippets that were skipped due to validation errors
    /// </summary>
    public List<string> SkippedIds { get; set; } = [];

    /// <summary>
    /// Validation errors for skipped items (if SkipInvalidItems was true)
    /// </summary>
    public Dictionary<string, string> ValidationErrors { get; set; } = [];
}

internal sealed class BulkUpdateSnippetStatusCommandHandler
    : PlatformCqrsCommandApplicationHandler<BulkUpdateSnippetStatusCommand, BulkUpdateSnippetStatusCommandResult>
{
    private readonly ITextSnippetRootRepository<TextSnippetEntity> snippetRepository;

    public BulkUpdateSnippetStatusCommandHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        Lazy<IPlatformCqrs> cqrs,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        ITextSnippetRootRepository<TextSnippetEntity> snippetRepository)
        : base(requestContextAccessor, unitOfWorkManager, cqrs, loggerFactory, serviceProvider)
    {
        this.snippetRepository = snippetRepository;
    }

    /// <summary>
    /// Async validation demonstrating:
    /// - Batch existence check with ThenValidateFoundAllAsync pattern
    /// </summary>
    protected override async Task<PlatformValidationResult<BulkUpdateSnippetStatusCommand>> ValidateRequestAsync(
        PlatformValidationResult<BulkUpdateSnippetStatusCommand> requestSelfValidation,
        CancellationToken cancellationToken)
    {
        // Only validate all exist if not skipping invalid items
        return await requestSelfValidation
            .AndAsync(
                async request =>
                {
                    if (request.SkipInvalidItems) return true;

                    var existingIds = await snippetRepository.GetAllAsync(
                        query => query
                            .Where(e => request.SnippetIds.Contains(e.Id))
                            .Select(e => e.Id),
                        cancellationToken);

                    var missingIds = request.SnippetIds.Except(existingIds).ToList();

                    return missingIds.Count == 0;
                },
                "Some snippets not found");
    }

    protected override async Task<BulkUpdateSnippetStatusCommandResult> HandleAsync(
        BulkUpdateSnippetStatusCommand request,
        CancellationToken cancellationToken)
    {
        // Step 1: Get all snippets
        var snippets = await snippetRepository.GetByIdsAsync(request.SnippetIds.Distinct().ToList(), cancellationToken);
        var result = new BulkUpdateSnippetStatusCommandResult();
        var validSnippets = new List<TextSnippetEntity>();

        // Step 2: Validate each snippet for status transition
        foreach (var snippet in snippets)
        {
            var validationError = ValidateStatusTransition(snippet, request.NewStatus);

            if (validationError != null)
            {
                if (request.SkipInvalidItems)
                {
                    result.SkippedIds.Add(snippet.Id);
                    result.ValidationErrors[snippet.Id] = validationError;
                    continue;
                }
                else
                {
                    // If not skipping, throw validation error
                    throw new PlatformValidationException(validationError);
                }
            }

            validSnippets.Add(snippet);
        }

        // Step 3: Track missing IDs (if skipping invalid items)
        if (request.SkipInvalidItems)
        {
            var foundIds = snippets.Select(s => s.Id).ToHashSet();

            var missingIds = request.SnippetIds.Where(id => !foundIds.Contains(id)).ToList();

            foreach (var missingId in missingIds)
            {
                result.SkippedIds.Add(missingId);
                result.ValidationErrors[missingId] = "Snippet not found";
            }
        }

        // Step 4: Apply status changes with business logic
        foreach (var snippet in validSnippets)
        {
            snippet.Status = request.NewStatus;

            // Auto-set published date when publishing
            if (request.NewStatus == SnippetStatus.Published && !snippet.PublishedDate.HasValue)
                snippet.PublishedDate = Clock.UtcNow;

            // Clear published date when archiving
            if (request.NewStatus == SnippetStatus.Archived)
                snippet.PublishedDate = null;

            snippet.LastUpdatedBy = RequestContext.UserId();
            snippet.LastUpdatedDate = Clock.UtcNow;
        }

        // Step 5: Bulk update with events enabled (for side effects)
        if (validSnippets.Count > 0)
        {
            await snippetRepository.UpdateManyAsync(
                validSnippets,
                dismissSendEvent: false, // Enable events for side effects
                checkDiff: true,
                cancellationToken: cancellationToken);
        }

        result.UpdatedCount = validSnippets.Count;
        return result;
    }

    /// <summary>
    /// Validate status transition is allowed.
    /// Returns error message if invalid, null if valid.
    /// </summary>
    private static string? ValidateStatusTransition(TextSnippetEntity snippet, SnippetStatus newStatus)
    {
        // Cannot change status of deleted snippets
        if (snippet.IsDeleted)
            return $"Snippet '{snippet.Id}' is deleted and cannot be modified";

        // Validate specific transitions
        return (snippet.Status, newStatus) switch
        {
            // Already in target status
            (var current, var target) when current == target
                => $"Snippet '{snippet.Id}' is already {target}",

            // Cannot publish empty snippet
            (_, SnippetStatus.Published) when snippet.SnippetText.IsNullOrEmpty()
                => $"Snippet '{snippet.Id}' cannot be published without content",

            // All other transitions are valid
            _ => null
        };
    }
}

/// <summary>
/// Custom exception for validation errors in bulk operations
/// </summary>
public class PlatformValidationException : Exception
{
    public PlatformValidationException(string message) : base(message) { }
}
