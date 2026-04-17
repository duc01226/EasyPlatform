using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace PlatformExampleApp.IntegrationTests.WebAppFactory;

/// <summary>
/// WebApplicationFactory for TextSnippet HTTP-level integration tests.
///
/// <para>
/// <strong>When to use WAF vs Platform Fixture:</strong>
/// </para>
/// <list type="bullet">
/// <item>Use <see cref="TextSnippetWebApplicationFactory"/> (this class) for:
///   HTTP-layer concerns — routing, serialization, middleware, exception-to-status mapping,
///   authentication headers, and controller-level behavior.</item>
/// <item>Use <see cref="TextSnippetIntegrationTestFixture"/> (platform fixture) for:
///   CQRS-layer concerns — command/query validation, handler logic, entity events, background jobs.</item>
/// </list>
///
/// <para>
/// <strong>Autofac compatibility note (from bravoSURVEYS pattern):</strong>
/// Services using Autofac DI (delegate factories, ContainerBuilder modules) are incompatible
/// with <c>PlatformServiceIntegrationTestFixture</c> (Microsoft DI only). For those services,
/// WAF is the ONLY integration test option since it bootstraps the real <c>Program.cs</c>
/// pipeline including Autofac registration. TextSnippet uses Microsoft DI, so both patterns
/// are available as alternatives.
/// </para>
///
/// <para>
/// <strong>Auto-seeding:</strong>
/// WAF bootstraps the real <c>Program.cs</c> which registers <c>TextSnippetApiAspNetCoreModule</c>
/// (not the test module). <c>EnableAutomaticDataSeedingOnInit</c> defaults to <c>true</c> and
/// cannot be easily overridden here. Seeding is lightweight for TextSnippet and is accepted.
/// </para>
/// </summary>
internal sealed class TextSnippetWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        // Prevent port binding — TestServer handles requests in-memory.
        // Avoids conflicts with a locally running TextSnippet API on port 5001.
        builder.UseUrls();
    }
}

/// <summary>
/// xUnit collection fixture — shares one WAF instance across all WAF test classes.
/// </summary>
public sealed class TextSnippetWebAppFactoryFixture : IAsyncLifetime, IDisposable
{
    private TextSnippetWebApplicationFactory? factory;

    public HttpClient CreateClient()
    {
        return factory!.CreateClient(new WebApplicationFactoryClientOptions
        {
            // AllowAutoRedirect=false to observe raw redirects in tests
            AllowAutoRedirect = false,
        });
    }

    public IServiceProvider Services => factory!.Services;

    public async Task InitializeAsync()
    {
        factory = new TextSnippetWebApplicationFactory();

        // Force the host to start so the DI container is fully initialized
        using var scope = factory.Services.CreateScope();
        await Task.CompletedTask;
    }

    public Task DisposeAsync()
    {
        Dispose();
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        factory?.Dispose();
        factory = null;
    }
}

/// <summary>
/// xUnit collection definition for WAF-based HTTP tests.
/// Separate collection from the platform fixture tests — WAF boots its own DI container.
/// </summary>
[CollectionDefinition(Name)]
public class TextSnippetWebAppFactoryCollection : ICollectionFixture<TextSnippetWebAppFactoryFixture>
{
    public const string Name = "TextSnippet WebAppFactory Tests";
}
