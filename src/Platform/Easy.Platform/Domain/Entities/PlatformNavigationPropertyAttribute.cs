namespace Easy.Platform.Domain.Entities;

/// <summary>
/// Marks a property as a navigation property that can be loaded from a related entity.
/// Properties with this attribute are auto-ignored during BSON serialization by the platform convention.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public class PlatformNavigationPropertyAttribute : Attribute
{
    /// <summary>
    /// The name of the foreign key property that references the related entity.
    /// </summary>
    public string ForeignKeyProperty { get; }

    /// <summary>
    /// Specifies whether this is a single entity or collection navigation.
    /// Default: Single (FK is TKey → Entity)
    /// </summary>
    public PlatformNavigationCardinality Cardinality { get; set; } = PlatformNavigationCardinality.Single;

    /// <summary>
    /// Maximum depth for nested navigation loading to prevent circular references.
    /// Default: 3
    /// </summary>
    public int MaxDepth { get; set; } = 3;

    /// <summary>
    /// Creates a navigation property attribute.
    /// </summary>
    /// <param name="foreignKeyProperty">Name of the FK property (e.g., nameof(DepartmentId))</param>
    public PlatformNavigationPropertyAttribute(string foreignKeyProperty)
    {
        ForeignKeyProperty = foreignKeyProperty;
    }
}

/// <summary>
/// Specifies the cardinality of a navigation property.
/// </summary>
public enum PlatformNavigationCardinality
{
    /// <summary>
    /// FK is a single key (e.g., DepartmentId → Department)
    /// </summary>
    Single,

    /// <summary>
    /// FK is a collection of keys (e.g., StageIds → Stages)
    /// </summary>
    Collection
}
