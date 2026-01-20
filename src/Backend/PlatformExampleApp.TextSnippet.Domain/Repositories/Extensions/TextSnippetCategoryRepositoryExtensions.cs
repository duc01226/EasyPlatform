using System.Linq.Expressions;
using Easy.Platform.Domain.Exceptions.Extensions;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Domain.Repositories.Extensions;

/// <summary>
/// Repository extensions for TextSnippetCategory demonstrating platform patterns:
/// - Hierarchical data queries (parent-child relationships)
/// - EnsureFound for single entity retrieval with validation
/// - Batch loading with eager loading
/// - Tree structure queries
/// </summary>
public static class TextSnippetCategoryRepositoryExtensions
{
    #region Get Single with Validation (EnsureFound Pattern)

    /// <summary>
    /// Get category by ID with EnsureFound validation.
    /// Usage: repository.GetByIdValidatedAsync(id, ct, c => c.Snippets)
    /// </summary>
    public static async Task<TextSnippetCategory> GetByIdValidatedAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        string id,
        CancellationToken cancellationToken = default,
        params Expression<Func<TextSnippetCategory, object?>>[] loadRelatedEntities)
    {
        return await repository
            .GetByIdAsync(id, cancellationToken, loadRelatedEntities)
            .EnsureFound($"Category not found: Id={id}");
    }

    /// <summary>
    /// Get category by unique expression (parent + name) with EnsureFound validation.
    /// Usage: repository.GetByUniqueExprAsync(parentId, name, ct)
    /// </summary>
    public static async Task<TextSnippetCategory> GetByUniqueExprAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        string? parentCategoryId,
        string name,
        CancellationToken cancellationToken = default,
        params Expression<Func<TextSnippetCategory, object?>>[] loadRelatedEntities)
    {
        return await repository
            .FirstOrDefaultAsync(TextSnippetCategory.UniqueExpr(parentCategoryId, name), cancellationToken, loadRelatedEntities)
            .EnsureFound($"Category not found: ParentId={parentCategoryId}, Name={name}");
    }

    #endregion

    #region Hierarchical Queries (Tree Structure Pattern)

    /// <summary>
    /// Get all root categories (no parent).
    /// Usage: repository.GetRootCategoriesAsync(ct)
    /// </summary>
    public static async Task<List<TextSnippetCategory>> GetRootCategoriesAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var expr = TextSnippetCategory.RootCategoriesExpr()
            .AndAlsoIf(!includeInactive, () => TextSnippetCategory.ActiveExpr());

        return await repository.GetAllAsync(expr, cancellationToken);
    }

    /// <summary>
    /// Get children of a specific parent category.
    /// Usage: repository.GetChildCategoriesAsync(parentId, ct)
    /// </summary>
    public static async Task<List<TextSnippetCategory>> GetChildCategoriesAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        string parentCategoryId,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var expr = TextSnippetCategory.ChildrenOfExpr(parentCategoryId)
            .AndAlsoIf(!includeInactive, () => TextSnippetCategory.ActiveExpr());

        return await repository.GetAllAsync(expr, cancellationToken);
    }

    /// <summary>
    /// Get full category tree (all categories with hierarchy info).
    /// Usage: repository.GetCategoryTreeAsync(ct)
    /// </summary>
    public static async Task<List<TextSnippetCategory>> GetCategoryTreeAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        var expr = ((Expression<Func<TextSnippetCategory, bool>>)(c => true))
            .AndAlsoIf(!includeInactive, () => TextSnippetCategory.ActiveExpr());

        return await repository.GetAllAsync(
            query => query
                .Where(expr)
                .OrderBy(c => c.ParentCategoryId)
                .ThenBy(c => c.SortOrder)
                .ThenBy(c => c.Name),
            cancellationToken,
            c => c.ParentCategory);
    }

    /// <summary>
    /// Get category with its parent chain (for breadcrumb).
    /// Usage: repository.GetWithParentChainAsync(id, ct)
    /// </summary>
    public static async Task<List<TextSnippetCategory>> GetParentChainAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        string categoryId,
        CancellationToken cancellationToken = default)
    {
        var result = new List<TextSnippetCategory>();
        var currentId = categoryId;

        while (currentId.IsNotNullOrEmpty())
        {
            var category = await repository.GetByIdAsync(currentId!, cancellationToken);
            if (category == null) break;

            result.Insert(0, category); // Insert at beginning to get root-first order
            currentId = category.ParentCategoryId;
        }

        return result;
    }

    #endregion

    #region Batch Operations with Validation

    /// <summary>
    /// Get categories by IDs with validation that all IDs are found.
    /// Usage: repository.GetByIdsValidatedAsync(ids, ct)
    /// </summary>
    public static async Task<List<TextSnippetCategory>> GetByIdsValidatedAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        List<string> ids,
        CancellationToken cancellationToken = default)
    {
        if (ids.IsNullOrEmpty()) return [];

        return await repository
            .GetByIdsAsync(ids, cancellationToken)
            .EnsureFoundAllBy(c => c.Id, ids, notFoundIds => $"Categories not found: {string.Join(", ", notFoundIds)}");
    }

    #endregion

    #region Projected Queries (Performance Pattern)

    /// <summary>
    /// Get child category count for each parent - demonstrates aggregation projection.
    /// Usage: repository.GetChildCountsAsync(parentIds, ct)
    /// </summary>
    public static async Task<Dictionary<string, int>> GetChildCountsAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        List<string> parentCategoryIds,
        CancellationToken cancellationToken = default)
    {
        if (parentCategoryIds.IsNullOrEmpty()) return [];

        var counts = await repository.GetAllAsync(
            query => query
                .Where(c => c.ParentCategoryId != null && parentCategoryIds.Contains(c.ParentCategoryId))
                .GroupBy(c => c.ParentCategoryId!)
                .Select(g => new { ParentId = g.Key, Count = g.Count() }),
            cancellationToken);

        return counts.ToDictionary(x => x.ParentId, x => x.Count);
    }

    /// <summary>
    /// Get category names by IDs - demonstrates simple projection.
    /// Usage: repository.GetNamesByIdsAsync(ids, ct)
    /// </summary>
    public static async Task<Dictionary<string, string>> GetNamesByIdsAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        List<string> ids,
        CancellationToken cancellationToken = default)
    {
        if (ids.IsNullOrEmpty()) return [];

        var results = await repository.GetAllAsync(
            query => query
                .Where(c => ids.Contains(c.Id))
                .Select(c => new { c.Id, c.Name }),
            cancellationToken);

        return results.ToDictionary(x => x.Id, x => x.Name);
    }

    /// <summary>
    /// Build hierarchy path string for a category.
    /// Usage: repository.BuildHierarchyPathAsync(categoryId, ct) => "Root > Parent > Child"
    /// </summary>
    public static async Task<string> BuildHierarchyPathAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        string categoryId,
        string separator = " > ",
        CancellationToken cancellationToken = default)
    {
        var chain = await repository.GetParentChainAsync(categoryId, cancellationToken);
        return string.Join(separator, chain.Select(c => c.Name));
    }

    #endregion

    #region GetOrInit Pattern (Upsert)

    /// <summary>
    /// Get existing category or initialize new one if not found.
    /// Usage: repository.GetOrInitAsync(parentId, name, () => new TextSnippetCategory { ... }, ct)
    /// </summary>
    public static async Task<TextSnippetCategory> GetOrInitAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        string? parentCategoryId,
        string name,
        Func<TextSnippetCategory> initFactory,
        CancellationToken cancellationToken = default)
    {
        var existing = await repository.FirstOrDefaultAsync(
            TextSnippetCategory.UniqueExpr(parentCategoryId, name),
            cancellationToken);

        if (existing != null)
            return existing;

        var newEntity = initFactory();

        return await repository.CreateAsync(newEntity, cancellationToken: cancellationToken);
    }

    #endregion

    #region Existence and Validation Checks

    /// <summary>
    /// Check if category name exists under parent (for uniqueness validation).
    /// Usage: repository.ExistsByNameAsync(parentId, name, excludeId, ct)
    /// </summary>
    public static async Task<bool> ExistsByNameAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        string? parentCategoryId,
        string name,
        string? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var expr = TextSnippetCategory.UniqueExpr(parentCategoryId, name)
            .AndAlsoIf(excludeId.IsNotNullOrEmpty(), () => c => c.Id != excludeId);

        return await repository.AnyAsync(expr, cancellationToken);
    }

    /// <summary>
    /// Check if category has any children (for delete validation).
    /// Usage: repository.HasChildrenAsync(categoryId, ct)
    /// </summary>
    public static async Task<bool> HasChildrenAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        string categoryId,
        CancellationToken cancellationToken = default)
    {
        return await repository.AnyAsync(
            TextSnippetCategory.ChildrenOfExpr(categoryId),
            cancellationToken);
    }

    /// <summary>
    /// Check if category would create circular reference when moved to new parent.
    /// Usage: repository.WouldCreateCircularReferenceAsync(categoryId, newParentId, ct)
    /// </summary>
    public static async Task<bool> WouldCreateCircularReferenceAsync(
        this ITextSnippetRootRepository<TextSnippetCategory> repository,
        string categoryId,
        string newParentId,
        CancellationToken cancellationToken = default)
    {
        if (categoryId == newParentId) return true;

        // Check if newParentId is a descendant of categoryId
        var currentId = newParentId;

        while (currentId.IsNotNullOrEmpty())
        {
            if (currentId == categoryId) return true;

            var parent = await repository.GetByIdAsync(currentId!, cancellationToken);
            if (parent == null) break;

            currentId = parent.ParentCategoryId;
        }

        return false;
    }

    #endregion
}
