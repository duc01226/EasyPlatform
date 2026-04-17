#region

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries;

#endregion

namespace PlatformExampleApp.IntegrationTests.WebAppFactory;

/// <summary>
/// HTTP-layer integration tests using WebApplicationFactory.
/// Verifies routing, serialization, and middleware behavior via real HTTP calls against
/// the in-memory TestServer — no CQRS layer bypass.
///
/// <para>
/// <strong>When to use this pattern vs platform fixture:</strong>
/// Use WAF tests for HTTP-layer concerns (routing, status codes, request/response serialization,
/// middleware, exception-to-status mapping). Use <see cref="TextSnippetIntegrationTestBase"/>
/// for CQRS-layer concerns (handler logic, entity events, domain validation).
/// </para>
///
/// <para>
/// <strong>JSON format:</strong>
/// The TextSnippet API uses <c>useCamelCaseNaming: false</c> (PascalCase JSON).
/// Request and response bodies use PascalCase property names.
/// </para>
/// </summary>
[Collection(TextSnippetWebAppFactoryCollection.Name)]
[Trait("Category", "WebAppFactory")]
public class TextSnippetWebAppFactoryIntegrationTests
{
    private readonly TextSnippetWebAppFactoryFixture fixture;

    // PascalCase JSON matches the API's useCamelCaseNaming:false configuration
    private static readonly JsonSerializerOptions PascalCaseOptions = new()
    {
        PropertyNamingPolicy = null,
        PropertyNameCaseInsensitive = true,
    };

    public TextSnippetWebAppFactoryIntegrationTests(TextSnippetWebAppFactoryFixture fixture)
    {
        this.fixture = fixture;
    }

    /// <summary>
    /// POST /api/TextSnippet/save creates a new snippet and returns a 200 response
    /// with a non-empty SavedData.Id.
    ///
    /// <para>
    /// Verifies the full HTTP stack: routing → controller → CQRS command → handler → DB write.
    /// </para>
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-026")]
    public async Task Save_ValidRequest_ShouldReturn200WithNonEmptyId()
    {
        // Arrange
        var client = fixture.CreateClient();
        var snippetText = IntegrationTestHelper.UniqueName("WafCreate");

        var command = new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto
            {
                SnippetText = snippetText,
                FullText = "waf-test full text",
            },
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/TextSnippet/save", command, PascalCaseOptions);

        // Assert — HTTP layer
        response.StatusCode.Should().Be(HttpStatusCode.OK,
            "POST /api/TextSnippet/save with valid data must return 200 OK");

        var result = await response.Content.ReadFromJsonAsync<SaveSnippetTextCommandResult>(PascalCaseOptions);

        result.Should().NotBeNull("response body must deserialize to SaveSnippetTextCommandResult");
        result!.SavedData.Should().NotBeNull("SavedData must be present in the response");
        result.SavedData.Id.Should().NotBeNullOrEmpty(
            "SavedData.Id must be non-empty — handler assigns a new Ulid on create");
        result.SavedData.SnippetText.Should().Be(snippetText,
            "SavedData.SnippetText must echo the value from the request");
    }

    /// <summary>
    /// GET /api/TextSnippet/search returns the seeded snippet when searched by SnippetText.
    ///
    /// <para>
    /// Seeds a snippet via POST /save, then verifies GET /search finds it — confirming
    /// the read path (query handler + DB read) works correctly over HTTP.
    /// </para>
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-027")]
    public async Task Search_SeededSnippet_ShouldReturnMatchingItems()
    {
        // Arrange — seed a snippet via the save endpoint
        var client = fixture.CreateClient();
        var snippetText = IntegrationTestHelper.UniqueName("WafSearch");

        var saveCommand = new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto
            {
                SnippetText = snippetText,
                FullText = "waf-search full text",
            },
        };

        var saveResponse = await client.PostAsJsonAsync("/api/TextSnippet/save", saveCommand, PascalCaseOptions);
        saveResponse.StatusCode.Should().Be(HttpStatusCode.OK, "seed save must succeed");

        // Act — search by the unique snippet text
        var searchUrl = $"/api/TextSnippet/search?SearchText={Uri.EscapeDataString(snippetText)}";
        var searchResponse = await client.GetAsync(searchUrl);

        // Assert
        searchResponse.StatusCode.Should().Be(HttpStatusCode.OK,
            "GET /api/TextSnippet/search must return 200 OK");

        var result = await searchResponse.Content.ReadFromJsonAsync<SearchSnippetTextQueryResult>(PascalCaseOptions);

        result.Should().NotBeNull("response body must deserialize to SearchSnippetTextQueryResult");
        result!.Items.Should().NotBeNull("Items list must be present");
        result.Items.Should().Contain(
            item => item.SnippetText == snippetText,
            $"search results must include the snippet seeded with SnippetText='{snippetText}'");
    }

    /// <summary>
    /// POST /api/TextSnippet/save with invalid data (null Data property) returns a
    /// non-success status code, verifying that validation middleware converts
    /// PlatformValidationException to an error response.
    ///
    /// <para>
    /// SaveSnippetTextCommand.Validate() enforces <c>Data != null</c>.
    /// PlatformExceptionHandlerMiddleware maps PlatformValidationException to 400.
    /// </para>
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-028")]
    public async Task Save_NullData_ShouldReturnErrorResponse()
    {
        // Arrange — command with null Data to trigger "Data must be not null." validation
        var client = fixture.CreateClient();

        var command = new SaveSnippetTextCommand
        {
            Data = null!, // intentionally invalid — triggers PlatformValidationException
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/TextSnippet/save", command, PascalCaseOptions);

        // Assert — must NOT be 2xx; validation exceptions map to 400 Bad Request
        response.IsSuccessStatusCode.Should().BeFalse(
            "SaveSnippetTextCommand with null Data must fail validation — " +
            "PlatformExceptionHandlerMiddleware maps PlatformValidationException to 4xx");
    }
}
