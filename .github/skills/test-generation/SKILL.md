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
- LoadTextSnippets_WhenCalled_UpdatesState
```

## Backend Unit Test Pattern

```csharp
public class SaveTextSnippetCommandHandlerTests
{
    private readonly Mock<IPlatformQueryableRootRepository<TextSnippet, string>> _repositoryMock;
    private readonly SaveTextSnippetCommandHandler _handler;

    public SaveTextSnippetCommandHandlerTests()
    {
        _repositoryMock = new Mock<IPlatformQueryableRootRepository<TextSnippet, string>>();
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
        var command = new SaveTextSnippetCommand { SnippetText = "Hello World" };
        _repositoryMock
            .Setup(r => r.CreateOrUpdateAsync(It.IsAny<TextSnippet>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TextSnippet e, CancellationToken _) => e);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result.Entity);
        Assert.Equal("Hello World", result.Entity.SnippetText);
    }
}
```

## Frontend Component Test

```typescript
describe('TextSnippetListComponent', () => {
    let component: TextSnippetListComponent;
    let fixture: ComponentFixture<TextSnippetListComponent>;
    let store: TextSnippetStore;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TextSnippetListComponent],
            providers: [{ provide: TextSnippetApiService, useValue: jasmine.createSpyObj('TextSnippetApiService', ['getTextSnippets']) }]
        }).compileComponents();

        fixture = TestBed.createComponent(TextSnippetListComponent);
        component = fixture.componentInstance;
        store = TestBed.inject(TextSnippetStore);
    });

    it('should load text snippets on init', () => {
        spyOn(store, 'loadTextSnippets');
        fixture.detectChanges();
        expect(store.loadTextSnippets).toHaveBeenCalled();
    });
});
```

## BDD Test Case Format

```markdown
### TC-001: Create TextSnippet Successfully

**Feature Module:** TextSnippet Management
**Priority:** Critical

**Given** a user is on the text snippet creation page
**And** the form is empty
**When** the user fills required fields (snippet text, full text)
**And** clicks Save
**Then** the system should:

- Create the text snippet record
- Display success notification
- Navigate to text snippet list

**Edge Cases:**

- Duplicate text validation
- Required field validation
- Max length validation
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
