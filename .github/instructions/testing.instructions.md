---
applyTo: "**/*.spec.ts,**/*.test.ts,**/Tests/**/*.cs,**/*Test*.cs"
excludeAgent: ["copilot-code-review"]
description: "Testing patterns for EasyPlatform backend and frontend"
---

# Testing Patterns

## Backend Testing (.NET)

### Unit Test Structure

```csharp
public class SaveEmployeeCommandHandlerTests
{
    private readonly Mock<IPlatformQueryableRootRepository<Employee, string>> _repositoryMock;
    private readonly SaveEmployeeCommandHandler _handler;

    public SaveEmployeeCommandHandlerTests()
    {
        _repositoryMock = new Mock<IPlatformQueryableRootRepository<Employee, string>>();
        _handler = new SaveEmployeeCommandHandler(
            Mock.Of<ILoggerFactory>(),
            Mock.Of<IPlatformUnitOfWorkManager>(),
            Mock.Of<IServiceProvider>(),
            Mock.Of<IPlatformRootServiceProvider>(),
            _repositoryMock.Object);
    }

    [Fact]
    public async Task Handle_NewEmployee_CreatesSuccessfully()
    {
        // Arrange
        var command = new SaveEmployeeCommand { Name = "John Doe" };
        _repositoryMock
            .Setup(r => r.CreateOrUpdateAsync(It.IsAny<Employee>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Employee e, CancellationToken _) => e);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result.Entity);
        Assert.Equal("John Doe", result.Entity.Name);
    }
}
```

### Integration Test Pattern

```csharp
public class EmployeeIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public EmployeeIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CreateEmployee_ReturnsSuccess()
    {
        // Arrange
        var command = new { Name = "Test Employee" };

        // Act
        var response = await _client.PostAsJsonAsync("/api/Employee", command);

        // Assert
        response.EnsureSuccessStatusCode();
    }
}
```

## Frontend Testing (Angular)

### Component Test Structure

```typescript
describe('EmployeeListComponent', () => {
  let component: EmployeeListComponent;
  let fixture: ComponentFixture<EmployeeListComponent>;
  let store: EmployeeStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeListComponent],
      providers: [
        { provide: EmployeeApiService, useValue: jasmine.createSpyObj('EmployeeApiService', ['getEmployees']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeListComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(EmployeeStore);
  });

  it('should load employees on init', () => {
    spyOn(store, 'loadEmployees');
    fixture.detectChanges();
    expect(store.loadEmployees).toHaveBeenCalled();
  });
});
```

### Service Test Pattern

```typescript
describe('EmployeeApiService', () => {
  let service: EmployeeApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EmployeeApiService]
    });
    service = TestBed.inject(EmployeeApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should get employees', () => {
    const mockEmployees = [{ id: '1', name: 'John' }];

    service.getEmployees().subscribe(employees => {
      expect(employees).toEqual(mockEmployees);
    });

    const req = httpMock.expectOne('/api/Employee');
    expect(req.request.method).toBe('GET');
    req.flush(mockEmployees);
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
