---
agent: 'agent'
description: 'Generate unit tests following EasyPlatform testing patterns'
tools: ['read', 'edit', 'search', 'execute']
---

# Create Unit Tests

## Required Reading

**Before implementing, you MUST read the appropriate guide:**

- **Backend (C#):** `docs/claude/backend-csharp-complete-guide.md`
- **Frontend (TS):** `docs/claude/frontend-typescript-complete-guide.md`

---

Generate unit tests for the following:

**Target:** ${input:target}
**Test Type:** ${input:type:Command Handler,Query Handler,Entity,Service,Component,Store}

## Test File Location

```
Backend:
{Service}.Tests/
├── UseCaseCommands/
│   └── {Feature}/
│       └── Save{Entity}CommandHandlerTests.cs
├── UseCaseQueries/
│   └── {Feature}/
│       └── Get{Entity}ListQueryHandlerTests.cs
└── Domain/
    └── {Entity}Tests.cs

Frontend:
src/PlatformExampleAppWeb/libs/{lib}/src/lib/
├── {feature}/
│   └── {feature}.component.spec.ts
└── stores/
    └── {feature}.store.spec.ts
```

---

## Backend Test Patterns

### Command Handler Test
```csharp
public class Save{Entity}CommandHandlerTests : PlatformApplicationTestBase<{Service}Module>
{
    private readonly Mock<I{Service}RootRepository<{Entity}>> mockRepository;
    private readonly Save{Entity}CommandHandler handler;

    public Save{Entity}CommandHandlerTests()
    {
        mockRepository = new Mock<I{Service}RootRepository<{Entity}>>();
        handler = CreateHandler<Save{Entity}CommandHandler>(
            services => services.AddScoped(_ => mockRepository.Object));
    }

    [Fact]
    public async Task HandleAsync_WhenValidCommand_ShouldCreateEntity()
    {
        // Arrange
        var command = new Save{Entity}Command { Name = "Test" };
        mockRepository.Setup(r => r.CreateAsync(It.IsAny<{Entity}>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Entity e, CancellationToken _) => e);

        // Act
        var result = await handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Entity.Name.Should().Be("Test");
        mockRepository.Verify(r => r.CreateAsync(It.IsAny<{Entity}>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WhenInvalidCommand_ShouldReturnValidationError()
    {
        // Arrange
        var command = new Save{Entity}Command { Name = "" };

        // Act
        var result = await handler.HandleAsync(command, CancellationToken.None);

        // Assert
        result.IsValid.Should().BeFalse();
        result.ErrorMessage.Should().Contain("Name is required");
    }
}
```

### Query Handler Test
```csharp
public class Get{Entity}ListQueryHandlerTests : PlatformApplicationTestBase<{Service}Module>
{
    [Fact]
    public async Task HandleAsync_WhenItemsExist_ShouldReturnPagedResult()
    {
        // Arrange
        var entities = new List<{Entity}>
        {
            new {Entity} { Id = "1", Name = "Test1" },
            new {Entity} { Id = "2", Name = "Test2" }
        };
        mockRepository.Setup(r => r.GetAllAsync(...)).ReturnsAsync(entities);
        mockRepository.Setup(r => r.CountAsync(...)).ReturnsAsync(2);

        var query = new Get{Entity}ListQuery { MaxResultCount = 10 };

        // Act
        var result = await handler.HandleAsync(query, CancellationToken.None);

        // Assert
        result.Items.Should().HaveCount(2);
        result.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task HandleAsync_WithSearchText_ShouldFilterResults()
    {
        // Arrange
        var query = new Get{Entity}ListQuery { SearchText = "test" };

        // Act
        var result = await handler.HandleAsync(query, CancellationToken.None);

        // Assert
        mockSearchService.Verify(s => s.Search(
            It.IsAny<IQueryable<{Entity}>>(),
            "test",
            It.IsAny<Expression<Func<{Entity}, object>>[]>()), Times.Once);
    }
}
```

### Entity Test
```csharp
public class {Entity}Tests
{
    [Fact]
    public void UniqueExpr_ShouldMatchCorrectEntity()
    {
        // Arrange
        var entities = new List<{Entity}>
        {
            new { Id = "1", CompanyId = "C1", Code = "A" },
            new { Id = "2", CompanyId = "C1", Code = "B" },
            new { Id = "3", CompanyId = "C2", Code = "A" }
        }.AsQueryable();

        // Act
        var result = entities.Where({Entity}.UniqueExpr("C1", "A")).ToList();

        // Assert
        result.Should().HaveCount(1);
        result[0].Id.Should().Be("1");
    }

    [Theory]
    [InlineData("", false)]
    [InlineData("Valid Name", true)]
    public void Validate_ShouldReturnExpectedResult(string name, bool expectedValid)
    {
        // Arrange
        var entity = new {Entity} { Name = name };

        // Act
        var result = entity.Validate();

        // Assert
        result.IsValid.Should().Be(expectedValid);
    }
}
```

---

## Frontend Test Patterns

### Component Test
```typescript
describe('{Feature}Component', () => {
  let component: {Feature}Component;
  let fixture: ComponentFixture<{Feature}Component>;
  let mockStore: jasmine.SpyObj<{Feature}Store>;

  beforeEach(async () => {
    mockStore = jasmine.createSpyObj('{Feature}Store', ['loadItems'], {
      vm$: signal({ items: [], loading: false })
    });

    await TestBed.configureTestingModule({
      imports: [{Feature}Component],
      providers: [{ provide: {Feature}Store, useValue: mockStore }]
    }).compileComponents();

    fixture = TestBed.createComponent({Feature}Component);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load items on init', () => {
    fixture.detectChanges();
    expect(mockStore.loadItems).toHaveBeenCalled();
  });

  it('should display loading indicator when loading', () => {
    mockStore.vm$.set({ items: [], loading: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.loading')).toBeTruthy();
  });
});
```

### Store Test
```typescript
describe('{Feature}Store', () => {
  let store: {Feature}Store;
  let mockApi: jasmine.SpyObj<{Feature}ApiService>;

  beforeEach(() => {
    mockApi = jasmine.createSpyObj('{Feature}ApiService', ['getList', 'save']);

    TestBed.configureTestingModule({
      providers: [
        {Feature}Store,
        { provide: {Feature}ApiService, useValue: mockApi }
      ]
    });

    store = TestBed.inject({Feature}Store);
  });

  it('should load items successfully', fakeAsync(() => {
    const items = [{ id: '1', name: 'Test' }];
    mockApi.getList.and.returnValue(of(items));

    store.loadItems();
    tick();

    expect(store.vm$().items).toEqual(items);
    expect(store.isLoading$('loadItems')()).toBeFalse();
  }));

  it('should handle error on load', fakeAsync(() => {
    mockApi.getList.and.returnValue(throwError(() => new Error('API Error')));

    store.loadItems();
    tick();

    expect(store.getErrorMsg$('loadItems')()).toContain('API Error');
  }));
});
```

---

## Test Naming Convention

```
MethodName_WhenCondition_ShouldExpectedBehavior

Examples:
- HandleAsync_WhenValidCommand_ShouldCreateEntity
- HandleAsync_WhenEntityNotFound_ShouldThrowNotFoundException
- UniqueExpr_WithMatchingData_ShouldReturnSingleResult
- LoadItems_WhenApiSucceeds_ShouldUpdateState
```

## Coverage Requirements

- [ ] Happy path scenarios
- [ ] Validation failures
- [ ] Edge cases (null, empty, boundary values)
- [ ] Error handling paths
- [ ] Async operations
