# Testing Guide

## Test Locations

### Backend Tests
- Unit Tests: `{Service}.Tests/` project alongside service
- Platform Tests: `src/Platform/*.Tests/`
- Automation Tests: `src/AutomationTest/`

### Frontend Tests
- Unit Tests: `*.spec.ts` files alongside components
- E2E Tests: `src/AutomationTest/`

## Running Tests

### Backend (.NET)
```bash
# Run all tests for a project
dotnet test {Project}.csproj

# Run with filter
dotnet test --filter "FullyQualifiedName~EmployeeTests"

# Run with coverage
dotnet test --collect:"XPlat Code Coverage"
```

### Frontend (Angular)
```bash
# Run all tests
npm test

# Run specific library tests
nx test platform-core

# Run with coverage
nx test platform-core --code-coverage
```

### Automation Tests
```bash
# Run all automation tests
.\src\AutomationTest\test-systemtest-ALL.cmd
```

## Test Patterns

### Backend Unit Test Structure
```csharp
public class SaveSnippetTextCommandHandlerTests
{
    private readonly Mock<IPlatformQueryableRootRepository<SnippetText, string>> _repository;
    private readonly SaveSnippetTextCommandHandler _handler;

    public SaveSnippetTextCommandHandlerTests()
    {
        _repository = new Mock<IPlatformQueryableRootRepository<SnippetText, string>>();
        _handler = new SaveSnippetTextCommandHandler(_repository.Object, ...);
    }

    [Fact]
    public async Task Handle_ValidCommand_CreatesEmployee()
    {
        // Arrange
        var command = new SaveEmployeeCommand { Name = "Test" };
        _repository.Setup(x => x.CreateAsync(It.IsAny<Employee>(), default))
            .ReturnsAsync(new Employee { Id = "1" });

        // Act
        var result = await _handler.Handle(command, default);

        // Assert
        Assert.NotNull(result.Entity);
        _repository.Verify(x => x.CreateAsync(It.IsAny<Employee>(), default), Times.Once);
    }

    [Fact]
    public async Task Handle_InvalidCommand_ReturnsValidationError()
    {
        // Arrange
        var command = new SaveEmployeeCommand { Name = "" };

        // Act & Assert
        await Assert.ThrowsAsync<PlatformValidationException>(
            () => _handler.Handle(command, default));
    }
}
```

### Frontend Unit Test Structure
```typescript
describe('EmployeeListComponent', () => {
    let component: EmployeeListComponent;
    let fixture: ComponentFixture<EmployeeListComponent>;
    let mockStore: jasmine.SpyObj<EmployeeStore>;

    beforeEach(async () => {
        mockStore = jasmine.createSpyObj('EmployeeStore', ['loadEmployees']);

        await TestBed.configureTestingModule({
            declarations: [EmployeeListComponent],
            providers: [{ provide: EmployeeStore, useValue: mockStore }]
        }).compileComponents();

        fixture = TestBed.createComponent(EmployeeListComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load employees on init', () => {
        fixture.detectChanges();
        expect(mockStore.loadEmployees).toHaveBeenCalled();
    });
});
```

## Test Data

### Test Data Seeding
- Use `RequestContext.IsSeedingTestingData()` to skip side effects during seeding
- Test data is seeded via migrations or dedicated seeder classes

## Testing Best Practices

### Unit Tests
- Test one thing per test
- Use descriptive test names: `Method_Scenario_ExpectedResult`
- Mock external dependencies
- Test edge cases and error conditions

### Integration Tests
- Use real database (test container or in-memory)
- Test full request/response cycle
- Clean up test data after each test

### Test Coverage
- Focus on business logic coverage
- Don't test framework code
- Aim for meaningful tests over high coverage numbers

## Example References
- Platform Examples: `src/PlatformExampleApp/`
- Working Tests: Search for `*.Tests.csproj` projects
