namespace Easy.Platform.Infrastructures.FileStorage;

/// <summary>
/// Single source of truth for rewriting a blob storage URI's endpoint prefix. Replaces the <c>fromEndpoint</c> prefix of
/// a blob URI with <c>toEndpoint</c>, preserving the blob path and any SAS query (the SAS signature is computed over the
/// blob path and account, not the host, so a SAS URI stays valid after the host swap).
/// <para>
/// Used in BOTH directions so neither caller reimplements endpoint parsing:
/// <list type="bullet">
/// <item>internal → public — the storage service emits client-visible URLs (via <c>PlatformAzureFileStorageService.ToPublicBlobUri</c> in the Azure provider).</item>
/// <item>public → internal — a server re-fetches a stored public URL through the internal SDK endpoint (e.g. local Docker
/// stores <c>127.0.0.1</c> public URLs but the server reaches Azurite via the internal <c>azurite</c> host).</item>
/// </list>
/// Pure and static so the host-rewrite contract is unit-testable without a live storage client. See TC-SUP-INF-001 / TC-SUP-INF-003.
/// </para>
/// </summary>
public static class PlatformBlobUriRewriter
{
    /// <summary>
    /// Returns <paramref name="blobUri"/> with its <paramref name="fromEndpoint"/> prefix replaced by
    /// <paramref name="toEndpoint"/>. Returns the URI unchanged when either endpoint is null/whitespace, or when the URI
    /// does not start with <paramref name="fromEndpoint"/> (case-insensitive). The blob path and any SAS query are preserved.
    /// </summary>
    public static Uri Rewrite(string? fromEndpoint, string? toEndpoint, Uri blobUri)
    {
        return TryRewrite(fromEndpoint, toEndpoint, blobUri, out var rewrittenUri)
            ? rewrittenUri
            : blobUri;
    }

    /// <summary>
    /// Attempts to rewrite <paramref name="blobUri"/> only when it is under the trusted <paramref name="fromEndpoint"/>.
    /// Use this for server-side fetch paths that must fail closed rather than contacting an arbitrary URI.
    /// </summary>
    public static bool TryRewrite(string? fromEndpoint, string? toEndpoint, Uri blobUri, out Uri rewrittenUri)
    {
        rewrittenUri = blobUri;

        if (string.IsNullOrWhiteSpace(fromEndpoint) || string.IsNullOrWhiteSpace(toEndpoint))
            return false;

        var trimmedFromEndpoint = fromEndpoint.TrimEnd('/');
        var trimmedToEndpoint = toEndpoint.TrimEnd('/');
        var blobUriText = blobUri.AbsoluteUri;

        if (!StartsWithEndpointBoundary(blobUriText, trimmedFromEndpoint))
            return false;

        rewrittenUri = new Uri(trimmedToEndpoint + blobUriText[trimmedFromEndpoint.Length..]);
        return true;
    }

    public static string? GetBlobEndpointFromConnectionString(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            return null;

        var values = connectionString
            .Split(';', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.Split('=', 2))
            .Where(parts => parts.Length == 2)
            .ToDictionary(parts => parts[0], parts => parts[1], StringComparer.OrdinalIgnoreCase);

        if (values.TryGetValue("BlobEndpoint", out var blobEndpoint) && !string.IsNullOrWhiteSpace(blobEndpoint))
            return blobEndpoint;

        if (!values.TryGetValue("AccountName", out var accountName) || string.IsNullOrWhiteSpace(accountName))
            return null;

        if (!values.TryGetValue("EndpointSuffix", out var endpointSuffix) || string.IsNullOrWhiteSpace(endpointSuffix))
            return null;

        var protocol = values.TryGetValue("DefaultEndpointsProtocol", out var configuredProtocol) && !string.IsNullOrWhiteSpace(configuredProtocol)
            ? configuredProtocol
            : Uri.UriSchemeHttps;

        return $"{protocol}://{accountName}.blob.{endpointSuffix}/";
    }

    private static bool StartsWithEndpointBoundary(string uriText, string endpoint)
    {
        if (!uriText.StartsWith(endpoint, StringComparison.OrdinalIgnoreCase))
            return false;

        if (uriText.Length == endpoint.Length)
            return true;

        return uriText[endpoint.Length] is '/' or '?' or '#';
    }
}
