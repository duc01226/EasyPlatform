# Design System Documentation Index

Quick reference for AI agents to select the correct design system file based on target application.

## Summary - Quick File Selection

| File Path Contains | Read This Guide                                |
| ------------------ | ---------------------------------------------- |
| `src/Frontend/`    | [WebV2DesignSystem.md](./WebV2DesignSystem.md) |

**Quick Detection:**

- `@use 'shared-mixin'` → Angular 19 Example App
- Angular 19 standalone components with signals

---

## Table of Contents

1. [File Selection Matrix](#file-selection-matrix) - Which doc for which app
2. [Decision Tree](#decision-tree) - Visual path selector
3. [App-to-File Mapping](#app-to-file-mapping) - Detailed directory mappings
4. [Quick Detection Rules](#quick-detection-rules) - Identify app by code patterns

---

## File Selection Matrix

| Working On   | Design System File                             | Path Pattern                                 |
| ------------ | ---------------------------------------------- | -------------------------------------------- |
| **Frontend** | [WebV2DesignSystem.md](./WebV2DesignSystem.md) | `src/Frontend/apps/*`, `src/Frontend/libs/*` |

## Decision Tree

```
Which app are you modifying?
|
+-> src/Frontend/* (playground-text-snippet, libs)
    +-> READ: WebV2DesignSystem.md
```

## App-to-File Mapping

### WebV2DesignSystem.md

- `src/Frontend/apps/playground-text-snippet/`
- `src/Frontend/libs/apps-domains/`
- `src/Frontend/libs/platform-core/`
- `src/Frontend/libs/share-styles/`
- `src/Frontend/libs/share-assets/`

**Key indicators:** Angular 19, standalone components, `@use 'shared-mixin'`, CSS variables (`--bg-pri-cl`), flex mixins

## Quick Detection Rules

1. **Check import statements:**
    - `@use 'shared-mixin'` → Frontend (Angular 19)

2. **Check class naming:**
    - No prefix, uses `--modifier` separate class → Standard BEM pattern

3. **Check file path:**
    - Contains `Frontend` → WebV2DesignSystem.md
