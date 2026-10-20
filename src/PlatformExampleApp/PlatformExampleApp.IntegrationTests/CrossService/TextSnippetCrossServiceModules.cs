using Microsoft.Extensions.Configuration;

namespace PlatformExampleApp.IntegrationTests.CrossService;

/// <summary>
/// Marker module for the "producer" side of the TextSnippet cross-service POC.
///
/// <para>
/// <strong>Why two separate module subclasses:</strong>
/// <see cref="Easy.Platform.AutomationTest.IntegrationTests.PlatformServiceIntegrationTestBase{TServiceModule}"/>
/// uses a static <c>ServiceProvider</c> keyed on the closed generic type <c>TServiceModule</c>.
/// Subclassing <see cref="TextSnippetIntegrationTestAspNetCoreModule"/> produces distinct closed-generic
/// types, which boots two independent DI containers — even though both point to the same DB.
/// This structurally mirrors a real multi-service cross-service fixture.
/// </para>
/// </summary>
public sealed class TextSnippetCrossServiceProducerModule : TextSnippetIntegrationTestAspNetCoreModule
{
    public TextSnippetCrossServiceProducerModule(IServiceProvider sp, IConfiguration config)
        : base(sp, config) { }
}

/// <summary>
/// Marker module for the "consumer" side of the TextSnippet cross-service POC.
/// See <see cref="TextSnippetCrossServiceProducerModule"/> for the isolation rationale.
/// </summary>
public sealed class TextSnippetCrossServiceConsumerModule : TextSnippetIntegrationTestAspNetCoreModule
{
    public TextSnippetCrossServiceConsumerModule(IServiceProvider sp, IConfiguration config)
        : base(sp, config) { }
}
