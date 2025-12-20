---
applyTo: "**/*.spec.ts,**/*.test.ts,**/Tests/**/*.cs,**/*Test*.cs,**/*Tests.cs"
---

# Testing Patterns for EasyPlatform

## Core Testing Principles

**CRITICAL**: No mocks for happy path - use real implementations and test actual system behavior.

1. **Real Tests Only**: Test actual behavior, not mocked behavior
2. **Happy Path = Real Implementation**: Only mock for error scenarios or external dependencies
3. **One Assertion Focus**: Each test verifies one specific behavior
4. **Independent Tests**: Tests don't depend on each other's execution order
5. **No Skipped Tests**: Fix or remove tests, never skip
6. **Verification Required**: Prove test works before claiming success

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
        var command = new SaveTextSnippetCommand
        {
            SnippetText = "Sample snippet text",
            FullTextSearchCode = "TEST001"
        };

        _repositoryMock
            .Setup(r => r.CreateOrUpdateAsync(It.IsAny<TextSnippetText>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TextSnippetText entity, CancellationToken _) => entity);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result.Data);
        Assert.Equal("Sample snippet text", result.Data.SnippetText);
        Assert.Equal("TEST001", result.Data.FullTextSearchCode);
    }

    [Fact]
    public async Task Handle_DuplicateCode_ThrowsValidationException()
    {
        // Arrange
        var command = new SaveTextSnippetCommand
        {
            SnippetText = "Test",
            FullTextSearchCode = "DUPLICATE"
        };

        _repositoryMock
            .Setup(r => r.AnyAsync(It.IsAny<Expression<Func<TextSnippetText, bool>>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);  // Code already exists

        // Act & Assert
        await Assert.ThrowsAsync<PlatformValidationException>(
            async () => await _handler.Handle(command, CancellationToken.None));
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("   ")]
    public async Task Handle_InvalidSnippetText_ThrowsValidationException(string invalidText)
    {
        // Arrange
        var command = new SaveTextSnippetCommand { SnippetText = invalidText };

        // Act & Assert
        await Assert.ThrowsAsync<PlatformValidationException>(
            async () => await _handler.Handle(command, CancellationToken.None));
    }
}
```

### Integration Test Pattern

```csharp
public class TextSnippetIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private readonly WebApplicationFactory<Program> _factory;

    public TextSnippetIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateTextSnippet_WithValidData_ReturnsSuccess()
    {
        // Arrange
        var command = new SaveTextSnippetCommand
        {
            SnippetText = "Integration test snippet",
            FullTextSearchCode = "INT001"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/TextSnippet", command);

        // Assert
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<SaveTextSnippetCommandResult>();
        Assert.NotNull(result);
        Assert.NotNull(result.Data);
        Assert.Equal("Integration test snippet", result.Data.SnippetText);
    }

    [Fact]
    public async Task GetTextSnippetList_WithFilter_ReturnsFilteredResults()
    {
        // Arrange
        var query = new GetTextSnippetListQuery
        {
            SearchText = "test",
            MaxResultCount = 10
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/TextSnippet/list", query);

        // Assert
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<GetTextSnippetListQueryResult>();
        Assert.NotNull(result);
        Assert.All(result.Items, item =>
            Assert.Contains("test", item.SnippetText, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task DeleteTextSnippet_WithValidId_ReturnsNoContent()
    {
        // Arrange
        var createCommand = new SaveTextSnippetCommand { SnippetText = "To be deleted" };
        var createResponse = await _client.PostAsJsonAsync("/api/TextSnippet", createCommand);
        var created = await createResponse.Content.ReadFromJsonAsync<SaveTextSnippetCommandResult>();

        // Act
        var deleteResponse = await _client.DeleteAsync($"/api/TextSnippet/{created!.Data.Id}");

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }
}
```

### Repository Extension Tests

```csharp
public class TextSnippetRepositoryExtensionsTests
{
    private readonly Mock<IPlatformQueryableRootRepository<TextSnippetText, string>> _repositoryMock;

    public TextSnippetRepositoryExtensionsTests()
    {
        _repositoryMock = new Mock<IPlatformQueryableRootRepository<TextSnippetText, string>>();
    }

    [Fact]
    public async Task GetByCodeAsync_WithExistingCode_ReturnsEntity()
    {
        // Arrange
        var code = "TEST001";
        var expected = new TextSnippetText { Id = "1", FullTextSearchCode = code };

        _repositoryMock
            .Setup(r => r.FirstOrDefaultAsync(
                It.IsAny<Expression<Func<TextSnippetText, bool>>>(),
                It.IsAny<CancellationToken>(),
                It.IsAny<Expression<Func<TextSnippetText, object?>>[]>()))
            .ReturnsAsync(expected);

        // Act
        var result = await _repositoryMock.Object.GetByCodeAsync(code);

        // Assert
        Assert.Equal(expected.Id, result.Id);
        Assert.Equal(code, result.FullTextSearchCode);
    }

    [Fact]
    public async Task GetByCodeAsync_WithNonExistingCode_ThrowsException()
    {
        // Arrange
        var code = "NONEXISTENT";

        _repositoryMock
            .Setup(r => r.FirstOrDefaultAsync(
                It.IsAny<Expression<Func<TextSnippetText, bool>>>(),
                It.IsAny<CancellationToken>(),
                It.IsAny<Expression<Func<TextSnippetText, object?>>[]>()))
            .ReturnsAsync((TextSnippetText?)null);

        // Act & Assert
        await Assert.ThrowsAsync<PlatformDomainRowNotFoundException>(
            async () => await _repositoryMock.Object.GetByCodeAsync(code));
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
  let apiService: jasmine.SpyObj<TextSnippetApiService>;

  beforeEach(async () => {
    const apiServiceSpy = jasmine.createSpyObj('TextSnippetApiService', ['getList', 'delete']);

    await TestBed.configureTestingModule({
      imports: [TextSnippetListComponent],
      providers: [
        TextSnippetStore,
        { provide: TextSnippetApiService, useValue: apiServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TextSnippetListComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(TextSnippetStore);
    apiService = TestBed.inject(TextSnippetApiService) as jasmine.SpyObj<TextSnippetApiService>;
  });

  it('should load text snippets on init', () => {
    // Arrange
    const mockSnippets = [
      { id: '1', snippetText: 'Test 1' },
      { id: '2', snippetText: 'Test 2' }
    ];
    apiService.getList.and.returnValue(of(mockSnippets));

    // Act
    fixture.detectChanges(); // Triggers ngOnInit

    // Assert
    expect(apiService.getList).toHaveBeenCalled();
    expect(component.vm()?.snippets.length).toBe(2);
  });

  it('should display snippets in template', () => {
    // Arrange
    const mockSnippets = [{ id: '1', snippetText: 'Test Snippet' }];
    apiService.getList.and.returnValue(of(mockSnippets));

    // Act
    fixture.detectChanges();

    // Assert
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test Snippet');
  });

  it('should handle delete action', () => {
    // Arrange
    const snippetId = '123';
    apiService.delete.and.returnValue(of(void 0));

    // Act
    component.onDelete(snippetId);

    // Assert
    expect(apiService.delete).toHaveBeenCalledWith(snippetId);
  });

  it('should show error message on load failure', () => {
    // Arrange
    const error = new Error('Network error');
    apiService.getList.and.returnValue(throwError(() => error));

    // Act
    fixture.detectChanges();

    // Assert
    expect(component.getErrorMsg$()).toBeTruthy();
  });
});
```

### Form Component Tests

```typescript
describe('TextSnippetFormComponent', () => {
  let component: TextSnippetFormComponent;
  let fixture: ComponentFixture<TextSnippetFormComponent>;
  let apiService: jasmine.SpyObj<TextSnippetApiService>;

  beforeEach(async () => {
    const apiServiceSpy = jasmine.createSpyObj('TextSnippetApiService', [
      'save',
      'checkCodeExists'
    ]);

    await TestBed.configureTestingModule({
      imports: [TextSnippetFormComponent, ReactiveFormsModule],
      providers: [{ provide: TextSnippetApiService, useValue: apiServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(TextSnippetFormComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(TextSnippetApiService) as jasmine.SpyObj<TextSnippetApiService>;
  });

  it('should validate required fields', () => {
    // Arrange
    component.form.patchValue({ snippetText: '' });

    // Act
    const isValid = component.validateForm();

    // Assert
    expect(isValid).toBeFalse();
    expect(component.form.get('snippetText')?.hasError('required')).toBeTrue();
  });

  it('should check code uniqueness asynchronously', fakeAsync(() => {
    // Arrange
    apiService.checkCodeExists.and.returnValue(of(true)); // Code exists

    // Act
    component.form.patchValue({ code: 'DUPLICATE' });
    tick(500); // Wait for async validator

    // Assert
    expect(component.form.get('code')?.hasError('codeExists')).toBeTrue();
  }));

  it('should submit form with valid data', () => {
    // Arrange
    const mockResult = { data: { id: '123', snippetText: 'Test' } };
    apiService.save.and.returnValue(of(mockResult));
    component.form.patchValue({ snippetText: 'Test snippet' });

    // Act
    component.onSubmit();

    // Assert
    expect(apiService.save).toHaveBeenCalledWith(
      jasmine.objectContaining({ snippetText: 'Test snippet' })
    );
  });

  it('should not submit with invalid form', () => {
    // Arrange
    component.form.patchValue({ snippetText: '' });

    // Act
    component.onSubmit();

    // Assert
    expect(apiService.save).not.toHaveBeenCalled();
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

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding requests
  });

  it('should get text snippets list', () => {
    // Arrange
    const mockSnippets = [
      { id: '1', snippetText: 'Test 1' },
      { id: '2', snippetText: 'Test 2' }
    ];

    // Act
    service.getList().subscribe(snippets => {
      // Assert
      expect(snippets).toEqual(mockSnippets);
      expect(snippets.length).toBe(2);
    });

    // HTTP expectations
    const req = httpMock.expectOne('/api/TextSnippet');
    expect(req.request.method).toBe('GET');
    req.flush(mockSnippets);
  });

  it('should save text snippet', () => {
    // Arrange
    const command = { snippetText: 'New snippet' };
    const mockResult = { data: { id: '123', snippetText: 'New snippet' } };

    // Act
    service.save(command).subscribe(result => {
      // Assert
      expect(result).toEqual(mockResult);
    });

    // HTTP expectations
    const req = httpMock.expectOne('/api/TextSnippet');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(command);
    req.flush(mockResult);
  });

  it('should handle HTTP errors', () => {
    // Arrange
    const errorMessage = 'Server error';

    // Act
    service.getList().subscribe({
      next: () => fail('Should have failed'),
      error: (error) => {
        // Assert
        expect(error.status).toBe(500);
      }
    });

    // HTTP expectations
    const req = httpMock.expectOne('/api/TextSnippet');
    req.flush(errorMessage, { status: 500, statusText: 'Server Error' });
  });
});
```

### Store Test Pattern

```typescript
describe('TextSnippetStore', () => {
  let store: TextSnippetStore;
  let apiService: jasmine.SpyObj<TextSnippetApiService>;

  beforeEach(() => {
    const apiServiceSpy = jasmine.createSpyObj('TextSnippetApiService', ['getList', 'save']);

    TestBed.configureTestingModule({
      providers: [
        TextSnippetStore,
        { provide: TextSnippetApiService, useValue: apiServiceSpy }
      ]
    });

    store = TestBed.inject(TextSnippetStore);
    apiService = TestBed.inject(TextSnippetApiService) as jasmine.SpyObj<TextSnippetApiService>;
  });

  it('should load snippets and update state', (done) => {
    // Arrange
    const mockSnippets = [{ id: '1', snippetText: 'Test' }];
    apiService.getList.and.returnValue(of(mockSnippets));

    // Act
    store.loadSnippets();

    // Assert
    store.snippets$.subscribe(snippets => {
      expect(snippets).toEqual(mockSnippets);
      done();
    });
  });

  it('should handle loading state', () => {
    // Arrange
    apiService.getList.and.returnValue(of([]));

    // Act
    store.loadSnippets();

    // Assert
    expect(store.loading$()).toBeTrue();
  });

  it('should handle error state', (done) => {
    // Arrange
    const error = new Error('Load failed');
    apiService.getList.and.returnValue(throwError(() => error));

    // Act
    store.loadSnippets();

    // Assert
    setTimeout(() => {
      expect(store.getErrorMsg$()).toBeTruthy();
      done();
    }, 100);
  });
});
```

## Test Naming Conventions

```
[MethodName]_[Scenario]_[ExpectedResult]

Backend Examples:
- Handle_ValidCommand_ReturnsSuccess
- Handle_InvalidName_ThrowsValidationException
- GetByCodeAsync_WithNonExistingCode_ThrowsException
- Validate_EmptyName_ReturnsValidationError

Frontend Examples:
- ngOnInit_WithValidData_LoadsSnippets
- onSubmit_WithInvalidForm_DoesNotCallApi
- loadSnippets_WithError_ShowsErrorMessage
```

## Testing Best Practices

### 1. No Mocks for Happy Path

```csharp
// ❌ WRONG: Mocking platform repository for happy path
var mockRepo = new Mock<IPlatformQueryableRootRepository<Entity, string>>();
mockRepo.Setup(r => r.GetAllAsync(...)).ReturnsAsync(fakeEntities);

// ✅ CORRECT: Use real repository with test database
var realRepo = serviceProvider.GetService<IPlatformQueryableRootRepository<Entity, string>>();
var entities = await realRepo.GetAllAsync(e => e.IsActive, ct);
```

### 2. Test Actual Behavior

```typescript
// ❌ WRONG: Testing mocked behavior
apiService.getList.and.returnValue(of(mockData));
expect(apiService.getList).toHaveBeenCalled(); // Only tests mock was called

// ✅ CORRECT: Test actual UI behavior
apiService.getList.and.returnValue(of(mockData));
fixture.detectChanges();
const compiled = fixture.nativeElement;
expect(compiled.textContent).toContain('Expected Data'); // Tests actual rendering
```

### 3. One Clear Assertion

```csharp
// ❌ WRONG: Multiple unrelated assertions
[Fact]
public void Test_MultipleThings()
{
    Assert.True(entity.IsValid());
    Assert.Equal("Name", entity.Name);
    Assert.NotNull(entity.CreatedDate);
}

// ✅ CORRECT: One focused test per assertion
[Fact]
public void Validate_ValidEntity_ReturnsTrue() => Assert.True(entity.IsValid());

[Fact]
public void MapFromDto_WithName_SetsNameProperty() => Assert.Equal("Name", entity.Name);
```

### 4. No Skipped Tests

```csharp
// ❌ WRONG: Skipping tests
[Fact(Skip = "TODO: Fix later")]
public void Test_BrokenFeature() { }

// ✅ CORRECT: Fix or remove
[Fact]
public void Test_FixedFeature() { /* working test */ }
```

### 5. Verify Before Claiming Success

```csharp
// ✅ CORRECT: Run test, see it fail, then fix
[Fact]
public void Handle_InvalidData_ThrowsException()
{
    // First run: Verify test actually fails when it should
    // Then implement validation
    // Then verify test passes
    await Assert.ThrowsAsync<ValidationException>(async () => await handler.Handle(invalidCommand));
}
```

## Coverage Requirements

- Minimum 80% code coverage for business logic
- 100% coverage for validation logic
- All public APIs must have tests
- Edge cases and error paths must be tested

## Test Organization

```
src/
├── YourService.Tests/
│   ├── Application/
│   │   ├── Commands/
│   │   │   └── SaveEntityCommandHandlerTests.cs
│   │   └── Queries/
│   │       └── GetEntityListQueryHandlerTests.cs
│   ├── Domain/
│   │   ├── Entities/
│   │   │   └── EntityTests.cs
│   │   └── Repositories/
│   │       └── EntityRepositoryExtensionsTests.cs
│   └── Integration/
│       └── EntityIntegrationTests.cs
```

## Anti-Patterns

```csharp
// ❌ WRONG: Tests depend on execution order
[Fact] public void Test1_CreateEntity() { }
[Fact] public void Test2_UpdateEntity() { } // Assumes Test1 ran

// ✅ CORRECT: Independent tests
[Fact] public void Create_ValidEntity_ReturnsId() { /* setup + test */ }
[Fact] public void Update_ExistingEntity_Succeeds() { /* setup + test */ }

// ❌ WRONG: Testing implementation details
Assert.Equal(3, mock.Invocations.Count);

// ✅ CORRECT: Testing behavior
Assert.Equal(expectedResult, actualResult);

// ❌ WRONG: Vague test names
[Fact] public void Test1() { }

// ✅ CORRECT: Descriptive names
[Fact] public void Handle_WithDuplicateCode_ThrowsValidationException() { }
```
