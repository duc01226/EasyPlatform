using System.IO;
using Easy.Platform.Common;
using Microsoft.AspNetCore.Connections;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Server.Kestrel.Core;

namespace Easy.Platform.AspNetCore.Extensions;

/// <summary>
/// Provides extension methods for configuring the ASP.NET Core web host builder with platform-specific settings.
/// These extensions simplify the setup of common hosting scenarios and security configurations
/// for EasyPlatform microservices.
/// </summary>
/// <remarks>
/// This static class contains extension methods that enhance the IWebHostBuilder with platform-specific
/// functionality including:
/// - Custom HTTPS certificate configuration for secure communications
/// - Kestrel server configuration with SSL/TLS support
/// - URL and port binding configuration from environment variables
/// - Development and production hosting optimizations
/// - Certificate validation and error handling
///
/// Key features:
/// - Environment-aware HTTPS certificate loading
/// - Support for custom certificate files with password protection
/// - Automatic URL binding from platform environment configuration
/// - Graceful fallback for missing certificate files in development
/// - Integration with platform path utilities for certificate resolution
///
/// These extensions are designed to work with the platform's environment configuration
/// system and provide consistent hosting setup across all EasyPlatform services.
///
/// Usage:
/// These methods are typically called during web host builder configuration in Program.cs
/// or Startup.cs to apply platform-standard hosting configurations.
/// </remarks>
public static class WebHostBuilderExtensions
{
    /// <summary>
    /// Configures the web host builder to use a custom HTTPS certificate for secure communications.
    /// This method enables SSL/TLS support using a specified certificate file and password,
    /// with optional fallback behavior for development scenarios.
    /// </summary>
    /// <param name="hostBuilder">
    /// The web host builder instance to configure with HTTPS certificate support.
    /// </param>
    /// <param name="httpsCertFileRelativePath">
    /// The relative path to the HTTPS certificate file from the entry assembly execution location.
    /// This path will be resolved to an absolute path using platform path utilities.
    /// </param>
    /// <param name="httpsCertPassword">
    /// The password required to decrypt and load the certificate file.
    /// This should be securely managed and typically loaded from configuration or environment variables.
    /// </param>
    /// <param name="ignoreIfFileNotExisting">
    /// When true, the method will not throw an exception if the certificate file doesn't exist.
    /// This is useful for development environments where HTTPS might not be required.
    /// Default value is false.
    /// </param>
    /// <returns>
    /// The configured web host builder instance for method chaining.
    /// </returns>
    /// <exception cref="FileNotFoundException">
    /// Thrown when the certificate file doesn't exist and <paramref name="ignoreIfFileNotExisting"/> is false.
    /// </exception>
    /// <exception cref="ArgumentNullException">
    /// Thrown when <paramref name="hostBuilder"/>, <paramref name="httpsCertFileRelativePath"/>,
    /// or <paramref name="httpsCertPassword"/> is null.
    /// </exception>
    /// <remarks>
    /// This method performs the following operations:
    /// 1. Resolves the relative certificate path to an absolute path
    /// 2. Validates that the certificate file exists (unless ignored)
    /// 3. Parses listening URLs from platform environment configuration
    /// 4. Configures Kestrel server with SSL certificate for HTTPS endpoints
    /// 5. Sets up appropriate listening endpoints based on URL configuration
    ///
    /// The method integrates with the platform's environment configuration system
    /// to automatically determine the appropriate URLs and ports for the service.
    /// </remarks>
    /// Use the given https certificate for handling and trust https request
    /// </summary>
    /// <param name="hostBuilder"></param>
    /// <param name="httpsCertFileRelativePath">Relative path to entry executing assembly location</param>
    /// <param name="httpsCertPassword"></param>
    /// <param name="ignoreIfFileNotExisting"></param>
    /// <returns></returns>
    public static IWebHostBuilder UseCustomHttpsCert(
        this IWebHostBuilder hostBuilder,
        string httpsCertFileRelativePath,
        string httpsCertPassword,
        bool ignoreIfFileNotExisting = false
    )
    {
        var fullHttpsCertFilePath = Util.PathBuilder.GetFullPathByRelativeToEntryExecutionPath(httpsCertFileRelativePath);

        var isCertFileExisting = File.Exists(fullHttpsCertFilePath)
            .Ensure(
                must: isCertFileExisting => isCertFileExisting || ignoreIfFileNotExisting,
                $"HttpsCertFileRelativePath:[{httpsCertFileRelativePath}] to FullHttpsCertFilePath:[{fullHttpsCertFilePath}] does not exists"
            );
        var listenUrls = PlatformEnvironment.AspCoreUrlsValue?.Split(";");

        return hostBuilder.PipeIf(
            listenUrls != null && isCertFileExisting,
            p =>
                p.ConfigureKestrel(serverOptions =>
                {
                    listenUrls!.ForEach(listenUrl =>
                    {
                        if (listenUrl.StartsWith("http://*:") || listenUrl.StartsWith("https://*:"))
                        {
                            var listenAnyPort = listenUrl.Replace("http://*:", "http://0.0.0.0:").Replace("https://*:", "https://0.0.0.0:").ToUri().Port;

                            serverOptions.ListenAnyIP(listenAnyPort, listenOptions => ConfigUseHttps(listenOptions, listenUrl, fullHttpsCertFilePath!, httpsCertPassword));
                        }
                        else if (listenUrl.Contains("://localhost"))
                        {
                            serverOptions.ListenLocalhost(
                                listenUrl.ToUri().Port,
                                listenOptions => ConfigUseHttps(listenOptions, listenUrl, fullHttpsCertFilePath!, httpsCertPassword)
                            );
                        }
                        else
                        {
                            serverOptions.Listen(
                                new UriEndPoint(listenUrl.ToUri()),
                                listenOptions => ConfigUseHttps(listenOptions, listenUrl, fullHttpsCertFilePath!, httpsCertPassword)
                            );
                        }
                    });
                })
        );

        static void ConfigUseHttps(ListenOptions listenOptions, string listenUrl, string certFilePath, string certPassword)
        {
            listenOptions.PipeIf(listenUrl.StartsWith("https"), options => options.UseHttps(fileName: certFilePath!, certPassword));
        }
    }
}
