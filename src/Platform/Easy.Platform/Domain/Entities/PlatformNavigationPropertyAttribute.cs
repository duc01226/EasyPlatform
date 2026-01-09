namespace Easy.Platform.Domain.Entities;

/// <summary>
/// Marks a property as a navigation property that can be loaded from a related entity.
/// Properties with this attribute are auto-ignored during BSON serialization by the platform convention.
/// <para>
/// <strong>Two collection patterns supported:</strong>
/// <list type="bullet">
/// <item>
/// <term>FK List (parent has List&lt;Id&gt;)</term>
/// <description>Use <see cref="ForeignKeyProperty"/> with <see cref="Cardinality"/> = Collection</description>
/// </item>
/// <item>
/// <term>Reverse Navigation (child has FK)</term>
/// <description>Use <see cref="ReverseForeignKeyProperty"/> to specify FK on child entity</description>
/// </item>
/// </list>
/// </para>
/// </summary>
/// <example>
/// <code>
/// // Pattern 1: FK List - parent has List&lt;string&gt; ProjectIds
/// [PlatformNavigationProperty(nameof(ProjectIds), Cardinality = Collection)]
/// public List&lt;Project&gt;? Projects { get; set; }
///
/// // Pattern 2: Reverse Navigation - Project has EmployeeId FK
/// [PlatformNavigationProperty(ReverseForeignKeyProperty = nameof(Project.EmployeeId))]
/// public List&lt;Project&gt;? Projects { get; set; }
/// </code>
/// </example>
[AttributeUsage(AttributeTargets.Property)]
public class PlatformNavigationPropertyAttribute : Attribute
{
    /// <summary>
    /// The name of the foreign key property on THIS entity that references the related entity.
    /// For single navigation: the FK property (e.g., "DepartmentId").
    /// For collection with FK list: the List&lt;TKey&gt; property (e.g., "ProjectIds").
    /// Leave empty when using <see cref="ReverseForeignKeyProperty"/> for reverse navigation.
    /// </summary>
    public string ForeignKeyProperty { get; }

    /// <summary>
    /// The name of the foreign key property on the RELATED entity that references THIS entity.
    /// Used for reverse/inverse navigation where the child has the FK pointing to parent.
    /// Example: For Employee.Projects where Project has EmployeeId, set this to "EmployeeId".
    /// </summary>
    /// <remarks>
    /// When set, the loader queries: RelatedEntity.Where(r => r.[ReverseForeignKeyProperty] == thisEntity.Id)
    /// </remarks>
    public string? ReverseForeignKeyProperty { get; set; }

    /// <summary>
    /// Returns true if this is a reverse navigation (child has FK pointing to parent).
    /// </summary>
    public bool IsReverseNavigation => !string.IsNullOrEmpty(ReverseForeignKeyProperty);

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
    /// Creates a navigation property attribute for forward navigation.
    /// </summary>
    /// <param name="foreignKeyProperty">Name of the FK property on this entity (e.g., nameof(DepartmentId)). Use empty string for reverse navigation.</param>
    public PlatformNavigationPropertyAttribute(string foreignKeyProperty = "")
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
