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
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.Repositories.Extensions;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.UseCaseCommands.Snippet;

/// <summary>
/// Command for cloning an existing snippet.
/// Demonstrates platform patterns:
/// - Entity cloning with selective property copying
/// - EnsureFound validation pattern
/// - New ID generation with Ulid
/// - Optional property overrides during clone
/// </summary>
public sealed class CloneSnippetCommand : PlatformCqrsCommand<CloneSnippetCommandResult>
{
    /// <summary>
    /// ID of the snippet to clone
    /// </summary>
    public string SourceSnippetId { get; set; } = "";

    /// <summary>
    /// Optional: Override the snippet text for the clone
    /// </summary>
    public string? NewSnippetText { get; set; }

    /// <summary>
    /// Optional: Place the clone in a different category
    /// </summary>
    public string? TargetCategoryId { get; set; }

    /// <summary>
    /// Whether to copy tags from the source snippet
    /// </summary>
    public bool CopyTags { get; set; } = true;

    /// <summary>
    /// Whether to copy the address from the source snippet
    /// </summary>
    public bool CopyAddress { get; set; } = true;

    /// <summary>
    /// Suffix to add to the snippet text (e.g., " (Copy)")
    /// </summary>
    public string CloneSuffix { get; set; } = " (Copy)";

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => SourceSnippetId.IsNotNullOrEmpty(), "Source snippet ID is required");
    }
}

public sealed class CloneSnippetCommandResult : PlatformCqrsCommandResult
{
    /// <summary>
    /// The cloned snippet
    /// </summary>
    public TextSnippetEntityDto ClonedSnippet { get; set; } = null!;

    /// <summary>
    /// ID of the source snippet that was cloned
    /// </summary>
    public string SourceSnippetId { get; set; } = "";
}

internal sealed class CloneSnippetCommandHandler
    : PlatformCqrsCommandApplicationHandler<CloneSnippetCommand, CloneSnippetCommandResult>
{
    private readonly ITextSnippetRootRepository<TextSnippetEntity> snippetRepository;
    private readonly ITextSnippetRootRepository<TextSnippetCategory> categoryRepository;

    public CloneSnippetCommandHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        Lazy<IPlatformCqrs> cqrs,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        ITextSnippetRootRepository<TextSnippetEntity> snippetRepository,
        ITextSnippetRootRepository<TextSnippetCategory> categoryRepository)
        : base(requestContextAccessor, unitOfWorkManager, cqrs, loggerFactory, serviceProvider)
    {
        this.snippetRepository = snippetRepository;
        this.categoryRepository = categoryRepository;
    }

    /// <summary>
    /// Async validation demonstrating:
    /// - Source entity existence check
    /// - Target category existence check (if specified)
    /// </summary>
    protected override async Task<PlatformValidationResult<CloneSnippetCommand>> ValidateRequestAsync(
        PlatformValidationResult<CloneSnippetCommand> requestSelfValidation,
        CancellationToken cancellationToken)
    {
        return await requestSelfValidation
            // Validate source snippet exists
            .AndAsync(
                async request => await snippetRepository.AnyAsync(
                    e => e.Id == request.SourceSnippetId,
                    cancellationToken),
                "Source snippet not found")
            // Validate target category exists (if specified)
            .AndAsync(
                async request => request.TargetCategoryId.IsNullOrEmpty() ||
                    await categoryRepository.AnyAsync(
                        c => c.Id == request.TargetCategoryId,
                        cancellationToken),
                "Target category not found");
    }

    protected override async Task<CloneSnippetCommandResult> HandleAsync(
        CloneSnippetCommand request,
        CancellationToken cancellationToken)
    {
        // Step 1: Get source snippet with related data
        var source = await snippetRepository.GetByIdValidatedAsync(
            request.SourceSnippetId,
            cancellationToken,
            e => e.SnippetCategory);

        // Step 2: Determine the clone's snippet text
        var cloneSnippetText = request.NewSnippetText.IsNotNullOrEmpty()
            ? request.NewSnippetText
            : $"{source.SnippetText}{request.CloneSuffix}";

        // Step 3: Create the clone entity
        var clone = new TextSnippetEntity
        {
            // New identity
            Id = Ulid.NewUlid().ToString(),

            // Core content (cloned)
            SnippetText = cloneSnippetText!,
            FullText = source.FullText,
            Title = source.Title,
            TimeOnly = source.TimeOnly,

            // Category (use target or same as source)
            CategoryId = request.TargetCategoryId ?? source.CategoryId,

            // Conditional cloning
            Tags = request.CopyTags ? source.Tags.ToList() : [],
            Address = request.CopyAddress ? source.Address : new(),

            // Reset status for new clone
            Status = SnippetStatus.Draft,
            PublishedDate = null,
            ViewCount = 0,
            IsDeleted = false,

            // New audit fields
            CreatedBy = RequestContext.UserId(),
            CreatedDate = Clock.UtcNow,
            LastUpdatedBy = null,
            LastUpdatedDate = null
        };

        // Step 4: Validate the clone entity
        clone.Validate().EnsureValid();

        // Step 5: Save the clone
        var savedClone = await snippetRepository.CreateAsync(clone, cancellationToken: cancellationToken);

        // Step 6: Load category for response (if exists)
        var category = savedClone.CategoryId.IsNotNullOrEmpty()
            ? await categoryRepository.FirstOrDefaultAsync(
                c => c.Id == savedClone.CategoryId,
                cancellationToken)
            : null;

        return new CloneSnippetCommandResult
        {
            ClonedSnippet = new TextSnippetEntityDto(savedClone)
                .WithCategory(category),
            SourceSnippetId = request.SourceSnippetId
        };
    }
}
