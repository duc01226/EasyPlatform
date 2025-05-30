namespace Easy.Platform.Domain.Entities;

/// <summary>
/// Marks properties as computed entity properties that require special change detection handling
/// in the Easy Platform's Entity Framework Core and MongoDB change tracking mechanisms.
/// </summary>
/// <remarks>
/// <para>
/// The <see cref="ComputedEntityPropertyAttribute"/> is designed to handle properties that have dynamic getter logic
/// but empty or no-op setters. These properties typically compute their values based on other entity properties
/// or external data, making traditional reference equality change detection ineffective.
/// </para>
///
/// <para><strong>Core Problem Solved:</strong></para>
/// <para>
/// In Entity Framework Core and MongoDB change tracking, properties are typically compared using reference equality.
/// However, computed properties with complex getter logic may return different object instances on each access,
/// even when the underlying data hasn't changed. This causes false positives in change detection, leading to
/// unnecessary database updates and event triggers.
/// </para>
///
/// <para><strong>Integration Points:</strong></para>
/// <list type="bullet">
/// <item><description><strong>PlatformEfCoreDbContext:</strong> Used in <c>DetachLocalIfAnyDifferentTrackedEntity</c> method to identify properties requiring deep comparison using JSON serialization instead of reference equality.</description></item>
/// <item><description><strong>GetChangedFields Extension:</strong> Integrates with entity change detection to properly identify modified computed properties.</description></item>
/// <item><description><strong>CQRS Event System:</strong> Ensures computed property changes are properly captured for domain events and audit trails.</description></item>
/// <item><description><strong>MongoDB Context:</strong> Provides consistent change detection behavior across both EF Core and MongoDB persistence layers.</description></item>
/// </list>
///
/// <para><strong>Usage Patterns:</strong></para>
/// <list type="number">
/// <item><description><strong>Concatenated Text Properties:</strong> Properties that combine multiple string fields (e.g., FullName from FirstName + MiddleName + LastName).</description></item>
/// <item><description><strong>Status Calculations:</strong> Properties that compute status based on timestamps, flags, or business rules.</description></item>
/// <item><description><strong>Flattened Complex Objects:</strong> Properties that serialize nested objects or collections into flat representations for search or display.</description></item>
/// <item><description><strong>Time-based Computations:</strong> Properties that calculate durations, working hours, or time-based statuses.</description></item>
/// </list>
///
/// <para><strong>Real-world Examples from Codebase:</strong></para>
/// <code>
/// // Example 1: Computed full name property
/// [ComputedEntityProperty]
/// public string FullName => $"{FirstName} {MiddleName} {LastName}".Trim();
///
/// // Example 2: Status computation based on timestamps
/// [ComputedEntityProperty]
/// public TimeLogStatus Status
/// {
///     get
///     {
///         if (CheckInDateTime == null) return TimeLogStatus.NotCheckedIn;
///         if (CheckOutDateTime == null) return TimeLogStatus.CheckedIn;
///         return TimeLogStatus.CheckedOut;
///     }
/// }
///
/// // Example 3: Flattened complex object for search
/// [ComputedEntityProperty]
/// public string FlattenQuestionInfo_QuestionText_FullTextSearchValue =>
///     JsonSerializer.Serialize(QuestionInfo?.QuestionText ?? string.Empty);
///
/// // Example 4: Working hour calculations
/// [ComputedEntityProperty]
/// public double WorkingHour
/// {
///     get
///     {
///         if (CheckInDateTime == null || CheckOutDateTime == null) return 0;
///         return (CheckOutDateTime.Value - CheckInDateTime.Value).TotalHours;
///     }
/// }
/// </code>
///
/// <para><strong>Technical Implementation:</strong></para>
/// <para>
/// When this attribute is present, the platform's change detection mechanism switches from reference equality
/// to deep JSON serialization comparison. This ensures that:
/// </para>
/// <list type="bullet">
/// <item><description>Changes in computed property values are properly detected even when getter logic creates new instances</description></item>
/// <item><description>False positive change detections are eliminated for stable computed values</description></item>
/// <item><description>Audit trails and domain events accurately reflect actual property changes</description></item>
/// <item><description>Database update operations are optimized by avoiding unnecessary writes</description></item>
/// </list>
///
/// <para><strong>Performance Considerations:</strong></para>
/// <list type="bullet">
/// <item><description><strong>JSON Serialization Overhead:</strong> Deep comparison requires JSON serialization, which has higher computational cost than reference equality. Use judiciously on frequently accessed entities.</description></item>
/// <item><description><strong>Memory Allocation:</strong> JSON serialization creates temporary string objects. Consider caching strategies for expensive computations.</description></item>
/// <item><description><strong>Computation Complexity:</strong> Ensure getter logic is efficient since it may be called multiple times during change detection.</description></item>
/// </list>
///
/// <para><strong>Best Practices:</strong></para>
/// <list type="bullet">
/// <item><description>Apply only to properties with complex getter logic that cannot use simple reference equality</description></item>
/// <item><description>Ensure computed properties are deterministic - same inputs should always produce same outputs</description></item>
/// <item><description>Avoid side effects in property getters as they may be called multiple times during change detection</description></item>
/// <item><description>Consider performance implications for properties accessed frequently in tight loops</description></item>
/// <item><description>Document the computation logic clearly as it affects change detection behavior</description></item>
/// </list>
///
/// <para><strong>Alternative Approaches:</strong></para>
/// <para>
/// For simple computed properties that don't require change tracking, consider using standard C# computed properties
/// without this attribute. For properties that need caching, implement explicit backing fields with proper
/// invalidation logic instead of relying on the computed property pattern.
/// </para>
/// </remarks>
/// <example>
/// <code>
/// public class TimeLog : DomainEntity
/// {
///     public DateTime? CheckInDateTime { get; set; }
///     public DateTime? CheckOutDateTime { get; set; }
///
///     [ComputedEntityProperty]
///     public bool IsEdited => /* complex logic to determine if time log was edited */;
///
///     [ComputedEntityProperty]
///     public TimeLogStatus Status
///     {
///         get
///         {
///             if (CheckInDateTime == null) return TimeLogStatus.NotCheckedIn;
///             if (CheckOutDateTime == null) return TimeLogStatus.CheckedIn;
///             return TimeLogStatus.CheckedOut;
///         }
///     }
/// }
/// </code>
/// </example>
[AttributeUsage(AttributeTargets.Property)]
public class ComputedEntityPropertyAttribute : Attribute { }
