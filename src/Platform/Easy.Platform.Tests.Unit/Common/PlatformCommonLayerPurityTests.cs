using Easy.Platform.Tests.Unit.Base;
using Easy.Platform.Tests.Unit.TestInfrastructure;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common;

/// <summary>
/// Guards the layering invariant that <c>Easy.Platform/Common</c> depends on NOTHING in
/// <c>Easy.Platform.Application</c>.
///
/// <para><strong>Why this needs a test at all.</strong> <c>Common</c> and <c>Application</c> ship in the SAME
/// assembly (<c>Easy.Platform.csproj</c>), so there is no project reference for a build to reject and no assembly
/// reference for a tool to inspect. The rule is real but invisible to the compiler: one <c>using
/// Easy.Platform.Application...</c> inside <c>Common</c> restores the coupling and everything still builds, still
/// runs, and still passes review. The dependency direction is only enforceable by something that reads the source.</para>
///
/// <para><strong>Why the check is TEXTUAL rather than reflective.</strong> Checked against the seven real
/// violations that existed before the decoupling: four were XML-doc <c>see cref</c> references and the only
/// remaining runtime use was a <c>typeof(...)</c> expression inside a METHOD BODY. Base types, interfaces, fields,
/// properties and method signatures were all clean throughout. A reflection pass over the declarative surface would
/// have reported zero violations while every one of them was present, so it would have been a guard that could not
/// fail. A source scan sees usings, method bodies and doc comments alike.</para>
///
/// <para><strong>What this does NOT do — do not over-trust it.</strong>
/// (1) It is not ENFORCED: the only pipeline step that runs <c>dotnet test</c> targets the E2E automation
/// project (<c>automation-systemtest-azure-pipelines.yml:45-52</c>), never this unit suite, so this guard fails
/// only for someone who already runs the suite locally. Wiring a CI test gate is tracked separately.
/// (2) It is textual, so a fully-qualified alias, a <c>global using</c> in another file, or reflection-by-string
/// would evade it.
/// (3) It proves direction, not absence of coupling in general — <c>Common</c> can still be coupled to
/// <c>Application</c> concepts through shared vocabulary without naming the namespace.</para>
///
/// <para>Traceability: TECHNICAL-ONLY id <c>TC-PLATLAYER-001</c>.</para>
/// </summary>
public class PlatformCommonLayerPurityTests : PlatformUnitTestBase
{
    private const string CommonSourceRelativePath = "src/Platform/Easy.Platform/Common";

    private const string ForbiddenNamespace = "Easy.Platform.Application";

    /// <summary>
    /// Opt-out marker for the rare line that must name the namespace without depending on it — most obviously a
    /// comment explaining this very rule. Without an escape hatch the first such comment reds the suite and the
    /// next person deletes the guard instead of the comment.
    /// </summary>
    private const string AllowMarker = "layer-guard:allow";

    [Fact]
    public void CommonLayerSource_MustNotReferenceTheApplicationLayer()
    {
        var commonSourceDirectory = PlatformRepositorySourceTestHelpers.FindRepositoryDirectory(CommonSourceRelativePath);

        var violations = commonSourceDirectory
            .EnumerateFiles("*.cs", SearchOption.AllDirectories)
            .SelectMany(file =>
                File.ReadAllLines(file.FullName)
                    .Select((lineText, lineIndex) => (lineText, lineNumber: lineIndex + 1))
                    .Where(line => line.lineText.Contains(ForbiddenNamespace, StringComparison.Ordinal))
                    .Where(line => !line.lineText.Contains(AllowMarker, StringComparison.OrdinalIgnoreCase))
                    .Select(line =>
                        $"{Path.GetRelativePath(commonSourceDirectory.FullName, file.FullName)}:{line.lineNumber}: {line.lineText.Trim()}"))
            .ToList();

        violations
            .Should()
            .BeEmpty(
                "the Common layer must not depend on the Application layer — they share one assembly, so nothing else "
                + $"catches this. Remove the reference, or append the '{AllowMarker}' marker to the line if it genuinely "
                + $"names the namespace without depending on it.{Environment.NewLine}"
                + string.Join(Environment.NewLine, violations));
    }

    /// <summary>
    /// The guard must be pointed at real source. If the scan silently found nothing to read, the assertion above
    /// would pass vacuously forever, which is the specific failure mode that makes an unenforced guard dangerous.
    /// </summary>
    [Fact]
    public void CommonLayerSourceScan_MustActuallyFindSourceFilesToScan()
    {
        var commonSourceDirectory = PlatformRepositorySourceTestHelpers.FindRepositoryDirectory(CommonSourceRelativePath);

        commonSourceDirectory
            .EnumerateFiles("*.cs", SearchOption.AllDirectories)
            .Should()
            .HaveCountGreaterThan(
                50,
                "the Common layer contains hundreds of source files; a near-empty scan means the anchor resolved to the "
                + "wrong directory and the purity assertion is passing without checking anything");
    }
}
