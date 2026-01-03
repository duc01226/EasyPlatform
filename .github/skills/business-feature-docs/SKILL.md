---
name: business-feature-docs
description: Create or update EasyPlatform business feature documentation in docs/business-features/{Module}/. Use when asked to document a feature, create module docs, update feature documentation, or add detailed feature specs. Triggers on "feature docs", "business feature documentation", "module documentation", "document feature", "update feature docs".
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task, TodoWrite
---

# EasyPlatform Business Feature Documentation

Generate comprehensive business feature documentation following EasyPlatform conventions and folder structure.

---

## Output Structure

All documentation MUST be placed in the correct folder structure:

```
docs/
├── BUSINESS-FEATURES.md              # Master index (UPDATE if new module)
└── business-features/
    ├── {Module}/                     # TextSnippet, TextSnippet, TextSnippet, TextSnippet, Accounts, SupportingServices
    │   ├── README.md                 # Complete module documentation
    │   ├── INDEX.md                  # Navigation hub
    │   ├── API-REFERENCE.md          # Endpoint documentation
    │   ├── TROUBLESHOOTING.md        # Issue resolution guide
    │   └── detailed-features/
    │       └── README.{FeatureName}.md  # Deep dive for complex features
    └── ...
```

### Module Mapping

| Module Code | Folder Name | Service Path |
|-------------|-------------|--------------|
| TextSnippet | `TextSnippet` | `src/PlatformExampleApp/TextSnippet/` |
| TextSnippet | `TextSnippet` | `src/PlatformExampleApp/TextSnippet/` |
| TextSnippet | `TextSnippet` | `src/PlatformExampleApp/TextSnippet/` |
| TextSnippet | `TextSnippet` | `src/PlatformExampleApp/TextSnippet/` |
| Accounts | `Accounts` | `src/PlatformExampleApp/Accounts/` |
| Supporting | `SupportingServices` | `src/PlatformExampleApp/{NotificationMessage,ParserApi,PermissionProvider}/` |

---

## Phase 1: Module Detection & Context Gathering

### Step 1.1: Identify Target Module

Determine which module the feature belongs to by:
1. User explicitly specifies module name
2. Feature name/domain implies module (e.g., "Kudos" → TextSnippet, "Candidate" → TextSnippet)
3. Search codebase for feature-related entities/commands

### Step 1.2: Read Existing Documentation

Before creating new docs, read existing structure:
```
1. Read docs/BUSINESS-FEATURES.md (master index)
2. Read docs/business-features/{Module}/INDEX.md (if exists)
3. Read docs/business-features/{Module}/README.md (if exists)
4. Identify what already exists vs what needs creation/update
```

### Step 1.3: Codebase Analysis

Gather evidence from source code:
- **Entities**: `src/PlatformExampleApp/{Module}/{Module}.Domain/Entities/`
- **Commands**: `src/PlatformExampleApp/{Module}/{Module}.Application/UseCaseCommands/`
- **Queries**: `src/PlatformExampleApp/{Module}/{Module}.Application/UseCaseQueries/`
- **Controllers**: `src/PlatformExampleApp/{Module}/{Module}.Service/Controllers/`
- **Frontend**: `src/PlatformExampleAppWeb/apps/playground-text-snippet/` or `src/PlatformExampleAppWeb/libs/apps-domains/`

---

## Phase 2: Documentation Templates

### Template: Module README.md

Reference: `docs/business-features/TextSnippet/README.md`

```markdown
# {Module} - [Full Name]

**Module**: {Module} ([Description])
**Last Updated**: {Date}
**Coverage**: [Sub-modules list]

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Sub-Modules & Features](#sub-modules--features)
4. [Key Data Models](#key-data-models)
5. [API Endpoints](#api-endpoints)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Common Workflows](#common-workflows)
8. [Configuration](#configuration)
9. [Related Documentation](#related-documentation)

---

## Overview

[Brief description of module purpose and capabilities]

### Key Capabilities
- [Capability 1]
- [Capability 2]

---

## Architecture

```
[ASCII architecture diagram]
```

### Service Responsibilities

| Service | Responsibility |
|---------|---------------|
| {Module}.Domain | Business entities, validation rules |
| {Module}.Application | CQRS commands/queries, business logic |
| {Module}.Service | REST API, controllers |

---

## Sub-Modules & Features

### 1. [Sub-Module Name]

#### 1.1 [Feature Name]

**Description**: [What this feature does]

**Backend API**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/{controller}` | [Action] |

**Workflow**:
1. [Step 1]
2. [Step 2]

**Evidence**: `{FilePath}:{LineRange}`

---

## Key Data Models

### [Entity Name]

| Property | Type | Description |
|----------|------|-------------|
| Id | string | Unique identifier |

---

## API Endpoints

See [API-REFERENCE.md](API-REFERENCE.md) for complete endpoint documentation.

---

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| Admin | Full access |
| Manager | [Specific permissions] |
| Employee | [Limited permissions] |

---

## Common Workflows

### Workflow 1: [Name]

```
[Flow diagram or numbered steps]
```

---

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| [Setting] | [Description] | [Value] |

---

## Related Documentation

- [Other Module](../OtherModule/README.md)
- [Test Specifications](../../test-specs/{Module}/README.md)
- [Backend Patterns](../../claude/backend-patterns.md)
```

### Template: INDEX.md

```markdown
# {Module} Documentation Index

> Complete documentation set for {Module}

---

## Quick Navigation

### Main Documentation
- **[README.md](README.md)** - Complete module documentation
- **[API-REFERENCE.md](API-REFERENCE.md)** - REST API reference
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Issue resolution guide

### Detailed Features
- **[detailed-features/README.{Feature1}.md](detailed-features/README.{Feature1}.md)** - {Feature1} deep dive

---

## Documentation by Audience

### For Developers
1. Read: [README.md](README.md#architecture)
2. Reference: [API-REFERENCE.md](API-REFERENCE.md)

### For Product Owners
1. Overview: [README.md](README.md#overview)
2. Features: [README.md](README.md#sub-modules--features)

---

**Last Updated:** {Date}
```

### Template: Detailed Feature (README.{FeatureName}.md)

Reference: `docs/business-features/TextSnippet/detailed-features/README.KudosFeature.md`

```markdown
# {FeatureName} Feature Documentation

**Module**: {Module}
**Feature**: {FeatureName}
**Version**: {Version}
**Last Updated**: {Date}

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [API Reference](#api-reference)
5. [Business Rules](#business-rules)
6. [Workflows](#workflows)
7. [Configuration](#configuration)
8. [Test Specifications](#test-specifications)
9. [Troubleshooting](#troubleshooting)

---

## Overview

[Comprehensive feature description]

### Key Capabilities
- [Capability with code reference]

---

## Architecture

```
[ASCII diagram showing component relationships]
```

### Component Breakdown

| Component | Type | Path | Purpose |
|-----------|------|------|---------|
| {Entity} | Domain Entity | `src/PlatformExampleApp/{Module}/.../Entities/{Entity}.cs` | [Purpose] |
| {Command} | CQRS Command | `src/PlatformExampleApp/{Module}/.../UseCaseCommands/{Feature}/{Command}.cs` | [Purpose] |

---

## Data Models

### {Entity}

```csharp
// Evidence: {FilePath}:{LineRange}
public class {Entity} : RootEntity<{Entity}, string>
{
    public string Name { get; set; }
    // ... key properties
}
```

---

## API Reference

### Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/{Controller}/{action}` | [Description] | [Policy] |

### Request/Response Examples

```json
// POST /api/{Controller}/{action}
// Request
{
  "field": "value"
}

// Response
{
  "success": true,
  "data": {}
}
```

---

## Business Rules

| Rule | Description | Evidence |
|------|-------------|----------|
| BR-001 | [Rule description] | `{File}:{Line}` |

---

## Workflows

### Workflow: [Name]

```
[Numbered steps or sequence diagram]
```

---

## Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| [Setting] | [Type] | [Default] | [Description] |

---

## Test Specifications

See [Test Specs](../../../test-specs/{Module}/README.md) for complete test coverage.

### Key Test Cases
- TC-{MOD}-{FEAT}-001: [Test name]

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| [Issue] | [Cause] | [Solution] |

---

**Maintained By**: Documentation Team
```

---

## Phase 3: Master Index Update

After creating/updating module docs, update `docs/BUSINESS-FEATURES.md`:

1. Read current content
2. Verify module is listed in the "Detailed Module Documentation" table
3. Add link if missing:
   ```markdown
   | **{Module}** | [Description] | [View Details](./business-features/{Module}/README.md) |
   ```

---

## Anti-Hallucination Protocols

### EVIDENCE_CHAIN_VALIDATION
- Every feature claim MUST have code reference with file path and line numbers
- Read actual source files before documenting
- Never assume behavior without code evidence

### ACCURACY_CHECKPOINT
Before writing any documentation:
- "Have I read the actual code?"
- "Are my line number references accurate?"
- "Can I provide a code snippet as evidence?"

---

## Quality Checklist

- [ ] Documentation placed in correct folder structure
- [ ] README.md follows template format
- [ ] INDEX.md created with navigation links
- [ ] All code references verified with actual files
- [ ] Master index (BUSINESS-FEATURES.md) updated
- [ ] Links to test-specs included
- [ ] ASCII diagrams for architecture
- [ ] API endpoints documented with examples
