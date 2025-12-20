#region

using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.Repositories.Extensions;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.UseCaseCommands.Category;

/// <summary>
/// Command for saving a snippet category with optional nested snippets.
/// Demonstrates platform patterns:
/// - Nested entity pattern (saving parent with children)
/// - Async validation with database checks
/// - Create vs Update detection via GetSubmittedId
/// - Parallel operations with tuple await
/// </summary>
public sealed class SaveSnippetCategoryCommand : PlatformCqrsCommand<SaveSnippetCategoryCommandResult>
{
    /// <summary>
    /// Category data to save
    /// </summary>
    public TextSnippetCategoryDto Category { get; set; } = null!;

    /// <summary>
    /// Optional snippets to add to the category (nested entity pattern)
    /// </summary>
    public List<TextSnippetEntityDto> SnippetsToAdd { get; set; } = [];

    /// <summary>
    /// Whether to move existing snippets when changing parent category
    /// </summary>
    public bool MoveExistingSnippetsToNewParent { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Category != null, "Category data is required")
            .And(_ => Category.Name.IsNotNullOrEmpty(), "Category name is required")
            .And(_ => Category.Name.Length <= TextSnippetCategory.NameMaxLength, $"Category name must not exceed {TextSnippetCategory.NameMaxLength} characters")
            .And(
                _ => Category.Description.IsNullOrEmpty() || Category.Description!.Length <= TextSnippetCategory.DescriptionMaxLength,
                $"Description must not exceed {TextSnippetCategory.DescriptionMaxLength} characters");
    }
}

public sealed class SaveSnippetCategoryCommandResult : PlatformCqrsCommandResult
{
    public TextSnippetCategoryDto SavedCategory { get; set; } = null!;

    public int AddedSnippetsCount { get; set; }
}

internal sealed class SaveSnippetCategoryCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveSnippetCategoryCommand, SaveSnippetCategoryCommandResult>
{
    private readonly ITextSnippetRootRepository<TextSnippetCategory> categoryRepository;
    private readonly ITextSnippetRootRepository<TextSnippetEntity> snippetRepository;

    public SaveSnippetCategoryCommandHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        Lazy<IPlatformCqrs> cqrs,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        ITextSnippetRootRepository<TextSnippetCategory> categoryRepository,
        ITextSnippetRootRepository<TextSnippetEntity> snippetRepository)
        : base(requestContextAccessor, unitOfWorkManager, cqrs, loggerFactory, serviceProvider)
    {
        this.categoryRepository = categoryRepository;
        this.snippetRepository = snippetRepository;
    }

    /// <summary>
    /// Async validation demonstrating:
    /// - AndNotAsync for negative checks
    /// - Database existence checks
    /// - Circular reference validation for hierarchical data
    /// </summary>
    protected override async Task<PlatformValidationResult<SaveSnippetCategoryCommand>> ValidateRequestAsync(
        PlatformValidationResult<SaveSnippetCategoryCommand> requestSelfValidation,
        CancellationToken cancellationToken)
    {
        return await requestSelfValidation
            // Validate category name uniqueness within parent
            .AndNotAsync(
                async request => await categoryRepository.ExistsByNameAsync(
                    request.Category.ParentCategoryId,
                    request.Category.Name,
                    request.Category.Id, // Exclude self when updating
                    cancellationToken),
                "Category name already exists under the same parent")
            // Validate parent category exists (if specified)
            .AndAsync(
                async request => request.Category.ParentCategoryId.IsNullOrEmpty() ||
                                 await categoryRepository.AnyAsync(c => c.Id == request.Category.ParentCategoryId, cancellationToken),
                "Parent category not found")
            // Validate no circular reference when updating parent
            .AndNotAsync(
                async request => request.Category.Id.IsNotNullOrEmpty() &&
                                 request.Category.ParentCategoryId.IsNotNullOrEmpty() &&
                                 await categoryRepository.WouldCreateCircularReferenceAsync(
                                     request.Category.Id!,
                                     request.Category.ParentCategoryId!,
                                     cancellationToken),
                "Cannot move category under its own descendant (circular reference)");
    }

    protected override async Task<SaveSnippetCategoryCommandResult> HandleAsync(
        SaveSnippetCategoryCommand request,
        CancellationToken cancellationToken)
    {
        // Step 1: Determine if creating or updating
        var isCreate = request.Category.NotHasSubmitId();

        // Step 2: Get or create category entity
        var category = isCreate
            ? request.Category.MapToNewEntity()
                .With(c => c.CreatedBy = RequestContext.UserId())
                .With(c => c.CreatedDate = Clock.UtcNow)
            : await categoryRepository.GetByIdValidatedAsync(request.Category.Id!, cancellationToken)
                .Then(c => request.Category.UpdateToEntity(c))
                .Then(c => c.With(e => e.LastUpdatedBy = RequestContext.UserId()))
                .Then(c => c.With(e => e.LastUpdatedDate = Clock.UtcNow));

        // Step 3: Validate entity
        category.Validate().EnsureValid();

        // Step 4: Save category and add nested snippets in parallel (if any)
        var savedCategory = await categoryRepository.CreateOrUpdateAsync(category, cancellationToken: cancellationToken);
        var addedSnippetsCount = 0;

        // Step 5: Add nested snippets (nested entity pattern)
        if (request.SnippetsToAdd.Count > 0)
        {
            var snippetsToCreate = request.SnippetsToAdd
                .SelectList(dto =>
                {
                    var snippet = dto.MapToNewEntity();

                    snippet.CategoryId = savedCategory.Id;
                    snippet.CreatedBy = RequestContext.UserId();
                    snippet.CreatedDate = Clock.UtcNow;
                    return snippet;
                });

            await snippetRepository.CreateManyAsync(snippetsToCreate, cancellationToken: cancellationToken);
            addedSnippetsCount = snippetsToCreate.Count;
        }

        // Step 6: Load related data for response
        var snippetCount = await snippetRepository.CountAsync(TextSnippetEntity.OfCategoryExpr(savedCategory.Id), cancellationToken);
        var childCount = await categoryRepository.CountAsync(TextSnippetCategory.ChildrenOfExpr(savedCategory.Id), cancellationToken);

        return new SaveSnippetCategoryCommandResult
        {
            SavedCategory = new TextSnippetCategoryDto(savedCategory)
                .WithSnippetCount(snippetCount)
                .WithChildCategoryCount(childCount),
            AddedSnippetsCount = addedSnippetsCount
        };
    }
}
