# Schema Validation Before Persist

## Problem Statement

Invalid data can persist and cause downstream issues:
- Factory functions create invalid objects that get saved
- Validation at read time doesn't prevent corrupt writes
- "It was validated earlier" is never reliable

**Real Example:** A factory function didn't validate its output. Invalid objects with empty required fields persisted and caused injection failures later.

## Solution: Validate at Every Boundary

Validate data:
1. At creation (factory functions)
2. Before every write
3. At every trust boundary (API responses, message consumption)

### Factory Function Pattern

```javascript
/**
 * Create entity with validation
 */
function createEntity(input, options = {}) {
  const entity = {
    id: input.id || generateId(),
    name: input.name || '',
    status: input.status || 'pending',
    createdAt: input.createdAt || new Date().toISOString(),
    // ... other fields with defaults
  };

  // Always validate unless explicitly skipped
  if (!options.skipValidation) {
    const errors = validateEntity(entity);
    if (errors.length > 0) {
      throw new Error(`Invalid entity: ${errors.join(', ')}`);
    }
  }

  return entity;
}

/**
 * Validate entity schema
 */
function validateEntity(entity) {
  const errors = [];

  if (!entity) {
    return ['Entity is null or undefined'];
  }

  // Required field checks
  if (!entity.id || typeof entity.id !== 'string') {
    errors.push('id is required and must be a string');
  }

  if (!entity.name || entity.name.length < 1) {
    errors.push('name is required and cannot be empty');
  }

  // Format checks
  if (entity.createdAt && !isValidISODate(entity.createdAt)) {
    errors.push('createdAt must be a valid ISO date string');
  }

  // Range checks
  if (entity.count !== undefined && (entity.count < 0 || entity.count > 1000)) {
    errors.push('count must be between 0 and 1000');
  }

  return errors;
}

function isValidISODate(str) {
  const date = new Date(str);
  return date instanceof Date && !isNaN(date) && date.toISOString() === str;
}
```

### Save with Validation Pattern

```javascript
/**
 * Save entities with pre-save validation
 */
function saveEntities(entities) {
  // Validate all before saving any
  const allErrors = [];
  entities.forEach((entity, index) => {
    const errors = validateEntity(entity);
    if (errors.length > 0) {
      allErrors.push(`Entity ${index}: ${errors.join(', ')}`);
    }
  });

  if (allErrors.length > 0) {
    throw new Error(`Validation failed:\n${allErrors.join('\n')}`);
  }

  // All valid, proceed with save
  atomicWriteJSON(ENTITIES_FILE, entities);
}
```

### Update with Validation Pattern

```javascript
/**
 * Update entity with validation
 */
function updateEntity(id, updates) {
  return withLock(() => {
    const entities = loadEntities();
    const entity = entities.find(e => e.id === id);

    if (!entity) {
      throw new Error(`Entity not found: ${id}`);
    }

    // Apply updates
    const updated = { ...entity, ...updates, updatedAt: new Date().toISOString() };

    // Validate updated entity
    const errors = validateEntity(updated);
    if (errors.length > 0) {
      throw new Error(`Invalid update: ${errors.join(', ')}`);
    }

    // Replace in array
    const index = entities.indexOf(entity);
    entities[index] = updated;

    saveEntities(entities);
    return updated;
  });
}
```

## Key Principles

1. **Validate at creation** - Factory functions validate output
2. **Validate before every write** - Never trust "validated earlier"
3. **Fail fast** - Reject invalid data immediately
4. **Collect all errors** - Don't stop at first error
5. **Bounded values** - Prevent overflow with min/max checks

## Bounds Checking Pattern

Prevent integer overflow and unbounded growth:

```javascript
const MAX_COUNT = 1000;
const MAX_ITEMS = 100;

/**
 * Increment count with bounds checking
 */
function incrementCount(current, amount = 1) {
  return Math.min((current || 0) + amount, MAX_COUNT);
}

/**
 * Add item with size limit
 */
function addItem(array, item, maxItems = MAX_ITEMS) {
  if (!array) array = [];
  array.push(item);
  return array.slice(-maxItems); // Keep only last N items
}
```

## Anti-Patterns

```javascript
// WRONG: No validation in factory
function createEntity(input) {
  return { ...defaultEntity, ...input }; // Invalid input passes through
}

// WRONG: Validation only at read
function loadEntities() {
  const entities = JSON.parse(fs.readFileSync(FILE));
  return entities.filter(e => validateEntity(e).length === 0);
  // Invalid entities already in file!
}

// WRONG: Trust "validated earlier"
async function processAndSave(rawInput) {
  const validated = validateInput(rawInput); // Validated here
  const processed = await slowProcess(validated); // But what if this changes it?
  saveEntity(processed); // No validation before save!
}

// WRONG: Unbounded growth
delta.helpful_count = delta.helpful_count + 1; // Can overflow
delta.source_events.push(event); // Array grows forever
```

## Verification

```javascript
// Test validation catches invalid data
function testValidation() {
  // Should throw
  try {
    createEntity({ name: '' }); // Empty name
    console.error('FAIL: Should have thrown');
  } catch (e) {
    console.log('PASS: Caught invalid entity');
  }

  // Should pass
  try {
    const entity = createEntity({ name: 'Valid' });
    console.log('PASS: Valid entity created');
  } catch (e) {
    console.error('FAIL: Should not have thrown');
  }
}
```

## Integration with Locking and Atomic Writes

Complete pattern combining all three:

```javascript
function saveEntitySafely(entity) {
  // 1. Validate before anything
  const errors = validateEntity(entity);
  if (errors.length > 0) {
    throw new Error(`Invalid entity: ${errors.join(', ')}`);
  }

  // 2. Lock for read-modify-write
  return withLock(() => {
    const entities = loadEntities();

    // 3. Check for duplicates or conflicts
    const existing = entities.find(e => e.id === entity.id);
    if (existing) {
      const index = entities.indexOf(existing);
      entities[index] = entity;
    } else {
      entities.push(entity);
    }

    // 4. Atomic write
    atomicWriteJSON(ENTITIES_FILE, entities);
    return entity;
  });
}
```
