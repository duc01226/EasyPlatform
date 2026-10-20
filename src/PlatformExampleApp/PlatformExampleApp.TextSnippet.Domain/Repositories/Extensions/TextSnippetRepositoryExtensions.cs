using System.Linq.Expressions;
using Easy.Platform.Domain.Exceptions.Extensions;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Domain.Repositories.Extensions;

/// <summary>
/// Repository extensions for TextSnippetEntity demonstrating platform patterns:
/// - EnsureFound for single entity retrieval with validation
/// - EnsureFoundAllBy for batch retrieval with validation
/// - Projected queries for performance optimization
/// - GetOrInit pattern for upsert operations
/// - Composite expression queries
/// </summary>
public static class TextSnippetRepositoryExtensions
{
    #region Get Single with Validation (EnsureFound Pattern)

    /// <summary>
    /// Get snippet by unique expression (category + title) with EnsureFound validation.
    /// Usage: repository.GetByUniqueExprAsync(categoryId, title, ct)
    /// </summary>
    public static async Task<TextSnippetEntity> GetByUniqueExprAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        string? categoryId,
        string snippetText,
        CancellationToken cancellationToken = default,
        params Expression<Func<TextSnippetEntity, object?>>[] loadRelatedEntities)
    {
        return await repository
            .FirstOrDefaultAsync(TextSnippetEntity.UniqueExpr(categoryId, snippetText), cancellationToken, loadRelatedEntities)
            .EnsureFound($"Snippet not found: CategoryId={categoryId}, SnippetText={snippetText}");
    }

    /// <summary>
    /// Get snippet by ID with EnsureFound validation and optional related entity loading.
    /// Usage: repository.GetByIdValidatedAsync(id, ct, e => e.SnippetCategory)
    /// </summary>
    public static async Task<TextSnippetEntity> GetByIdValidatedAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        string id,
        CancellationToken cancellationToken = default,
        params Expression<Func<TextSnippetEntity, object?>>[] loadRelatedEntities)
    {
        return await repository
            .GetByIdAsync(id, cancellationToken, loadRelatedEntities)
            .EnsureFound($"Snippet not found: Id={id}");
    }

    #endregion

    #region Get Multiple with Validation (EnsureFoundAllBy Pattern)

    /// <summary>
    /// Get snippets by IDs with validation that all IDs are found.
    /// Usage: repository.GetByIdsValidatedAsync(ids, ct)
    /// </summary>
    public static async Task<List<TextSnippetEntity>> GetByIdsValidatedAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        List<string> ids,
        CancellationToken cancellationToken = default)
    {
        if (ids.IsNullOrEmpty()) return [];

        return await repository
            .GetByIdsAsync(ids, cancellationToken)
            .EnsureFoundAllBy(e => e.Id, ids, notFoundIds => $"Snippets not found: {string.Join(", ", notFoundIds)}");
    }

    /// <summary>
    /// Get snippets by category with optional status filter.
    /// Usage: repository.GetByCategoryAsync(categoryId, statuses, ct)
    /// </summary>
    public static async Task<List<TextSnippetEntity>> GetByCategoryAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        string categoryId,
        List<SnippetStatus>? statuses = null,
        CancellationToken cancellationToken = default)
    {
        var expr = TextSnippetEntity.OfCategoryExpr(categoryId)
            .AndAlsoIf(statuses?.Count > 0, () => TextSnippetEntity.FilterByStatusExpr(statuses!));

        return await repository.GetAllAsync(expr, cancellationToken);
    }

    #endregion

    #region Projected Queries (Performance Pattern)

    /// <summary>
    /// Get only snippet IDs by category - demonstrates projection for performance.
    /// Usage: repository.GetIdsByCategoryAsync(categoryId, ct)
    /// </summary>
    public static async Task<List<string>> GetIdsByCategoryAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        string categoryId,
        CancellationToken cancellationToken = default)
    {
        return await repository.GetAllAsync(
            query => query
                .Where(TextSnippetEntity.OfCategoryExpr(categoryId))
                .Select(e => e.Id),
            cancellationToken);
    }

    /// <summary>
    /// Get snippet ID by unique expression - single field projection.
    /// Usage: repository.GetIdByUniqueExprAsync(categoryId, title, ct)
    /// </summary>
    public static async Task<string?> GetIdByUniqueExprAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        string? categoryId,
        string snippetText,
        CancellationToken cancellationToken = default)
    {
        return await repository.FirstOrDefaultAsync(
            query => query
                .Where(TextSnippetEntity.UniqueExpr(categoryId, snippetText))
                .Select(e => e.Id),
            cancellationToken);
    }

    /// <summary>
    /// Get snippet counts grouped by category - demonstrates aggregation projection.
    /// Usage: repository.GetCountsByCategoryAsync(categoryIds, ct)
    /// </summary>
    public static async Task<Dictionary<string, int>> GetCountsByCategoryAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        List<string> categoryIds,
        CancellationToken cancellationToken = default)
    {
        if (categoryIds.IsNullOrEmpty()) return [];

        var counts = await repository.GetAllAsync(
            query => query
                .Where(e => e.CategoryId != null && categoryIds.Contains(e.CategoryId))
                .GroupBy(e => e.CategoryId!)
                .Select(g => new { CategoryId = g.Key, Count = g.Count() }),
            cancellationToken);

        return counts.ToDictionary(x => x.CategoryId, x => x.Count);
    }

    /// <summary>
    /// Get snippet counts grouped by status - demonstrates status aggregation.
    /// Usage: repository.GetCountsByStatusAsync(categoryId, ct)
    /// </summary>
    public static async Task<Dictionary<SnippetStatus, int>> GetCountsByStatusAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        string? categoryId = null,
        CancellationToken cancellationToken = default)
    {
        var counts = await repository.GetAllAsync(
            query => query
                .WhereIf(categoryId.IsNotNullOrEmpty(), e => e.CategoryId == categoryId)
                .GroupBy(e => e.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() }),
            cancellationToken);

        return counts.ToDictionary(x => x.Status, x => x.Count);
    }

    #endregion

    #region GetOrInit Pattern (Upsert)

    /// <summary>
    /// Get existing snippet or initialize new one if not found.
    /// Usage: repository.GetOrInitAsync(categoryId, title, () => new TextSnippetEntity { ... }, ct)
    /// </summary>
    public static async Task<TextSnippetEntity> GetOrInitAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        string? categoryId,
        string snippetText,
        Func<TextSnippetEntity> initFactory,
        CancellationToken cancellationToken = default)
    {
        var existing = await repository.FirstOrDefaultAsync(
            TextSnippetEntity.UniqueExpr(categoryId, snippetText),
            cancellationToken);

        if (existing != null)
            return existing;

        var newEntity = initFactory();

        return await repository.CreateAsync(newEntity, cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Get existing snippet or initialize with async factory.
    /// Usage: repository.GetOrInitAsync(categoryId, title, async () => await CreateAsync(...), ct)
    /// </summary>
    public static async Task<TextSnippetEntity> GetOrInitAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        string? categoryId,
        string snippetText,
        Func<Task<TextSnippetEntity>> initFactoryAsync,
        CancellationToken cancellationToken = default)
    {
        var existing = await repository.FirstOrDefaultAsync(
            TextSnippetEntity.UniqueExpr(categoryId, snippetText),
            cancellationToken);

        if (existing != null)
            return existing;

        var newEntity = await initFactoryAsync();

        return await repository.CreateAsync(newEntity, cancellationToken: cancellationToken);
    }

    #endregion

    #region Active/Published Queries

    /// <summary>
    /// Get active (published and not deleted) snippets in a category.
    /// Usage: repository.GetActiveSnippetsAsync(categoryId, ct)
    /// </summary>
    public static async Task<List<TextSnippetEntity>> GetActiveSnippetsAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        string categoryId,
        CancellationToken cancellationToken = default)
    {
        return await repository.GetAllAsync(
            TextSnippetEntity.SearchableSnippetsExpr(categoryId),
            cancellationToken);
    }

    /// <summary>
    /// Get recently modified snippets (within last N days).
    /// Usage: repository.GetRecentlyModifiedAsync(days: 7, ct)
    /// </summary>
    public static async Task<List<TextSnippetEntity>> GetRecentlyModifiedAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        int days = 7,
        CancellationToken cancellationToken = default)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);

        return await repository.GetAllAsync(
            e => e.LastUpdatedDate.HasValue && e.LastUpdatedDate.Value >= cutoffDate,
            cancellationToken);
    }

    #endregion

    #region Existence Checks

    /// <summary>
    /// Check if snippet exists by unique expression.
    /// Usage: repository.ExistsByUniqueExprAsync(categoryId, title, excludeId, ct)
    /// </summary>
    public static async Task<bool> ExistsByUniqueExprAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        string? categoryId,
        string snippetText,
        string? excludeId = null,
        CancellationToken cancellationToken = default)
    {
        var expr = TextSnippetEntity.UniqueExpr(categoryId, snippetText)
            .AndAlsoIf(excludeId.IsNotNullOrEmpty(), () => e => e.Id != excludeId);

        return await repository.AnyAsync(expr, cancellationToken);
    }

    #endregion
}
