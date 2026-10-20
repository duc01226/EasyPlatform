#region

using Easy.Platform.AutomationTest.IntegrationTests;

#endregion

namespace PlatformExampleApp.IntegrationTests;

/// <summary>
/// Integration test fixture for the TextSnippet service.
/// Manages DI container lifecycle across all test classes in the collection.
/// </summary>
public class TextSnippetIntegrationTestFixture : PlatformServiceIntegrationTestFixture<TextSnippetIntegrationTestAspNetCoreModule>
{
    public override string FallbackAspCoreEnvironmentValue()
    {
        return "Development";
    }
}

/// <summary>
/// xUnit collection definition for TextSnippet integration tests.
/// All test classes using [Collection(TextSnippetIntegrationTestCollection.Name)] share the same fixture.
/// </summary>
[CollectionDefinition(Name)]
public class TextSnippetIntegrationTestCollection : ICollectionFixture<TextSnippetIntegrationTestFixture>
{
    public const string Name = "TextSnippet Integration Tests";
}
