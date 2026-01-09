#region

using System.Linq.Expressions;
using System.Text.Json.Serialization;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Validations.Validators;
using Easy.Platform.Domain.Entities;
using FluentValidation;

#endregion

namespace PlatformExampleApp.TextSnippet.Domain.Entities;

/// <summary>
/// Category entity for organizing TextSnippetEntity items.
/// Demonstrates platform patterns:
/// - RootAuditedEntity base class with audit trails
/// - TrackFieldUpdatedDomainEvent for property change tracking
/// - Static expressions for query patterns
/// - Hierarchical parent-child relationship
/// - Instance validation methods
/// </summary>
[TrackFieldUpdatedDomainEvent]
public class TextSnippetCategory : RootAuditedEntity<TextSnippetCategory, string, string>, IRowVersionEntity
{
    public const int NameMaxLength = 200;
    public const int DescriptionMaxLength = 1000;

    #region Core Properties

    /// <summary>
    /// Category name - tracked for field update events
    /// </summary>
    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";

    /// <summary>
    /// Category description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Parent category ID for hierarchical structure (null = root category)
    /// </summary>
    public string? ParentCategoryId { get; set; }

    /// <summary>
    /// Display order within parent category
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Active flag for soft-enable/disable
    /// </summary>
    [TrackFieldUpdatedDomainEvent]
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Icon identifier for UI display
    /// </summary>
    public string? IconName { get; set; }

    /// <summary>
    /// Color code for UI display (hex format)
    /// </summary>
    public string? ColorCode { get; set; }

    #endregion

    #region Navigation Properties

    /// <summary>
    /// Parent category - demonstrates PlatformNavigationProperty for auto-loading.
    /// [PlatformNavigationProperty] auto-ignores in BSON. Add [JsonIgnore] manually for API responses.
    /// Usage: await category.LoadNavigationAsync(c => c.ParentCategory, ct);
    /// </summary>
    [JsonIgnore]
    [PlatformNavigationProperty(nameof(ParentCategoryId))]
    public TextSnippetCategory? ParentCategory { get; set; }

    /// <summary>
    /// Child categories in hierarchy.
    /// Demonstrates reverse navigation: child's ParentCategoryId points to this parent's Id.
    /// Usage: await repo.GetByIdAsync(id, ct, loadRelatedEntities: c => c.ChildCategories)
    /// With filter: await repo.GetByIdAsync(id, ct, loadRelatedEntities: c => c.ChildCategories.Where(x => x.IsActive))
    /// </summary>
    [JsonIgnore]
    [PlatformNavigationProperty(ReverseForeignKeyProperty = nameof(ParentCategoryId))]
    public List<TextSnippetCategory>? ChildCategories { get; set; }

    /// <summary>
    /// Snippets belonging to this category
    /// </summary>
    [JsonIgnore]
    public List<TextSnippetEntity>? Snippets { get; set; }

    #endregion

    #region Computed Properties (Platform Pattern: ComputedEntityProperty)

    /// <summary>
    /// Computed flag indicating if this is a root category.
    /// MUST have empty setter for EF Core compatibility.
    /// </summary>
    [ComputedEntityProperty]
    public bool IsRootCategory
    {
        get => ParentCategoryId.IsNullOrEmpty();
        set { } // Required empty setter for EF Core
    }

    /// <summary>
    /// Computed display name with hierarchy indicator.
    /// MUST have empty setter for EF Core compatibility.
    /// </summary>
    [ComputedEntityProperty]
    public string DisplayName
    {
        get => IsActive ? Name : $"{Name} (Inactive)";
        set { } // Required empty setter for EF Core
    }

    #endregion

    #region IRowVersionEntity

    public string? ConcurrencyUpdateToken { get; set; }

    #endregion

    #region Static Expressions (Platform Pattern: Entity Static Expressions)

    /// <summary>
    /// Unique expression for finding category by name within parent.
    /// Usage: repository.FirstOrDefaultAsync(TextSnippetCategory.UniqueExpr(parentId, name))
    /// </summary>
    public static Expression<Func<TextSnippetCategory, bool>> UniqueExpr(string? parentCategoryId, string name)
        => c => c.ParentCategoryId == parentCategoryId && c.Name == name;

    /// <summary>
    /// Filter for root categories (no parent).
    /// Usage: repository.GetAllAsync(TextSnippetCategory.RootCategoriesExpr())
    /// </summary>
    public static Expression<Func<TextSnippetCategory, bool>> RootCategoriesExpr()
        => c => c.ParentCategoryId == null;

    /// <summary>
    /// Filter for children of a specific parent.
    /// Usage: repository.GetAllAsync(TextSnippetCategory.ChildrenOfExpr(parentId))
    /// </summary>
    public static Expression<Func<TextSnippetCategory, bool>> ChildrenOfExpr(string parentId)
        => c => c.ParentCategoryId == parentId;

    /// <summary>
    /// Filter for active categories.
    /// Usage: repository.GetAllAsync(TextSnippetCategory.ActiveExpr())
    /// </summary>
    public static Expression<Func<TextSnippetCategory, bool>> ActiveExpr()
        => c => c.IsActive;

    /// <summary>
    /// Filter for inactive categories.
    /// Usage: repository.GetAllAsync(TextSnippetCategory.InactiveExpr())
    /// </summary>
    public static Expression<Func<TextSnippetCategory, bool>> InactiveExpr()
        => c => !c.IsActive;

    /// <summary>
    /// Composite expression: root AND active categories.
    /// Usage: repository.GetAllAsync(TextSnippetCategory.ActiveRootCategoriesExpr())
    /// </summary>
    public static Expression<Func<TextSnippetCategory, bool>> ActiveRootCategoriesExpr()
        => RootCategoriesExpr().AndAlso(ActiveExpr());

    /// <summary>
    /// Composite expression: children of parent AND active.
    /// Usage: repository.GetAllAsync(TextSnippetCategory.ActiveChildrenOfExpr(parentId))
    /// </summary>
    public static Expression<Func<TextSnippetCategory, bool>> ActiveChildrenOfExpr(string parentId)
        => ChildrenOfExpr(parentId).AndAlso(ActiveExpr());

    /// <summary>
    /// Filter expression with conditional parameters.
    /// Usage: repository.GetAllAsync(TextSnippetCategory.FilterExpr(parentId, includeInactive))
    /// </summary>
    public static Expression<Func<TextSnippetCategory, bool>> FilterExpr(
        string? parentCategoryId = null,
        bool includeInactive = false)
    {
        return ((Expression<Func<TextSnippetCategory, bool>>)(c => true))
            .AndAlsoIf(parentCategoryId != null, () => ChildrenOfExpr(parentCategoryId!))
            .AndAlsoIf(parentCategoryId == null, () => RootCategoriesExpr())
            .AndAlsoIf(!includeInactive, () => ActiveExpr());
    }

    /// <summary>
    /// Full-text search columns for IPlatformFullTextSearchPersistenceService.
    /// Usage: fullTextSearchService.Search(query, searchText, TextSnippetCategory.DefaultFullTextSearchColumns())
    /// </summary>
    public static Expression<Func<TextSnippetCategory, object?>>[] DefaultFullTextSearchColumns()
        => [c => c.Name, c => c.Description];

    /// <summary>
    /// Default ordering expression.
    /// Usage: query.OrderBy(TextSnippetCategory.DefaultOrderExpr())
    /// </summary>
    public static Expression<Func<TextSnippetCategory, object>> DefaultOrderExpr()
        => c => c.SortOrder;

    #endregion

    #region Instance Validation Methods (Platform Pattern)

    /// <summary>
    /// Validates if the category can be deleted.
    /// Usage: category.ValidateCanBeDeleted(snippetCount, childCount).EnsureValid()
    /// </summary>
    public PlatformValidationResult<TextSnippetCategory> ValidateCanBeDeleted(int snippetCount, int childCategoryCount)
    {
        return this.Validate(_ => snippetCount == 0, $"Cannot delete category '{Name}' with {snippetCount} existing snippet(s). Move or delete snippets first.")
            .And(_ => childCategoryCount == 0, $"Cannot delete category '{Name}' with {childCategoryCount} child category(ies). Delete child categories first.");
    }

    /// <summary>
    /// Validates if the category can be deactivated.
    /// Usage: category.ValidateCanBeDeactivated(activeSnippetCount).EnsureValid()
    /// </summary>
    public PlatformValidationResult<TextSnippetCategory> ValidateCanBeDeactivated(int activeSnippetCount)
    {
        return this.Validate(_ => IsActive, "Category is already inactive")
            .And(_ => activeSnippetCount == 0, $"Cannot deactivate category '{Name}' with {activeSnippetCount} active snippet(s). Archive snippets first.");
    }

    /// <summary>
    /// Validates if the category can be moved to a new parent.
    /// Usage: category.ValidateCanBeMovedTo(newParentId).EnsureValid()
    /// </summary>
    public PlatformValidationResult<TextSnippetCategory> ValidateCanBeMovedTo(string? newParentId)
    {
        return this.Validate(_ => newParentId != Id, "Cannot move category to itself")
            .And(_ => ParentCategoryId != newParentId, $"Category is already under the specified parent");
    }

    #endregion

    #region Basic Property Validators

    public static PlatformSingleValidator<TextSnippetCategory, string> NameValidator()
    {
        return new PlatformSingleValidator<TextSnippetCategory, string>(
            c => c.Name,
            p => p.NotNull().NotEmpty().MaximumLength(NameMaxLength));
    }

    public static PlatformSingleValidator<TextSnippetCategory, string?> DescriptionValidator()
    {
        return new PlatformSingleValidator<TextSnippetCategory, string?>(
            c => c.Description,
            p => p.MaximumLength(DescriptionMaxLength));
    }

    public override PlatformValidator<TextSnippetCategory> GetValidator()
    {
        return PlatformValidator<TextSnippetCategory>.Create(NameValidator(), DescriptionValidator());
    }

    #endregion

    #region Unique Composite Id

    public override string UniqueCompositeId()
    {
        return Id;
    }

    public override PlatformCheckUniqueValidator<TextSnippetCategory> CheckUniqueValidator()
    {
        return new PlatformCheckUniqueValidator<TextSnippetCategory>(
            targetItem: this,
            findOtherDuplicatedItemExpr: other => other.Id != Id && other.ParentCategoryId == ParentCategoryId && other.Name == Name,
            "Category name must be unique within the same parent category");
    }

    #endregion

    #region Factory Methods

    /// <summary>
    /// Factory method to create a new root category.
    /// Usage: TextSnippetCategory.CreateRoot("Category Name", "Description")
    /// </summary>
    public static TextSnippetCategory CreateRoot(string name, string? description = null)
    {
        return new TextSnippetCategory
        {
            Id = Ulid.NewUlid().ToString(),
            Name = name,
            Description = description,
            ParentCategoryId = null,
            IsActive = true
        };
    }

    /// <summary>
    /// Factory method to create a new child category.
    /// Usage: TextSnippetCategory.CreateChild(parentId, "Category Name", "Description")
    /// </summary>
    public static TextSnippetCategory CreateChild(string parentCategoryId, string name, string? description = null)
    {
        return new TextSnippetCategory
        {
            Id = Ulid.NewUlid().ToString(),
            Name = name,
            Description = description,
            ParentCategoryId = parentCategoryId,
            IsActive = true
        };
    }

    #endregion
}
