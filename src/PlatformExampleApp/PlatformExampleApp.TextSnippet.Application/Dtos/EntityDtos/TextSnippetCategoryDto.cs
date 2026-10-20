using Easy.Platform.Application.Dtos;
using Easy.Platform.Common.Extensions;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;

/// <summary>
/// DTO for TextSnippetCategory demonstrating platform patterns:
/// - PlatformEntityDto base class
/// - With* fluent methods for optional data loading
/// - MapToEntity with mode awareness
/// - GetSubmittedId for create vs update detection
/// - Static factory methods for batch operations
/// </summary>
public sealed class TextSnippetCategoryDto : PlatformEntityDto<TextSnippetCategory, string>
{
    public TextSnippetCategoryDto() { }

    /// <summary>
    /// Constructor mapping from entity - maps core properties only.
    /// Use With* methods to populate optional/related data.
    /// </summary>
    public TextSnippetCategoryDto(TextSnippetCategory entity)
    {
        Id = entity.Id;
        Name = entity.Name;
        Description = entity.Description;
        ParentCategoryId = entity.ParentCategoryId;
        SortOrder = entity.SortOrder;
        IsActive = entity.IsActive;
        IconName = entity.IconName;
        ColorCode = entity.ColorCode;
        CreatedDate = entity.CreatedDate;
        // Computed properties (read-only from entity)
        IsRootCategory = entity.IsRootCategory;
        DisplayName = entity.DisplayName;
    }

    #region Core Properties

    public string Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? ParentCategoryId { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public string? IconName { get; set; }
    public string? ColorCode { get; set; }
    public DateTime? CreatedDate { get; set; }

    #endregion

    #region Computed Properties (Read-Only from Entity)

    /// <summary>
    /// Computed flag for root category - populated from entity.IsRootCategory
    /// </summary>
    public bool IsRootCategory { get; set; }

    /// <summary>
    /// Computed display name - populated from entity.DisplayName
    /// </summary>
    public string? DisplayName { get; set; }

    #endregion

    #region Optional Loaded Properties (Populated via With* Methods)

    /// <summary>
    /// Parent category - populated via WithParentCategory()
    /// </summary>
    public TextSnippetCategoryDto? ParentCategory { get; set; }

    /// <summary>
    /// Child categories - populated via WithChildCategories()
    /// </summary>
    public List<TextSnippetCategoryDto>? ChildCategories { get; set; }

    /// <summary>
    /// Snippets in this category - populated via WithSnippets()
    /// </summary>
    public List<TextSnippetEntityDto>? Snippets { get; set; }

    /// <summary>
    /// Snippet count - populated via WithSnippetCount()
    /// </summary>
    public int? SnippetCount { get; set; }

    /// <summary>
    /// Child category count - populated via WithChildCategoryCount()
    /// </summary>
    public int? ChildCategoryCount { get; set; }

    /// <summary>
    /// Full hierarchy path (e.g., "Root > Parent > This") - populated via WithHierarchyPath()
    /// </summary>
    public string? HierarchyPath { get; set; }

    #endregion

    #region With* Fluent Methods (Platform Pattern)

    /// <summary>
    /// Populates parent category data from related TextSnippetCategory entity.
    /// Usage: new TextSnippetCategoryDto(entity).WithParentCategory(entity.ParentCategory)
    /// </summary>
    public TextSnippetCategoryDto WithParentCategory(TextSnippetCategory? parentCategory)
    {
        if (parentCategory != null)
            ParentCategory = new TextSnippetCategoryDto(parentCategory);
        return this;
    }

    /// <summary>
    /// Populates child categories from related entities.
    /// Usage: new TextSnippetCategoryDto(entity).WithChildCategories(childCategories)
    /// </summary>
    public TextSnippetCategoryDto WithChildCategories(List<TextSnippetCategory>? childCategories)
    {
        if (childCategories != null)
            ChildCategories = childCategories.SelectList(c => new TextSnippetCategoryDto(c));
        return this;
    }

    /// <summary>
    /// Populates snippets belonging to this category.
    /// Usage: new TextSnippetCategoryDto(entity).WithSnippets(entity.Snippets)
    /// </summary>
    public TextSnippetCategoryDto WithSnippets(List<TextSnippetEntity>? snippets)
    {
        if (snippets != null)
            Snippets = snippets.SelectList(s => new TextSnippetEntityDto(s));
        return this;
    }

    /// <summary>
    /// Populates snippet count from separate query.
    /// Usage: new TextSnippetCategoryDto(entity).WithSnippetCount(snippetCountsDict.GetValueOrDefault(entity.Id))
    /// </summary>
    public TextSnippetCategoryDto WithSnippetCount(int count)
    {
        SnippetCount = count;
        return this;
    }

    /// <summary>
    /// Populates child category count from separate query.
    /// Usage: new TextSnippetCategoryDto(entity).WithChildCategoryCount(childCountsDict.GetValueOrDefault(entity.Id))
    /// </summary>
    public TextSnippetCategoryDto WithChildCategoryCount(int count)
    {
        ChildCategoryCount = count;
        return this;
    }

    /// <summary>
    /// Populates the full hierarchy path string.
    /// Usage: new TextSnippetCategoryDto(entity).WithHierarchyPath("Root > Parent > This")
    /// </summary>
    public TextSnippetCategoryDto WithHierarchyPath(string path)
    {
        HierarchyPath = path;
        return this;
    }

    /// <summary>
    /// Conditional With method using WithIf pattern.
    /// Usage: dto.WithIf(includeSnippets, d => d.WithSnippets(snippets))
    /// </summary>
    public TextSnippetCategoryDto WithIf(bool condition, Func<TextSnippetCategoryDto, TextSnippetCategoryDto> action)
    {
        return condition ? action(this) : this;
    }

    #endregion

    #region Platform Overrides

    protected override object GetSubmittedId()
    {
        return Id;
    }

    protected override TextSnippetCategory MapToEntity(TextSnippetCategory entity, MapToEntityModes mode)
    {
        entity.Name = Name;
        entity.Description = Description;
        entity.SortOrder = SortOrder;
        entity.IconName = IconName;
        entity.ColorCode = ColorCode;

        // Only update parent on create or explicit update (not general updates)
        if (mode != MapToEntityModes.MapToUpdateExistingEntity)
            entity.ParentCategoryId = ParentCategoryId;

        // Only update IsActive on explicit update (not create - default is true)
        if (mode == MapToEntityModes.MapToUpdateExistingEntity)
            entity.IsActive = IsActive;

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
    /// Usage: TextSnippetCategoryDto.FromEntityWithRelated(entity, parentCategory, snippetCount)
    /// </summary>
    public static TextSnippetCategoryDto FromEntityWithRelated(
        TextSnippetCategory entity,
        TextSnippetCategory? parentCategory = null,
        int? snippetCount = null,
        int? childCategoryCount = null,
        string? hierarchyPath = null)
    {
        return new TextSnippetCategoryDto(entity)
            .WithIf(parentCategory != null, dto => dto.WithParentCategory(parentCategory))
            .WithIf(snippetCount.HasValue, dto => dto.WithSnippetCount(snippetCount!.Value))
            .WithIf(childCategoryCount.HasValue, dto => dto.WithChildCategoryCount(childCategoryCount!.Value))
            .WithIf(hierarchyPath.IsNotNullOrEmpty(), dto => dto.WithHierarchyPath(hierarchyPath!));
    }

    /// <summary>
    /// Factory method to create DTOs from entities list with batch-loaded related data.
    /// Usage: TextSnippetCategoryDto.FromEntitiesWithRelated(entities, parentsDict, snippetCountsDict)
    /// </summary>
    public static List<TextSnippetCategoryDto> FromEntitiesWithRelated(
        List<TextSnippetCategory> entities,
        Dictionary<string, TextSnippetCategory>? parentsDict = null,
        Dictionary<string, int>? snippetCountsDict = null,
        Dictionary<string, int>? childCountsDict = null)
    {
        return entities.SelectList(entity => new TextSnippetCategoryDto(entity)
            .WithIf(
                parentsDict != null && entity.ParentCategoryId.IsNotNullOrEmpty(),
                dto => dto.WithParentCategory(parentsDict!.GetValueOrDefault(entity.ParentCategoryId!)))
            .WithIf(
                snippetCountsDict != null,
                dto => dto.WithSnippetCount(snippetCountsDict!.GetValueOrDefault(entity.Id)))
            .WithIf(
                childCountsDict != null,
                dto => dto.WithChildCategoryCount(childCountsDict!.GetValueOrDefault(entity.Id))));
    }

    /// <summary>
    /// Factory method to create hierarchical tree structure from flat list.
    /// Usage: TextSnippetCategoryDto.BuildHierarchy(flatCategories)
    /// </summary>
    public static List<TextSnippetCategoryDto> BuildHierarchy(List<TextSnippetCategory> flatCategories)
    {
        var dtoDict = flatCategories.ToDictionary(c => c.Id, c => new TextSnippetCategoryDto(c));

        foreach (var dto in dtoDict.Values.Where(d => d.ParentCategoryId.IsNotNullOrEmpty()))
        {
            if (dtoDict.TryGetValue(dto.ParentCategoryId!, out var parent))
            {
                parent.ChildCategories ??= [];
                parent.ChildCategories.Add(dto);
                dto.ParentCategory = parent;
            }
        }

        // Return only root categories (children are nested within)
        return dtoDict.Values.Where(d => d.ParentCategoryId.IsNullOrEmpty()).ToList();
    }

    #endregion
}
