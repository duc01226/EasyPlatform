---
description: "Test generation with real implementations - no mocks for happy path"
---

# Testing Framework

Comprehensive testing strategy emphasizing real implementations and meaningful verification.

## Core Principles

1. **Real Tests Only** - No fake data or mocks for core happy paths
2. **Test Behavior, Not Implementation** - Focus on outcomes, not internals
3. **Verification Before Success Claims** - Run tests before claiming anything works
4. **Coverage Matters** - Test critical paths, edge cases, and error handling

## Test Philosophy

### Real vs Fake Tests

**❌ Fake Tests (Avoid):**
```typescript
// Mock everything
const mockService = { getData: jest.fn().mockResolvedValue([]) };
const component = new Component(mockService);
expect(component.data).toEqual([]);
```

**✅ Real Tests (Prefer):**
```typescript
// Use actual service with real database
const service = new Service(realDatabase);
const result = await service.getData();
expect(result).toMatchSnapshot();
```

**When to Mock:**
- External APIs (payment gateways, third-party services)
- Time-dependent functions (`Date.now()`, timers)
- File system operations (sometimes)
- Network calls to external systems

**When NOT to Mock:**
- Your own services
- Database operations (use test DB)
- Business logic
- Validation functions

### Test Structure

**AAA Pattern: Arrange, Act, Assert**

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = { name: 'John', email: 'john@example.com' };

      // Act
      const user = await service.createUser(userData);

      // Assert
      expect(user.id).toBeDefined();
      expect(user.name).toBe('John');
      expect(user.email).toBe('john@example.com');
    });
  });
});
```

## Test Categories

### 1. Unit Tests

**Test individual functions/methods in isolation.**

**What to Test:**
- Pure functions (input → output)
- Business logic
- Validation functions
- Utility functions
- Entity methods

**Example:**
```typescript
describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
  });
});
```

### 2. Integration Tests

**Test multiple components working together.**

**What to Test:**
- API endpoints with database
- Service layer with repositories
- Component with API service
- Full feature flows

**Example:**
```typescript
describe('Employee API', () => {
  it('should create and retrieve employee', async () => {
    // Create
    const createResponse = await request(app)
      .post('/api/employees')
      .send({ name: 'John', email: 'john@example.com' });

    expect(createResponse.status).toBe(201);
    const employeeId = createResponse.body.id;

    // Retrieve
    const getResponse = await request(app)
      .get(`/api/employees/${employeeId}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.name).toBe('John');
  });
});
```

### 3. End-to-End Tests

**Test complete user workflows.**

**What to Test:**
- Critical user journeys
- Multi-step processes
- Cross-component flows
- Real user scenarios

**Example:**
```typescript
describe('User Registration Flow', () => {
  it('should complete full registration', async () => {
    // Navigate to registration
    await page.goto('/register');

    // Fill form
    await page.fill('#name', 'John Doe');
    await page.fill('#email', 'john@example.com');
    await page.fill('#password', 'secure123');

    // Submit
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard
    await page.waitForURL('/dashboard');
    expect(await page.textContent('h1')).toBe('Welcome, John');
  });
});
```

## Test Coverage Requirements

### Critical Paths (100% Coverage Required)

- User authentication/authorization
- Payment processing
- Data persistence (create/update/delete)
- Security validations
- Core business logic

### Important Paths (80%+ Coverage)

- API endpoints
- Service layer methods
- Repository operations
- Form validations
- State management

### Nice-to-Have (50%+ Coverage)

- UI components
- Utility functions
- Helper methods
- Display logic

## Edge Cases and Error Handling

### Common Edge Cases

**Boundary Values:**
```typescript
describe('pagination', () => {
  it('should handle first page', async () => {
    const result = await service.getPage(0, 10);
    expect(result.items.length).toBeLessThanOrEqual(10);
  });

  it('should handle empty results', async () => {
    const result = await service.getPage(999, 10);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should handle negative page', async () => {
    await expect(service.getPage(-1, 10)).rejects.toThrow();
  });
});
```

**Null/Undefined/Empty:**
```typescript
describe('processData', () => {
  it('should handle null input', () => {
    expect(() => processData(null)).toThrow('Input required');
  });

  it('should handle empty array', () => {
    const result = processData([]);
    expect(result).toEqual([]);
  });

  it('should handle undefined properties', () => {
    const result = processData({ name: undefined });
    expect(result.name).toBe('');
  });
});
```

**Error Conditions:**
```typescript
describe('deleteUser', () => {
  it('should handle non-existent user', async () => {
    await expect(service.deleteUser('invalid-id'))
      .rejects.toThrow('User not found');
  });

  it('should handle database errors', async () => {
    jest.spyOn(repository, 'delete').mockRejectedValue(new Error('DB Error'));
    await expect(service.deleteUser('user-1'))
      .rejects.toThrow('Failed to delete user');
  });

  it('should rollback on failure', async () => {
    // Test transaction rollback
  });
});
```

## Test Organization

### File Structure

```
src/
├── features/
│   └── users/
│       ├── user.service.ts
│       ├── user.service.spec.ts          # Unit tests
│       ├── user.controller.ts
│       ├── user.controller.spec.ts       # Integration tests
│       └── user.e2e.spec.ts              # E2E tests
```

### Naming Conventions

**Test Files:**
- `*.spec.ts` - Unit/Integration tests
- `*.e2e.spec.ts` - End-to-end tests
- `*.test.ts` - Alternative convention

**Test Names:**
```typescript
// ✅ Good: Descriptive, behavior-focused
it('should return empty array when no users exist', () => {});
it('should throw error when email is invalid', () => {});
it('should create user with default role when role not specified', () => {});

// ❌ Bad: Vague, implementation-focused
it('should work', () => {});
it('tests the function', () => {});
it('calls repository.save', () => {});
```

## Test Data Management

### Test Database

**Setup/Teardown:**
```typescript
beforeAll(async () => {
  // Connect to test database
  await database.connect(testConfig);
});

afterAll(async () => {
  // Disconnect
  await database.disconnect();
});

beforeEach(async () => {
  // Clear data before each test
  await database.clear();
});
```

### Factory Pattern

**Create test data consistently:**
```typescript
// factories/user.factory.ts
export const createTestUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  createdAt: new Date(),
  ...overrides
});

// Usage in tests
const user = await service.create(createTestUser({
  email: 'specific@example.com'
}));
```

## Verification Protocol

### Before Claiming Tests Pass

**❌ DON'T:**
- Trust old test run
- Assume tests pass
- Skip running tests
- Trust CI without local verification

**✅ DO:**
```bash
# 1. Run tests fresh
npm test

# 2. Read output completely
# Look for: X passed, Y failed
# Check for warnings

# 3. Verify specific claims
npm test -- path/to/specific/test

# 4. Check coverage
npm test -- --coverage

# 5. THEN claim results with evidence
"Tests pass: 47 passed, 0 failed, 85% coverage"
```

## Common Testing Anti-Patterns

| ❌ Anti-Pattern | ✅ Better Approach |
|----------------|-------------------|
| Mock everything | Use real implementations where possible |
| Test implementation details | Test behavior and outcomes |
| One assertion per test | Multiple related assertions OK |
| Brittle snapshots | Specific assertions for critical fields |
| No edge case tests | Comprehensive edge case coverage |
| Tests depend on order | Isolated, independent tests |
| Hardcoded test data | Factory functions |
| No cleanup | beforeEach/afterEach cleanup |

## Testing Checklist

**Before Claiming Code Complete:**

- [ ] Critical paths have tests
- [ ] Edge cases covered
- [ ] Error handling tested
- [ ] Integration tests exist
- [ ] All tests actually run
- [ ] All tests pass (verified fresh)
- [ ] No skipped tests without reason
- [ ] Test data cleaned up
- [ ] Coverage meets requirements

**Test Quality Checks:**

- [ ] Tests are readable
- [ ] Tests are isolated
- [ ] Tests are deterministic
- [ ] Meaningful test names
- [ ] Proper assertions
- [ ] No false positives
- [ ] No flaky tests

## Testing Tools by Stack

### Backend (.NET)

```csharp
// xUnit + FluentAssertions
[Fact]
public async Task CreateUser_WithValidData_ReturnsUser()
{
    // Arrange
    var command = new CreateUserCommand { Name = "John", Email = "john@example.com" };

    // Act
    var result = await _handler.HandleAsync(command, CancellationToken.None);

    // Assert
    result.Should().NotBeNull();
    result.Id.Should().NotBeNullOrEmpty();
    result.Name.Should().Be("John");
}
```

### Frontend (Angular)

```typescript
// Jasmine/Karma
describe('UserComponent', () => {
  it('should display user list', async () => {
    // Arrange
    const users = [{ id: '1', name: 'John' }];
    apiService.getUsers.and.returnValue(of(users));

    // Act
    await component.ngOnInit();

    // Assert
    expect(component.vm().users).toEqual(users);
  });
});
```

## Bottom Line

**Testing priorities:**

1. **Real implementations** - Actual code paths, not mocks
2. **Critical coverage** - Authentication, payments, data persistence
3. **Edge cases** - Nulls, empties, boundaries, errors
4. **Verification** - Run tests fresh before any claims
5. **Maintainability** - Clear names, isolated tests, proper cleanup

**Remember:** Tests are proof your code works. No shortcuts.
