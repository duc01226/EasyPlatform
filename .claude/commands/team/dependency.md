---
name: dependency
description: Track and visualize dependencies for feature or project
allowed-tools: Read, Write, Grep, Glob
arguments:
  - name: target
    description: PBI file, feature name, or "all"
    required: false
    default: all
---

# Track Dependencies

Map and visualize dependencies between features.

## Pre-Workflow

### Activate Skills

- Activate `project-manager` skill for dependency analysis best practices

## Workflow

1. **Load PBIs**
   - Read PBIs in scope
   - Extract dependency fields

2. **Build Dependency Graph**
   ```
   Feature A → Feature B (blocked by)
   Feature A ← Feature C (blocks)
   Feature A ↔ Feature D (mutual)
   ```

3. **Identify Risks**
   - Circular dependencies
   - Unresolved blockers
   - External dependencies

4. **Generate Visualization**
   ```markdown
   ## Dependency Map

   ### {Feature}

   **Upstream (We depend on):**
   - [ ] {Dep 1} - {status}
   - [ ] {Dep 2} - {status}

   **Downstream (Depends on us):**
   - [ ] {Dep 1} - {their deadline}

   ### Critical Path
   {A} → {B} → {C} → {D}

   ### Risk Areas
   - 🔴 {Feature X} blocking 3 items
   - 🟡 {External API} - timeline uncertain
   ```

5. **Output Report**
   - Console output or save to file

## Example

```bash
/dependency team-artifacts/pbis/260119-pbi-dark-mode-toggle.md
/dependency all
```
