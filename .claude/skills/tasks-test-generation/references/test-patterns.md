# Test Patterns Reference

Additional patterns extending the base 5 patterns in SKILL.md.

---

## Pattern 6: Docker-compose Integration Test

Use when testing against a running docker-compose stack. No teardown needed — UUID-based data isolation prevents conflicts.

**Prerequisites:**
- `docker-compose -f src/platform-example-app.docker-compose.yml -f src/platform-example-app.docker-compose.override.yml -p easyplatform-example up -d`
- API reachable at `http://localhost:5001`
- Extends `TextSnippetIntegrationTestBase` which handles health checking

**Example test class:**

```csharp
using Easy.Platform.IntegrationTest;
using PlatformExampleApp.Tests.Integration.Infrastructure;

namespace PlatformExampleApp.Tests.Integration.TextSnippet;

/// <summary>
/// Integration tests against the full docker-compose stack.
/// No teardown — UUID-isolated data prevents conflicts between runs.
/// Uses typed deserialization (PostAsync/GetAsync) — NOT raw JSON parsing.
/// </summary>
[Trait("Category", "Integration")]
public class TextSnippetCrudTests : TextSnippetIntegrationTestBase
{
    [Fact]
    [Trait("TestCase", "TC-SNP-CRT-001")]
    public async Task SaveSnippet_ValidData_ReturnsCreatedSnippet()
    {
        // Arrange — UUID isolates this test's data
        var uniqueText = TestDataHelper.GenerateTestText("CRUD Test");
        var fullText = TestDataHelper.GenerateTestText("CRUD FullText");

        // Act — use typed PostAsync, NOT PostRawAsync
        var result = await Api.PostAsync<object, SaveSnippetTextCommandResult>(
            TextSnippetApiEndpoints.SnippetSave,
            new { Data = new { SnippetText = uniqueText, FullText = fullText } });

        // Assert — verify domain fields, NOT just HTTP status
        result.SavedData.Should().NotBeNull("response must contain savedData");

        result.SavedData.Id.Should().NotBeNullOrEmpty(
            "newly created snippet must have an assigned id");

        result.SavedData.SnippetText.Should().Be(uniqueText,
            "returned snippetText must match the submitted value");
    }

    [Fact]
    [Trait("TestCase", "TC-SNP-SRC-001")]
    public async Task SearchSnippet_ByText_ReturnsMatchingResults()
    {
        // Arrange — create first, then search
        var uniqueText = TestDataHelper.GenerateTestText("Search Test");

        await Api.PostAsync<object, SaveSnippetTextCommandResult>(
            TextSnippetApiEndpoints.SnippetSave,
            new { Data = new { SnippetText = uniqueText, FullText = "Searchable content" } });

        // Act — use typed GetAsync, NOT GetRawAsync
        var searchResult = await Api.GetAsync<SearchSnippetTextQueryResult>(
            $"{TextSnippetApiEndpoints.SnippetSearch}?searchText={Uri.EscapeDataString(uniqueText)}&skipCount=0&maxResultCount=10");

        // Assert — verify domain data, NOT just HTTP status
        searchResult.Items.Should().NotBeEmpty(
            "search should find the snippet we just created");

        searchResult.Items.Should().Contain(
            item => item.SnippetText == uniqueText,
            "search results must contain an item with our unique snippetText");
    }
}
```

**Key rules:**
- Always use `TestDataHelper.GenerateTestId()` / `GenerateTestText()` / `GenerateTestName()` — never hardcode names
- Extend `TextSnippetIntegrationTestBase` — it handles HttpClient and health check via `IAsyncLifetime`
- No `[Cleanup]` or teardown — docker-compose environment accumulates test data harmlessly
- Tests are fully independent — any ordering, any parallelism
- Use `[Trait("TestCase", "TC-XXX")]` for TC-ID traceability

---

## Pattern 7: WaitUntil Assertion

Use when testing async operations that complete out-of-band (message bus consumers, background jobs). Poll the API until the expected state appears or timeout expires.

**API:** `Util.TaskRunner.TryWaitUntilAsync` returns `Task<bool>` (false on timeout). `WaitUntilAsync` throws `TimeoutException` on timeout.

**Parameters:**
- `maxWaitSeconds` — total timeout (default: 30s)
- `waitIntervalSeconds` — polling interval (default: 2s)
- `waitForMsg` — descriptive message for timeout errors

**Example — wait for message bus event processing:**

```csharp
using Easy.Platform.Common.Utils;
using Easy.Platform.IntegrationTest;
using FluentAssertions;
using PlatformExampleApp.Tests.Integration.Infrastructure;

namespace PlatformExampleApp.Tests.Integration.TextSnippet;

[Trait("Category", "Integration")]
public class MessageBusTests : TextSnippetIntegrationTestBase
{
    [Fact]
    [Trait("TestCase", "INT-004")]
    public async Task SaveSnippet_MessageBusConsumer_ProcessesEvent()
    {
        // Arrange
        var uniqueText = TestDataHelper.GenerateTestText("MsgBus Test");

        // Act — save triggers entity event → producer → RabbitMQ → consumer
        await Api.PostAsync<object, SaveSnippetTextCommandResult>(
            TextSnippetApiEndpoints.SnippetSave,
            new { Data = new { SnippetText = uniqueText, FullText = "Message bus test" } });

        // Assert — poll until consumer has processed (search returns the item with matching text)
        var found = await Util.TaskRunner.TryWaitUntilAsync(
            condition: async () =>
            {
                var searchResult = await Api.GetAsync<SearchSnippetTextQueryResult>(
                    $"{TextSnippetApiEndpoints.SnippetSearch}?searchText={Uri.EscapeDataString(uniqueText)}&skipCount=0&maxResultCount=10");
                return searchResult.Items.Any(item => item.SnippetText == uniqueText);
            },
            maxWaitSeconds: 30,
            waitIntervalSeconds: 2,
            waitForMsg: "Message bus consumer to process entity event");

        found.Should().BeTrue("message bus consumer should process entity event within 30s");
    }
}
```

**Configuration table:**

| Scenario | `maxWaitSeconds` | `waitIntervalSeconds` |
|---|---|---|
| Message bus consumer | 30 | 2 |
| Background job (fast) | 60 | 3 |
| Background job (slow/paged) | 120 | 5 |
| Search index update | 15 | 1 |

**Key rules:**
- Use `TryWaitUntilAsync` when you want a boolean result (no exception on timeout)
- Use `WaitUntilAsync` when timeout should fail the test with `TimeoutException`
- Always set a meaningful timeout — never use very large values
- Assert on the result with a descriptive failure message
- Polling interval should be >= 1s to avoid hammering the API
