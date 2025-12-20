# Bravo Reference Cleanup Analysis

**Analysis Date**: 2025-12-18 (Updated)
**Status**: 🔄 CLEANUP IN PROGRESS

---

## Quick Summary

| Category | Files | Status |
|----------|-------|--------|
| .github/agents/ | 4 files | 🔴 NEEDS CLEANUP |
| .github/instructions/ | 3 files | 🔴 NEEDS CLEANUP |
| .github/prompts/ | 1 file | 🔴 NEEDS CLEANUP |
| Platform Source (XML docs) | ~15 files | 🟡 LOW PRIORITY |
| Scripts | 3 files | 🟡 LOW PRIORITY |

---

## Executive Summary

This workspace is **EasyPlatform** - a standalone .NET + Angular development framework with only the `PlatformExampleApp` example application. Documentation was incorrectly copied from BravoSUITE enterprise project and contains extensive invalid references that must be cleaned up.

---

## Files Containing Bravo/Invalid References

### Category 1: Core AI Documentation (CRITICAL PRIORITY)

| File | Bravo References Found | Status |
|------|------------------------|--------|
| `CLAUDE.md` | Growth.Application, Growth.Domain, Employee entity, IGrowthRootRepository, WebV2 | NEEDS CLEANUP |
| `AGENTS.md` | Same as CLAUDE.md (identical copy) | NEEDS CLEANUP |
| `.github/copilot-instructions.md` | Same as CLAUDE.md (identical copy) | NEEDS CLEANUP |
| `ai-common-prompt.md` | May contain BravoSUITE references | NEEDS REVIEW |

### Category 2: .claude/skills/ Files (HIGH PRIORITY)

| File | Invalid References | Status |
|------|-------------------|--------|
| `arch-cross-service-integration/SKILL.md` | BravoSUITE, bravoTALENTS, bravoGROWTH, bravoSURVEYS, bravoINSIGHTS, Bravo.Shared, Employee entity | NEEDS CLEANUP |
| `backend-data-migration/SKILL.md` | src/Services/bravoGROWTH, IGrowthRootRepository, Growth.Persistence | NEEDS CLEANUP |
| `backend-message-bus/SKILL.md` | Bravo.Shared, Bravo.Shared/CrossServiceMessages/ | NEEDS CLEANUP |
| `backend-entity-development/SKILL.md` | bravoTALENTS, bravoGROWTH, bravoSURVEYS | NEEDS CLEANUP |
| `frontend-angular-component/SKILL.md` | WebV2, @libs/bravo-domain, growth-for-company, employee | NEEDS CLEANUP |
| `frontend-angular-api-service/SKILL.md` | src/WebV2/libs/bravo-domain | NEEDS CLEANUP |
| `frontend-angular-form/SKILL.md` | src/WebV2, @libs/bravo-domain | NEEDS CLEANUP |
| `frontend-angular-store/SKILL.md` | src/WebV2 | NEEDS CLEANUP |
| `tasks-feature-implementation/SKILL.md` | bravoGROWTH, bravoTALENTS | NEEDS CLEANUP |
| `tasks-test-generation/SKILL.md` | IGrowthRootRepository, src/WebV2 | NEEDS CLEANUP |
| `tasks-spec-update/SKILL.md` | bravoGROWTH | NEEDS CLEANUP |

### Category 3: .agent/rules/ Files (MEDIUM PRIORITY)

| File | Invalid References | Status |
|------|-------------------|--------|
| `architecture.md` | CLEAN - Already updated to PlatformExampleApp | OK |
| `frontend-patterns.md` | EmployeeListComponent, EmployeeFormComponent, EmployeeApiService | NEEDS CLEANUP |
| `repository-patterns.md` | Employee entity references, I{ServiceName}PlatformRootRepository | NEEDS CLEANUP |
| `testing.md` | Employee entity references | NEEDS CLEANUP |
| `anti-patterns.md` | May have bravo examples | NEEDS REVIEW |
| `authorization.md` | May have bravo examples | NEEDS REVIEW |
| `conventions.md` | May have bravo examples | NEEDS REVIEW |
| `validation-patterns.md` | May have bravo examples | NEEDS REVIEW |
| `migration-patterns.md` | May have bravo examples | NEEDS REVIEW |
| `backend-patterns.md` | May have bravo examples | NEEDS REVIEW |

### Category 4: Platform Source Code (LOW PRIORITY - XML Comments Only)

| File | BravoSUITE References | Status |
|------|----------------------|--------|
| `Easy.Platform.AspNetCore/PlatformAspNetCoreModule.cs` | XML comments mention BravoSUITE | CONSIDER CLEANUP |
| `Easy.Platform.AspNetCore/Controllers/PlatformBaseController.cs` | XML comments mention bravoTALENTS, CandidateApp, BravoSUITE | CONSIDER CLEANUP |
| `Easy.Platform.AspNetCore/OpenApi/PlatformBearerSecuritySchemeTransformer.cs` | BravoSUITE in XML docs | CONSIDER CLEANUP |
| `Easy.Platform.AspNetCore/Middleware/PlatformRequestIdGeneratorMiddleware.cs` | BravoSUITE in XML docs | CONSIDER CLEANUP |
| `Easy.Platform.AspNetCore/Extensions/*.cs` | BravoSUITE in XML docs (multiple files) | CONSIDER CLEANUP |
| `Easy.Platform.AspNetCore/ExceptionHandling/*.cs` | BravoSUITE in XML docs | CONSIDER CLEANUP |
| `Easy.Platform.AspNetCore/Constants/CommonHttpHeaderNames.cs` | BravoSUITE in XML docs | CONSIDER CLEANUP |
| `Easy.Platform/Common/PlatformModule.cs` | BravoSUITE in XML docs | CONSIDER CLEANUP |
| `Easy.Platform/Application/*.cs` | BravoSuitesApplicationCustomRequestContextKeys, IGrowthRootRepository in examples | CONSIDER CLEANUP |
| `Easy.Platform/Application/BackgroundJob/*.cs` | IGrowthRootRepository in XML examples | CONSIDER CLEANUP |

### Category 5: Script/Config Files (LOW PRIORITY)

| File | References | Status |
|------|-----------|--------|
| `src/start-dev-platform-example-app-AUTOMATION-TEST.cmd` | AutomationTest.BravoTalents.BDD.dll | NEEDS UPDATE |
| `src/GenerateHttpsCertForDocker/BRAVO-APIS-DOCKER-*.ps1` | BRAVO TALENTS in title | CONSIDER RENAME |
| `src/PlatformExampleAppWeb/libs/platform-core/**/*.ts` | WebV2 comments | CONSIDER CLEANUP |

---

## Invalid References Detailed Breakdown

### Business Domain References (MUST REMOVE)
These entities/services DO NOT EXIST in this workspace:
- `bravoTALENTS` - Recruitment service
- `bravoGROWTH` - Employee management
- `bravoSURVEYS` - Survey platform
- `bravoINSIGHTS` - Analytics
- `BravoSUITE` - Enterprise HR platform name
- `Accounts` - Auth service
- `CandidateApp` - Candidate portal
- `Employee` entity (as business domain)
- `LeaveRequest` entity
- `Goal` entity
- `CheckIn` entity
- `Candidate` entity
- `Survey` entity
- `Company` entity (as specific bravo entity)

### Path References (MUST FIX)
| Invalid Path | Correct Path |
|--------------|--------------|
| `src/Services/` | `src/PlatformExampleApp/` |
| `src/WebV2/` | `src/PlatformExampleAppWeb/` |
| `src/Web/` | (does not exist - remove) |
| `@libs/bravo-domain` | `@libs/apps-domains` |
| `@libs/bravo-common` | `@libs/platform-core` |
| `growth-for-company` app | `playground-text-snippet` |
| `employee` app | `playground-text-snippet` |

### Code References (MUST FIX)
| Invalid Reference | Correct Reference |
|-------------------|-------------------|
| `IGrowthRootRepository<T>` | `IPlatformQueryableRootRepository<T, TKey>` |
| `ICandidatePlatformRootRepository` | `IPlatformQueryableRootRepository<T, TKey>` |
| `Growth.Application` namespace | `PlatformExampleApp.TextSnippet.Application` |
| `Growth.Domain` namespace | `PlatformExampleApp.TextSnippet.Domain` |
| `Bravo.Shared` | `PlatformExampleApp.Shared` |
| `Employee` entity examples | `TextSnippetEntity` or generic `Entity` |
| `EmployeeDto` | `TextSnippetEntityDto` or generic `EntityDto` |
| `EmployeeListComponent` | `TextSnippetListComponent` or generic examples |
| `EmployeeFormComponent` | `TextSnippetDetailComponent` or generic examples |

---

## Actual Workspace Structure

### What EXISTS (Valid)
```
src/
├── Platform/                           # EasyPlatform framework (CORRECT)
│   ├── Easy.Platform/                  # Core framework
│   ├── Easy.Platform.AspNetCore/       # ASP.NET integration
│   ├── Easy.Platform.MongoDB/          # MongoDB support
│   ├── Easy.Platform.EfCore/           # EF Core support
│   ├── Easy.Platform.RabbitMQ/         # Message bus
│   └── ... other platform modules
│
├── PlatformExampleApp/                 # Example backend app (CORRECT)
│   ├── PlatformExampleApp.TextSnippet.Api/
│   ├── PlatformExampleApp.TextSnippet.Application/
│   ├── PlatformExampleApp.TextSnippet.Domain/
│   ├── PlatformExampleApp.TextSnippet.Persistence/
│   ├── PlatformExampleApp.TextSnippet.Persistence.PostgreSql/
│   └── PlatformExampleApp.Shared/
│
└── PlatformExampleAppWeb/              # Example frontend (CORRECT)
    ├── apps/playground-text-snippet/   # Text snippet example app
    └── libs/
        ├── platform-core/              # Base components, stores
        ├── apps-domains/               # Domain models
        │   └── text-snippet-domain/
        ├── share-styles/
        └── share-assets/
```

### What DOES NOT EXIST (Invalid Documentation)
```
src/
├── Services/                           # DOESN'T EXIST
│   ├── bravoTALENTS/                  # DOESN'T EXIST
│   ├── bravoGROWTH/                   # DOESN'T EXIST
│   ├── bravoSURVEYS/                  # DOESN'T EXIST
│   └── bravoINSIGHTS/                 # DOESN'T EXIST
│
├── WebV2/                              # DOESN'T EXIST (wrong path)
│   ├── apps/growth-for-company/       # DOESN'T EXIST
│   ├── apps/employee/                 # DOESN'T EXIST
│   └── libs/bravo-common/             # DOESN'T EXIST
│
└── Web/                                # DOESN'T EXIST
```

---

## Cleanup Strategy

### Recommended Approach: Full Cleanup (Option 1)

Replace all bravo-specific content with EasyPlatform/PlatformExampleApp equivalents:
1. Replace service examples with TextSnippet examples
2. Replace frontend examples with playground-text-snippet
3. Remove enterprise HR domain concepts entirely
4. Keep only platform framework patterns

### Replacement Map

| Bravo Term | Replacement |
|------------|-------------|
| BravoSUITE | EasyPlatform |
| bravoTALENTS, bravoGROWTH, bravoSURVEYS, bravoINSIGHTS | PlatformExampleApp.TextSnippet (or generic [YourService]) |
| src/Services/ | src/PlatformExampleApp/ |
| src/WebV2/ | src/PlatformExampleAppWeb/ |
| src/Web/ | (remove) |
| bravo-common | platform-core |
| bravo-domain | apps-domains |
| growth-for-company | playground-text-snippet |
| employee app | playground-text-snippet |
| IGrowthRootRepository | IPlatformQueryableRootRepository |
| Growth.Application | PlatformExampleApp.TextSnippet.Application |
| Growth.Domain | PlatformExampleApp.TextSnippet.Domain |
| Bravo.Shared | PlatformExampleApp.Shared |
| Employee entity | TextSnippetEntity (or generic Entity) |
| Accounts service | (remove or make generic auth example) |

---

## Implementation Plan

### Phase 1: Core AI Documentation (CRITICAL)
**Effort**: HIGH | **Impact**: CRITICAL

1. **CLAUDE.md** - Replace:
   - Line 649: `namespace Growth.Application.UseCaseCommands.Entity;` → `namespace PlatformExampleApp.TextSnippet.Application.UseCaseCommands;`
   - Line 795: `Growth.Application/UseCaseEvents/` → `PlatformExampleApp.TextSnippet.Application/UseCaseEvents/`
   - Line 931: `Growth.Application\EntityDtos\` → `PlatformExampleApp.TextSnippet.Application\Dtos\EntityDtos\`
   - All Employee entity examples → TextSnippetEntity examples

2. **AGENTS.md** - Sync with CLAUDE.md (or make symlink)

3. **.github/copilot-instructions.md** - Sync with CLAUDE.md

### Phase 2: .claude/skills/ Files (HIGH)
**Effort**: MEDIUM | **Impact**: HIGH

Files requiring significant changes:
1. `arch-cross-service-integration/SKILL.md` - Rewrite service boundary diagram with generic examples
2. `backend-data-migration/SKILL.md` - Fix paths, repository references
3. `backend-message-bus/SKILL.md` - Replace Bravo.Shared with generic shared project
4. `backend-entity-development/SKILL.md` - Remove bravo service names
5. `frontend-angular-component/SKILL.md` - Fix WebV2 paths, @libs/bravo-domain
6. `frontend-angular-form/SKILL.md` - Fix paths
7. `frontend-angular-api-service/SKILL.md` - Fix paths
8. `frontend-angular-store/SKILL.md` - Fix paths
9. `tasks-*.md` files - Fix service references

### Phase 3: .agent/rules/ Files (MEDIUM)
**Effort**: LOW | **Impact**: MEDIUM

Files requiring changes:
1. `frontend-patterns.md` - Replace Employee examples with generic or TextSnippet
2. `repository-patterns.md` - Already mostly generic, minor updates
3. `testing.md` - Replace Employee examples
4. Review and fix: anti-patterns.md, authorization.md, conventions.md, validation-patterns.md, migration-patterns.md, backend-patterns.md

### Phase 4: Platform Source Code (LOW)
**Effort**: MEDIUM | **Impact**: LOW (documentation only)

Update XML comments in:
1. `Easy.Platform.AspNetCore/*.cs` files - Replace "BravoSUITE" with "EasyPlatform" or generic terms
2. `Easy.Platform/Application/*.cs` - Update example code in XML docs

### Phase 5: Scripts (LOW)
**Effort**: LOW | **Impact**: LOW

1. `start-dev-platform-example-app-AUTOMATION-TEST.cmd` - Update DLL paths
2. `GenerateHttpsCertForDocker/BRAVO-*.ps1` - Rename to PLATFORM-*

---

## Verification Checklist

After cleanup, verify:
- [ ] No grep results for "bravo" (case-insensitive) except this analysis file
- [ ] No grep results for "WebV2" in documentation
- [ ] No grep results for "src/Services/" in documentation
- [ ] No grep results for "IGrowthRootRepository" in documentation
- [ ] No grep results for "Growth.Application" in documentation
- [ ] All file paths in documentation are valid
- [ ] Example code references actual entities (TextSnippetEntity)
- [ ] Frontend paths point to PlatformExampleAppWeb

---

## Notes

1. **Already Clean Files**:
   - `.agent/rules/architecture.md` - Already correctly references PlatformExampleApp

2. **Source Code Decision**:
   - XML comments in Platform source code mentioning BravoSUITE could be updated to say "EasyPlatform" or made generic
   - This is lower priority as it doesn't affect AI agent behavior

3. **Consolidation Opportunity**:
   - AGENTS.md and .github/copilot-instructions.md appear to be copies of CLAUDE.md
   - Consider making them reference CLAUDE.md or consolidating into single source of truth
