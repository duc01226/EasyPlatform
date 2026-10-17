using System.Collections.ObjectModel;

namespace Easy.Platform.Common;

/// <summary>
/// Indicates that a strict platform module composition is invalid before application readiness.
/// </summary>
public sealed class PlatformModuleCompositionException : Exception
{
    /// <summary>
    /// Initializes a new instance using deterministic, already-redacted diagnostics.
    /// </summary>
    /// <param name="diagnostics">Type/key/lane diagnostics. Configuration values and payloads are not permitted.</param>
    public PlatformModuleCompositionException(IEnumerable<string> diagnostics)
        : base(BuildMessage(diagnostics))
    {
        Diagnostics = NormalizeDiagnostics(diagnostics);
    }

    /// <summary>
    /// Gets the deterministic composition diagnostics.
    /// </summary>
    public IReadOnlyList<string> Diagnostics { get; }

    private static string BuildMessage(IEnumerable<string> diagnostics)
    {
        var normalizedDiagnostics = NormalizeDiagnostics(diagnostics);

        return normalizedDiagnostics.Count == 0
            ? "Platform module composition is invalid."
            : $"Platform module composition is invalid: {string.Join(" ", normalizedDiagnostics)}";
    }

    private static ReadOnlyCollection<string> NormalizeDiagnostics(IEnumerable<string> diagnostics)
    {
        ArgumentNullException.ThrowIfNull(diagnostics);

        return diagnostics
            .Where(diagnostic => !string.IsNullOrWhiteSpace(diagnostic))
            .Distinct(StringComparer.Ordinal)
            .OrderBy(diagnostic => diagnostic, StringComparer.Ordinal)
            .ToList()
            .AsReadOnly();
    }
}
