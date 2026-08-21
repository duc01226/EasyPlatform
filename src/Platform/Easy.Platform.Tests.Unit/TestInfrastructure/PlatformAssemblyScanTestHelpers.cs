using System.Reflection;

namespace Easy.Platform.Tests.Unit.TestInfrastructure;

/// <summary>
/// The tolerant-assembly-load step shared by the platform's reflection-driven type-contract suites (repository,
/// message-bus consumer, and any future census over an <see cref="Assembly" /> set). Written once here instead of
/// once per suite so a future change to the tolerance behaviour (e.g. also swallowing a different load exception,
/// or logging the types that failed to load) is a single edit instead of one per call site.
/// <para>
/// Deliberately NOT applied to every assembly-scan suite in this project: some suites intentionally call
/// <see cref="Assembly.GetTypes" /> directly so a <see cref="ReflectionTypeLoadException" /> fails that suite loudly
/// instead of silently shrinking its discovered set — that is a real behavioural choice per suite, not omitted
/// duplication.
/// </para>
/// </summary>
internal static class PlatformAssemblyScanTestHelpers
{
    /// <summary>
    /// Returns every type <paramref name="assembly" /> exposes, tolerating a partial load: an assembly with an
    /// optional dependency that is not present at test time throws <see cref="ReflectionTypeLoadException" /> from
    /// <see cref="Assembly.GetTypes" /> while still exposing every type that DID load. Failing an entire discovery
    /// suite because one unrelated type in a large assembly could not be loaded would be a false negative, so the
    /// loadable subset is returned instead.
    /// </summary>
    public static IEnumerable<Type> GetLoadableTypes(Assembly assembly)
    {
        try
        {
            return assembly.GetTypes();
        }
        catch (ReflectionTypeLoadException ex)
        {
            return ex.Types.Where(type => type != null)!;
        }
    }
}
