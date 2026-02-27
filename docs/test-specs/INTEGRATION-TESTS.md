# Integration Test Scenarios

> End-to-end test scenarios spanning multiple modules

---

## Overview

Integration tests verify the interaction between multiple components:

- Frontend ↔ Backend API
- Command ↔ Event Handler
- Producer ↔ Consumer (Message Bus)
- Multi-database operations

---

## E2E Scenarios

### INT-001: Full Snippet Lifecycle

**Priority**: P1-High

**Description**: Complete lifecycle of a text snippet from creation to deletion.

**Modules Involved**:

- TextSnippet API
- Entity Events
- Message Bus

**Test Steps**:

```gherkin
Given the system is running with RabbitMQ connected
  And I am an authenticated user

# Create
When I create a snippet with text "Integration Test"
Then the snippet should be saved to database
  And an EntityCreated event should be published to message bus
  And the consumer should process the event

# Read
When I retrieve the snippet by ID
Then I should receive the correct snippet data

# Update
When I update the snippet text to "Updated Integration Test"
Then the snippet should be updated in database
  And an EntityUpdated event should be published

# Search
When I search for "Integration"
Then the updated snippet should appear in results

# Delete
When I delete the snippet
Then the snippet should be removed from database
  And an EntityDeleted event should be published
```

**Verification Points**:

- [ ] Database record created/updated/deleted
- [ ] Message bus events published
- [ ] Consumers process events successfully
- [ ] Search index updated

---

### INT-002: Category with Snippets

**Priority**: P1-High

**Description**: Category management with associated snippets.

**Test Steps**:

```gherkin
Given I am an authenticated user

# Setup
When I create category "Test Category"
  And I create 3 snippets in "Test Category"
Then all snippets should have the category association

# Filter
When I filter snippets by "Test Category"
Then I should see only the 3 associated snippets

# Category Update
When I rename category to "Updated Category"
Then snippets should reflect the new category name
```

---

### INT-003: Background Job Execution

**Priority**: P2-Medium

**Description**: Manual background job scheduling and execution.

**Test Steps**:

```gherkin
Given the background job infrastructure is running

When I trigger DemoScheduleBackgroundJobManuallyCommand
Then the job should be queued in Hangfire
  And the job should execute within scheduled time
  And job completion should be logged
```

---

### INT-004: Message Bus Round-Trip

**Priority**: P1-High

**Description**: Verify message bus producer-consumer flow.

**Test Steps**:

```gherkin
Given RabbitMQ is running
  And consumers are registered and listening

When I save a snippet (triggers producer)
Then TextSnippetEntityEventBusMessageProducer should publish message
  And SnippetTextEntityEventBusConsumer should receive message
  And consumer should process without errors
```

**Verification Points**:

- [ ] Message appears in RabbitMQ queue
- [ ] Consumer acknowledges message
- [ ] No dead-letter messages

---

### INT-005: Multi-Database Demo

**Priority**: P2-Medium

**Description**: Verify multi-database functionality.

**Test Steps**:

```gherkin
Given SQL Server, MongoDB, and PostgreSQL are running

When I trigger multi-database demo command
Then data should be written to primary database
  And domain event should trigger cross-database sync
  And MultiDbDemoEntity should exist in secondary database
```

---

## Performance Tests

### PERF-001: Search Performance

**Target**: < 500ms for 10,000 snippets

**Test Steps**:

```gherkin
Given 10,000 snippets exist in database
When I perform full-text search
Then results should return within 500ms
```

---

### PERF-002: Bulk Operations

**Target**: < 5s for 1,000 inserts

**Test Steps**:

```gherkin
When I create 1,000 snippets via bulk API
Then all records should be saved within 5 seconds
  And no timeout errors should occur
```

---

## Test Environment Requirements

### Infrastructure

- Docker containers running (SQL Server, MongoDB, PostgreSQL, RabbitMQ, Redis)
- API service running on localhost:5001
- Frontend running on localhost:4001

### Commands

```bash
# Start infrastructure
docker-compose -f src/platform-example-app.docker-compose.yml up -d

# Run integration tests
dotnet test --filter "Category=Integration"

# Run E2E tests (Playwright)
cd src/Frontend/e2e
npm test
```

---

## Related Documentation

- [Test Specs README](./README.md)
- [Priority Index](./PRIORITY-INDEX.md)
- [TextSnippet Tests](./TextSnippet/README.md)
