using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization.Metadata;
using Easy.Platform.Common.JsonSerialization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Easy.Platform.AspNetCore.Middleware;

/// <summary>
/// WHAT: The redacting projector for the slow-request diagnostic sink. Given the buffered JSON request body and the
/// endpoint that will bind it, it returns that body with every <see cref="PlatformSensitiveDataAttribute" />-marked
/// property removed — or one of two constant markers when it cannot prove the projection is safe.
/// </summary>
/// <remarks>
/// <para>
/// WHY it renders content at all. It is the deliberate exception to the platform's payload-free diagnostic rule
/// (<c>PlatformDiagnosticJsonSerializer</c>, which emits only a type name). A slow-request warning exists to answer
/// "which request was slow, and why" — and the answer usually lives in the payload's shape and values (page size,
/// date range, filter breadth). A type name alone makes the warning unactionable. So this path renders real
/// content, and pays for it with a strict, explicitly typed redaction contract.
/// </para>
/// <para>
/// WHY it fails closed. Every uncertainty returns <see cref="OmittedPayload" /> rather than the original body:
/// no endpoint or no body parameter, a dynamic body type, a nested untyped container, an unparseable body, or any
/// thrown resolver/converter/reflection error. The rule being protected is that <em>absence of redaction metadata
/// must never be read as authorization to log</em>. A model with zero marked properties is far more likely to be
/// unclassified than to be genuinely non-sensitive, so it is omitted too. Over-redaction costs a diagnostic;
/// under-redaction leaks credentials and PII into log aggregation.
/// </para>
/// <para>
/// HOW — five steps in <see cref="Serialize" />:
/// 1. Short-circuit the oversized marker so it is never parsed as JSON.
/// 2. Resolve the DECLARED <see cref="BindingSource.Body" /> parameter type from
///    <see cref="ControllerActionDescriptor" /> — the declared type, not the payload, is the only trustworthy
///    redaction contract; a payload can claim any shape.
/// 3. Walk that type graph and collect the JSON names of all marked properties, following nested objects,
///    collection element types, and polymorphic derived types.
/// 4. Bail out to <see cref="OmittedPayload" /> if the contract is absent (no marked property) or unenforceable
///    (a dynamic container anywhere in the graph).
/// 5. Parse the body as a <see cref="JsonNode" /> and delete matching properties at every depth, then re-emit.
/// </para>
/// <para>
/// HOW it deletes rather than masks: the property is removed outright, not replaced with <c>"***"</c>, so the
/// marked member's schema name is not disclosed either.
/// </para>
/// <para>
/// HOW it is bounded: the 32 KB cap (<see cref="MaxDiagnosticPayloadBytes" />) is enforced upstream at read time by
/// <c>PlatformSlowRequestWarningMiddleware.ReadRequestBodyAsync</c>, which caps this walk and the buffered read in
/// one place. Behavior is covered by <c>PlatformSlowRequestWarningMiddlewareRedactionTests</c>; the middleware's
/// use of this boundary is asserted structurally by <c>PlatformDiagnosticSinkSourceShapeTests</c>.
/// </para>
/// </remarks>
internal static class PlatformHttpRequestBodyDiagnosticSerializer
{
    /// <summary>
    /// Returned whenever the payload cannot be projected under a proven redaction contract. It is a fixed literal
    /// (never the body, never a partial body) so no failure mode can degrade into disclosure.
    /// </summary>
    internal const string OmittedPayload = "[Request payload omitted because it could not be safely serialized]";

    /// <summary>
    /// Written upstream by the middleware when the body exceeds <see cref="MaxDiagnosticPayloadBytes" />, and
    /// passed straight through by <see cref="Serialize" />. It is a distinct marker from
    /// <see cref="OmittedPayload" /> so a size cap is not misdiagnosed as a redaction-contract failure.
    /// </summary>
    internal const string OversizedPayload = "[Request payload omitted because it exceeded the diagnostic size limit]";

    /// <summary>
    /// Upper bound on the request payload captured for diagnostics. Slow requests correlate with large payloads,
    /// so an unbounded capture is exactly the shape that turns a slow request into an out-of-memory failure.
    /// </summary>
    internal const int MaxDiagnosticPayloadBytes = 32 * 1024;

    /// <summary>
    /// Projects a buffered JSON request body into a log-safe form by removing marked properties, or returns a
    /// constant marker when no safe projection can be proven. Never throws.
    /// </summary>
    /// <param name="context">
    /// The request being observed. Used only to reach the endpoint's <see cref="ControllerActionDescriptor" /> for
    /// the declared body-parameter type; no header, cookie, query, or request-context value is read.
    /// </param>
    /// <param name="requestBody">
    /// The buffered body, or <see cref="OversizedPayload" /> if the upstream read hit the size cap.
    /// </param>
    /// <returns>
    /// The redacted JSON, <c>"null"</c> for a JSON null body, or <see cref="OmittedPayload" /> /
    /// <see cref="OversizedPayload" />. Never the raw body of an unclassified or unparseable request.
    /// </returns>
    public static string Serialize(HttpContext context, string requestBody)
    {
        // The reader already refused an oversized body; never attempt to parse the marker as JSON.
        if (requestBody == OversizedPayload)
            return OversizedPayload;

        try
        {
            var requestType = context
                .GetEndpoint()?
                .Metadata
                .GetMetadata<ControllerActionDescriptor>()?
                .Parameters
                .FirstOrDefault(parameter => parameter.BindingInfo?.BindingSource == BindingSource.Body)?
                .ParameterType;

            if (requestType == null || IsDynamicContainer(requestType))
                return OmittedPayload;

            var sensitivePropertyNames = GetSensitiveJsonPropertyNames(
                requestType,
                out var hasUnredactableDynamicContainer);

            // Only an explicit typed redaction contract is safe to project. Unclassified models fail closed,
            // because returning their original payload would make absence of metadata an authorization decision.
            if (sensitivePropertyNames.Count == 0 || hasUnredactableDynamicContainer)
                return OmittedPayload;

            var requestBodyNode = JsonNode.Parse(requestBody);

            RemoveSensitiveProperties(requestBodyNode, sensitivePropertyNames);

            return requestBodyNode?.ToJsonString() ?? "null";
        }
        catch (Exception)
        {
            // Resolver, converter, JSON, and reflection failures are all diagnostic-only failures. This deliberately
            // broad guard ensures observability never masks the request being observed and always fails closed.
            return OmittedPayload;
        }
    }

    /// <summary>
    /// Detects a type whose members are not knowable from the type itself — <see cref="object" />,
    /// <see cref="JsonNode" />, <see cref="JsonElement" />, and any dictionary. These carry arbitrary caller-chosen
    /// keys, so no static allowlist can be derived and any payload under them must be omitted wholesale.
    /// </summary>
    /// <param name="requestType">Candidate type; nullable wrappers are unwrapped first.</param>
    /// <returns><c>true</c> when the type's content cannot be classified ahead of time.</returns>
    private static bool IsDynamicContainer(Type requestType)
    {
        requestType = Nullable.GetUnderlyingType(requestType) ?? requestType;

        return requestType == typeof(object)
               || typeof(JsonNode).IsAssignableFrom(requestType)
               || requestType == typeof(JsonElement)
               || typeof(System.Collections.IDictionary).IsAssignableFrom(requestType)
               || requestType
                   .GetInterfaces()
                   .Append(requestType)
                   .Any(candidate =>
                       candidate.IsGenericType
                       && candidate.GetGenericTypeDefinition() == typeof(IDictionary<,>));
    }

    /// <summary>
    /// Builds the redaction allowlist for a declared body type: the JSON names of every marked property found
    /// anywhere in its graph, plus a flag reporting whether that graph is redactable at all.
    /// </summary>
    /// <param name="requestType">The declared body-parameter type.</param>
    /// <param name="hasUnredactableDynamicContainer">
    /// Set when a dynamic container was reached anywhere in the graph. The caller must then omit the whole payload
    /// — a marked sibling property does not authorize logging an untyped neighbour.
    /// </param>
    /// <returns>
    /// JSON property names to delete, compared case-insensitively so a naming-policy or casing mismatch between the
    /// resolved metadata and the wire payload cannot silently skip a redaction.
    /// </returns>
    private static HashSet<string> GetSensitiveJsonPropertyNames(
        Type requestType,
        out bool hasUnredactableDynamicContainer)
    {
        var sensitivePropertyNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var visitedTypes = new HashSet<Type>();
        hasUnredactableDynamicContainer = false;

        CollectSensitiveJsonPropertyNames(
            requestType,
            sensitivePropertyNames,
            visitedTypes,
            ref hasUnredactableDynamicContainer);

        return sensitivePropertyNames;
    }

    /// <summary>
    /// Depth-first walk of a type graph collecting marked property names. Collection element types are unwrapped so
    /// a marked member inside a list is still found, and <paramref name="visitedTypes" /> makes self-referencing
    /// and mutually recursive models terminate instead of stack-overflowing the request being observed.
    /// </summary>
    /// <param name="type">Current node in the walk; nullable wrappers are unwrapped.</param>
    /// <param name="sensitivePropertyNames">Accumulator for marked JSON property names.</param>
    /// <param name="visitedTypes">Cycle guard — a type is expanded at most once per walk.</param>
    /// <param name="hasUnredactableDynamicContainer">Set on reaching any dynamic container; see the caller.</param>
    /// <remarks>
    /// Names are collected from <see cref="JsonTypeInfo" /> rather than from raw reflection so the recorded name is
    /// the one that will actually appear on the wire — honouring <c>[JsonPropertyName]</c> and the configured naming
    /// policy. Reading the attribute off the CLR member name instead would silently fail to match the payload.
    /// A marked property stops the descent: it is deleted whole, so its own children need no inspection.
    /// </remarks>
    private static void CollectSensitiveJsonPropertyNames(
        Type type,
        HashSet<string> sensitivePropertyNames,
        HashSet<Type> visitedTypes,
        ref bool hasUnredactableDynamicContainer)
    {
        type = Nullable.GetUnderlyingType(type) ?? type;

        if (IsDynamicContainer(type))
        {
            hasUnredactableDynamicContainer = true;
            return;
        }

        if (!visitedTypes.Add(type) || IsTerminalType(type))
            return;

        var enumerableElementType = TryGetEnumerableElementType(type);

        if (enumerableElementType != null)
        {
            CollectSensitiveJsonPropertyNames(
                enumerableElementType,
                sensitivePropertyNames,
                visitedTypes,
                ref hasUnredactableDynamicContainer);
            return;
        }

        var serializerOptions = PlatformJsonSerializer.CurrentOptions.Value;
        var typeInfoResolver = serializerOptions.TypeInfoResolver ?? new PlatformJsonTypeInfoResolver();
        var typeInfo = typeInfoResolver.GetTypeInfo(type, serializerOptions);

        if (typeInfo.Kind != JsonTypeInfoKind.Object)
            return;

        foreach (var property in typeInfo.Properties)
        {
            if (property.AttributeProvider?.IsDefined(typeof(PlatformSensitiveDataAttribute), inherit: true) == true)
                sensitivePropertyNames.Add(property.Name);
            else
                CollectSensitiveJsonPropertyNames(
                    property.PropertyType,
                    sensitivePropertyNames,
                    visitedTypes,
                    ref hasUnredactableDynamicContainer);
        }

        // Walk polymorphic derived types too. Redaction is driven by the DECLARED parameter type, so a sensitive
        // member declared only on a derived type would otherwise never be discovered and would fail OPEN --
        // the attribute would be present on the property yet redact nothing for that payload shape.
        if (typeInfo.PolymorphismOptions != null)
        {
            foreach (var derivedType in typeInfo.PolymorphismOptions.DerivedTypes)
                CollectSensitiveJsonPropertyNames(
                    derivedType.DerivedType,
                    sensitivePropertyNames,
                    visitedTypes,
                    ref hasUnredactableDynamicContainer);
        }
    }

    /// <summary>
    /// Resolves the element type of an array or <see cref="IEnumerable{T}" /> so the walk descends into collection
    /// items. Without this, a marked member on a list element would never be collected and would fail OPEN.
    /// </summary>
    /// <param name="type">Candidate collection type.</param>
    /// <returns>The element type, or <c>null</c> when the type is not a collection.</returns>
    private static Type? TryGetEnumerableElementType(Type type)
    {
        if (type.IsArray)
            return type.GetElementType();

        return type
            .GetInterfaces()
            .Append(type)
            .FirstOrDefault(candidate => candidate.IsGenericType && candidate.GetGenericTypeDefinition() == typeof(IEnumerable<>))?
            .GetGenericArguments()[0];
    }

    /// <summary>
    /// Leaf types that map to a JSON scalar and therefore have no members worth walking. Cutting the walk here is
    /// what keeps it cheap enough to run inside a request pipeline: without it, every <see cref="string" /> and
    /// <see cref="DateTime" /> would be expanded into its own BCL property graph.
    /// </summary>
    /// <param name="type">Candidate type.</param>
    /// <returns><c>true</c> when the walk should stop at this node.</returns>
    private static bool IsTerminalType(Type type)
    {
        return type == typeof(string)
               || type.IsPrimitive
               || type.IsEnum
               || type == typeof(decimal)
               || type == typeof(DateTime)
               || type == typeof(DateTimeOffset)
               || type == typeof(DateOnly)
               || type == typeof(TimeOnly)
               || type == typeof(Guid);
    }

    /// <summary>
    /// Deletes every property whose name is in the allowlist, at every depth of the parsed payload, in place.
    /// </summary>
    /// <param name="node">Current JSON node; non-object, non-array nodes are left untouched.</param>
    /// <param name="sensitivePropertyNames">Names collected from the declared type graph.</param>
    /// <remarks>
    /// Matching is by NAME across the whole document, not by the path the name was discovered at. That intentionally
    /// over-redacts — an unrelated object that happens to reuse a marked name also loses it — because the alternative,
    /// path-precise redaction, fails open whenever the runtime payload shape diverges from the declared graph
    /// (polymorphism, inheritance, extra members). Losing a field from a diagnostic is cheap; leaking one is not.
    /// The object is snapshotted with <c>ToList()</c> before iterating, since removal mutates the collection.
    /// </remarks>
    private static void RemoveSensitiveProperties(JsonNode? node, HashSet<string> sensitivePropertyNames)
    {
        if (node is JsonObject jsonObject)
        {
            foreach (var property in jsonObject.ToList())
            {
                if (sensitivePropertyNames.Contains(property.Key))
                    jsonObject.Remove(property.Key);
                else
                    RemoveSensitiveProperties(property.Value, sensitivePropertyNames);
            }
        }
        else if (node is JsonArray jsonArray)
        {
            foreach (var item in jsonArray)
                RemoveSensitiveProperties(item, sensitivePropertyNames);
        }
    }
}
