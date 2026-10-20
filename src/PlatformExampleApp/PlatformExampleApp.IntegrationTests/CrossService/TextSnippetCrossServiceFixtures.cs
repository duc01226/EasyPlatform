#region

using Easy.Platform.AutomationTest.IntegrationTests;
using Xunit;

#endregion

namespace PlatformExampleApp.IntegrationTests.CrossService;

/// <summary>
/// Fixture for the "producer" service in the TextSnippet cross-service POC.
/// Boots <see cref="TextSnippetCrossServiceProducerModule"/> — a distinct DI container
/// that simulates the writing side of a cross-service scenario.
/// </summary>
public sealed class TextSnippetCrossServiceProducerFixture
    : PlatformServiceIntegrationTestFixture<TextSnippetCrossServiceProducerModule>
{
    public override string FallbackAspCoreEnvironmentValue() => "Development";
}

/// <summary>
/// Fixture for the "consumer" service in the TextSnippet cross-service POC.
/// Boots <see cref="TextSnippetCrossServiceConsumerModule"/> — a separate DI container
/// that simulates the reading/assertion side of a cross-service scenario.
/// </summary>
public sealed class TextSnippetCrossServiceConsumerFixture
    : PlatformServiceIntegrationTestFixture<TextSnippetCrossServiceConsumerModule>
{
    public override string FallbackAspCoreEnvironmentValue() => "Development";
}

/// <summary>
/// Composing cross-service fixture that boots both producer and consumer containers.
///
/// <para>
/// <strong>POC for PlatformCrossServiceFixture pattern:</strong>
/// In a real cross-service scenario (e.g., Accounts + Growth), each fixture boots a different
/// service module pointing to a different database. Here both modules point to the same TextSnippet DB,
/// but the structural pattern — two independent DI containers, sequential init, WaitUntilAsync
/// for cross-service assertions — is identical to the production pattern.
/// </para>
///
/// <para>
/// <strong>Container isolation:</strong>
/// <see cref="ProducerServiceProvider"/> and <see cref="ConsumerServiceProvider"/> are distinct
/// <see cref="IServiceProvider"/> instances because the static container in
/// <c>PlatformServiceIntegrationTestBase&lt;TModule&gt;</c> is keyed on the closed generic type.
/// </para>
/// </summary>
public sealed class TextSnippetCrossServiceFixture : PlatformCrossServiceFixture
{
    protected override IReadOnlyList<Type> GetFixtureTypes()
        => [typeof(TextSnippetCrossServiceProducerFixture), typeof(TextSnippetCrossServiceConsumerFixture)];

    /// <summary>
    /// Producer ServiceProvider — from <c>PlatformServiceIntegrationTestBase&lt;TextSnippetCrossServiceProducerModule&gt;</c>.
    /// </summary>
    public IServiceProvider ProducerServiceProvider
        => GetFixture<TextSnippetCrossServiceProducerFixture>().ServiceProvider;

    /// <summary>
    /// Consumer ServiceProvider — from <c>PlatformServiceIntegrationTestBase&lt;TextSnippetCrossServiceConsumerModule&gt;</c>.
    /// </summary>
    public IServiceProvider ConsumerServiceProvider
        => GetFixture<TextSnippetCrossServiceConsumerFixture>().ServiceProvider;
}

/// <summary>
/// xUnit collection definition for TextSnippet cross-service integration tests.
/// Separate collection from platform fixture tests — boots its own combined DI containers.
/// </summary>
[CollectionDefinition(Name)]
public class TextSnippetCrossServiceIntegrationTestCollection : ICollectionFixture<TextSnippetCrossServiceFixture>
{
    public const string Name = "TextSnippet CrossService Integration Tests";
}
