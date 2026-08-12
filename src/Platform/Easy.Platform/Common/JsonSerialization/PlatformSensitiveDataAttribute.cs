namespace Easy.Platform.Common.JsonSerialization;

/// <summary>
/// Marks a property or field that must be omitted from explicitly typed diagnostic projections, such as
/// HTTP request-body redaction. Generic diagnostic serialization is payload-free. Normal JSON serialization
/// and deserialization intentionally ignore this attribute so transport, model binding, persistence, and
/// message contracts remain unchanged.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field)]
public sealed class PlatformSensitiveDataAttribute : Attribute
{
}
