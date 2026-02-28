# Design System Documentation Index

Quick reference for AI agents to select the correct design system file based on target application.

## Summary - Quick File Selection

| File Path Contains | Read This Guide |
|--------------------|-----------------|
| `src/WebV2/` | [WebV2DesignSystem.md](./WebV2DesignSystem.md) |
| `src/Web/bravoTALENTS` | [bravoTALENTSClientDesignSystem.md](./bravoTALENTSClientDesignSystem.md) |
| `src/Web/CandidateApp` or `JobPortal` | [CandidateAppClientDesignSystem.md](./CandidateAppClientDesignSystem.md) |
| V1 app + NEW modern UI | [WebV1ModernStyleGuide.md](./WebV1ModernStyleGuide.md) + app guide |

**Quick Detection:**
- `@use 'shared-mixin'` → WebV2
- `@import '~assets/scss/variables'` + sprite icons → bravoTALENTS
- `ca-` class prefix + Bootstrap grid → CandidateApp

---

## Table of Contents

1. [File Selection Matrix](#file-selection-matrix) - Which doc for which app
2. [Decision Tree](#decision-tree) - Visual path selector
3. [When to Use WebV1ModernStyleGuide](#when-to-use-webv1modernstyleguidemd) - V2 aesthetics in V1
4. [App-to-File Mapping](#app-to-file-mapping) - Detailed directory mappings
5. [Quick Detection Rules](#quick-detection-rules) - Identify app by code patterns

---

## File Selection Matrix

| Working On | Design System File | Path Pattern |
|------------|-------------------|--------------|
| **WebV2 apps** | [WebV2DesignSystem.md](./WebV2DesignSystem.md) | `src/WebV2/apps/*`, `src/WebV2/libs/*` |
| **bravoTALENTS** | [bravoTALENTSClientDesignSystem.md](./bravoTALENTSClientDesignSystem.md) | `src/Web/bravoTALENTSClient/*` |
| **CandidateApp** | [CandidateAppClientDesignSystem.md](./CandidateAppClientDesignSystem.md) | `src/Web/CandidateAppClient/*` |
| **V1 apps + Modern UI** | [WebV1ModernStyleGuide.md](./WebV1ModernStyleGuide.md) | New UI in V1 apps with V2 aesthetics |

## Decision Tree

```
Which app are you modifying?
│
├─► src/WebV2/* (employee, growth-for-company, notification, libs)
│   └─► READ: WebV2DesignSystem.md
│
├─► src/Web/bravoTALENTSClient/* (existing patterns)
│   └─► READ: bravoTALENTSClientDesignSystem.md
│
├─► src/Web/bravoTALENTSClient/* (NEW modern UI)
│   └─► READ: WebV1ModernStyleGuide.md + bravoTALENTSClientDesignSystem.md
│
├─► src/Web/CandidateAppClient/* (existing patterns)
│   └─► READ: CandidateAppClientDesignSystem.md
│
├─► src/Web/CandidateAppClient/* (NEW modern UI)
│   └─► READ: WebV1ModernStyleGuide.md + CandidateAppClientDesignSystem.md
│
└─► src/Web/* (other legacy apps: JobPortalClient, bravoSURVEYSClient, etc.)
    └─► READ: bravoTALENTSClientDesignSystem.md (closest match)
```

## When to Use WebV1ModernStyleGuide.md

Use this guide when building **NEW UI components** in V1 apps (bravoTALENTS, CandidateApp) that should match the modern WebV2 aesthetic:

- New pages/features in V1 apps
- Redesigning existing V1 components to look modern
- Applying V2 colors, spacing, typography to V1 structure

**Read BOTH**: WebV1ModernStyleGuide.md (for V2 aesthetic) + app-specific guide (for V1 component patterns)

## App-to-File Mapping

### WebV2DesignSystem.md
- `src/WebV2/apps/employee/`
- `src/WebV2/apps/growth-for-company/`
- `src/WebV2/apps/notification/`
- `src/WebV2/libs/bravo-common/`
- `src/WebV2/libs/bravo-domain/`
- `src/WebV2/libs/platform-core/`

**Key indicators:** Angular 19, standalone components, `@use 'shared-mixin'`, CSS variables (`--bg-pri-cl`), flex mixins

### bravoTALENTSClientDesignSystem.md
- `src/Web/bravoTALENTSClient/`
- `src/Web/bravoINSIGHTSClient/` (similar patterns)
- `src/Web/bravoSURVEYSClient/` (similar patterns)
- `src/Web/PulseSurveysClient/` (similar patterns)

**Key indicators:** Legacy Angular, SCSS `$variables`, sprite icons, `flex-column-container` mixin

### CandidateAppClientDesignSystem.md
- `src/Web/CandidateAppClient/`
- `src/Web/JobPortalClient/` (similar patterns)

**Key indicators:** Bootstrap 3 grid (`col-xs-*`), `ca-` BEM prefix, Font Awesome icons

## Quick Detection Rules

1. **Check import statements:**
   - `@use 'shared-mixin'` → WebV2
   - `@import 'variables'` with `$color-*` → bravoTALENTS
   - `@import 'variables'` with Bootstrap → CandidateApp

2. **Check class prefixes:**
   - No prefix, uses `--modifier` separate class → WebV2
   - `ca-*` prefix → CandidateApp
   - Module-specific prefix (e.g., `recruitment-*`) → bravoTALENTS

3. **Check file path:**
   - Contains `WebV2` → WebV2DesignSystem.md
   - Contains `bravoTALENTS` → bravoTALENTSClientDesignSystem.md
   - Contains `CandidateApp` or `JobPortal` → CandidateAppClientDesignSystem.md
