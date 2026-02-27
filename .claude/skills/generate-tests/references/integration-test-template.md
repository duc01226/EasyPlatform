# Integration Test Template (C# xUnit)

> Reference template for generating backend integration tests from TC-IDs.
> Based on real patterns from `src/Backend/PlatformExampleApp.Tests.Integration/`.

## Project Structure

```
src/Backend/PlatformExampleApp.Tests.Integration/
  Infrastructure/
    TextSnippetIntegrationTestBase.cs   -- Base class (configures HttpClient)
    TextSnippetApiEndpoints.cs          -- Endpoint constants
  TextSnippet/
    SnippetCrudTests.cs                 -- CRUD test class
    SnippetSearchTests.cs               -- Search test class
  TaskItem/
    TaskCrudTests.cs                    -- Task CRUD tests
    TaskQueryTests.cs                   -- Task query tests
  Smoke/
    ApiHealthSmokeTests.cs              -- Health check tests
```

## Project References (CRITICAL)

The test project **MUST** reference the Application project to access typed DTOs and command/query results:

```xml
<ProjectReference Include="..\PlatformExampleApp.TextSnippet.Application\PlatformExampleApp.TextSnippet.Application.csproj" />
```

Global usings for typed deserialization:

```csharp
global using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
global using PlatformExampleApp.TextSnippet.Application.UseCaseCommands.TaskItem;
global using PlatformExampleApp.TextSnippet.Application.UseCaseQueries;
global using PlatformExampleApp.TextSnippet.Application.UseCaseQueries.TaskItem;
global using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
```

## Required Imports

```csharp
using System.Net;
using Easy.Platform.IntegrationTest;
using PlatformExampleApp.Tests.Integration.Infrastructure;
```

**IMPORTANT: Do NOT import `System.Text.Json`.** Use typed `Api.PostAsync<TRequest, TResponse>()` and `Api.GetAsync<T>()` instead of `JsonDocument.Parse()`.

## Base Class

All integration tests extend `TextSnippetIntegrationTestBase`:

```csharp
public abstract class TextSnippetIntegrationTestBase : IntegrationTestBase
{
    protected override string BaseUrl =>
        Environment.GetEnvironmentVariable("TEXTSNIPPET_BASE_URL") ?? "http://localhost:5001";

    protected ApiTestClient Api { get; private set; } = null!;

    public override async Task InitializeAsync()
    {
        await base.InitializeAsync();
        Api = new ApiTestClient(Client);
    }
}
```

## ApiTestClient -- Typed Methods (PREFERRED over Raw)

```csharp
// PREFERRED: Typed deserialization -- assert on typed properties
var result = await Api.PostAsync<object, SaveSnippetTextCommandResult>(endpoint, body);
result.SavedData.Id.Should().NotBeNullOrEmpty();

var searchResult = await Api.GetAsync<SearchSnippetTextQueryResult>(url);
searchResult.Items.Should().Contain(item => item.SnippetText == expected);

// ONLY for error scenarios (non-success HTTP status):
var response = await Api.PostRawAsync(endpoint, body);
response.IsSuccessStatusCode.Should().BeFalse();
```

**Rule: Use `PostRawAsync`/`GetRawAsync` ONLY for error-path tests where you expect non-success HTTP status.** For all success-path tests, use the typed `PostAsync<,>`/`GetAsync<>` methods.

## API Endpoints

Defined in `TextSnippetApiEndpoints`:

```csharp
public static class TextSnippetApiEndpoints
{
    public const string SnippetSearch = "/api/TextSnippet/search";
    public const string SnippetSave = "/api/TextSnippet/save";
    public const string TaskList = "/api/TaskItem/list";
    public const string TaskSave = "/api/TaskItem/save";
    public const string TaskDelete = "/api/TaskItem/delete";
    public const string TaskRestore = "/api/TaskItem/restore";
    public const string TaskStats = "/api/TaskItem/stats";
}
```

## Key Typed Result Classes

| Endpoint | Result Class | Key Properties |
|----------|-------------|----------------|
| SnippetSave | `SaveSnippetTextCommandResult` | `SavedData` (TextSnippetEntityDto) |
| SnippetSearch | `SearchSnippetTextQueryResult` | `Items` (List), `TotalCount` |
| TaskSave | `SaveTaskItemCommandResult` | `SavedTask` (TaskItemEntityDto), `WasCreated`, `WasRestored` |
| TaskDelete | `DeleteTaskItemCommandResult` | `WasSoftDeleted` |
| TaskList | `GetTaskListQueryResult` | `Items` (List), `TotalCount` |
| TaskStats | `GetTaskStatisticsQueryResult` | `TotalCount`, `ActiveCount`, `CompletedCount`, `CompletionRate`, `CountsByStatus` |

## Test Data Helpers

Use `TestDataHelper` for unique, UUID-based test data:

```csharp
// Unique text: "CRT001 3f4a7b2c..."
var snippetText = TestDataHelper.GenerateTestText("CRT001");

// Unique ID: "test-3f4a7b2c..."
var testId = TestDataHelper.GenerateTestId("test");

// Unique name: "Test_3f4a7b2c"
var name = TestDataHelper.GenerateTestName("Test");
```

## Full Template -- CRUD Test Class

```csharp
using System.Net;
using Easy.Platform.IntegrationTest;
using PlatformExampleApp.Tests.Integration.Infrastructure;

namespace PlatformExampleApp.Tests.Integration.{FeatureName};

/// <summary>
/// {Feature} integration tests for the {FeatureName} endpoints.
/// Auto-generated from docs/test-specs/{FeatureName}/README.md
/// </summary>
[Trait("Category", "Integration")]
public class {ClassName}Tests : TextSnippetIntegrationTestBase
{
    /// <summary>
    /// {TC-ID}: {Title}
    /// </summary>
    [Fact]
    [Trait("TestCase", "{TC-ID}")]
    public async Task {MethodName}()
    {
        // Arrange
        var uniqueText = TestDataHelper.GenerateTestText("{context}");
        var fullText = TestDataHelper.GenerateTestText("{context} FullText");

        var requestBody = new
        {
            Data = new
            {
                SnippetText = uniqueText,
                FullText = fullText
            }
        };

        // Act -- typed deserialization (no manual JSON parsing)
        var result = await Api.PostAsync<object, SaveSnippetTextCommandResult>(
            TextSnippetApiEndpoints.SnippetSave, requestBody);

        // Assert -- typed property access
        result.SavedData.Should().NotBeNull("response must contain savedData");
        result.SavedData.Id.Should().NotBeNullOrEmpty(
            "{reason for assertion}");
        result.SavedData.SnippetText.Should().Be(uniqueText,
            "{reason for assertion}");
    }
}
```

## Full Template -- Search Test

```csharp
/// <summary>
/// {TC-ID}: {Title}
/// </summary>
[Fact]
[Trait("TestCase", "{TC-ID}")]
public async Task {MethodName}()
{
    // Arrange -- create searchable data
    var uniqueText = TestDataHelper.GenerateTestText("{context}");

    var saveBody = new
    {
        Data = new
        {
            SnippetText = uniqueText,
            FullText = TestDataHelper.GenerateTestText("{context} FullText")
        }
    };

    await Api.PostAsync<object, SaveSnippetTextCommandResult>(
        TextSnippetApiEndpoints.SnippetSave, saveBody);

    // Act -- typed deserialization
    var searchUrl = $"{TextSnippetApiEndpoints.SnippetSearch}" +
                    $"?searchText={Uri.EscapeDataString(uniqueText)}" +
                    $"&skipCount=0&maxResultCount=10";

    var searchResult = await Api.GetAsync<SearchSnippetTextQueryResult>(searchUrl);

    // Assert -- typed LINQ assertions
    searchResult.Items.Should().NotBeEmpty(
        "search should find the item we just created");

    searchResult.Items.Should().Contain(
        item => item.SnippetText == uniqueText,
        "search results must contain an item with our unique text");
}
```

## Full Template -- Validation Error Test

```csharp
/// <summary>
/// {TC-ID}: {Title}
/// </summary>
[Fact]
[Trait("TestCase", "{TC-ID}")]
public async Task {MethodName}()
{
    // Arrange -- invalid data
    var requestBody = new
    {
        Data = new
        {
            SnippetText = string.Empty,
            FullText = TestDataHelper.GenerateTestText("{context}")
        }
    };

    // Act -- use PostRawAsync for error-path tests
    var response = await Api.PostRawAsync(
        TextSnippetApiEndpoints.SnippetSave, requestBody);

    // Assert -- validate error response body, not just status
    response.IsSuccessStatusCode.Should().BeFalse(
        "{reason: what validation rule should trigger}");
}
```

## Full Template -- Update (Create-then-Update) Test

```csharp
/// <summary>
/// {TC-ID}: {Title}
/// </summary>
[Fact]
[Trait("TestCase", "{TC-ID}")]
public async Task {MethodName}()
{
    // Arrange -- create initial record (typed deserialization)
    var originalText = TestDataHelper.GenerateTestText("{context}-Original");

    var createBody = new
    {
        Data = new
        {
            SnippetText = originalText,
            FullText = TestDataHelper.GenerateTestText("{context}-Original FullText")
        }
    };

    var createResult = await Api.PostAsync<object, SaveSnippetTextCommandResult>(
        TextSnippetApiEndpoints.SnippetSave, createBody);

    var createdId = createResult.SavedData.Id;
    createdId.Should().NotBeNullOrEmpty("created record must have an id");

    // Act -- update with modified data
    var updatedText = TestDataHelper.GenerateTestText("{context}-Updated");

    var updateBody = new
    {
        Data = new
        {
            Id = createdId,
            SnippetText = updatedText,
            FullText = TestDataHelper.GenerateTestText("{context}-Updated FullText")
        }
    };

    var updateResult = await Api.PostAsync<object, SaveSnippetTextCommandResult>(
        TextSnippetApiEndpoints.SnippetSave, updateBody);

    // Assert -- typed property access
    updateResult.SavedData.Id.Should().Be(createdId,
        "updated record must retain the same id");
    updateResult.SavedData.SnippetText.Should().Be(updatedText,
        "text must reflect the updated value");

    // PREFERRED: Verify via follow-up query to confirm persisted state
    var verifyUrl = $"{TextSnippetApiEndpoints.SnippetSearch}" +
                    $"?searchText={Uri.EscapeDataString(updatedText)}" +
                    $"&skipCount=0&maxResultCount=10";

    var verifyResult = await Api.GetAsync<SearchSnippetTextQueryResult>(verifyUrl);

    verifyResult.Items.Should().NotBeEmpty(
        "updated record must be retrievable via query");
    verifyResult.Items.Should().Contain(
        item => item.SnippetText == updatedText,
        "query results must contain the record with updated text");
}
```

## Full Template -- Task CRUD with Domain Flags

```csharp
/// <summary>
/// {TC-ID}: Create, update status, verify domain flags.
/// </summary>
[Fact]
[Trait("TestCase", "{TC-ID}")]
public async Task {MethodName}()
{
    // Arrange -- create task
    var title = TestDataHelper.GenerateTestText("{context}");

    var createBody = new
    {
        Task = new
        {
            Title = title,
            Description = TestDataHelper.GenerateTestText("{context} Desc"),
            Status = 0,
            Priority = 1
        }
    };

    var createResult = await Api.PostAsync<object, SaveTaskItemCommandResult>(
        TextSnippetApiEndpoints.TaskSave, createBody);

    // Assert -- typed domain flag and property access
    createResult.WasCreated.Should().BeTrue("wasCreated flag must be true for a new task");
    createResult.SavedTask.Id.Should().NotBeNullOrEmpty("task must have an id");
    createResult.SavedTask.Title.Should().Be(title, "title must match submitted value");

    var concurrencyToken = createResult.SavedTask.ConcurrencyUpdateToken;

    // Act -- update status
    var updateBody = new
    {
        Task = new
        {
            Id = createResult.SavedTask.Id,
            Title = title,
            Status = 2, // Completed
            Priority = 1,
            ConcurrencyUpdateToken = concurrencyToken
        }
    };

    var updateResult = await Api.PostAsync<object, SaveTaskItemCommandResult>(
        TextSnippetApiEndpoints.TaskSave, updateBody);

    // Assert -- typed enum comparison
    updateResult.SavedTask.Status.Should().Be(TaskItemStatus.Completed,
        "status must be updated to Completed");
}
```

## Full Template -- Lifecycle (Multi-Step) Test

```csharp
/// <summary>
/// {TC-ID}: {Title} -- Full lifecycle test.
/// </summary>
[Fact]
[Trait("TestCase", "{TC-ID}")]
public async Task {MethodName}()
{
    // === STEP 1: Create ===
    var originalText = TestDataHelper.GenerateTestText("{context}-Create");

    var createBody = new
    {
        Data = new
        {
            SnippetText = originalText,
            FullText = TestDataHelper.GenerateTestText("{context}-Create FullText")
        }
    };

    var createResult = await Api.PostAsync<object, SaveSnippetTextCommandResult>(
        TextSnippetApiEndpoints.SnippetSave, createBody);

    var createdId = createResult.SavedData.Id;
    createdId.Should().NotBeNullOrEmpty();

    // === STEP 2: Verify Create via Query ===
    var searchUrl = $"{TextSnippetApiEndpoints.SnippetSearch}" +
                    $"?searchText={Uri.EscapeDataString(originalText)}" +
                    $"&skipCount=0&maxResultCount=10";

    var searchResult = await Api.GetAsync<SearchSnippetTextQueryResult>(searchUrl);

    searchResult.Items.Should().NotBeEmpty(
        "created record must appear in query results");

    // === STEP 3: Update ===
    var updatedText = TestDataHelper.GenerateTestText("{context}-Updated");

    var updateBody = new
    {
        Data = new
        {
            Id = createdId,
            SnippetText = updatedText,
            FullText = TestDataHelper.GenerateTestText("{context}-Updated FullText")
        }
    };

    var updateResult = await Api.PostAsync<object, SaveSnippetTextCommandResult>(
        TextSnippetApiEndpoints.SnippetSave, updateBody);

    updateResult.SavedData.SnippetText.Should().Be(updatedText,
        "updated text must be reflected in response");

    // === STEP 4: Verify Update via Query ===
    var searchUpdatedUrl = $"{TextSnippetApiEndpoints.SnippetSearch}" +
                           $"?searchText={Uri.EscapeDataString(updatedText)}" +
                           $"&skipCount=0&maxResultCount=10";

    var searchUpdatedResult = await Api.GetAsync<SearchSnippetTextQueryResult>(searchUpdatedUrl);

    searchUpdatedResult.Items.Should().NotBeEmpty(
        "updated record must be findable via query with new text");
    searchUpdatedResult.Items.Should().Contain(
        item => item.SnippetText == updatedText,
        "query results must contain the record with updated text value");
}
```

## Data Verification Strategy

**Priority order for verifying data correctness:**

1. **Follow-up query (PREFERRED):** Execute a GET/search/list query after mutation to verify data was persisted correctly. This proves the data round-trips through the database.
2. **Response body inspection:** Use typed result properties to verify domain fields. Acceptable when no query endpoint exists or when the response is authoritative.

Always use at least one of these methods. Never rely solely on HTTP status codes.

## Domain Flag Verification Pattern

Entities returning boolean operation flags MUST have those flags asserted using typed properties:

```csharp
// After Create -- typed flag access
var createResult = await Api.PostAsync<object, SaveTaskItemCommandResult>(endpoint, body);
createResult.WasCreated.Should().BeTrue("wasCreated flag must be true after successful create");

// After Soft Delete -- typed flag access
var deleteResult = await Api.PostAsync<object, DeleteTaskItemCommandResult>(endpoint, body);
deleteResult.WasSoftDeleted.Should().BeTrue("wasSoftDeleted flag must be true after soft delete");

// After Restore -- typed flag access
var restoreResult = await Api.PostAsync<object, SaveTaskItemCommandResult>(endpoint, body);
restoreResult.WasRestored.Should().BeTrue("wasRestored flag must be true after restore");
```

See `TaskCrudTests.cs` for the canonical multi-step lifecycle example with all domain flags.

## Minimum Assertion Rules

Every generated test MUST meet these minimums:

| Operation | Required Assertions |
|-----------|-------------------|
| Create | HTTP 200 + `id` not null + at least 1 domain field matches input. PREFERRED: follow-up query confirms persistence |
| Update | HTTP 200 + same `id` + at least 1 changed field. PREFERRED: follow-up query confirms new value |
| Soft Delete | `WasSoftDeleted == true`. PREFERRED: follow-up query confirms absence or deleted status |
| Restore | `WasRestored == true` + `id` retained |
| Validation Error | Non-success status (use `PostRawAsync`) |
| Search | Result items not empty + matched item contains search term |
| Setup Step | Typed result used (PostAsync throws on non-success) |

## Anti-Patterns (Weak vs Strong)

| Weak (DO NOT) | Strong (DO) |
|---------------|-------------|
| `JsonDocument.Parse()` + `GetProperty()` manual extraction | `Api.PostAsync<,>()` / `Api.GetAsync<>()` typed deserialization |
| `response.StatusCode.Should().Be(OK)` only | Typed `result.SavedData.Id` + domain field assertions |
| `IsSuccessStatusCode.Should().BeFalse()` only | Use `PostRawAsync` for error paths, typed for success paths |
| `item.GetProperty("status").GetInt32().Should().Be(2)` | `result.SavedTask.Status.Should().Be(TaskItemStatus.Completed)` |
| Iterating `EnumerateArray()` to find matches | `result.Items.Should().Contain(item => item.Field == expected)` |
| `doc.RootElement.GetProperty("wasCreated").GetBoolean()` | `result.WasCreated.Should().BeTrue()` |
| Identical `because` strings | Unique, descriptive `because` per assertion |

## Naming Convention Rules

| Element | Convention | Example |
|---------|-----------|---------|
| Namespace | `PlatformExampleApp.Tests.Integration.{Feature}` | `.TextSnippet` |
| Class name | `{Feature}{SubFeature}Tests` | `SnippetCrudTests` |
| Method name | `{Action}_{Scenario}_{ExpectedResult}` | `SaveSnippet_ValidData_ReturnsCreatedSnippet` |
| TC-ID trait | `[Trait("TestCase", "{TC-ID}")]` | `[Trait("TestCase", "TC-SNP-CRT-001")]` |
| Category trait | `[Trait("Category", "Integration")]` | Always at class level |

## Rules

1. Every test method MUST have `[Trait("TestCase", "{TC-ID}")]`
2. Every test method MUST have XML doc with TC-ID and title
3. Use `TestDataHelper.GenerateTestText()` for ALL test data -- never hardcode
4. Follow Arrange-Act-Assert strictly with comment separators
5. Include descriptive `because` strings in all FluentAssertions `.Should()` calls
6. One test class per feature area (CRUD, Search, etc.)
7. Class-level `[Trait("Category", "Integration")]` on every test class
8. **MUST use typed deserialization** (`Api.PostAsync<,>` / `Api.GetAsync<>`) -- never `JsonDocument.Parse()`
9. **MUST reference Application project** for DTO and result types -- never manual JSON property extraction
10. Every mutation test MUST verify at least one domain field via typed properties
11. Validation error tests use `PostRawAsync` (only case where raw response is acceptable)
12. Prefer follow-up query verification over response-body-only assertions when a query endpoint exists
13. Assert domain boolean flags (`WasCreated`, `WasSoftDeleted`, `WasRestored`) via typed result properties
14. Use typed enum comparisons (`TaskItemStatus.Completed`) instead of magic numbers
