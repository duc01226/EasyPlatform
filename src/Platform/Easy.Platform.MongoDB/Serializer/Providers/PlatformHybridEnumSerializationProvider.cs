using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Easy.Platform.MongoDB.Serializer.Providers;

/// <summary>
/// Hybrid enum serializer that provides backward-compatible enum serialization for MongoDB.
/// <para>
/// <strong>Serialization Strategy:</strong>
/// <list type="bullet">
/// <item><description><strong>Writing:</strong> Always serializes enums as strings (human-readable, refactor-safe)</description></item>
/// <item><description><strong>Reading:</strong> Deserializes from both string and integer formats (backward compatibility)</description></item>
/// </list>
/// </para>
/// <para>
/// <strong>Migration Path:</strong> This serializer enables safe migration from integer-based enum storage 
/// to string-based storage without requiring data migration. Old records with integer values can still be 
/// read while new/updated records are saved as strings.
/// </para>
/// <para>
/// <strong>Performance Optimization:</strong> Uses a cached dictionary for string-to-enum conversion 
/// to avoid repeated <see cref="Enum.Parse"/> overhead during deserialization.
/// </para>
/// </summary>
/// <typeparam name="TEnum">The enum type to serialize. Must be a struct (value type) enum.</typeparam>
/// <example>
/// Manual registration (not typically needed - use <see cref="PlatformHybridEnumSerializationProvider"/> instead):
/// <code>
/// BsonSerializer.RegisterSerializer(typeof(MyEnum), new PlatformHybridEnumSerializer&lt;MyEnum&gt;());
/// </code>
/// 
/// Example enum:
/// <code>
/// public enum Status
/// {
///     Active = 1,
///     Inactive = 2,
///     Archived = 3
/// }
/// </code>
/// 
/// Behavior:
/// <code>
/// // Old document in MongoDB: { "status": 1 } → Deserializes to Status.Active
/// // New document in MongoDB: { "status": "Active" } → Deserializes to Status.Active
/// // All saves produce: { "status": "Active" } (string format)
/// </code>
/// </example>
public class PlatformHybridEnumSerializer<TEnum> : StructSerializerBase<TEnum> where TEnum : struct, Enum
{
    // Optimization: Cache the string-to-enum mapping to avoid Enum.Parse overhead
    private static readonly Dictionary<string, TEnum> StringToEnum =
        Enum.GetValues(typeof(TEnum))
            .Cast<TEnum>()
            .ToDictionary(e => e.ToString(), e => e, StringComparer.OrdinalIgnoreCase);

    public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, TEnum value)
    {
        // REQUIREMENT: Always save new data as String
        context.Writer.WriteString(value.ToString());
    }

    /// <summary>
    /// Deserializes a BSON value to an enum.
    /// </summary>
    /// <param name="context">The deserialization context.</param>
    /// <param name="args">The deserialization arguments.</param>
    /// <returns>The deserialized enum value.</returns>
    /// <exception cref="BsonSerializationException">
    /// Thrown when the BSON type cannot be converted to the target enum type.
    /// </exception>
    /// <remarks>
    /// <strong>Supports multiple BSON types for backward compatibility:</strong>
    /// <list type="bullet">
    /// <item><description><strong>String:</strong> New format - uses cached lookup for performance</description></item>
    /// <item><description><strong>Int32:</strong> Legacy format - converts integer to enum</description></item>
    /// <item><description><strong>Int64:</strong> Legacy format (rare) - converts long to enum</description></item>
    /// <item><description><strong>Null:</strong> Returns default enum value</description></item>
    /// </list>
    /// </remarks>
    /// <example>
    /// Deserialization examples:
    /// <code>
    /// // String format (new): { "status": "Active" } → Status.Active
    /// // Int32 format (legacy): { "status": 1 } → Status.Active
    /// // Int64 format (rare): { "status": 1L } → Status.Active
    /// // Null: { "status": null } → default(Status) (typically first enum value)
    /// </code>
    /// </example>
    public override TEnum Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
    {
        var bsonType = context.Reader.CurrentBsonType;

        switch (bsonType)
        {
            case BsonType.String:
                // Handle new data (String)
                var stringValue = context.Reader.ReadString();

                // Try to get from cache first (performance optimization)
                if (StringToEnum.TryGetValue(stringValue, out var enumValue)) return enumValue;

                // Fallback to Enum.Parse for dynamic values or values not in cache
                return (TEnum)Enum.Parse(typeof(TEnum), stringValue, ignoreCase: true);

            case BsonType.Int32:
                // Handle old data (Int) - legacy integer-based storage
                var intValue = context.Reader.ReadInt32();
                return (TEnum)Enum.ToObject(typeof(TEnum), intValue);

            case BsonType.Int64:
                // Handle old data (Long) - rare but possible in legacy data
                var longValue = context.Reader.ReadInt64();
                return (TEnum)Enum.ToObject(typeof(TEnum), longValue);

            case BsonType.Null:
                // Handle null values - returns default enum value (typically first value or 0)
                context.Reader.ReadNull();
                return default;

            default:
                throw new BsonSerializationException(
                    $"Cannot deserialize BsonType {bsonType} to Enum {typeof(TEnum).Name}"
                );
        }
    }
}

// 2. The Provider to apply this to ALL Enums automatically
public class PlatformHybridEnumSerializationProvider : IBsonSerializationProvider
{
    public IBsonSerializer GetSerializer(Type type)
    {
        if (type.IsEnum)
        {
            // Construct the generic serializer type: HybridEnumSerializer<T>
            var serializerType = typeof(PlatformHybridEnumSerializer<>).MakeGenericType(type);
            return (IBsonSerializer)Activator.CreateInstance(serializerType);
        }

        return null; // Return null to let other providers handle non-enums
    }
}
