#nullable enable

#region

using System.Net;
using System.Web;

#endregion

namespace Easy.Platform.Common.Extensions;

public static class UrlExtension
{
    public const int DefaultHttpPort = 80;
    public const int DefaultHttpsPort = 443;

    /// <summary>
    /// Converts a string to a Uri.
    /// </summary>
    /// <param name="absoluteUrl">The string to convert.</param>
    /// <returns>The Uri created from the string.</returns>
    public static Uri ToUri(this string absoluteUrl, params ValueTuple<string, object?>[] queryParams)
    {
        return new UriBuilder(absoluteUrl)
            .PipeIf(
                queryParams.Any(),
                uriBuilder => uriBuilder.With(p => p.Query = p.Query.UpsertQueryParams(queryParams)))
            .Uri;
    }

    /// <summary>
    /// Adds or updates query parameters to a Uri.
    /// </summary>
    /// <param name="uri">The Uri to add query parameters to.</param>
    /// <param name="queryParams">The query parameters to add or update.</param>
    /// <returns>A new Uri with the updated query parameters.</returns>
    public static Uri WithUrlQueryParams(this Uri uri, params (string key, object? value)[] queryParams)
    {
        if (queryParams.IsEmpty())
            return uri;

        return new UriBuilder(uri)
            .With(builder => builder.Query = builder.Query.TrimStart('?').UpsertQueryParams(queryParams))
            .Uri;
    }

    public static string WithUrlQueryParams(this string absoluteOrRelativeUrl, params (string key, object? value)[] queryParams)
    {
        if (queryParams.IsEmpty())
            return absoluteOrRelativeUrl;

        var questionMarkIndex = absoluteOrRelativeUrl.IndexOf('?');

        var baseUrlPart = questionMarkIndex >= 0 ? absoluteOrRelativeUrl.Substring(0, questionMarkIndex) : absoluteOrRelativeUrl;
        var existingQueryPart = questionMarkIndex >= 0 && questionMarkIndex < absoluteOrRelativeUrl.Length - 1
            ? absoluteOrRelativeUrl.Substring(questionMarkIndex + 1)
            : string.Empty;

        return $"{baseUrlPart}?{existingQueryPart.UpsertQueryParams(queryParams)}";
    }

    /// <summary>
    /// Adds or updates query parameters to a Uri.
    /// </summary>
    /// <param name="uri">The Uri to add query parameters to.</param>
    /// <param name="queryParams">The query parameters to add or update.</param>
    /// <returns>A new Uri with the updated query parameters.</returns>
    public static Uri UpsertQueryParams(this Uri uri, params (string key, object? value)[] queryParams)
    {
        return uri.WithUrlQueryParams(queryParams);
    }

    public static string UpsertQueryParams(this string? query, params (string key, object? value)[] queryParams)
    {
        if (queryParams.IsEmpty())
            return query ?? "";

        // Parse the existing query string.
        var queryCollection = (query.IsNullOrEmpty() ? [] : HttpUtility.ParseQueryString(query!))
            .PipeAction(queryCollection =>
            {
                // Add (or overwrite) the provided query parameters.
                foreach (var (key, value) in queryParams) queryCollection[key] = value?.ToString();
            });

        // Manually rebuild the query string so that spaces are encoded as %20.
        /*
         * By default, when you use HttpUtility.ParseQueryString() and then call its ToString() method, the resulting query string is encoded using the application/x-www-form-urlencoded standard. In this encoding, spaces are represented as + rather than %20. This behavior is intentional and standard in many parts of the .NET Framework.
         *
         * However, some external systems or APIs expect spaces to be encoded strictly as %20. The UriBuilder itself works as designed; it relies on the query string provided. If you require %20 encoding for spaces, you need to manually rebuild the query string using Uri.EscapeDataString(), which encodes spaces as %20.
         */
        return queryCollection.AllKeys
            .Where(key => key != null)
            .SelectList(key => $"{Uri.EscapeDataString(key!)}={Uri.EscapeDataString(queryCollection[key] ?? "")}")
            .JoinToString("&");
    }

    /// <summary>
    /// Tries to parse a string to a Uri.
    /// </summary>
    /// <param name="str">The string to parse.</param>
    /// <returns>The Uri if the string can be parsed, null otherwise.</returns>
    public static Uri? TryParseUri(this string str)
    {
        try
        {
            return str.ToUri();
        }
        catch (Exception)
        {
            return null;
        }
    }

    /// <summary>
    /// Gets the origin of a Uri.
    /// </summary>
    /// <param name="url">The Uri to get the origin from.</param>
    /// <returns>The origin of the Uri.</returns>
    public static string Origin(this Uri url)
    {
        return $"{url.Scheme}://{url.Host}".PipeIf(url.Port is not DefaultHttpPort and not DefaultHttpsPort, s => $"{s}:{url.Port}");
    }

    /// <summary>
    /// Concatenates a relative path to a Uri.
    /// </summary>
    /// <param name="uri">The Uri to concatenate the relative path to.</param>
    /// <param name="relativePath">The relative path to concatenate.</param>
    /// <returns>The Uri with the concatenated relative path.</returns>
    public static Uri ConcatRelativePath(this Uri uri, string relativePath)
    {
        return new UriBuilder(uri)
            .With(builder => builder.Path = builder.Path.TrimEnd('/') + "/" + relativePath.TrimStart('/'))
            .Uri;
    }

    /// <summary>
    /// Gets the query parameters of a Uri.
    /// </summary>
    /// <param name="url">The Uri to get the query parameters from.</param>
    /// <returns>A dictionary of the query parameters.</returns>
    public static Dictionary<string, string?> QueryParams(this Uri url)
    {
        return url.Query.PipeIfOrDefault(
            queryStr => !queryStr.IsNullOrEmpty(),
            queryStr => HttpUtility.ParseQueryString(queryStr).Pipe(queryNvc => queryNvc.AllKeys.ToDictionary(k => k!, k => queryNvc[k])),
            []);
    }

    /// <summary>
    /// Converts a dictionary of query parameters to a query string.
    /// </summary>
    /// <param name="queryParams">The dictionary of query parameters.</param>
    /// <returns>The query string.</returns>
    public static string ToQueryString(this Dictionary<string, string> queryParams)
    {
        return $"?{queryParams.Select(keyValuePair => WebUtility.UrlEncode($"{keyValuePair.Key}={keyValuePair.Value}")).JoinToString('&')}";
    }

    /// <summary>
    /// Gets the path of a Uri.
    /// </summary>
    /// <param name="uri">The Uri to get the path from.</param>
    /// <returns>The path of the Uri.</returns>
    public static string Path(this Uri uri)
    {
        return uri.PathAndQuery.Substring(0, uri.PathAndQuery.Length - uri.Query.Length).TrimEnd('/');
    }

    /// <summary>True if absolute HTTP/HTTPS URL.</summary>
    public static bool IsAbsoluteHttpUrl(this string? s)
    {
        return Uri.TryCreate(s, UriKind.Absolute, out var u) &&
               (u.Scheme == Uri.UriSchemeHttp || u.Scheme == Uri.UriSchemeHttps);
    }

    /// <summary>True if starts with "www." (after trimming leading spaces).</summary>
    public static bool IsWwwPrefixed(this string? s)
    {
        return !string.IsNullOrWhiteSpace(s) &&
               s.AsSpan().TrimStart().StartsWith("www.", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>True if absolute HTTP/HTTPS URL or "www."-prefixed.</summary>
    public static bool IsAbsoluteHttpOrWwwUrl(this string? s)
    {
        return s.IsAbsoluteHttpUrl() || s.IsWwwPrefixed();
    }

    /// <summary>True if absolute HTTP/HTTPS URL or "www."-prefixed.</summary>
    public static bool IsNotAbsoluteHttpOrWwwUrl(this string? s)
    {
        return !IsAbsoluteHttpOrWwwUrl(s);
    }
}
