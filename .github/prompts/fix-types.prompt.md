---
description: "Fix TypeScript type errors systematically"
---

# Fix Type Errors

Run TypeScript type checker and fix all errors.

## Workflow

### Step 1: Run Type Check

```bash
cd src/PlatformExampleAppWeb
npx tsc --noEmit
```

Or with Nx:

```bash
nx run playground-text-snippet:typecheck
```

### Step 2: Analyze Errors

Group errors by type:
- Missing types/interfaces
- Incorrect type assignments
- Null/undefined issues
- Generic type mismatches
- Import errors

### Step 3: Fix Systematically

#### Missing Types

```typescript
// Error: Parameter 'x' implicitly has an 'any' type
// Fix: Add type annotation
function process(x: string): void { }
```

#### Null/Undefined

```typescript
// Error: Object is possibly 'undefined'
// Fix: Add null check or optional chaining
const value = obj?.property ?? defaultValue;
```

#### Type Mismatches

```typescript
// Error: Type 'string' is not assignable to type 'number'
// Fix: Convert or use correct type
const num: number = parseInt(str, 10);
```

### Step 4: Repeat Until Clean

```bash
npx tsc --noEmit
# Should show: No errors
```

## Common Fixes

| Error | Solution |
|-------|----------|
| TS2322 | Type mismatch → Cast or fix assignment |
| TS2345 | Argument type → Check function signature |
| TS2339 | Property doesn't exist → Add to interface |
| TS2531 | Object possibly null → Add null check |
| TS7006 | Implicit any → Add type annotation |
| TS2307 | Module not found → Check import path |

## Rules

- **Never use `any`** just to pass type check
- Fix root cause, not symptoms
- Add proper type definitions
- Use type narrowing for unions
- Prefer interfaces over inline types

## Type Narrowing Examples

```typescript
// Using type guards
if (typeof value === 'string') {
  // value is string here
}

// Using discriminated unions
if (result.success) {
  // result.data is available
}

// Using assertion functions
function assertDefined<T>(val: T | undefined): asserts val is T {
  if (val === undefined) throw new Error('Value is undefined');
}
```

## Important

- Run tests after fixing types
- Type errors often indicate logic issues
- Don't suppress errors without understanding them
