# Form Templates Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.FormTemplatesFeature.md](./README.FormTemplatesFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoGROWTH |
| Service | Growth.Service |
| Database | SQL Server (PostgreSQL for Growth) |
| Full Docs | [README.FormTemplatesFeature.md](./README.FormTemplatesFeature.md) |

### File Locations

```
Entities:    src/Services/bravoGROWTH/Growth.Domain/Entities/FormTemplate/
Commands:    src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/FormTemplate/
Queries:     src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/FormTemplate/
Controllers: src/Services/bravoGROWTH/Growth.Service/Controllers/FormTemplateController.cs
API Service: src/WebV2/libs/bravo-domain/src/growth/api-services/form-template-api.service.ts
Frontend:    src/WebV2/apps/growth-for-company/src/app/routes/employee-setting-management/templates-management/
```

---

## Domain Model

### Entities

```
FormTemplate : RootEntity<FormTemplate, string> (Root Aggregate)
├── Id: string (ULID)
├── Name: string
├── Description: string
├── Status: FormTemplateStatus (Draft | Published | Archived)
├── Type: FormTemplateType (PerformanceReview)
├── Code: string (version lineage identifier)
├── VersionNumber: int
├── CompanyId: string
├── DefaultLanguage: string (e.g., "en")
├── AdditionalLanguages: List<string>
├── Orders: Dictionary<string, int> (QuestionId|SectionId → DisplayOrder)
├── Attachments: Dictionary<string, string>
├── CreatedByEmployeeId: string?
├── FormTemplateQuestions: ICollection<FormTemplateQuestion> (direct questions)
├── FormTemplateQuestionSections: ICollection<FormTemplateQuestionSection>
├── FormTemplateUsages: ICollection<FormTemplateUsage> (linked to review events)
└── FormTemplateResponses: ICollection<FormTemplateResponse> (submitted forms)

FormTemplateQuestion : Entity
├── Id: string (ULID)
├── FormTemplateId: string
├── FormTemplateQuestionSectionId: string? (null = direct question, else in section)
├── SharedQuestionId: string? (OR custom QuestionInfo, not both)
├── IsRequired: bool
├── MaxScore: double?
├── QuestionInfo: Question?
├── ReportCode: string?
└── QuestionAnswerOptions: List<FormTemplateQuestionAnswerOption>?

FormTemplateQuestionSection : Entity
├── Id: string (ULID)
├── FormTemplateId: string
├── SharedQuestionSectionId: string?
├── QuestionSectionInfo: QuestionSection?
├── Orders: Dictionary<string, int> (QuestionId → DisplayOrder in section)
└── FormTemplateQuestions: ICollection<FormTemplateQuestion>?

FormTemplateResponse : Entity
├── Id: string (ULID)
├── FormTemplateId: string
├── AnswerUserId: string
├── CompletedDate: DateTime?
├── Status: FormTemplateResponseStatus (NotStarted | InProgress | Completed)
├── Results: List<FormTemplateQuestionResponse> (per-question answers)
├── LinkedExternalResponseId: string? (performance review assessment ID)
└── CompanyId: string

FormTemplateUsage : Entity
├── Id: string (ULID)
├── FormTemplateId: string
├── UsingTargetId: string (event ID using this template)
├── UsingTargetType: string
├── DateAssigned: DateTime
└── FormTemplateEditMode: FormTemplateEditMode?
```

### Enums

```
FormTemplateType: PerformanceReview = 0

FormTemplateStatus:
  Draft = 0 (fully editable)
  Published = 1 (partially editable if in use)
  Archived = 2 (read-only)

FormTemplateEditMode:
  Editable = 0 (all fields)
  PartiallyEditable = 1 (description only)
  ReadOnly = 2 (no changes)

FormTemplateResponseStatus:
  NotStarted = 0
  InProgress = 1
  Completed = 2
```

### Value Objects

```
FormTemplateQuestionAnswerOption {
  Label: LanguageString
  Value: QuestionAnswer
  Order: int
  Score: double?
}

FormTemplateQuestionResponse {
  FormTemplateQuestionId: string
  Answers: List<QuestionAnswer>
  Score: double?
  PercentageScore: double?
  CorrectStatus: CorrectStatus?
  Comment: string?
}
```

---

## API Contracts

### Commands

```
POST /api/FormTemplate/save-template
├── Request:  SaveFormTemplateCommand { toSaveFormTemplate, files? }
├── Response: FormTemplateEntityDto
└── Evidence: SaveFormTemplateCommand.cs:18-34

POST /api/FormTemplate/delete-template
├── Request:  DeleteFormTemplateCommand { formTemplateId }
├── Response: DeleteFormTemplateCommandResult
└── Evidence: DeleteFormTemplateCommand.cs:35-50

POST /api/FormTemplate/clone-form-template
├── Request:  CloneFormTemplateCommand { toCloneFormTemplateId, formTemplateType }
├── Response: ClonedFormTemplate
└── Evidence: CloneFormTemplateCommand.cs:17-33

POST /api/FormTemplate/change-status
├── Request:  ChangeFormTemplateStatusCommand { formTemplateIds, status }
├── Response: ChangeFormTemplateStatusResult { templateStatusResults[] }
└── Evidence: ChangeFormTemplateStatusCommand.cs:17-40

POST /api/FormTemplate/save-form-template-question
├── Request:  SaveFormTemplateQuestionCommand { formTemplateId, sharedQuestionId?, isRequired, maxScore }
├── Response: FormTemplateQuestionDto
└── Evidence: SaveFormTemplateQuestionCommand.cs:15-40

POST /api/FormTemplate/save-form-template-question-section
├── Request:  SaveFormTemplateQuestionSectionCommand { formTemplateId, questionSectionInfo }
├── Response: FormTemplateQuestionSectionDto
└── Evidence: SaveFormTemplateQuestionSectionCommand.cs:14-30

POST /api/FormTemplate/reorder
├── Request:  ReorderFormTemplateItemsCommand { sectionReorders[], formTemplateReorder?, toUpdateReorderedQuestions[] }
├── Response: ReorderFormTemplateItemsCommandResult
└── Evidence: ReorderFormTemplateItemsCommand.cs:16-35
```

### Queries

```
GET /api/FormTemplate/
├── Request:  GetFormTemplateListQuery { searchText?, statuses[], createdByEmployeeIds[], isInUsed? }
├── Response: GetFormTemplateListQueryResult { items[], totalCount }
└── Evidence: GetFormTemplateListQuery.cs:18-46

GET /api/FormTemplate/detail
├── Request:  GetFormTemplateQuery { formTemplateId }
├── Response: FormTemplate (with questions, sections)
└── Evidence: GetFormTemplateQuery.cs

GET /api/FormTemplate/check-unique-name
├── Request:  CheckFormTemplateNameUniquenessQuery { name, excludeFormTemplateId? }
├── Response: bool (isUnique)
└── Evidence: CheckFormTemplateNameUniquenessQuery.cs

GET /api/FormTemplate/get-shared-question-list
├── Request:  GetSharedQuestionListQuery { searchText?, pageIndex, pageSize }
├── Response: List<SharedQuestion>
└── Evidence: GetSharedQuestionListQuery.cs

GET /api/FormTemplate/form-template-response/{id}
├── Response: FormTemplateResponse
└── Evidence: GetFormTemplateResponseDetailQuery.cs
```

### DTOs

```
FormTemplateEntityDto : PlatformEntityDto<FormTemplate, string>
├── Id: string?
├── Name: string
├── Description: string
├── Status: FormTemplateStatus
├── Type: FormTemplateType
├── Code: string
├── VersionNumber: int
├── DefaultLanguage: string
├── AdditionalLanguages: List<string>
└── MapToEntity(): FormTemplate
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|-----------|----------|
| BR-FT-001 | Template name unique within company | `CheckFormTemplateNameUniquenessQuery.cs` |
| BR-FT-002 | Status transitions: Draft→Published\|Archived, Published→Archived only, Archived→locked | `ChangeFormTemplateStatusCommand.cs:100-117` |
| BR-FT-003 | Publish requires ≥1 valid question | `FormTemplateHelper.GetStatusUpdateFailureReasonsAsync()` |
| BR-FT-004 | Published + in-use = PartiallyEditable; Published + unused = Editable; Archived = ReadOnly | `FormTemplateEditMode.cs` |
| BR-FT-005 | Cannot delete if FormTemplateUsages exist | `DeleteFormTemplateCommand.cs:55-74` |
| BR-FT-006 | Clone naming: "{Name} (copy)" → "{Name} (copy 2)" auto-increments | `FormTemplate.cs:172-192` |
| BR-FT-007 | Question requires SharedQuestionId XOR QuestionInfo.QuestionText | `FormTemplateQuestion.cs:66-83` |
| BR-FT-008 | Move question between sections: update section ID + recalc both sections' Orders | `ReorderFormTemplateItemsCommand.cs:78-120` |
| BR-FT-009 | Cloned template preserves Code (version lineage), increments VersionNumber | `FormTemplate.cs:19,24` |
| BR-FT-010 | Complete response requires all required questions answered | `FormTemplateResponse.cs:7-50` |

---

## Service Boundaries

### Produces Events

```
FormTemplateEntityEventBusMessage → [Employee.Service, Growth.Service, Candidate.Service]
├── Producer: Auto-generated by Platform (triggered on FormTemplate Create/Update/Delete)
├── Payload: FormTemplate entity data
└── Primary Use: Cross-service sync not typical (template is bravoGROWTH internal)
```

### Consumes Events

```
GrowthFormTemplateResponseUpsertRequestBusMessage ← PerformanceReviewAssessment
├── Consumer: GrowthFormTemplateResponseUpsertRequestBusMessageConsumer.cs
├── Action: Create/update FormTemplateResponse linked to assessment
└── Idempotent: Yes

GrowthFormTemplateUsageCudRequestBusMessage ← PerformanceReviewEvent
├── Consumer: GrowthFormTemplateUsageCudRequestBusMessageConsumer.cs
├── Action: Create/update/delete FormTemplateUsage
└── Purpose: Track template usage across events
```

### Entity Event Handlers

```
UpdateOrdersOnCreateOrDeleteFormTemplateQuestionEntityEventHandler
├── Triggered: FormTemplateQuestion created/deleted
├── Action: Recalculate template.Orders and section.Orders
└── Purpose: Auto-update ordering when questions added/removed

UpdatePerformanceAssessmentOnCreateFormTemplateResponseEntityEventHandler
├── Triggered: FormTemplateResponse created/updated
├── Action: Sync response results back to PerformanceReviewAssessment
└── Purpose: Two-way data binding

SendGrowthUpsertFormTemplateResponseMessageOnCreatePerformanceReviewAssessmentEntityEventHandler
├── Triggered: PerformanceReviewAssessment created
├── Action: Publish message to create FormTemplateResponse
└── Purpose: Initiate response form when assessment created
```

---

## Critical Paths

### Create Template

```
1. Validate input (BR-FT-001)
   ├── Name required
   ├── Name unique per company
   └── Type = PerformanceReview
2. Generate ID if empty → Ulid.NewUlid()
3. Create FormTemplate with Status=Draft
4. Set CompanyId, CreatedByEmployeeId
5. Save via repository.CreateAsync()
6. Platform auto-publishes entity event
```
**Evidence**: `SaveFormTemplateCommand.cs:60-90`, `SaveFormTemplateCommandHandler.cs:36-91`

### Add Question to Template

```
1. Validate (BR-FT-007)
   ├── SharedQuestionId XOR (QuestionInfo with text)
   ├── If dropdown: options.count >= 1
   └── Group must exist if section-based
2. Create FormTemplateQuestion with FormTemplateId
3. Set IsRequired, MaxScore, QuestionInfo
4. Save via repository.CreateAsync()
5. Entity event: Update template Orders dict
```
**Evidence**: `SaveFormTemplateQuestionCommand.cs`, `UpdateOrdersOnCreateOrDeleteFormTemplateQuestionEntityEventHandler.cs`

### Publish Template

```
1. Load template with questions
2. Validate publishability (BR-FT-003)
   ├── Has ≥1 question
   └── All questions have (SharedQuestionId OR QuestionInfo.text)
3. Change Status → Published
4. Determine EditMode:
   ├── If FormTemplateUsages exist: PartiallyEditable
   └── Else: Editable
5. Save → Publish event → Consumers update tracking
```
**Evidence**: `ChangeFormTemplateStatusCommand.cs:75-118`, `ChangeFormTemplateStatusCommandHandler.cs`

### Clone Template

```
1. Check permissions: HR Manager or Performance Review Admin
2. Load source template with all questions + sections
3. Generate new IDs for template, questions, sections (ULID)
4. Map question IDs: old → new
5. Clone Questions
   ├── Preserve SharedQuestionId references
   ├── Generate new FormTemplateQuestion.Id
   └── Keep custom QuestionInfo/QuestionAnswerOptions
6. Clone Sections with new IDs
7. Rebuild Orders dictionaries with new IDs
8. Generate clone name: "{Original}" → "{Original} (copy)" → "{Original} (copy 2)"
9. Set Status=Draft, Code=source.Code (preserve version lineage)
10. Save cloned template
```
**Evidence**: `CloneFormTemplateCommand.cs:68-93`, `FormTemplate.cs:117-192`

### Reorder Questions in Template

```
1. Parse ReorderFormTemplateItemsCommand
   ├── FormTemplateReorder = template-level reorder
   ├── SectionReorders = per-section reorders
   └── ToUpdateReorderedQuestions = move questions between sections
2. Update template.Orders with new mappings
3. Update section.Orders for each section
4. Move questions between sections:
   ├── Update FormTemplateQuestion.FormTemplateQuestionSectionId
   ├── Remove from old section's Orders
   └── Add to new section's Orders
5. Save → Persists new order structure
```
**Evidence**: `ReorderFormTemplateItemsCommand.cs:16-120`, `FormTemplate.cs:204-223`

### Delete Template

```
1. Load template
2. Check if deletable (BR-FT-005)
   ├── Query FormTemplateUsages
   └── If count > 0: return error "linked to active events"
3. Soft delete: repository.DeleteAsync(templateId)
4. Platform auto-publishes delete event
5. Historical data preserved, template hidden from lists
```
**Evidence**: `DeleteFormTemplateCommand.cs:55-90`, `DeleteFormTemplateCommandHandler.cs:76-89`

---

## Permission Model

| Action | HR Manager | PR Admin | Creator | Regular |
|--------|:----------:|:--------:|:-------:|:-------:|
| View List | ✅ | ✅ | ✅ | ❌ |
| Create | ✅ | ✅ (PR only) | ✅ | ❌ |
| Edit Draft | ✅ | ✅ (own) | ✅ (own) | ❌ |
| Edit Questions | ✅ | ✅ (own) | ✅ (own) | ❌ |
| Edit Published | ✅ desc only | ✅ desc only | ✅ desc only | ❌ |
| Delete | ✅ | ❌ | ✅ (own, if unused) | ❌ |
| Clone | ✅ | ✅ | ✅ | ❌ |
| Publish | ✅ | ✅ (own) | ✅ (own) | ❌ |
| Archive | ✅ | ✅ (own) | ✅ (own) | ❌ |

**Evidence**: `FormTemplate.cs:74-91`, `CloneFormTemplateCommand.cs:55-66`, `SaveFormTemplateCommand.cs:60-71`

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-FT-001 | Create with valid data | Template created (Draft), event published |
| TC-FT-002 | Clone template | All questions/sections cloned, IDs regenerated, Orders rebuilt |
| TC-FT-003 | Add question | Linked to template, Orders updated |
| TC-FT-004 | Create section | Empty Orders initialized, questions assignable |
| TC-FT-006 | Publish success | Status→Published, EditMode determined by usage |
| TC-FT-007 | Publish fail (no questions) | Returns "Template has no valid questions" |
| TC-FT-008 | Delete unused | Soft delete succeeds, historical data preserved |
| TC-FT-014 | Archive published | Status→Archived, no further transitions |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Clone with 100+ questions | Completes <5s, all IDs regenerated | `FormTemplate.cs:117-192` |
| Move question to different section | Updates section ID + recalcs Orders | `ReorderFormTemplateItemsCommand.cs:78-120` |
| Publish with invalid questions | Validation error, status unchanged | `ChangeFormTemplateStatusCommand.cs:104-109` |
| Delete template in use | Error: "linked to active events" | `DeleteFormTemplateCommand.cs:55-74` |
| Multi-language missing translation | Fallback to DefaultLanguage | `FormTemplate.cs:30-36` |
| Concurrent edits | Last-write-wins (standard behavior) | Recommend optimistic locking |

---

## Integration Points

### With Performance Review Feature

```
PerformanceReviewEvent
  ├── uses → FormTemplate (via FormTemplateUsage)
  ├── creates → FormTemplateResponse (for each reviewer)
  └── tracks results in PerformanceReviewAssessment

When event created:
  ├── FormTemplateUsage record created
  ├── FormTemplateResponse record created (per reviewer)
  ├── EditMode changed to PartiallyEditable if Published
  └── Template status determines if reviewers can edit
```

### With Shared Question Library

```
FormTemplateQuestion.SharedQuestionId → SharedQuestion
  ├── Reference to global question
  ├── Custom override: QuestionAnswerOptions
  ├── Inherit if no override
  └── Validation: must exist in library
```

### Message Bus Flow

```
Create Performance Review Event
  ├─→ (message) → FormTemplate.Service
  │   └── Create FormTemplateUsage (tracks usage)
  │
Reviewer Completes Form
  ├─→ (message) → Performance Review.Service
  │   └── Update PerformanceReviewAssessment with results
```

---

## Performance Notes

- **Query Optimization**: All list endpoints paginated (default 10-50 items)
- **Index Priority**: (CompanyId, Status), (FormTemplateId), (Code, VersionNumber)
- **Caching**: Template lists cacheable by company+status; invalidate on save
- **Large Templates**: 100+ questions → consider virtual scrolling, lazy-load sections
- **Clone Operation**: Benchmark <5s for 150 questions + 20 sections

---

## Usage Notes

### When to Use This File

- Implementing new form template features
- Fixing bugs in template lifecycle
- Adding question/section management
- Understanding API contracts quickly
- Code review context
- Template integration with reviews

### When to Use Full Documentation

- Understanding business requirements
- Stakeholder presentations
- Comprehensive test planning
- Troubleshooting production issues
- Understanding UI workflows
- Design decisions and roadmap

---

*Generated from comprehensive documentation. For full details, see [README.FormTemplatesFeature.md](./README.FormTemplatesFeature.md)*
