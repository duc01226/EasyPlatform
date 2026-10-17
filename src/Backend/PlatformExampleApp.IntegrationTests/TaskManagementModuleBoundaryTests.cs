using System.IO;
using FluentAssertions;

namespace PlatformExampleApp.IntegrationTests;

/// <summary>
/// Technical split-readiness and evidence-hygiene checks for the TaskManagement proof-of-concept.
/// They intentionally inspect only the module-owned source/project boundaries; standalone buildability is verified
/// by the Phase 15 build command because a test must not spawn a second build process for its own project graph.
/// </summary>
[Trait("Category", "ModularMonolith")]
public sealed class TaskManagementModuleBoundaryTests
{
    private static readonly string RepositoryRoot = FindRepositoryRoot();

    /// <summary>
    /// TC-SPLIT-201: the domain/application/persistence/API boundary contains no direct TextSnippet edge.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-SPLIT-201")]
    public void TaskManagementModuleBoundary_HasNoTextSnippetProjectOrSymbolEdge()
    {
        var moduleDirectories = new[]
        {
            "PlatformExampleApp.TaskManagement.Domain",
            "PlatformExampleApp.TaskManagement.Application",
            "PlatformExampleApp.TaskManagement.Persistence.Mongo",
            "PlatformExampleApp.TaskManagement.Api"
        };

        foreach (var moduleDirectory in moduleDirectories)
        {
            var directory = Path.Combine(
                RepositoryRoot,
                "src",
                "Backend",
                moduleDirectory);

            Directory.Exists(directory).Should().BeTrue($"the split boundary directory '{directory}' must exist");

            var sourceFiles = Directory
                .EnumerateFiles(directory, "*.*", SearchOption.AllDirectories)
                .Where(path => !path.Contains(Path.DirectorySeparatorChar + "bin" + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                .Where(path => !path.Contains(Path.DirectorySeparatorChar + "obj" + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                .Where(path => path.EndsWith(".cs", StringComparison.OrdinalIgnoreCase) ||
                               path.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase))
                .ToList();

            sourceFiles.Should().NotBeEmpty();
            foreach (var sourceFile in sourceFiles)
            {
                var source = File.ReadAllText(sourceFile);

                if (sourceFile.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase))
                {
                    source.Contains("TextSnippet", StringComparison.OrdinalIgnoreCase)
                        .Should()
                        .BeFalse($"{moduleDirectory} must remain extractable without a TextSnippet project dependency");
                    continue;
                }

                var codeLines = File.ReadLines(sourceFile)
                    .Where(line => !line.TrimStart().StartsWith("//", StringComparison.Ordinal))
                    .ToList();

                codeLines.Any(line => line.Contains("TextSnippet", StringComparison.OrdinalIgnoreCase))
                    .Should()
                    .BeFalse($"{moduleDirectory} must remain extractable without a TextSnippet symbol dependency");
            }
        }
    }

    /// <summary>
    /// TC-SPLIT-201: the standalone API composition remains an explicit TaskManagement-only root.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-SPLIT-201")]
    public void TaskManagementStandaloneComposition_IsSelfContained()
    {
        var projectPath = Path.Combine(
            RepositoryRoot,
            "src",
            "Backend",
            "PlatformExampleApp.TaskManagement.Api",
            "PlatformExampleApp.TaskManagement.Api.csproj");
        var modulePath = Path.Combine(
            RepositoryRoot,
            "src",
            "Backend",
            "PlatformExampleApp.TaskManagement.Api",
            "TaskManagementApiAspNetCoreModule.cs");

        File.Exists(projectPath).Should().BeTrue();
        File.Exists(modulePath).Should().BeTrue();

        var project = File.ReadAllText(projectPath);
        var module = File.ReadAllText(modulePath);

        project.Contains("TextSnippet", StringComparison.OrdinalIgnoreCase).Should().BeFalse();
        project.Should().Contain("PlatformExampleApp.TaskManagement.Application");
        project.Should().Contain("PlatformExampleApp.TaskManagement.Persistence.Mongo");
        module.Should().Contain("TaskManagementApplicationModule");
        module.Should().Contain("TaskManagementMongoPersistenceModule");
        module.Should().Contain("TaskBoardController");
    }

    /// <summary>
    /// TC-SEC-201: new integration proof source contains no embedded credentials or authorization material.
    /// The existing local appsettings fixture remains the sole configuration-owned local endpoint source.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-SEC-201")]
    public void Phase15EvidenceSources_DoNotEmbedCredentials()
    {
        var phase15SourceFiles = new[]
        {
            Path.Combine(
                RepositoryRoot,
                "src",
                "Backend",
                "PlatformExampleApp.IntegrationTests",
                "WebAppFactory",
                "ModularMonolithWebApplicationFactory.cs"),
            Path.Combine(
                RepositoryRoot,
                "src",
                "Backend",
                "PlatformExampleApp.IntegrationTests",
                "ModularMonolithCompositionIntegrationTests.cs")
        };

        foreach (var sourceFile in phase15SourceFiles)
        {
            File.Exists(sourceFile).Should().BeTrue();
            var source = File.ReadAllText(sourceFile);

            source.Contains("mongodb://", StringComparison.OrdinalIgnoreCase).Should().BeFalse();
            source.Contains("Password=", StringComparison.OrdinalIgnoreCase).Should().BeFalse();
            source.Contains("Authorization:", StringComparison.OrdinalIgnoreCase).Should().BeFalse();
            source.Contains("Bearer ", StringComparison.OrdinalIgnoreCase).Should().BeFalse();
        }
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory != null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "src", "Easy.Platform.sln")))
                return directory.FullName;

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException(
            "Could not locate src/Easy.Platform.sln from the integration-test output directory.");
    }
}
