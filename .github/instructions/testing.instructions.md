---
applyTo: "**/*.spec.ts,**/*.test.ts,**/Tests/**/*.cs,**/*Test*.cs"
description: "Testing patterns for EasyPlatform backend and frontend"
---

# Testing Patterns

## Backend Testing (.NET)

### Unit Test Structure

```csharp
public class SaveTextSnippetCommandHandlerTests
{
    private readonly Mock<IPlatformQueryableRootRepository<TextSnippetText, string>> _repositoryMock;
    private readonly SaveTextSnippetCommandHandler _handler;

    public SaveTextSnippetCommandHandlerTests()
    {
        _repositoryMock = new Mock<IPlatformQueryableRootRepository<TextSnippetText, string>>();
        _handler = new SaveTextSnippetCommandHandler(
            Mock.Of<ILoggerFactory>(),
            Mock.Of<IPlatformUnitOfWorkManager>(),
            Mock.Of<IServiceProvider>(),
            Mock.Of<IPlatformRootServiceProvider>(),
            _repositoryMock.Object);
    }

    [Fact]
    public async Task Handle_NewTextSnippet_CreatesSuccessfully()
    {
        // Arrange
        var command = new SaveTextSnippetCommand { SnippetText = "Sample text" };
        _repositoryMock
            .Setup(r => r.CreateOrUpdateAsync(It.IsAny<TextSnippetText>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TextSnippetText e, CancellationToken _) => e);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result.Data);
        Assert.Equal("Sample text", result.Data.SnippetText);
    }
}
```

### Integration Test Pattern

```csharp
public class TextSnippetIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public TextSnippetIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateTextSnippet_ReturnsSuccess()
    {
        // Arrange
        var command = new { SnippetText = "Test snippet text" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/TextSnippet", command);

        // Assert
        response.EnsureSuccessStatusCode();
    }
}
```

## Frontend Testing (Angular)

### Component Test Structure

```typescript
describe('TextSnippetListComponent', () => {
  let component: TextSnippetListComponent;
  let fixture: ComponentFixture<TextSnippetListComponent>;
  let store: TextSnippetStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextSnippetListComponent],
      providers: [
        { provide: TextSnippetApiService, useValue: jasmine.createSpyObj('TextSnippetApiService', ['getList']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TextSnippetListComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(TextSnippetStore);
  });

  it('should load text snippets on init', () => {
    spyOn(store, 'loadSnippets');
    fixture.detectChanges();
    expect(store.loadSnippets).toHaveBeenCalled();
  });
});
```

### Service Test Pattern

```typescript
describe('TextSnippetApiService', () => {
  let service: TextSnippetApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TextSnippetApiService]
    });
    service = TestBed.inject(TextSnippetApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should get text snippets', () => {
    const mockSnippets = [{ id: '1', snippetText: 'Sample text' }];

    service.getList().subscribe(snippets => {
      expect(snippets).toEqual(mockSnippets);
    });

    const req = httpMock.expectOne('/api/TextSnippet');
    expect(req.request.method).toBe('GET');
    req.flush(mockSnippets);
  });
});
```

## Test Naming Conventions

```
[MethodName]_[Scenario]_[ExpectedResult]

Examples:
- Handle_ValidCommand_ReturnsSuccess
- Handle_InvalidName_ThrowsValidationError
- LoadEmployees_WhenCalled_UpdatesState
```

## Best Practices

- Test behavior, not implementation details
- Use meaningful test names
- One assertion per test (when possible)
- Mock external dependencies
- Test edge cases and error scenarios
- Keep tests independent and isolated
