using System.Collections.Concurrent;
using System.Reflection;

namespace Easy.Platform.Domain.Entities;

/// <summary>
/// Tracks navigation loading state to prevent circular references and control loading depth.
/// </summary>
public class PlatformNavigationLoadContext
{
    private readonly HashSet<(Type, object)> visited = [];

    /// <summary>
    /// Cache for Id property reflection lookups.
    /// </summary>
    private static readonly ConcurrentDictionary<Type, PropertyInfo?> IdPropertyCache = new();

    /// <summary>
    /// Current depth of navigation loading.
    /// </summary>
    public int CurrentDepth { get; private set; } = 0;

    /// <summary>
    /// Determines if the entity should be loaded based on depth and circular reference checks.
    /// </summary>
    /// <typeparam name="TEntity">Entity type</typeparam>
    /// <param name="entity">Entity to check</param>
    /// <param name="maxDepth">Maximum allowed depth</param>
    /// <returns>True if entity should be loaded, false if blocked by depth or circular reference</returns>
    public bool ShouldLoad<TEntity>(TEntity entity, int maxDepth) where TEntity : class
    {
        if (CurrentDepth >= maxDepth) return false;

        // Use cached reflection instead of dynamic for performance
        var idProp = IdPropertyCache.GetOrAdd(typeof(TEntity), t => t.GetProperty("Id"));
        var id = idProp?.GetValue(entity);
        if (id == null) return true;

        var key = (typeof(TEntity), id);
        if (!visited.Add(key)) return false;

        CurrentDepth++;
        return true;
    }

    /// <summary>
    /// Resets the context for reuse.
    /// </summary>
    public void Reset()
    {
        visited.Clear();
        CurrentDepth = 0;
    }
}
