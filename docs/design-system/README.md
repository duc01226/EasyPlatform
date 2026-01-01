# Design System Documentation Index

Quick reference for AI agents to select the correct design system file based on target application.

## Summary - Quick File Selection

| File Path Contains | Read This Guide |
|--------------------|-----------------|
| `src/PlatformExampleAppWeb/` | [WebV2DesignSystem.md](./WebV2DesignSystem.md) |

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

| Working On | Design System File | Path Pattern |
|------------|-------------------|--------------|
| **PlatformExampleAppWeb** | [WebV2DesignSystem.md](./WebV2DesignSystem.md) | `src/PlatformExampleAppWeb/apps/*`, `src/PlatformExampleAppWeb/libs/*` |

## Decision Tree

```
Which app are you modifying?
|
+-> src/PlatformExampleAppWeb/* (playground-text-snippet, libs)
    +-> READ: WebV2DesignSystem.md
```

## App-to-File Mapping

### WebV2DesignSystem.md
- `src/PlatformExampleAppWeb/apps/playground-text-snippet/`
- `src/PlatformExampleAppWeb/libs/apps-domains/`
- `src/PlatformExampleAppWeb/libs/platform-core/`
- `src/PlatformExampleAppWeb/libs/share-styles/`
- `src/PlatformExampleAppWeb/libs/share-assets/`

**Key indicators:** Angular 19, standalone components, `@use 'shared-mixin'`, CSS variables (`--bg-pri-cl`), flex mixins

## Quick Detection Rules

1. **Check import statements:**
   - `@use 'shared-mixin'` → PlatformExampleAppWeb (Angular 19)

2. **Check class naming:**
   - No prefix, uses `--modifier` separate class → Standard BEM pattern

3. **Check file path:**
   - Contains `PlatformExampleAppWeb` → WebV2DesignSystem.md
