#region

using System.Linq.Expressions;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Timing;
using Easy.Platform.Common.Validations.Validators;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Exceptions.Extensions;
using FluentValidation;
using PlatformExampleApp.TextSnippet.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.ValueObjects;

#endregion

namespace PlatformExampleApp.TextSnippet.Domain.Entities;

// DEMO USING AutoAddFieldUpdatedEvent to track entity property updated
[TrackFieldUpdatedDomainEvent]
public class TextSnippetEntity : RootAuditedEntity<TextSnippetEntity, string, string>, IRowVersionEntity
{
    public const int FullTextMaxLength = 4000;
    public const int SnippetTextMaxLength = 100;

    [TrackFieldUpdatedDomainEvent]
    public string SnippetText { get; set; }

    [TrackFieldUpdatedDomainEvent]
    public string FullText { get; set; }

    public TimeOnly TimeOnly { get; set; } = TimeOnly.MaxValue;

    /// <summary>
    /// Demo ForeignKey for TextSnippetAssociatedEntity
    /// </summary>
    public string CreatedByUserId { get; set; }

    /// <summary>
    /// Properties for LazyLoadRequestContextAccessorRegistersFactory demo
    /// </summary>
    public string Title { get; set; } = "";
    public string Category { get; set; } = "";
    public string CreatedByDepartment { get; set; } = "";

    #region New Properties for Enhanced Patterns Demo

    /// <summary>
    /// Status of the snippet - demonstrates enum pattern and TrackFieldUpdatedDomainEvent
    /// </summary>
    [TrackFieldUpdatedDomainEvent]
    public SnippetStatus Status { get; set; } = SnippetStatus.Draft;

    /// <summary>
    /// Foreign key to category - demonstrates parent-child relationship
    /// </summary>
    public string? CategoryId { get; set; }

    /// <summary>
    /// Navigation property to category - demonstrates JsonIgnore for circular reference prevention
    /// </summary>
    [JsonIgnore]
    public TextSnippetCategory? SnippetCategory { get; set; }

    /// <summary>
    /// Tags for categorization - demonstrates List property
    /// </summary>
    public List<string> Tags { get; set; } = [];

    /// <summary>
    /// View count for analytics - demonstrates simple counter
    /// </summary>
    public int ViewCount { get; set; }

    /// <summary>
    /// Published date - demonstrates nullable DateTime with business logic
    /// </summary>
    public DateTime? PublishedDate { get; set; }

    /// <summary>
    /// Soft delete flag - demonstrates IsDeleted pattern
    /// </summary>
    public bool IsDeleted { get; set; }

    /// <summary>
    /// Full-text search index - demonstrates full-text search optimization
    /// </summary>
    public string? FullTextSearch { get; set; }

    #endregion

    #region Computed Properties (Platform Pattern: ComputedEntityProperty)

    /// <summary>
    /// Computed word count from SnippetText - demonstrates ComputedEntityProperty pattern.
    /// MUST have empty setter for EF Core compatibility.
    /// </summary>
    [ComputedEntityProperty]
    public int WordCount
    {
        get => SnippetText?.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length ?? 0;
        set { } // Required empty setter for EF Core
    }

    /// <summary>
    /// Computed flag for recently modified content - demonstrates date-based computation.
    /// MUST have empty setter for EF Core compatibility.
    /// </summary>
    [ComputedEntityProperty]
    public bool IsRecentlyModified
    {
        get => LastUpdatedDate.HasValue && (Clock.UtcNow - LastUpdatedDate.Value).TotalDays < 7;
        set { } // Required empty setter for EF Core
    }

    /// <summary>
    /// Computed display title with status prefix - demonstrates UI-friendly computed property.
    /// MUST have empty setter for EF Core compatibility.
    /// </summary>
    [ComputedEntityProperty]
    public string DisplayTitle
    {
        get => $"[{Status}] {SnippetText?.TakeTop(50) ?? "Untitled"}";
        set { } // Required empty setter for EF Core
    }

    /// <summary>
    /// Computed flag for published status - demonstrates simple boolean computation.
    /// MUST have empty setter for EF Core compatibility.
    /// </summary>
    [ComputedEntityProperty]
    public bool IsPublished
    {
        get => Status == SnippetStatus.Published && PublishedDate.HasValue;
        set { } // Required empty setter for EF Core
    }

    #endregion

    #region Static Expressions (Platform Pattern: Entity Static Expressions)

    /// <summary>
    /// Unique expression for finding snippet by category and title.
    /// Usage: repository.FirstOrDefaultAsync(TextSnippetEntity.UniqueExpr(categoryId, title))
    /// </summary>
    public static Expression<Func<TextSnippetEntity, bool>> UniqueExpr(string? categoryId, string snippetText)
        => e => e.CategoryId == categoryId && e.SnippetText == snippetText;

    /// <summary>
    /// Filter by category expression.
    /// Usage: repository.GetAllAsync(TextSnippetEntity.OfCategoryExpr(categoryId))
    /// </summary>
    public static Expression<Func<TextSnippetEntity, bool>> OfCategoryExpr(string categoryId)
        => e => e.CategoryId == categoryId;

    /// <summary>
    /// Filter by multiple statuses using HashSet for performance.
    /// Usage: repository.GetAllAsync(TextSnippetEntity.FilterByStatusExpr(statuses))
    /// </summary>
    public static Expression<Func<TextSnippetEntity, bool>> FilterByStatusExpr(List<SnippetStatus> statuses)
    {
        var statusSet = statuses.ToHashSet();
        return e => statusSet.Contains(e.Status);
    }

    /// <summary>
    /// Active (published and not deleted) snippets expression.
    /// Usage: repository.GetAllAsync(TextSnippetEntity.IsActiveExpr())
    /// </summary>
    public static Expression<Func<TextSnippetEntity, bool>> IsActiveExpr()
        => e => e.Status == SnippetStatus.Published && !e.IsDeleted;

    /// <summary>
    /// Composite expression combining category and active status using AndAlso extension.
    /// Usage: repository.GetAllAsync(TextSnippetEntity.SearchableSnippetsExpr(categoryId))
    /// </summary>
    public static Expression<Func<TextSnippetEntity, bool>> SearchableSnippetsExpr(string categoryId)
        => OfCategoryExpr(categoryId).AndAlso(IsActiveExpr());

    /// <summary>
    /// Conditional composite expression using AndAlsoIf for optional filtering.
    /// Usage: repository.GetAllAsync(TextSnippetEntity.FilterExpr(categoryId, statuses, includeDeleted))
    /// </summary>
    public static Expression<Func<TextSnippetEntity, bool>> FilterExpr(
        string? categoryId,
        List<SnippetStatus>? statuses = null,
        bool includeDeleted = false)
    {
        return ((Expression<Func<TextSnippetEntity, bool>>)(e => true))
            .AndAlsoIf(categoryId.IsNotNullOrEmpty(), () => OfCategoryExpr(categoryId!))
            .AndAlsoIf(statuses?.Count > 0, () => FilterByStatusExpr(statuses!))
            .AndAlsoIf(!includeDeleted, () => e => !e.IsDeleted);
    }

    /// <summary>
    /// Full-text search columns for IPlatformFullTextSearchPersistenceService.
    /// Usage: fullTextSearchService.Search(query, searchText, TextSnippetEntity.DefaultFullTextSearchColumns())
    /// </summary>
    public static Expression<Func<TextSnippetEntity, object?>>[] DefaultFullTextSearchColumns()
        => [e => e.SnippetText, e => e.FullText, e => e.Title, e => e.FullTextSearch];

    /// <summary>
    /// Filter by tags - demonstrates Contains expression.
    /// Usage: repository.GetAllAsync(TextSnippetEntity.HasTagExpr("important"))
    /// </summary>
    public static Expression<Func<TextSnippetEntity, bool>> HasTagExpr(string tag)
        => e => e.Tags.Contains(tag);

    /// <summary>
    /// Filter by created user - demonstrates user-based filtering.
    /// Usage: repository.GetAllAsync(TextSnippetEntity.CreatedByUserExpr(userId))
    /// </summary>
    public static Expression<Func<TextSnippetEntity, bool>> CreatedByUserExpr(string userId)
        => e => e.CreatedByUserId == userId;

    #endregion

    public ExampleAddressValueObject Address { get; set; } = new() { Street = "Random default street" };

    public List<string> AddressStrings { get; set; } = ["Random default street", "Random default streetAB", "Random default streetCD"];

    //// Example of using FindByUniqueCompositeIdExpr to check unique composite key for entity
    //public override Expression<Func<TextSnippetEntity, bool>> FindByUniqueCompositeIdExpr()
    //{
    //    //return p => p.SnippetText == SnippetText && p.Id == Id;
    //    return null;
    //}

    public List<ExampleAddressValueObject> Addresses { get; set; } =
        [new() { Street = "Random default street" }, new() { Street = "Random default streetAB" }, new() { Street = "Random default streetCD" }];

    public string? ConcurrencyUpdateToken { get; set; }

    public override string UniqueCompositeId()
    {
        return Id;
    }

    public static TextSnippetEntity Create(string id, string snippetText, string fullText)
    {
        return new TextSnippetEntity
        {
            Id = id,
            SnippetText = snippetText,
            FullText = fullText,
        };
    }

    public override PlatformCheckUniqueValidator<TextSnippetEntity> CheckUniqueValidator()
    {
        return new PlatformCheckUniqueValidator<TextSnippetEntity>(
            targetItem: this,
            findOtherDuplicatedItemExpr: otherItem => otherItem.Id != Id && otherItem.SnippetText == SnippetText,
            "SnippetText must be unique"
        );
    }

    public TextSnippetEntity DemoDoSomeDomainEntityLogicAction_EncryptSnippetText()
    {
        var bytes = Encoding.UTF8.GetBytes(SnippetText);

        var hash = SHA256.HashData(bytes);

        SnippetText = Convert.ToBase64String(hash);
        var originalSnippetText = SnippetText;

        AddDomainEvent(new EncryptSnippetTextDomainEvent { OriginalSnippetText = originalSnippetText, EncryptedSnippetText = SnippetText });

        return this;
    }

    public async Task<PlatformValidationResult<TextSnippetEntity>> ValidateSomeSpecificIsXxxLogicAsync(
        ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository,
        ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository
    )
    {
        // Example get data from db to check and validate logic
        return await this.ValidateAsync(
            must: async () => !await textSnippetEntityRepository.AnyAsync(p => p.Id != Id && p.SnippetText == SnippetText),
            "SnippetText is duplicated"
        );
    }

    public class EncryptSnippetTextDomainEvent : ISupportDomainEventsEntity.DomainEvent
    {
        public string OriginalSnippetText { get; set; }

        public string EncryptedSnippetText { get; set; }
    }

    #region Basic Prop Validators

    public static PlatformSingleValidator<TextSnippetEntity, string> SnippetTextValidator()
    {
        return new PlatformSingleValidator<TextSnippetEntity, string>(p => p.SnippetText, p => p.NotNull().NotEmpty().MaximumLength(SnippetTextMaxLength));
    }

    public static PlatformSingleValidator<TextSnippetEntity, string> FullTextValidator()
    {
        return new PlatformSingleValidator<TextSnippetEntity, string>(p => p.FullText, p => p.NotNull().NotEmpty().MaximumLength(FullTextMaxLength));
    }

    public static PlatformSingleValidator<TextSnippetEntity, ExampleAddressValueObject> AddressValidator()
    {
        return new PlatformSingleValidator<TextSnippetEntity, ExampleAddressValueObject>(p => p.Address, p => p.SetValidator(ExampleAddressValueObject.GetValidator()));
    }

    public override PlatformValidator<TextSnippetEntity> GetValidator()
    {
        return PlatformValidator<TextSnippetEntity>.Create(SnippetTextValidator(), FullTextValidator(), AddressValidator());
    }

    #endregion

    #region Demo Validation Logic, Reuse logic and Expression

    public static PlatformExpressionValidator<TextSnippetEntity> SavePermissionValidator(string userId)
    {
        return new PlatformExpressionValidator<TextSnippetEntity>(
            must: p => p.CreatedByUserId == null || userId == null || p.CreatedByUserId == userId,
            errorMessage: "User must be the creator to update text snippet entity"
        );
    }

    public static PlatformExpressionValidator<TextSnippetEntity> SomeSpecificIsXxxLogicValidator()
    {
        return new PlatformExpressionValidator<TextSnippetEntity>(must: p => true, errorMessage: "Some example domain logic violated message.");
    }

    public PlatformValidationResult<TextSnippetEntity> ValidateSomeSpecificIsXxxLogic()
    {
        return SomeSpecificIsXxxLogicValidator().Validate(this).WithDomainException();
    }

    public PlatformValidationResult<TextSnippetEntity> ValidateSavePermission(string userId)
    {
        return SavePermissionValidator(userId).Validate(this).WithPermissionException();
    }

    #endregion

    #region Instance Validation Methods (Platform Pattern)

    /// <summary>
    /// Validates if the snippet can be published.
    /// Usage: snippet.ValidateCanBePublished().EnsureValid()
    /// </summary>
    public PlatformValidationResult<TextSnippetEntity> ValidateCanBePublished()
    {
        return this.Validate(_ => Status != SnippetStatus.Published, "Snippet is already published")
            .And(_ => !IsDeleted, "Cannot publish a deleted snippet")
            .And(_ => SnippetText.IsNotNullOrEmpty(), "Snippet text is required to publish");
    }

    /// <summary>
    /// Validates if the snippet can be deleted.
    /// Usage: snippet.ValidateCanBeDeleted().EnsureValid()
    /// </summary>
    public PlatformValidationResult<TextSnippetEntity> ValidateCanBeDeleted()
    {
        return this.Validate(_ => Status != SnippetStatus.Published, "Cannot delete a published snippet. Archive it first.");
    }

    /// <summary>
    /// Validates if the snippet can be updated.
    /// Usage: snippet.ValidateCanBeUpdated().EnsureValid()
    /// </summary>
    public PlatformValidationResult<TextSnippetEntity> ValidateCanBeUpdated()
    {
        return this.Validate(_ => !IsDeleted, "Cannot update a deleted snippet");
    }

    #endregion
}

/// <summary>
/// Status enum for TextSnippetEntity - demonstrates enum pattern with meaningful states.
/// </summary>
public enum SnippetStatus
{
    /// <summary>
    /// Initial state - snippet is being drafted
    /// </summary>
    Draft = 0,

    /// <summary>
    /// Snippet is published and visible to users
    /// </summary>
    Published = 1,

    /// <summary>
    /// Snippet is archived and hidden from normal views
    /// </summary>
    Archived = 2
}
