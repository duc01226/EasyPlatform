using Easy.Platform.Application.Dtos;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Timing;
using Easy.Platform.Common.ValueObjects;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.ValueObjects;

namespace PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;

/// <summary>
/// DTO for TextSnippetEntity demonstrating platform patterns:
/// - PlatformEntityDto base class
/// - With* fluent methods for optional data loading
/// - MapToEntity with mode awareness
/// - GetSubmittedId for create vs update detection
/// </summary>
public sealed class TextSnippetEntityDto : PlatformEntityDto<TextSnippetEntity, string>
{
    public TextSnippetEntityDto() { }

    /// <summary>
    /// Constructor mapping from entity - maps core properties only.
    /// Use With* methods to populate optional/related data.
    /// </summary>
    public TextSnippetEntityDto(TextSnippetEntity entity)
    {
        Id = entity.Id;
        SnippetText = entity.SnippetText;
        FullText = entity.FullText;
        Address = entity.Address;
        CreatedDate = entity.CreatedDate;
        TimeOnly = entity.TimeOnly;
        // New properties
        Status = entity.Status;
        CategoryId = entity.CategoryId;
        Tags = entity.Tags;
        ViewCount = entity.ViewCount;
        PublishedDate = entity.PublishedDate;
        IsDeleted = entity.IsDeleted;
        // Computed properties (read-only from entity)
        WordCount = entity.WordCount;
        IsRecentlyModified = entity.IsRecentlyModified;
        DisplayTitle = entity.DisplayTitle;
        IsPublished = entity.IsPublished;
    }

    #region Core Properties

    public string Id { get; set; }
    public string SnippetText { get; set; }
    public string FullText { get; set; }
    public TimeOnly? TimeOnly { get; set; }
    public ExampleAddressValueObject Address { get; set; }
    public DateTime? CreatedDate { get; set; }

    #endregion

    #region New Properties (Enhanced Patterns)

    /// <summary>
    /// Snippet status - demonstrates enum property
    /// </summary>
    public SnippetStatus Status { get; set; }

    /// <summary>
    /// Category foreign key - demonstrates relationship property
    /// </summary>
    public string? CategoryId { get; set; }

    /// <summary>
    /// Tags list - demonstrates List property
    /// </summary>
    public List<string> Tags { get; set; } = [];

    /// <summary>
    /// View count - demonstrates counter property
    /// </summary>
    public int ViewCount { get; set; }

    /// <summary>
    /// Published date - demonstrates nullable DateTime
    /// </summary>
    public DateTime? PublishedDate { get; set; }

    /// <summary>
    /// Soft delete flag
    /// </summary>
    public bool IsDeleted { get; set; }

    #endregion

    #region Computed Properties (Read-Only from Entity)

    /// <summary>
    /// Computed word count - populated from entity.WordCount
    /// </summary>
    public int WordCount { get; set; }

    /// <summary>
    /// Computed recently modified flag - populated from entity.IsRecentlyModified
    /// </summary>
    public bool IsRecentlyModified { get; set; }

    /// <summary>
    /// Computed display title - populated from entity.DisplayTitle
    /// </summary>
    public string? DisplayTitle { get; set; }

    /// <summary>
    /// Computed published flag - populated from entity.IsPublished
    /// </summary>
    public bool IsPublished { get; set; }

    #endregion

    #region Optional Loaded Properties (Populated via With* Methods)

    /// <summary>
    /// Related category - populated via WithCategory()
    /// </summary>
    public TextSnippetCategoryDto? SnippetCategory { get; set; }

    /// <summary>
    /// Created by user name - populated via WithCreatedByUser()
    /// </summary>
    public string? CreatedByUserName { get; set; }

    /// <summary>
    /// Comment count - populated via WithCommentCount()
    /// </summary>
    public int? CommentCount { get; set; }

    /// <summary>
    /// Related snippets count in same category - populated via WithRelatedSnippetsCount()
    /// </summary>
    public int? RelatedSnippetsCount { get; set; }

    #endregion

    #region Legacy Properties (for LazyLoadRequestContextAccessorRegistersFactory demo)

    public string Title { get; set; } = "";
    public string Category { get; set; } = "";
    public string CreatedByName { get; set; } = "";
    public string CreatedByDepartment { get; set; } = "";
    public Address Address1 { get; set; }
    public FullName FullName { get; set; }

    #endregion

    #region With* Fluent Methods (Platform Pattern)

    /// <summary>
    /// Populates category data from related TextSnippetCategory entity.
    /// Usage: new TextSnippetEntityDto(entity).WithCategory(entity.SnippetCategory)
    /// </summary>
    public TextSnippetEntityDto WithCategory(TextSnippetCategory? category)
    {
        if (category != null)
            SnippetCategory = new TextSnippetCategoryDto(category);
        return this;
    }

    /// <summary>
    /// Populates created by user name from User entity.
    /// Usage: new TextSnippetEntityDto(entity).WithCreatedByUser(userDict.GetValueOrDefault(entity.CreatedByUserId))
    /// </summary>
    public TextSnippetEntityDto WithCreatedByUser(string? userName)
    {
        CreatedByUserName = userName;
        return this;
    }

    /// <summary>
    /// Populates comment count from separate query.
    /// Usage: new TextSnippetEntityDto(entity).WithCommentCount(commentCountsDict.GetValueOrDefault(entity.Id))
    /// </summary>
    public TextSnippetEntityDto WithCommentCount(int count)
    {
        CommentCount = count;
        return this;
    }

    /// <summary>
    /// Populates related snippets count in same category.
    /// Usage: new TextSnippetEntityDto(entity).WithRelatedSnippetsCount(relatedCountsDict.GetValueOrDefault(entity.CategoryId))
    /// </summary>
    public TextSnippetEntityDto WithRelatedSnippetsCount(int count)
    {
        RelatedSnippetsCount = count;
        return this;
    }

    /// <summary>
    /// Conditional With method using WithIf pattern.
    /// Usage: dto.WithIf(includeCategory, d => d.WithCategory(category))
    /// </summary>
    public TextSnippetEntityDto WithIf(bool condition, Func<TextSnippetEntityDto, TextSnippetEntityDto> action)
    {
        return condition ? action(this) : this;
    }

    #endregion

    #region Platform Overrides

    protected override object GetSubmittedId()
    {
        return Id;
    }

    protected override TextSnippetEntity MapToEntity(TextSnippetEntity entity, MapToEntityModes mode)
    {
        entity.SnippetText = SnippetText;
        entity.FullText = FullText;

        // Demo do not update address on submit. Only when create new entity or mapping data to return to client
        if (mode != MapToEntityModes.MapToUpdateExistingEntity)
            entity.Address = Address;
        entity.TimeOnly = TimeOnly ?? default;

        // Map new properties
        entity.Tags = Tags;

        // Only update status if explicitly changed (not on create)
        if (mode == MapToEntityModes.MapToUpdateExistingEntity)
        {
            entity.Status = Status;
            // Auto-set published date when publishing
            if (Status == SnippetStatus.Published && !entity.PublishedDate.HasValue)
                entity.PublishedDate = Clock.UtcNow;
        }

        return entity;
    }

    protected override string GenerateNewId()
    {
        return Ulid.NewUlid().ToString();
    }

    #endregion

    #region Static Factory Methods (Platform Pattern)

    /// <summary>
    /// Factory method to create DTO from entity with all related data.
    /// Usage: TextSnippetEntityDto.FromEntityWithRelated(entity, category, userName, commentCount)
    /// </summary>
    public static TextSnippetEntityDto FromEntityWithRelated(
        TextSnippetEntity entity,
        TextSnippetCategory? category = null,
        string? createdByUserName = null,
        int? commentCount = null)
    {
        return new TextSnippetEntityDto(entity)
            .WithIf(category != null, dto => dto.WithCategory(category))
            .WithIf(createdByUserName.IsNotNullOrEmpty(), dto => dto.WithCreatedByUser(createdByUserName))
            .WithIf(commentCount.HasValue, dto => dto.WithCommentCount(commentCount!.Value));
    }

    /// <summary>
    /// Factory method to create DTOs from entities list with batch-loaded related data.
    /// Usage: TextSnippetEntityDto.FromEntitiesWithRelated(entities, categoriesDict, userNamesDict)
    /// </summary>
    public static List<TextSnippetEntityDto> FromEntitiesWithRelated(
        List<TextSnippetEntity> entities,
        Dictionary<string, TextSnippetCategory>? categoriesDict = null,
        Dictionary<string, string>? userNamesDict = null,
        Dictionary<string, int>? commentCountsDict = null)
    {
        return entities.SelectList(entity => new TextSnippetEntityDto(entity)
            .WithIf(
                categoriesDict != null && entity.CategoryId.IsNotNullOrEmpty(),
                dto => dto.WithCategory(categoriesDict!.GetValueOrDefault(entity.CategoryId!)))
            .WithIf(
                userNamesDict != null && entity.CreatedByUserId.IsNotNullOrEmpty(),
                dto => dto.WithCreatedByUser(userNamesDict!.GetValueOrDefault(entity.CreatedByUserId)))
            .WithIf(
                commentCountsDict != null,
                dto => dto.WithCommentCount(commentCountsDict!.GetValueOrDefault(entity.Id))));
    }

    #endregion
}
