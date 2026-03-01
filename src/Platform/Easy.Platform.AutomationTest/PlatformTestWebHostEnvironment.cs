using System.IO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;

namespace Easy.Platform.AutomationTest;

/// <summary>
/// Platform implementation of IWebHostEnvironment for integration testing.
/// Provides a reusable mock hosting environment across all platform integration tests.
/// Used by both BDD automation tests (<see cref="BaseStartup"/>) and integration tests
/// (<see cref="IntegrationTests.PlatformServiceIntegrationTestBase{TServiceModule}"/>).
/// </summary>
public class PlatformTestWebHostEnvironment : IWebHostEnvironment
{
    public string ApplicationName { get; set; } = string.Empty;
    public IFileProvider ContentRootFileProvider { get; set; } = null!;
    public string ContentRootPath { get; set; } = string.Empty;
    public string EnvironmentName { get; set; } = string.Empty;
    public IFileProvider WebRootFileProvider { get; set; } = null!;
    public string WebRootPath { get; set; } = string.Empty;

    /// <summary>
    /// Creates a fully configured PlatformTestWebHostEnvironment instance.
    /// </summary>
    public static PlatformTestWebHostEnvironment Create(string applicationName, string environmentName, string contentRootPath, string webRootPath)
    {
        if (!Directory.Exists(webRootPath))
            Directory.CreateDirectory(webRootPath);

        return new PlatformTestWebHostEnvironment
        {
            ApplicationName = applicationName,
            EnvironmentName = environmentName,
            ContentRootPath = contentRootPath,
            WebRootPath = webRootPath,
            ContentRootFileProvider = new PhysicalFileProvider(contentRootPath),
            WebRootFileProvider = new PhysicalFileProvider(webRootPath)
        };
    }
}
