---
name: test-generation
description: Use when generating test cases, creating test specifications, writing unit tests, or analyzing test coverage.
---

# Test Generation for EasyPlatform

## Test Naming Convention

```
[MethodName]_[Scenario]_[ExpectedResult]

Examples:
- Handle_ValidCommand_ReturnsSuccess
- Handle_InvalidName_ThrowsValidationError
- LoadEmployees_WhenCalled_UpdatesState
```

## Backend Unit Test Pattern

```csharp
public class SaveEmployeeCommandHandlerTests
{
    private readonly Mock<IPlatformQueryableRootRepository<Employee>> _repositoryMock;
    private readonly SaveEmployeeCommandHandler _handler;

    public SaveEmployeeCommandHandlerTests()
    {
        _repositoryMock = new Mock<IPlatformQueryableRootRepository<Employee>>();
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

## Frontend Component Test

```typescript
describe('EmployeeListComponent', () => {
    let component: EmployeeListComponent;
    let fixture: ComponentFixture<EmployeeListComponent>;
    let store: EmployeeStore;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EmployeeListComponent],
            providers: [{ provide: EmployeeApiService, useValue: jasmine.createSpyObj('EmployeeApiService', ['getEmployees']) }]
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

## BDD Test Case Format

```markdown
### TC-001: Create Employee Successfully

**Feature Module:** Employee Management
**Priority:** Critical

**Given** an HR admin is on the employee creation page
**And** the form is empty
**When** the admin fills required fields (name, email, department)
**And** clicks Save
**Then** the system should:

- Create the employee record
- Display success notification
- Navigate to employee list

**Edge Cases:**

- Duplicate email validation
- Required field validation
- Special characters in name
```

## Test Categories

| Priority | Description             | Coverage Target |
| -------- | ----------------------- | --------------- |
| Critical | Core business workflows | 100%            |
| High     | Important features      | 90%             |
| Medium   | Secondary features      | 80%             |
| Low      | Edge cases, error paths | 70%             |

## Coverage Targets

- **Commands/Queries**: All validation paths, happy path, error scenarios
- **Entities**: Validation methods, computed properties, expressions
- **Components**: Initialization, user interactions, state changes
- **Services**: API calls, error handling, caching

## Best Practices

- Test behavior, not implementation details
- Use meaningful test names
- One assertion per test (when possible)
- Mock external dependencies
- Test edge cases and error scenarios
- Keep tests independent and isolated
