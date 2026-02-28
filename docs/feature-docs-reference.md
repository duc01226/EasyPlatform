# Feature Documentation Reference

> **Companion doc for generic skills.** Contains project-specific feature doc structure, app-to-service mapping, template paths, and section conventions. Generic skills reference this file via "MUST READ `feature-docs-reference.md`".

## BravoSUITE App-to-Service Mapping

| Module Code | Folder Name | Service Path | Features |
|---|---|---|---|
| bravoTALENTS | `bravoTALENTS` | `src/Services/bravoTALENTS/` | 8 features: Recruitment, Candidates, Jobs, Interviews, Employees, Coaching, Matching, Settings |
| bravoGROWTH | `bravoGROWTH` | `src/Services/bravoGROWTH/` | 6 features: Goals, Kudos, Check-ins, Performance Reviews, Timesheets, Form Templates |
| bravoSURVEYS | `bravoSURVEYS` | `src/Services/bravoSURVEYS/` | 2 features: Survey Design, Survey Distribution |
| bravoINSIGHTS | `bravoINSIGHTS` | `src/Services/bravoINSIGHTS/` | 1 feature: Dashboard Management |
| Accounts | `Accounts` | `src/Services/Accounts/` | 1 feature: User Management |
| Supporting | `SupportingServices` | `src/Services/{NotificationMessage,ParserApi,PermissionProvider}/` | Notification, Parsing, Permissions |

## Feature Doc Directory Structure

```
docs/business-features/
├── DOCUMENTATION-GUIDE.md                    # How to create/update docs
├── BUSINESS-FEATURES.md                      # Master index
├── {Module}/                                 # e.g., bravoGROWTH, bravoTALENTS
│   ├── README.md                             # Complete module documentation
│   ├── INDEX.md                              # Navigation hub
│   ├── API-REFERENCE.md                      # Endpoint documentation
│   ├── TROUBLESHOOTING.md                    # Issue resolution guide
│   └── detailed-features/
│       ├── README.{FeatureName}.md           # Comprehensive (human, 1000+ lines)
│       └── README.{FeatureName}.ai.md        # AI companion (code-focused, 300-500 lines)
└── ...
```

## Template File Paths

- **Master template:** `docs/templates/detailed-feature-docs-template.md`
- **AI companion template:** `docs/templates/feature-docs-ai-template.md`

## Gold Standard Reference Docs

Study these for quality and format:
- `docs/business-features/bravoTALENTS/detailed-features/README.EmployeeSettingsFeature.md`
- `docs/business-features/bravoTALENTS/detailed-features/README.RecruitmentPipelineFeature.md`
- `docs/features/README.ExampleFeature1.md` (Example App)

## 26-Section Structure

All feature docs MUST follow this exact section order:
1. Header + Metadata
2. Executive Summary
3. Business Context
4. Feature Overview
5. Architecture Overview
6. Domain Model
7. Data Flow
8. API Reference
9. Business Rules
10. UI Components
11. State Management
12. Form Handling
13. Validation Rules
14. Error Handling
15. Security & Permissions
16. Performance Considerations
17. Test Cases (TC-{MOD}-XXX format, MUST have `Evidence: FilePath:Line`)
18. Integration Test Mapping
19. Test Coverage Matrix
20. Test Data Requirements
21. Known Issues
22. Future Enhancements
23. Related Features
24. Glossary
25. References
26. Version History + CHANGELOG

## Test Case ID Format

| Context | Format | Example |
|---|---|---|
| test-spec | `TC-{SVC}-{NNN}` | TC-GRO-015 |
| test-specs-docs | `TC-{SVC}-{FEATURE}-{NNN}` | TC-GRO-KUD-001 |
| integration-test | `TC-{FEATURE}-{NNN}` (comment) | TC-KD-001 |

## Evidence Rule

EVERY test case MUST have verifiable code evidence:
```markdown
**Evidence**: `{RelativeFilePath}:{LineNumber}` or `{RelativeFilePath}:{StartLine}-{EndLine}`
```
