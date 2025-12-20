using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Easy.Platform.Common.JsonSerialization.Converters;

/// <summary>
/// JSON converter that handles serialization of <see cref="MethodBase"/> objects by ignoring them completely.
/// This converter prevents serialization errors when objects contain MethodBase properties by writing null values
/// instead of attempting to serialize method information.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Problem this converter solves:</strong> MethodBase and its derived types (MethodInfo, ConstructorInfo, etc.)
/// are not naturally serializable by System.Text.Json, which would normally cause serialization errors when
/// encountered in object graphs. This is common in scenarios involving:
/// </para>
/// <list type="bullet">
/// <item><description>Reflection-based operations where objects contain method references</description></item>
/// <item><description>Exception objects that include TargetSite properties (which are MethodBase instances)</description></item>
/// <item><description>Dynamic proxy objects or interceptor patterns that expose method metadata</description></item>
/// <item><description>Logging frameworks that capture stack trace information</description></item>
/// </list>
/// <para>
/// <strong>Behavior:</strong> When this converter encounters a MethodBase object during serialization:
/// </para>
/// <list type="number">
/// <item><description>Write operation: Outputs JSON null value instead of method details</description></item>
/// <item><description>Read operation: Skips the JSON token and returns null (used for deserialization)</description></item>
/// </list>
/// <para>
/// <strong>Registration:</strong> This converter is automatically registered in the platform's JSON configuration
/// through <see cref="PlatformJsonSerializer.ConfigOptions"/> and takes precedence over default serialization behavior.
/// </para>
/// <para>
/// <strong>Common usage scenarios in the platform:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>API error responses that include exception details with TargetSite information</description></item>
/// <item><description>Serializing objects that have been enhanced with AOP (Aspect-Oriented Programming) proxies</description></item>
/// <item><description>Logging complex object graphs that may contain reflection metadata</description></item>
/// <item><description>Debugging scenarios where method references are part of larger data structures</description></item>
/// </list>
/// </remarks>
/// <example>
/// Without this converter, attempting to serialize an exception would fail:
/// <code>
/// // This would throw without PlatformIgnoreMethodBaseJsonConverter
/// var exception = new InvalidOperationException("Test");
/// var json = JsonSerializer.Serialize(exception); // exception.TargetSite is MethodBase
///
/// // With the converter:
/// // {"Message":"Test","Data":{},"InnerException":null,"TargetSite":null,"StackTrace":null,...}
/// </code>
/// </example>
/// <seealso cref="MethodBase"/>
/// <seealso cref="PlatformJsonSerializer"/>
/// <seealso cref="JsonConverter{T}"/>
/// Fix exception when serialize class with have MethodBase type is not supported
/// </summary>
public class PlatformIgnoreMethodBaseJsonConverter : JsonConverter<MethodBase>
{
    public override MethodBase Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        reader.Skip();
        return null;
    }

    public override void Write(Utf8JsonWriter writer, MethodBase value, JsonSerializerOptions options)
    {
        writer.WriteNullValue();
    }
}
