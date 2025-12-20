using System.Text.Json;
using System.Text.Json.Serialization;

namespace Easy.Platform.Common.JsonSerialization.Converters;

/// <summary>
/// JSON converter for <see cref="Type"/> objects that handles serialization of .NET type information.
/// This converter serializes Type instances to their assembly-qualified names while restricting
/// deserialization for security reasons.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Security Notice:</strong> This converter only supports serialization (writing) of Type objects.
/// Deserialization is intentionally disabled to prevent potential security vulnerabilities that could
/// arise from deserializing arbitrary type information, which could lead to code injection attacks.
/// </para>
/// <para>
/// The converter is automatically registered as part of the platform's JSON configuration through
/// <see cref="PlatformJsonSerializer.ConfigOptions"/> and is used when Type objects need to be
/// serialized in API responses or data transfer scenarios.
/// </para>
/// <para>
/// <strong>When this converter is used:</strong>
/// </para>
/// <list type="bullet">
/// <item><description>Serializing objects that contain Type properties (e.g., reflection metadata)</description></item>
/// <item><description>API responses that include type information for client-side processing</description></item>
/// <item><description>Logging or debugging scenarios where type information needs to be preserved</description></item>
/// <item><description>Configuration objects that reference .NET types by name</description></item>
/// </list>
/// <para>
/// <strong>Output format:</strong> The serialized output is the assembly-qualified name of the type,
/// which includes the full type name, assembly name, version, culture, and public key token.
/// </para>
/// <para>
/// <strong>Example usage in codebase:</strong>
/// This converter is used when objects containing Type properties are serialized through the platform's
/// JSON serialization infrastructure, such as in reflection-based operations or metadata exchange.
/// </para>
/// </remarks>
/// <example>
/// Example of JSON output when serializing a Type object:
/// <code>
/// // C# Type object: typeof(string)
/// // JSON output: "System.String, System.Private.CoreLib, Version=6.0.0.0, Culture=neutral, PublicKeyToken=7cec85d7bea7798e"
/// </code>
/// </example>
/// <seealso cref="PlatformJsonSerializer"/>
/// <seealso cref="Type.AssemblyQualifiedName"/>
public class PlatformClassTypeJsonConverter : JsonConverter<Type>
{
    public override Type Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        // WHY: Deserialization of type instances like this
        // is not recommended and should be avoided
        // since it can lead to potential security issues.

        // If you really want this supported (for instance if the JSON input is trusted):
        // string assemblyQualifiedName = reader.GetString();
        // return Type.GetType(assemblyQualifiedName);
        throw new NotSupportedException();
    }

    public override void Write(Utf8JsonWriter writer, Type value, JsonSerializerOptions options)
    {
        var assemblyQualifiedName = value.AssemblyQualifiedName;

        // Use this with caution, since you are disclosing type information.
        writer.WriteStringValue(assemblyQualifiedName);
    }
}
