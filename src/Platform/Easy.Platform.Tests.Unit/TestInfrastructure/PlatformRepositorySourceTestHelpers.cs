namespace Easy.Platform.Tests.Unit.TestInfrastructure;

/// <summary>
/// Locates files in the REPOSITORY SOURCE TREE from a test running out of <c>bin/</c>.
/// <para>
/// Some invariants cannot be checked by reflection because they are not expressed in metadata — a layering rule
/// violated by a <c>using</c> directive or a reference inside a method body leaves no trace on a type's base type,
/// interfaces, fields or signatures. Those rules can only be checked against the source text, which means a test
/// has to find the source tree first.
/// </para>
/// <para>
/// Written once here rather than inlined per suite: this repository already carries a dozen-plus private copies of
/// the same upward walk (for example <c>UtilTaskRunnerRetryTests.ReadRepositoryFile</c>), and adding one more copy
/// per new source-level guard makes a future change to the anchoring strategy an N-site edit. Deliberately placed
/// beside <see cref="PlatformAssemblyScanTestHelpers" /> instead of on the shared unit-test base class, so adding a
/// source-level guard never edits a type every platform test inherits from.
/// </para>
/// </summary>
internal static class PlatformRepositorySourceTestHelpers
{
    /// <summary>
    /// Walks up from <see cref="AppContext.BaseDirectory" /> until <paramref name="relativePath" /> resolves to an
    /// existing directory, and returns it.
    /// </summary>
    /// <remarks>
    /// THROWS when the directory cannot be found — it never returns null and the caller must never turn a miss into
    /// a skip. A guard that silently passes because it could not find the thing it guards is worse than no guard:
    /// it reports green forever while checking nothing, and the first person to read the result trusts it.
    /// </remarks>
    public static DirectoryInfo FindRepositoryDirectory(string relativePath)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory != null)
        {
            var candidatePath = Path.Combine(directory.FullName, relativePath);
            if (Directory.Exists(candidatePath))
                return new DirectoryInfo(candidatePath);

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException(
            $"Could not locate repository directory '{relativePath}' by walking up from '{AppContext.BaseDirectory}'. "
            + "This guard checks the SOURCE TREE, so it cannot run without it. Fix the anchor rather than skipping the test — "
            + "a source-level guard that cannot find its source must fail, never silently pass.");
    }
}
