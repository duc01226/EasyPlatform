---
mode: 'agent'
tools: ['editFiles', 'codebase', 'terminal']
description: 'Generate unit tests following EasyPlatform testing patterns'
---

# Create Unit Test

Generate unit tests for the following code:

**Target:** ${input:targetPath}
**Test Framework:** ${input:framework:xUnit|Jest}

## Requirements

1. Follow Given-When-Then (Arrange-Act-Assert) structure
2. Use descriptive test method names: `MethodName_Scenario_ExpectedResult`
3. Mock all external dependencies
4. Cover success, failure, and edge cases

---

## .NET (xUnit) Template

**File location:** `{Project}.Tests/UseCaseCommands/{Feature}/{Handler}Tests.cs`

```csharp
using Xunit;
using Moq;
using FluentAssertions;

namespace YourService.Tests.UseCaseCommands.{Feature};

public class {Handler}Tests
{
    private readonly Mock<IPlatformQueryableRootRepository<{Entity}, string>> _repositoryMock;
    private readonly Mock<ILoggerFactory> _loggerFactoryMock;
    private readonly {Handler} _handler;

    public {Handler}Tests()
    {
        _repositoryMock = new Mock<IPlatformQueryableRootRepository<{Entity}, string>>();
        _loggerFactoryMock = new Mock<ILoggerFactory>();
        _loggerFactoryMock.Setup(x => x.CreateLogger(It.IsAny<string>()))
            .Returns(Mock.Of<ILogger>());

        _handler = new {Handler}(
            _loggerFactoryMock.Object,
            Mock.Of<IPlatformUnitOfWorkManager>(),
            Mock.Of<IServiceProvider>(),
            Mock.Of<IPlatformRootServiceProvider>(),
            _repositoryMock.Object);
    }

    [Fact]
    public async Task HandleAsync_ValidRequest_ReturnsSuccess()
    {
        // Arrange
        var request = new {Command} { Name = "Test" };
        var entity = new {Entity} { Id = "1", Name = "Test" };

        _repositoryMock
            .Setup(x => x.CreateOrUpdateAsync(It.IsAny<{Entity}>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(entity);

        // Act
        var result = await _handler.HandleAsync(request, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Entity.Should().NotBeNull();
        _repositoryMock.Verify(x => x.CreateOrUpdateAsync(It.IsAny<{Entity}>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_InvalidRequest_ThrowsValidationException()
    {
        // Arrange
        var request = new {Command} { Name = "" }; // Invalid: empty name

        // Act & Assert
        await Assert.ThrowsAsync<PlatformValidationException>(
            () => _handler.HandleAsync(request, CancellationToken.None));
    }

    [Fact]
    public async Task HandleAsync_EntityNotFound_ThrowsNotFoundException()
    {
        // Arrange
        var request = new {Command} { Id = "nonexistent" };

        _repositoryMock
            .Setup(x => x.GetByIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Task<{Entity}>)null!);

        // Act & Assert
        await Assert.ThrowsAsync<PlatformNotFoundException>(
            () => _handler.HandleAsync(request, CancellationToken.None));
    }
}
```

---

## Angular (Jest) Template

**File location:** `{component}.component.spec.ts`

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { {Component}Component } from './{component}.component';
import { {Component}Store } from './{component}.store';
import { {Entity}ApiService } from '@libs/apps-domains/{domain}';

describe('{Component}Component', () => {
  let component: {Component}Component;
  let fixture: ComponentFixture<{Component}Component>;
  let apiServiceMock: jest.Mocked<{Entity}ApiService>;
  let storeMock: jest.Mocked<{Component}Store>;

  beforeEach(async () => {
    apiServiceMock = {
      getList: jest.fn(),
      save: jest.fn(),
    } as any;

    storeMock = {
      load{Entity}s: jest.fn(),
      vm$: of({ {entity}s: [], loading: false }),
    } as any;

    await TestBed.configureTestingModule({
      declarations: [{Component}Component],
      providers: [
        { provide: {Entity}ApiService, useValue: apiServiceMock },
        { provide: {Component}Store, useValue: storeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent({Component}Component);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load {entity}s on init', () => {
      // Arrange & Act
      fixture.detectChanges();

      // Assert
      expect(storeMock.load{Entity}s).toHaveBeenCalled();
    });
  });

  describe('on{Action}', () => {
    it('should emit {event} when action triggered', () => {
      // Arrange
      const emitSpy = jest.spyOn(component.{event}, 'emit');
      const mock{Entity} = { id: '1', name: 'Test' };

      // Act
      component.on{Action}(mock{Entity});

      // Assert
      expect(emitSpy).toHaveBeenCalledWith(mock{Entity});
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', () => {
      // Arrange
      apiServiceMock.getList.mockReturnValue(throwError(() => new Error('API Error')));

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.getErrorMsg$()).toBeDefined();
    });
  });
});
```

---

## Test Categories

Generate tests for:

1. **Happy path** - Normal successful execution
2. **Validation** - Invalid input handling
3. **Not found** - Missing entity scenarios
4. **Authorization** - Permission checks
5. **Edge cases** - Empty lists, null values, boundary conditions
6. **Error handling** - Exception propagation

---

## Naming Convention

```
// .NET
MethodName_Scenario_ExpectedResult
HandleAsync_ValidRequest_ReturnsSuccess
HandleAsync_EmptyName_ThrowsValidationException
GetEmployees_NoActiveEmployees_ReturnsEmptyList

// TypeScript
describe('methodName', () => {
  it('should do X when Y', () => {});
  it('should throw error when invalid input', () => {});
});
```
