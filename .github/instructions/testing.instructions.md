---
applyTo: "**/*.test.ts,**/*.spec.ts,**/*Tests*.cs,**/*Test*.cs"
---

# Testing Patterns

> Auto-loads when editing test files. See `docs/claude/backend-patterns.md` and `docs/claude/frontend-patterns.md` for full reference.

## Backend Testing (C#)

### Unit Test Structure

```csharp
[Fact]
public async Task SaveEmployee_WithValidData_ReturnsCreatedEmployee()
{
    // Arrange
    var command = new SaveEmployeeCommand { Employee = new EmployeeDto { Name = "Test" } };

    // Act
    var result = await _handler.HandleAsync(command, CancellationToken.None);

    // Assert
    result.Employee.Name.Should().Be("Test");
}
```

### Test Naming Convention

```
[MethodName]_[Scenario]_[ExpectedResult]
```

Examples:
- `SaveEmployee_WithValidData_ReturnsCreatedEmployee`
- `GetById_WhenNotFound_ThrowsNotFoundException`
- `Validate_WithEmptyName_ReturnsValidationError`

### Entity Validation Tests

```csharp
[Fact]
public void Validate_WithInvalidDateRange_ReturnsError()
{
    var entity = new LeaveRequest { FromDate = DateTime.Today, ToDate = DateTime.Today.AddDays(-1) };
    var result = entity.Validate();
    result.IsValid.Should().BeFalse();
    result.Errors.Should().Contain(e => e.Contains("Invalid range"));
}
```

## Frontend Testing (TypeScript)

### Component Test

```typescript
describe('EmployeeListComponent', () => {
    let component: EmployeeListComponent;
    let store: MockStore<EmployeeState>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            declarations: [EmployeeListComponent],
            providers: [{ provide: EmployeeStore, useClass: MockStore }]
        });
        component = TestBed.createComponent(EmployeeListComponent).componentInstance;
    });

    it('should load employees on init', () => {
        component.ngOnInit();
        expect(store.load).toHaveBeenCalled();
    });
});
```

### Service Test

```typescript
describe('EmployeeApiService', () => {
    let service: EmployeeApiService;
    let httpMock: HttpTestingController;

    it('should fetch employees', () => {
        service.getEmployees().subscribe(employees => {
            expect(employees.length).toBe(2);
        });
        const req = httpMock.expectOne('/api/Employee');
        req.flush([{ id: '1' }, { id: '2' }]);
    });
});
```

## Test Coverage Focus

- **Entity validation logic** - all business rules
- **Command handlers** - happy path + error cases
- **Repository extensions** - query correctness
- **Store effects** - state transitions
- **Form components** - validation rules

## Critical Rules

1. **Test behavior, not implementation** - focus on what, not how
2. **One assertion per concept** - keep tests focused
3. **Use meaningful test data** - not generic "test" strings
4. **Test edge cases** - null, empty, boundary values
5. **Mock external dependencies** - repositories, APIs, message bus
