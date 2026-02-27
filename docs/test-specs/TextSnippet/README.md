# TextSnippet Test Specifications

> Given-When-Then test cases for TextSnippet module

---

## Test Summary

| Feature      | P0  | P1  | P2  | P3  | Total |
| ------------ | --- | --- | --- | --- | ----- |
| Snippet CRUD | 0   | 4   | 0   | 0   | 4     |
| Search       | 0   | 1   | 1   | 0   | 2     |
| Categories   | 0   | 2   | 0   | 0   | 2     |
| Tasks        | 0   | 3   | 0   | 0   | 3     |
| Edge Cases   | 0   | 0   | 2   | 0   | 2     |
| **Total**    | 0   | 10  | 3   | 0   | **13**|

---

## Snippet CRUD Tests

### TC-SNP-CRT-001: Create New Snippet Successfully

**Priority**: P1-High

**Preconditions**:

- User is authenticated
- At least one category exists

**Test Steps**:

```gherkin
Given I am an authenticated user
  And I am on the snippet creation page
When I enter "Hello World" as snippet text
  And I select "General" category
  And I click Save button
Then the snippet should be saved successfully
  And I should see a success notification
  And the snippet should appear in the list
```

**Acceptance Criteria**:

- ✅ Snippet is persisted to database
- ✅ Entity event is published to message bus
- ✅ Audit log entry is created
- ❌ Empty snippet text should show validation error

**Code Evidence**:

- Command: `src/Backend/...Application/UseCaseCommands/SaveSnippetTextCommand.cs`
- Frontend: `src/Frontend/.../app-text-snippet-detail.component.ts`

**Test Data**:

```json
{
    "snippetText": "Hello World",
    "fullText": "This is a sample snippet",
    "categoryId": "cat-general-001"
}
```

---

### TC-SNP-CRT-002: Create Snippet Validation Error

**Priority**: P1-High

**Preconditions**:

- User is authenticated

**Test Steps**:

```gherkin
Given I am an authenticated user
  And I am on the snippet creation page
When I leave snippet text empty
  And I click Save button
Then I should see validation error "Snippet text is required"
  And the snippet should not be saved
```

**Acceptance Criteria**:

- ✅ Validation error message displayed
- ✅ Form remains open for correction
- ❌ No database record created

---

### TC-SNP-UPD-001: Update Existing Snippet

**Priority**: P1-High

**Preconditions**:

- User is authenticated
- Snippet with ID "snp-001" exists

**Test Steps**:

```gherkin
Given I am an authenticated user
  And a snippet "snp-001" exists with text "Original"
When I open snippet "snp-001" for editing
  And I change text to "Updated"
  And I click Save button
Then the snippet should be updated successfully
  And the list should show "Updated" text
```

**Acceptance Criteria**:

- ✅ LastUpdatedDate is updated
- ✅ Entity event published with Updated action

---

### TC-SNP-DEL-001: Delete Snippet

**Priority**: P1-High

**Preconditions**:

- User is authenticated
- Snippet with ID "snp-001" exists

**Test Steps**:

```gherkin
Given I am an authenticated user
  And a snippet "snp-001" exists
When I click delete on snippet "snp-001"
  And I confirm deletion
Then the snippet should be deleted
  And it should not appear in the list
```

**Acceptance Criteria**:

- ✅ Snippet removed from database
- ✅ Entity event published with Deleted action

---

## Search Tests

### TC-SNP-SRC-001: Search by Text

**Priority**: P1-High

**Preconditions**:

- User is authenticated
- Multiple snippets exist with various text

**Test Steps**:

```gherkin
Given I am an authenticated user
  And snippets exist with text containing "Hello"
When I enter "Hello" in the search box
  And I click Search
Then I should see only snippets containing "Hello"
  And results should be paginated
```

**Acceptance Criteria**:

- ✅ Full-text search matches partial text
- ✅ Results are case-insensitive
- ✅ Pagination controls work correctly

---

### TC-SNP-SRC-002: Search with No Results

**Priority**: P2-Medium

**Preconditions**:

- User is authenticated

**Test Steps**:

```gherkin
Given I am an authenticated user
When I search for "xyznonexistent123"
Then I should see "No results found" message
  And the results list should be empty
```

---

## Category Tests

### TC-CAT-CRT-001: Create Category

**Priority**: P1-High

**Test Steps**:

```gherkin
Given I am an authenticated user
When I create a new category "Work"
Then the category should be saved
  And it should appear in category dropdown
```

---

### TC-CAT-FLT-001: Filter by Category

**Priority**: P1-High

**Test Steps**:

```gherkin
Given I am an authenticated user
  And snippets exist in "Work" and "Personal" categories
When I filter by "Work" category
Then I should see only "Work" category snippets
```

---

## Task Tests

### TC-TSK-LST-001: List All Tasks

**Priority**: P1-High

**Test Steps**:

```gherkin
Given I am an authenticated user
  And 10 tasks exist
When I navigate to task list
Then I should see all 10 tasks
  And each task shows title and status
```

---

### TC-TSK-CRT-001: Create Task

**Priority**: P1-High

**Test Steps**:

```gherkin
Given I am an authenticated user
When I create a task with title "New Task"
Then the task should be saved
  And it should appear in the list with "Pending" status
```

---

### TC-TSK-CMP-001: Complete Task

**Priority**: P1-High

**Test Steps**:

```gherkin
Given I am an authenticated user
  And a task exists with status "Pending"
When I mark the task as complete
Then the task status should change to "Completed"
  And the UI should reflect the change
```

---

## Edge Cases

### TC-SNP-EDGE-001: Maximum Text Length

**Priority**: P2-Medium

**Test Steps**:

```gherkin
Given I am an authenticated user
When I enter snippet text with 10000 characters
Then the snippet should save successfully
  And display should truncate with "..." indicator
```

---

### TC-SNP-EDGE-002: Special Characters

**Priority**: P2-Medium

**Test Steps**:

```gherkin
Given I am an authenticated user
When I enter snippet text with special characters "<script>alert('xss')</script>"
Then the text should be properly escaped
  And saved without executing scripts
```

---

## Related Documentation

- [Module Overview](../../business-features/TextSnippet/README.md)
- [API Reference](../../business-features/TextSnippet/API-REFERENCE.md)
- [Priority Index](../PRIORITY-INDEX.md)
