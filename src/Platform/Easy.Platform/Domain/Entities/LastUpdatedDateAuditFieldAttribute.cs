using System.Collections.Concurrent;
using System.Reflection;

namespace Easy.Platform.Domain.Entities;

/// <summary>
/// Marks a property as the last updated date audit field.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public class LastUpdatedDateAuditFieldAttribute : Attribute
{
    /// <summary>
    /// A cached dictionary of audit field properties by type.
    /// </summary>
    public static readonly ConcurrentDictionary<Type, PropertyInfo?> CachedAuditFieldByTypeDict = new();

    /// <summary>
    /// Gets the last updated date audit field for a given object type.
    /// </summary>
    /// <param name="objectType">The type of the object.</param>
    /// <returns>The <see cref="PropertyInfo"/> of the audit field, or null if not found.</returns>
    public static PropertyInfo? GetUpdatedDateAuditField(Type objectType)
    {
        return CachedAuditFieldByTypeDict.GetOrAdd(
            objectType,
            type =>
                type.GetProperties(BindingFlags.Public | BindingFlags.Instance)
                    .FirstOrDefault(p => p.GetCustomAttribute<LastUpdatedDateAuditFieldAttribute>() != null)
        );
    }
}
