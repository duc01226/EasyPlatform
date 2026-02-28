# Candidate Management Feature

---

## Document Metadata

| Property | Value |
|----------|-------|
| **Feature Name** | Candidate Management |
| **Module** | bravoTALENTS |
| **Version** | 1.4.0 |
| **Status** | Production |
| **Last Updated** | 2026-01-30 |
| **Owner** | BravoSUITE Documentation Team |
| **Document Type** | Business Feature Documentation (26-Section Standard) |

---

## Quick Navigation

| Business | Technical | Testing | Operations |
|----------|-----------|---------|------------|
| [Executive Summary](#1-executive-summary) | [Architecture](#8-architecture) | [Test Specifications](#17-test-specifications) | [Operational Runbook](#22-operational-runbook) |
| [Business Value](#2-business-value) | [Domain Model](#9-domain-model) | [Test Data](#18-test-data-requirements) | [Troubleshooting](#21-troubleshooting) |
| [Requirements](#3-business-requirements) | [API Reference](#10-api-reference) | [Edge Cases](#19-edge-cases-catalog) | [Roadmap](#23-roadmap-and-dependencies) |
| [Business Rules](#4-business-rules) | [Frontend](#11-frontend-components) | [Regression](#20-regression-impact) | [Related Docs](#24-related-documentation) |
| [Processes](#5-process-flows) | [Backend](#12-backend-controllers) | [Implementation](#16-implementation-guide) | [Glossary](#25-glossary) |
| [Design](#6-design-reference) | [Integration](#13-cross-service-integration) | [Performance](#15-performance-considerations) | [Version History](#26-version-history) |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Value](#2-business-value)
3. [Business Requirements](#3-business-requirements)
4. [Business Rules](#4-business-rules)
5. [Process Flows](#5-process-flows)
6. [Design Reference](#6-design-reference)
7. [System Design](#7-system-design)
8. [Architecture](#8-architecture)
9. [Domain Model](#9-domain-model)
10. [API Reference](#10-api-reference)
11. [Frontend Components](#11-frontend-components)
12. [Backend Controllers](#12-backend-controllers)
13. [Cross-Service Integration](#13-cross-service-integration)
14. [Security Architecture](#14-security-architecture)
15. [Performance Considerations](#15-performance-considerations)
16. [Implementation Guide](#16-implementation-guide)
17. [Test Specifications](#17-test-specifications)
18. [Test Data Requirements](#18-test-data-requirements)
19. [Edge Cases Catalog](#19-edge-cases-catalog)
20. [Regression Impact](#20-regression-impact)
21. [Troubleshooting](#21-troubleshooting)
22. [Operational Runbook](#22-operational-runbook)
23. [Roadmap and Dependencies](#23-roadmap-and-dependencies)
24. [Related Documentation](#24-related-documentation)
25. [Glossary](#25-glossary)
26. [Version History](#26-version-history)

---

## 1. Executive Summary

The **Candidate Management Feature** in bravoTALENTS provides comprehensive candidate lifecycle management from creation through profile management, tagging, search, and export. This feature enables HR teams to build and maintain a talent pool, track candidate information, organize candidates via tags, and manage candidate data throughout the recruitment pipeline.

### Key Capabilities

- **Candidate Creation**: Manual entry or bulk import from CSV/Excel files with auto CV parsing
- **Profile Management**: Comprehensive candidate profiles with work experience, skills, education, certifications
- **Search & Filter**: Advanced candidate search with full-text search and multi-dimensional filtering
- **Tags & Categories**: Organize candidates using flexible tagging system
- **Timeline & Activity**: Track candidate interactions, comments, and activity history
- **Attachment Management**: Upload and manage CVs, documents, and file attachments
- **Candidate Follow-up**: Mark candidates as followed/unfollowed for tracking interest
- **Candidate Ownership**: Assign an owner employee to candidates for accountability and filtering
- **Application Withdrawal**: Withdraw candidate applications from pipeline with reasons and comments, with undo capability
- **Data Export**: Export candidate data to Excel with configurable columns
- **Duplicate Detection**: Email-based duplicate detection to prevent redundant records
- **Email Verification**: Check email uniqueness during candidate creation
- **Interest Profiles**: Integration with VIP24 for interest profile assessment

### Key Locations

| Layer | Location |
|-------|----------|
| **Frontend** | `src/WebV2/apps/growth-for-company/src/app/` |
| **Backend** | `src/Services/bravoTALENTS/Candidate.Service/Controllers/` |
| **Application** | `src/Services/bravoTALENTS/Candidate.Application/` |
| **Domain** | `src/Services/bravoTALENTS/Candidate.Domain/` |

### Critical Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **Search Response Time** | < 1s | 0.6s avg |
| **Import Success Rate** | > 95% | 97.3% |
| **Data Accuracy** | > 99% | 99.5% |
| **User Adoption** | 80% HR teams | 82% |

---

## 2. Business Value

### Value Proposition

The Candidate Management Feature delivers strategic value by enabling HR teams to:

1. **Build Talent Pools**: Centralize candidate data from multiple sources (manual entry, file imports, job board integrations)
2. **Improve Candidate Discovery**: Fast, accurate search across 100k+ candidate records with <1s response time
3. **Enable Data-Driven Decisions**: Rich candidate profiles with skills, experience, education, and assessment data
4. **Streamline Workflows**: Bulk operations (import, tagging, follow) reduce manual effort by 70%
5. **Ensure Compliance**: Audit trails, data retention controls, and GDPR-compliant data management

### Business Impact

| Area | Before | After | Improvement |
|------|--------|-------|-------------|
| **Candidate Search** | 5-10 min manual search | < 5 sec automated search | 98% time saved |
| **Data Entry** | 15 min per candidate | 2 min per candidate (manual) or bulk import | 87% faster |
| **Duplicate Records** | 15% duplicate rate | <1% with email validation | 93% reduction |
| **Data Export** | 30 min manual export | 2 min automated export | 93% time saved |
| **Candidate Organization** | No tagging system | Flexible tagging + search | N/A (new capability) |

### ROI Analysis

**Annual Time Savings**: 520 hours per HR team (based on 10 recruiters)
- Search efficiency: 200 hours
- Data entry automation: 200 hours
- Export automation: 80 hours
- Reduced duplicate cleanup: 40 hours

**Cost Avoidance**: $26,000/year per team (at $50/hour loaded cost)

**Productivity Gains**: HR teams can manage 2x more candidates with same headcount

---

## 3. Business Requirements

> **Objective**: Enable efficient candidate data management and organization for talent acquisition
>
> **Core Values**: Searchable - Organized - Integrated

### Candidate Creation & Management

#### FR-CM-01: Create Candidate Manually

| Aspect | Details |
|--------|---------|
| **Description** | HR can create candidate profiles manually with complete information |
| **Fields** | First name, last name, email, phone, education level, gender, date of birth, address, owner |
| **Validation** | First/last name and email required; email must be unique within company |
| **Side Effects** | Profile creation tracked with audit trail |
| **Evidence** | `CandidatesController.cs:416-421`, `CreateCandidateManualCommand.cs` |

#### FR-CM-02: Import Candidates from File

| Aspect | Details |
|--------|---------|
| **Description** | HR can bulk import candidates from CSV/Excel files with optional override |
| **Formats** | CSV and Excel (.xlsx) files supported |
| **Features** | Auto-detect email, parse name fields, optional override of existing records |
| **Validation** | File format validation, file size limits, encoding validation |
| **Error Handling** | Detailed import error reporting per record |
| **Evidence** | `CandidatesController.cs:533-541`, `ImportCandidateFromFileCommandHandler.cs` |

#### FR-CM-03: Update Candidate Basic Information

| Aspect | Details |
|--------|---------|
| **Description** | HR can edit candidate basic profile information |
| **Editable Fields** | Name, email, phone, education, gender, DOB, address, previous company/job |
| **Permissions** | HR with CanUpdate permission or profile owner |
| **Validation** | Email uniqueness check, phone number format validation |
| **Evidence** | `CandidatesController.cs:449-456`, `UpdateBasicCandidateInfoCommand.cs` |

#### FR-CM-04: Retrieve Candidate Details

| Aspect | Details |
|--------|---------|
| **Description** | Get complete candidate profile with all related data |
| **Includes** | Profile, applications, CVs, attachments, tags, followers, owners, read status |
| **Filters** | Access control based on job assignment and organizational hierarchy |
| **Evidence** | `CandidatesController.cs:175-179`, `GetCandidateQuery.cs` |

### Candidate Search & Filtering

#### FR-CM-05: Search Candidates

| Aspect | Details |
|--------|---------|
| **Description** | Full-text search across candidate names, emails, and skills |
| **Search Scope** | Company-scoped search with access control |
| **Performance** | Indexed search with response time < 1s for 100k+ records |
| **Result Format** | Paginated results with relevance ranking |
| **Evidence** | `CandidatesController.cs:410-414`, `GetCandidateSearchResultsQuery.cs` |

#### FR-CM-06: Apply Advanced Filters

| Aspect | Details |
|--------|---------|
| **Description** | Multi-dimensional filtering on candidate list (status, tags, jobs, job openings, education) |
| **Filter Types** | Status, application status, pipeline stage, tags, education level, job categories, **job openings**, **owner** |
| **Saved Filters** | HR can save and reuse filter configurations |
| **Persistence** | Filter state maintained across sessions |
| **Evidence** | `CandidatesController.cs:181-189`, `GetCandidateFiltersQuery.cs`, `candidate-filter-option.model.ts` |

#### FR-CM-07: Get Filter Configuration Data

| Aspect | Details |
|--------|---------|
| **Description** | Retrieve dropdown options and filter configuration for UI |
| **Data** | Job list, **job openings list**, education levels, status options, tag suggestions, **owner employees** |
| **Caching** | Application-level caching for performance |
| **Evidence** | `CandidatesController.cs:191-195`, `GetCandidateFilterDataQuery.cs`, `GetCandidateFiltersQuery.cs` |

### Tagging & Organization

#### FR-CM-08: Add Candidate Tags

| Aspect | Details |
|--------|---------|
| **Description** | Tag candidates with custom or suggested tags for organization |
| **Tag Types** | Free-form text tags with company-wide vocabulary |
| **Suggestions** | Auto-complete suggestions based on existing tags |
| **Validation** | Tag name required, duplicate prevention at entity level |
| **Evidence** | `CandidatesController.cs:499-504`, `AddCandidateTagCommand.cs` |

#### FR-CM-09: Get Tag Suggestions

| Aspect | Details |
|--------|---------|
| **Description** | Get tag suggestions based on partial input for auto-complete |
| **Scope** | Company-scoped suggestions from existing candidate tags |
| **Matching** | Substring matching on tag values |
| **Limit** | Maximum 10 suggestions returned |
| **Evidence** | `CandidatesController.cs:506-511`, `GetTagSuggestionQuery.cs` |

#### FR-CM-10: Remove Candidate Tags

| Aspect | Details |
|--------|---------|
| **Description** | Remove tags from candidate profiles |
| **Scope** | Company-scoped tag removal |
| **Validation** | Tag must exist on candidate |
| **Side Effects** | Tag removal audit tracked |
| **Evidence** | `CandidatesController.cs:520-525`, `RemoveCandidateTagCommand.cs` |

#### FR-CM-11: Load All Tags

| Aspect | Details |
|--------|---------|
| **Description** | Get complete list of tags used in company for reference |
| **Scope** | Company-scoped tag list |
| **Sorting** | Alphabetically sorted |
| **Evidence** | `CandidatesController.cs:513-518`, `GetTagsQuery.cs` |

### Candidate Engagement

#### FR-CM-12: Mark Candidate as Followed

| Aspect | Details |
|--------|---------|
| **Description** | Mark one or more candidates as followed to track interest |
| **Scope** | Per-user tracking of followed candidates |
| **Bulk Operation** | Multiple candidates can be marked in single operation |
| **Side Effects** | Updates FollowedByUserIds collection in candidate entity |
| **Evidence** | `CandidatesController.cs:226-235`, `MarkCandidateAsFollowedCommand.cs` |

#### FR-CM-13: Unmark Candidate as Followed

| Aspect | Details |
|--------|---------|
| **Description** | Unmark candidates from followed list |
| **Scope** | Per-user tracking removal |
| **Bulk Operation** | Multiple candidates supported |
| **Side Effects** | Removes user ID from FollowedByUserIds collection |
| **Evidence** | `CandidatesController.cs:237-246`, `UnmarkCandidateAsFollowedCommand.cs` |

#### FR-CM-14: Mark Candidate as Read

| Aspect | Details |
|--------|---------|
| **Description** | Track which candidates have been viewed by current user |
| **Scope** | Per-user read status tracking |
| **Purpose** | Help HR track candidates they've reviewed |
| **Side Effects** | Updates ReadByUserIds collection |
| **Evidence** | `CandidatesController.cs:216-224`, `MarkCandidateAsReadCommand.cs` |

### Profile & CV Management

#### FR-CM-15: Create Candidate CV Information

| Aspect | Details |
|--------|---------|
| **Description** | Add structured CV information (education, experience, skills, etc.) to candidate |
| **Sections** | Work experience, education, skills, certifications, courses, projects, references, languages |
| **Attachments** | Support file attachments for each CV section |
| **Validation** | Required fields per section type |
| **Evidence** | `CandidatesController.cs:458-462`, `CreateCandidateCvInfoCommand.cs` |

#### FR-CM-16: Update Candidate CV Information

| Aspect | Details |
|--------|---------|
| **Description** | Modify existing CV section information |
| **Scope** | Individual CV section updates |
| **Validation** | Preserve data consistency across sections |
| **Evidence** | `CandidatesController.cs:470-474`, `UpdateCandidateCvInfoCommand.cs` |

#### FR-CM-17: Delete Candidate CV Information

| Aspect | Details |
|--------|---------|
| **Description** | Remove CV section from candidate profile |
| **Cascade** | Remove associated attachments |
| **Evidence** | `CandidatesController.cs:464-468`, `DeleteCandidateCvInfoCommand.cs` |

#### FR-CM-18: Save Candidate Description

| Aspect | Details |
|--------|---------|
| **Description** | Add or update general description/notes about candidate |
| **Field** | Long-form text field for HR comments |
| **Validation** | Text length limits (1000 chars) |
| **Evidence** | `CandidatesController.cs:598-602`, `SaveCandidateDescriptionCommand.cs` |

### Data Management & Export

#### FR-CM-19: Export Candidates to Excel

| Aspect | Details |
|--------|---------|
| **Description** | Export candidate list to Excel file with configurable columns |
| **Format** | XLSX with headers and formatting |
| **Columns** | Configurable selection from candidate fields |
| **Filtering** | Applied filters carry over to export |
| **Streaming** | Large exports use streaming to avoid memory issues |
| **Evidence** | `CandidatesController.cs:604-619`, `ExportCandidateQuery.cs` |

#### FR-CM-20: Check Email Uniqueness

| Aspect | Details |
|--------|---------|
| **Description** | Verify email is unique within company scope |
| **Scope** | Company-level uniqueness check |
| **Usage** | During candidate creation and profile updates |
| **Response** | Boolean true if email exists, false if available |
| **Evidence** | `CandidatesController.cs:423-427`, `CheckExistCandidateEmail.cs` |

#### FR-CM-21: Upload File Attachment

| Aspect | Details |
|--------|---------|
| **Description** | Upload file attachments to candidate applications |
| **Scope** | Per-application attachments |
| **Storage** | Cloud storage with configured retention |
| **Validation** | File type and size limits |
| **Evidence** | `CandidatesController.cs:308-320`, `UploadFileCommand.cs` |

#### FR-CM-22: Remove File Attachment

| Aspect | Details |
|--------|---------|
| **Description** | Delete file attachments from applications |
| **Scope** | Per-file deletion |
| **Side Effects** | Physical file deletion from storage |
| **Evidence** | `CandidatesController.cs:443-447`, `RemoveAttachmentCommand.cs` |

### Candidate Ownership

#### FR-CM-23: Assign/Change Candidate Owner

| Aspect | Details |
|--------|---------|
| **Description** | HR can assign or change the owner of a candidate record to a specific employee |
| **Fields** | OwnerUserId (employee reference, nullable) |
| **Permissions** | HR Manager, Recruiter roles |
| **Behavior** | Set or clear owner; resigned/deleted owners display with status indicator |
| **Filter** | Candidates can be filtered by owner in the candidate list |
| **Export** | Owner name included in candidate Excel export |
| **Display** | Owner shown on candidate quick card with person-profile icon; strikethrough for resigned/deleted |
| **Evidence** | `CandidatesController.cs:601-612`, `UpdateCandidateOwnerCommand.cs`, `CandidateOwnerHelper.ts` |

---

## 4. Business Rules

### BR-01: Email Uniqueness Constraint

**Rule**: Each candidate email must be unique within company scope.

| Aspect | Value |
|--------|-------|
| **Scope** | OrganizationalUnitId (Company) |
| **Applies To** | Candidate creation, profile updates |
| **Validation** | Pre-save check via `CheckExistCandidateEmail` |
| **Error Message** | "Email already exists." |
| **Override** | Admin can force-create duplicate (logged) |
| **Evidence** | `ErrorMessage.cs:83`, `CreateCandidateManualCommand.cs` |

**Rationale**: Prevents duplicate candidate records, ensures data integrity for reporting.

---

### BR-02: Required Candidate Fields

**Rule**: Minimum required fields to create candidate record.

| Field | Required | Validation |
|-------|----------|------------|
| **Firstname** | Yes | Non-empty string |
| **Lastname** | Yes | Non-empty string |
| **Email OR Phone** | At least one | Valid format |
| **OrganizationalUnitId** | Yes (auto) | From RequestContext |

**Error Messages**:
- Missing name: "First name and last name required."
- Missing contact: "Phone or Email required."

**Evidence**: `ErrorMessage.cs:70-71`, `CreateCandidateManualCommand.cs`

---

### BR-03: Tag Vocabulary Management

**Rule**: Tags are company-scoped, free-form text with auto-complete suggestions.

| Aspect | Value |
|--------|-------|
| **Scope** | Per OrganizationalUnitId |
| **Format** | String, case-insensitive, trimmed |
| **Duplicates** | Prevented at entity level (case-insensitive) |
| **Suggestions** | Based on existing tags in company |
| **Max Suggestions** | 10 results |
| **Evidence** | `GetTagSuggestionQuery.cs`, `AddCandidateTagCommand.cs` |

**Business Logic**: Tags enable flexible candidate organization without rigid category hierarchies.

---

### BR-04: Access Control by Job Assignment

**Rule**: Candidate visibility based on job access rights.

| Role | Access Rule |
|------|-------------|
| **Admin** | All company candidates |
| **HR Manager** | All company candidates |
| **Recruiter** | Only candidates for assigned jobs |
| **Employee** | Own profile only |

**Enforcement**: `JobAccessRightsHelper.CanAccessToSpecificApplicationAsync()`

**Evidence**: `CandidatesController.cs` authorization checks

---

### BR-05: File Upload Constraints

**Rule**: File attachments must meet size and type requirements.

| Constraint | Value |
|------------|-------|
| **Max File Size** | 50 MB |
| **Allowed Types** | PDF, DOC, DOCX, XLS, XLSX, JPG, PNG |
| **Naming** | Original filename preserved with ULID prefix |
| **Storage** | Cloud storage (configurable) |
| **Retention** | Per company data retention policy |

**Error Messages**:
- "File size is too large."
- "Incorrect format file."

**Evidence**: `ErrorMessage.cs:89-92`, `UploadFileCommand.cs`

---

### BR-06: Follow/Unfollow Idempotency

**Rule**: Follow/unfollow operations are idempotent (safe to repeat).

| Operation | Behavior |
|-----------|----------|
| **Follow Already Followed** | Succeeds silently, no duplicate IDs added |
| **Unfollow Not Followed** | Succeeds silently, no error thrown |
| **Bulk Operations** | Process all candidates, skip failures gracefully |

**Rationale**: Prevents UI race conditions, allows retry logic without side effects.

**Evidence**: `MarkCandidateAsFollowedCommand.cs`, `UnmarkCandidateAsFollowedCommand.cs`

---

### BR-07: Import Override Behavior

**Rule**: Import file behavior controlled by `IsOverride` flag.

| IsOverride | Duplicate Email Behavior |
|------------|--------------------------|
| **true** | Update existing candidate with new data |
| **false** | Skip duplicate, log as "skipped" in report |

**Conflict Resolution**:
- Match by email (case-insensitive, trimmed)
- Update all fields except ID, CreatedDate, CreatedBy
- Increment ModifiedDate, set ModifiedBy to importer

**Evidence**: `ImportCandidateFromFileCommandHandler.cs`

---

### BR-08: Candidate Description Length Limit

**Rule**: Candidate description field limited to 1000 characters.

| Field | Max Length | Validation |
|-------|------------|------------|
| **Description** | 1000 chars | Server-side check |
| **Error** | "Comment too long." | `ErrorMessage.cs:131` |

**Rationale**: Prevents database bloat, encourages concise notes.

**Evidence**: `SaveCandidateDescriptionCommand.cs`, `Candidate.Description:53`

---

### BR-09: Soft Delete Pattern

**Rule**: Candidates are soft-deleted, not physically removed.

| Aspect | Value |
|--------|-------|
| **Deletion** | Set IsDeleted flag to true |
| **Queries** | Exclude IsDeleted=true by default |
| **Retention** | Data retained for audit/compliance |
| **Restore** | Admin can undelete (set IsDeleted=false) |

**Evidence**: Candidate.Domain entity soft-delete pattern

---

### BR-10: Export Column Configuration

**Rule**: Excel export respects user-selected columns.

| Aspect | Value |
|--------|-------|
| **Default Columns** | Name, Email, Phone, Education, Tags |
| **Configurable** | User can select from all candidate fields |
| **Filters** | Applied filters carry over to export |
| **Streaming** | Large exports (>10k) use streaming |

**Evidence**: `ExportCandidateQuery.cs`, `CandidatesController.cs:604-619`

---

## 5. Process Flows

### Process 1: Create Candidate Manually

**Entry Point**: CandidatesController.CreateCandidateManual()

```mermaid
graph TD
    A[HR Submits Create Form] --> B{Validate Input}
    B -->|Invalid| C[Return Validation Error]
    B -->|Valid| D{Check Email Unique}
    D -->|Exists| E[Return Email Exists Error]
    D -->|Unique| F[Generate ULID ID]
    F --> G[Set CreatedBy, OrganizationalUnitId]
    G --> H[Create CandidateEntity]
    H --> I[Persist to MongoDB]
    I --> J[Trigger Entity Events]
    J --> K[Return CandidateDto with ID]
```

**Flow Steps**:
1. **Trigger**: HR submits CreateCandidateManualCommand with candidate details
2. **Validation**:
   - First/last name required
   - Email must be unique (checked via CheckExistCandidateEmail query)
   - Phone or email required
3. **Processing**: CreateCandidateManualCommandHandler creates CandidateEntity
4. **Persistence**: Repository persists to MongoDB
5. **Side Effects**: Entity events trigger notification handlers (if configured)
6. **Result**: Returns newly created CandidateDto with ID

**Key Files**:
- Handler: `Candidate.Application/Candidates/Commands/CreateCandidateManualCommand/`
- Service: `CandidatesController.cs:416-421`
- Validation: `ErrorMessage.cs:70-71` (FirstNameLastNameRequired, PhoneOrEmailRequired)

---

### Process 2: Import Candidates from File

**Entry Point**: CandidatesController.ImportCandidateFromFile()

```mermaid
graph TD
    A[HR Uploads CSV/Excel] --> B{Validate File}
    B -->|Invalid| C[Return File Error]
    B -->|Valid| D[Parse File Records]
    D --> E[Extract Email, Name, Phone]
    E --> F{Check Duplicates in File}
    F --> G{Check DB Duplicates}
    G --> H{IsOverride?}
    H -->|Yes| I[Update Existing]
    H -->|No| J[Skip Existing]
    G -->|New| K[Create New Candidate]
    I --> L[Bulk Persist to DB]
    J --> L
    K --> L
    L --> M[Return ImportResult Summary]
```

**Flow Steps**:
1. **Trigger**: HR uploads CSV/XLSX file with candidate data
2. **Parsing**: File parsed to extract candidate records and email
3. **Deduplication**: Check for duplicate emails in file and database
4. **Conflict Resolution**:
   - If IsOverride=true, update existing candidates
   - If IsOverride=false, skip existing records
5. **Validation**: Per-record validation (email format, required fields)
6. **Batch Create**: Bulk insert via repository for performance
7. **Error Reporting**: Return summary with success/failure counts
8. **Result**: Returns ImportResult with created, updated, and failed counts

**Key Files**:
- Handler: `Candidate.Application/Candidates/Commands/ImportCandidateFromFileCommand/`
- Controller: `CandidatesController.cs:533-541`
- Constants: `ErrorMessage.cs:90-91` (IncorrectFormatFile, FileIsEmpty)

---

### Process 3: Search and Filter Candidates

**Entry Point**: CandidatesController.GetCandidates()

```mermaid
graph TD
    A[HR Enters Search/Filters] --> B[Build MongoDB Filter Expr]
    B --> C[Apply Access Control]
    C --> D{Full-Text Search?}
    D -->|Yes| E[Match Name/Email/Skills]
    D -->|No| F[Apply Selected Filters]
    E --> F
    F --> G[Apply Sort Order]
    G --> H[Apply Pagination]
    H --> I[Execute MongoDB Query]
    I --> J[Map to CandidateDto]
    J --> K[Return Paged Results + Total]
```

**Flow Steps**:
1. **Trigger**: HR performs search or applies filters
2. **Query Building**: GetCandidatesQuery constructs MongoDB filter expression
3. **Access Control**: Apply job access rights to filter visible candidates
4. **Full-Text Search**: If search text provided, match across name, email, skills
5. **Filter Application**: Apply all selected filters (status, tags, education, etc.)
6. **Sorting**: Apply default or user-selected sort order
7. **Pagination**: Skip and take parameters for result paging
8. **Result**: Returns paginated CandidateDto collection with total count

**Key Files**:
- Query: `Candidate.Application/Candidates/Queries/GetCandidateSearchResults/`
- Controller: `CandidatesController.cs:203-214`
- Expression Library: `Candidate.Domain/AggregatesModel/Candidate.cs:57-72` (FilterByApplicationsExpr)

---

### Process 4: Tag Candidate

**Entry Point**: CandidatesController.AddCandidateTag()

```mermaid
graph TD
    A[HR Selects Tag] --> B{Tag Exists in Candidate?}
    B -->|Yes| C[Silently Succeed]
    B -->|No| D[Add to Tags Collection]
    D --> E[Update ModifiedDate]
    E --> F[Persist to MongoDB]
    F --> G[Trigger Entity Events]
    G --> H[Return Updated Candidate]
```

**Flow Steps**:
1. **Trigger**: HR selects candidate and adds/selects tag
2. **Command**: AddCandidateTagCommand captures candidate ID and tag value
3. **Scope Validation**: Verify tag belongs to current company
4. **Entity Update**: AddCandidateTagCommand mutates CandidateEntity.Tags collection
5. **Persistence**: Repository saves updated candidate
6. **Side Effects**: Entity event handlers notify followers (if configured)
7. **Result**: Returns updated candidate with new tag included

**Key Files**:
- Handler: `Candidate.Application/Candidates/Commands/AddCandidateTagCommand/`
- Controller: `CandidatesController.cs:499-504`
- Domain: `Candidate.Domain/AggregatesModel/Candidate.cs:43` (Tags property)

---

### Process 5: Follow Candidate

**Entry Point**: CandidatesController.MarkCandidateAsFollowed()

```mermaid
graph TD
    A[HR Clicks Follow] --> B[Capture Candidate IDs]
    B --> C{For Each Candidate}
    C --> D{User Already Following?}
    D -->|Yes| E[Skip, Already Followed]
    D -->|No| F[Add UserId to FollowedByUserIds]
    E --> G[Next Candidate]
    F --> G
    G --> H{More Candidates?}
    H -->|Yes| C
    H -->|No| I[Bulk Update Repository]
    I --> J[Return Success]
```

**Flow Steps**:
1. **Trigger**: HR clicks "Follow" on candidate(s)
2. **Command**: MarkCandidateAsFollowedCommand with candidate IDs
3. **Bulk Update**: For each candidate, add current user ID to FollowedByUserIds
4. **Persistence**: Repository updates all candidates in batch
5. **Result**: UI updates to show "Following" status for each candidate

**Key Files**:
- Handler: `Candidate.Application/Candidates/Commands/MarkCandidateAsFollowedCommand/`
- Controller: `CandidatesController.cs:226-235`
- Domain: `Candidate.Domain/AggregatesModel/Candidate.cs:45` (FollowedByUserIds)

---

### Process 6: Export Candidates to Excel

**Entry Point**: CandidatesController.GetExportFile()

```mermaid
graph TD
    A[HR Clicks Export] --> B[Apply Same Filters as Search]
    B --> C[User Selects Columns]
    C --> D{Large Dataset?>10k?}
    D -->|Yes| E[Use Streaming Export]
    D -->|No| F[Standard Export]
    E --> G[Generate XLSX with Headers]
    F --> G
    G --> H[Stream to Browser]
    H --> I[Return File Attachment]
```

**Flow Steps**:
1. **Trigger**: HR requests export with selected filters and columns
2. **Query**: ExportCandidateQuery applies same filters as search
3. **Column Selection**: Query respects user-configured column preferences
4. **Streaming**: Large datasets streamed to prevent memory overflow
5. **Excel Generation**: XLSX file created with headers and formatting
6. **Response**: File streamed to browser with attachment disposition
7. **Result**: User receives downloadable Excel file

**Key Files**:
- Query: `Candidate.Application/ApplyPlatform/UseCaseQueries/ExportCandidateQuery.cs`
- Controller: `CandidatesController.cs:604-619`
- Response Handling: Uses NamedJsonSettings("New") for streaming response

---

## 6. Design Reference

| Information | Details |
|-------------|---------|
| **Design System** | BravoSUITE Design System |
| **Frontend Platforms** | Angular 19 (WebV2), Legacy Angular (Web) |
| **Target Users** | HR Managers, Recruiters, HR Admins |
| **UI Framework** | Angular Material + Custom Bravo Components |

### Key UI Patterns

- **Search Bar**: Full-text search with auto-complete, debounced input (300ms)
- **Filter Panel**: Collapsible left panel with multi-select filters, saved filter presets
- **Data Table**: Paginated list with sorting, column customization, bulk actions
- **Slide-in Drawer**: Right panel for candidate detail view and edit forms (Material Sidenav)
- **Tag Input**: Auto-complete tag input with suggestions (max 10 results)
- **File Upload**: Drag-and-drop file upload areas with progress indicators
- **Bulk Actions**: Multi-select checkboxes with action bar (Follow, Tag, Export)

### Design Components

| Component | Library | Usage |
|-----------|---------|-------|
| **Search Bar** | `bravo-search-input` | Full-text candidate search |
| **Filter Panel** | `bravo-filter-panel` | Multi-dimensional filtering |
| **Data Table** | `bravo-data-table` | Candidate list display |
| **Tag Input** | `bravo-tag-input` | Tag management with autocomplete |
| **File Upload** | `bravo-file-upload` | CV and attachment uploads |
| **Slide Panel** | Material Sidenav | Candidate detail view |

### Responsive Design

- **Desktop** (>1280px): Full layout with filter panel, table, detail panel
- **Tablet** (768-1280px): Collapsible filter panel, full table
- **Mobile** (<768px): Stacked layout, card view instead of table

---

## 7. System Design

### Design Principles

1. **CQRS Pattern**: Separate commands (writes) from queries (reads) for scalability
2. **Event-Driven**: Entity events trigger cross-service synchronization via RabbitMQ
3. **Repository Pattern**: Abstracted data access via `ICandidatePlatformRootRepository`
4. **Domain-Driven Design**: Rich domain entities with business logic in domain layer
5. **Microservices**: Candidate service isolated with well-defined boundaries

### Key Design Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| **MongoDB for Candidate Storage** | Flexible schema for evolving CV structures, fast document retrieval | Weaker consistency guarantees vs SQL |
| **Email as Uniqueness Key** | Natural business key, prevents duplicates | Email changes require careful handling |
| **Tag-based Organization** | Flexible, user-driven categorization | No hierarchy, harder reporting |
| **Bulk Follow/Tag Operations** | Reduces API calls, improves UX | More complex error handling |
| **Streaming Export** | Handles large datasets without OOM | More complex implementation |
| **Company-scoped Data** | Data isolation for multi-tenancy | More complex queries with scope filters |

### Data Storage Strategy

| Data Type | Storage | Rationale |
|-----------|---------|-----------|
| **Candidate Profiles** | MongoDB | Flexible schema for CV sections |
| **File Attachments** | Cloud Storage (Blob) | Scalable, CDN-ready |
| **Search Index** | MongoDB Text Index | Fast full-text search |
| **Tags** | Embedded in Candidate entity | Fast retrieval, no joins |
| **Audit Logs** | Separate collection | Compliance, retention |

---

## 8. Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        bravoTALENTS Candidate Management              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ Frontend (Growth-for-Company App)                             │   │
│  │  ├─ Candidate Search & Filter                                 │   │
│  │  ├─ Candidate Profile Detail                                  │   │
│  │  ├─ Bulk Actions (Follow, Tag, Import)                        │   │
│  │  └─ Attachment Management                                     │   │
│  └───────────────────────────────────────────────────────────────┘   │
│         │                                                             │
│         ▼                                                             │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ Candidate.Service (REST API)                                  │   │
│  │  ├─ CandidatesController                                      │   │
│  │  ├─ AttachmentsController                                     │   │
│  │  └─ Request Routing & Validation                              │   │
│  └───────────────────────────────────────────────────────────────┘   │
│         │                                                             │
│         ▼                                                             │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ Candidate.Application (CQRS)                                  │   │
│  │  ├─ Commands: Create, Update, Delete candidates              │   │
│  │  ├─ Queries: Search, Filter, Get details                     │   │
│  │  └─ Business Logic Handlers                                   │   │
│  └───────────────────────────────────────────────────────────────┘   │
│         │                                                             │
│         ▼                                                             │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │ Candidate.Domain (MongoDB)                                    │   │
│  │  ├─ CandidateEntity (Root aggregate)                          │   │
│  │  ├─ ApplicationEntity (Child entity)                          │   │
│  │  ├─ Domain Enums & Value Objects                              │   │
│  │  └─ Domain Expressions for Filtering                          │   │
│  └───────────────────────────────────────────────────────────────┘   │
│         │                                                             │
│         ├──────────────────────────┬──────────────────────────┐       │
│         ▼                          ▼                          ▼       │
│  ┌──────────────┐         ┌──────────────┐          ┌──────────────┐ │
│  │ MongoDB      │         │ Message Bus  │          │ File Storage │ │
│  │ (Candidate   │         │ (RabbitMQ)   │          │ (Cloud)      │ │
│  │  collections)│         │ for sync     │          │              │ │
│  └──────────────┘         └──────────────┘          └──────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Responsibility |
|---------|---------------|
| **Candidate.Service** | REST API controllers, request routing, HTTP response formatting |
| **Candidate.Application** | CQRS command/query handlers, business logic, validation, error handling |
| **Candidate.Domain** | Entity definitions, enums, value objects, domain expressions, aggregate relationships |
| **Candidate.Persistence** | MongoDB persistence configuration, database initialization |

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Angular | 19 |
| **API** | ASP.NET Core | .NET 9 |
| **Database** | MongoDB | 7.0+ |
| **Message Bus** | RabbitMQ | 3.12+ |
| **Storage** | Cloud Blob Storage | Azure/AWS S3 |
| **Cache** | Redis | 7.0+ |

---

## 9. Domain Model

### Entity Relationship Diagram

```
┌─────────────────────────────┐         ┌──────────────────────────┐
│      CandidateEntity        │         │   ApplicationEntity      │
├─────────────────────────────┤         ├──────────────────────────┤
│ Id: string (ULID)           │─1─────N│ Id: string               │
│ Email: string (unique)      │         │ JobId: string            │
│ Firstname: string           │         │ AppliedDate: DateTime    │
│ Lastname: string            │         │ IsRejected: bool         │
│ Tags: List<string>          │         │ CurrentPipelineStage: VO │
│ Applications: List<AppEntity>         │ CV: VO (nested)          │
│ FollowedByUserIds: List     │         │ Attachments: List<File>  │
│ OwnedByUserIds: List        │         └──────────────────────────┘
│ OwnerUserId: string?        │
│ ReadByUserIds: List         │
│ SuitableJobCategories: List │
└─────────────────────────────┘
```

### Core Entities

#### CandidateEntity

**Location**: `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Candidate.cs`

| Property | Type | Description |
|----------|------|-------------|
| Id | string | Unique identifier (ULID) |
| ExternalId | string | External system reference (e.g., from VIP24) |
| Firstname | string | Candidate first name |
| Lastname | string | Candidate last name |
| Middlename | string | Candidate middle name |
| Email | string | Candidate email (company-unique) |
| PhoneNumber | string | Contact phone number |
| Gender | Gender? | Candidate gender (from Bravo.Shared) |
| EducationLevel | EducationLevel? | Highest education attained |
| DateOfBirth | DateTime? | Birth date |
| PreviousJob | string | Previous position/job title |
| PreviousCompany | string | Previous employer |
| ProfileImagePath | string | Profile photo path in cloud storage |
| Description | string | HR notes/comments about candidate |
| Tags | List<string> | Custom tags for organization |
| Applications | IReadOnlyList<ApplicationEntity> | Candidate's job applications |
| FollowedByUserIds | IList<string> | Users tracking this candidate |
| OwnedByUserIds | IList<string> | Users who created/own this record (legacy) |
| OwnerUserId | string? | Designated owner employee (single assignment) |
| ReadByUserIds | IList<string> | Users who viewed this candidate |
| SuitableJobCategories | IList<SuitableJobCategory> | Matching job categories from VIP24 |
| InterestProfileCodes | IList<string> | Interest profile codes from assessment |
| CreatedDate | DateTime | Creation timestamp |
| ModifiedDate | DateTime | Last modification timestamp |
| OrganizationalUnitId | string | Company/company scope |

#### ApplicationEntity

**Location**: `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Application.cs`

| Property | Type | Description |
|----------|------|-------------|
| Id | string | Unique identifier for application |
| JobId | string | Reference to job position |
| AppliedDate | DateTime | When candidate applied/was sourced |
| JoiningDate | DateTime | Expected start date if hired |
| ExpirationDate | DateTime | Offer expiration date |
| CurrentPipelineStage | CurrentPipelineStage | Current recruitment stage (VO) |
| CV | CV | Candidate CV information (VO) |
| CVFile | File | Primary CV document |
| IsRejected | bool | Rejection status |
| RejectReason | string | Reason for rejection (default value from CompanyLibraryItem or free-text for "Other") |
| RejectReasonCategory | string | Category: `Default` (predefined library item) or `Other` (free-text). See `RejectReasonCategory` enum |
| RejectReasonMultiLanguage | LanguageString | Computed (JsonIgnore/BsonIgnore). Multi-language reject reason resolved from CompanyLibraryItem at query time |
| RejectedDate | DateTime? | When candidate was rejected |
| RejectComment | string | HR comment on rejection |
| **IsWithdrawn** | **bool** | **Withdrawal status (default: false)** |
| **WithdrawReason** | **string** | **Reason for withdrawal (CompanyLibraryItem ID or "Other")** |
| **WithdrawReasonOtherText** | **string** | **Free-text reason when WithdrawReason is "Other"** |
| **WithdrawnDate** | **DateTime?** | **When application was withdrawn** |
| **WithdrawComment** | **string** | **Additional notes on withdrawal** |
| IsSentEmail | bool? | Email notification sent flag |
| CvSource | string | Source of CV (uploaded, parsed, etc.) |
| JobTitle | string | Job title for this application |
| AssignedHrId | string | HR person assigned to this application |
| Attachments | IList<File> | Application documents and files |
| PipelineStageHistories | List<PipelineStageHistory> | Audit trail of stage changes |

### Enumerations

#### EducationLevel

| Value | Code | Description |
|-------|------|-------------|
| 0 | PrimarySchool | Primary/Elementary school |
| 1 | SecondarySchool | Secondary school |
| 2 | HighSchool | High school diploma |
| 3 | VocationalSchool | Vocational/Technical school |
| 4 | College | Associate/College degree |
| 5 | University | Bachelor's degree |
| 6 | Postgraduate | Master's or higher degree |

#### JobType

| Value | Code | Description |
|-------|------|-------------|
| 0 | Undefined | Type not specified |
| 1 | FullTime | Full-time employment |
| 2 | PartTime | Part-time employment |
| 3 | Temporary | Temporary/Contract work |
| 4 | Internship | Internship/Training program |

#### PositionLevel

| Value | Code | Description |
|-------|------|-------------|
| 0 | Undefined | Level not specified |
| 1 | StudentJob | Student/Entry-level training |
| 2 | EntryLevel | Entry-level professional |
| 3 | Experienced | 2-5+ years experience |
| 4 | Manager | Team/Department manager |
| 5 | SeniorManager | Senior manager/Director |
| 6 | TopManagement | C-level/Executive |

### Value Objects

#### CurrentPipelineStage

Nested VO containing:
- `PipelineStageId`: Reference to recruitment stage
- `StageType`: Enum for stage classification
- `ChangedDate`: When candidate entered this stage

#### CV

Nested VO containing candidate education profile:
- `Certifications`: List<Certification>
- `Courses`: List<Course>
- `Education`: List<Education>
- `Languages`: List<Language>
- `Projects`: List<Project>
- `References`: List<Reference>
- `WorkExperiences`: List<WorkExperience>
- `Skills`: List<Skill>

Each section supports attachments for documentation.

#### File

Generic VO for file attachments:
- `Name`: File name
- `Path`: Cloud storage path
- `Size`: File size in bytes
- `UploadedDate`: Upload timestamp
- `ContentType`: MIME type

---

## 10. API Reference

### Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/candidates/{id}` | Get candidate profile | [Authorize] |
| GET | `/api/candidates` | Search/list candidates | [Authorize] |
| GET | `/api/candidates/filters` | Get filter configuration | [Authorize] |
| POST | `/api/candidates/create-candidate-manual` | Create candidate manually | [Authorize] |
| POST | `/api/candidates/import-candidate-from-file` | Bulk import from file | [Authorize] |
| PUT | `/api/candidates/{candidateId}/edit-candidate` | Update candidate info | [Authorize] |
| POST | `/api/candidates/mark-candidate-as-followed` | Mark as followed (bulk) | [Authorize] |
| POST | `/api/candidates/unmark-candidate-as-followed` | Unmark as followed | [Authorize] |
| POST | `/api/candidates/{id}/mark-candidate-as-read` | Mark as read | [Authorize] |
| PUT | `/api/candidates/add-candidate-tag` | Add tag to candidate | [Authorize] |
| PUT | `/api/candidates/remove-candidate-tag` | Remove tag | [Authorize] |
| GET | `/api/candidates/get-tag-suggestion` | Get tag suggestions | [Authorize] |
| GET | `/api/candidates/load-tags` | Get all tags | [Authorize] |
| GET | `/api/candidates/check-exist-candidate-email/{email}` | Check email uniqueness | [Authorize] |
| POST | `/api/candidates/{candidateId}/applications/{applicationId}/cv` | Create CV info | [Authorize] |
| PUT | `/api/candidates/{candidateId}/applications/{applicationId}/cv` | Update CV info | [Authorize] |
| DELETE | `/api/candidates/{candidateId}/applications/{applicationId}/cv` | Delete CV info | [Authorize] |
| POST | `/api/candidates/description/save` | Save candidate description | [Authorize] |
| POST | `/api/candidates/export-file` | Export to Excel | [Authorize] |
| POST | `/api/candidates/{candidateId}/application/{applicationId}/upload-file` | Upload attachment | [Authorize] |
| POST | `/api/candidates/remove-attachment` | Remove attachment | [Authorize] |
| GET | `/api/candidates/suitable-job-categories` | Get job categories | [Authorize] |
| POST | `/api/candidates/{candidateId}/owner` | Update candidate owner | [Authorize] |

### Request/Response Examples

#### GET /api/candidates/{id}

**Response**:
```json
{
  "id": "candidate123",
  "firstname": "John",
  "lastname": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+84912345678",
  "educationLevel": 5,
  "gender": 1,
  "tags": ["javascript", "senior"],
  "applications": [
    {
      "id": "app456",
      "jobId": "job789",
      "appliedDate": "2026-01-01T00:00:00",
      "currentPipelineStage": {
        "pipelineStageId": "stage1",
        "changedDate": "2026-01-02T00:00:00"
      },
      "isRejected": false
    }
  ],
  "followedByUserIds": ["user1", "user2"],
  "ownedByUserIds": ["user1"],
  "ownerUserId": "employee123",
  "ownerEmployee": {
    "fullName": "Jane Smith",
    "status": "Active"
  },
  "readByUserIds": ["user1", "user3"]
}
```

#### POST /api/candidates/create-candidate-manual

**Request Body**:
```json
{
  "firstname": "Jane",
  "lastname": "Smith",
  "email": "jane@example.com",
  "phoneNumber": "+84987654321",
  "educationLevel": 5,
  "gender": 2,
  "dateOfBirth": "1990-01-15",
  "address": {
    "street": "123 Main St",
    "city": "Ho Chi Minh",
    "country": "VN"
  }
}
```

**Response**:
```json
{
  "id": "candidateNewId",
  "firstname": "Jane",
  "lastname": "Smith",
  "email": "jane@example.com",
  "createdDate": "2026-01-10T10:30:00"
}
```

#### POST /api/candidates/{candidateId}/owner

**Request Body**:
```json
{
  "ownerUserId": "employee123"
}
```

Set `ownerUserId` to `null` to clear ownership.

**Response**: Returns updated candidate entity (same as GET response).

**Authorization**: HR Manager, Recruiter roles required.

---

## 11. Frontend Components

### Component Hierarchy

```
growth-for-company App
├── CandidateSearchComponent (Container)
│   ├── CandidateFilterPanelComponent
│   │   ├── StatusFilterComponent
│   │   ├── TagFilterComponent
│   │   ├── EducationLevelFilterComponent
│   │   └── OwnerFilterComponent (employee autocomplete)
│   ├── CandidateListComponent
│   │   ├── CandidateItemComponent (for each candidate)
│   │   └── CandidateBulkActionsComponent
│   └── CandidateDetailSlidePanel (SlideIn)
│       ├── CandidateProfileComponent
│       ├── CandidateApplicationsComponent
│       ├── CandidateCvComponent
│       ├── CandidateActivityComponent
│       └── CandidateAttachmentsComponent
└── CandidateImportDialogComponent (Modal)
    ├── FileUploadComponent
    └── ImportProgressComponent
```

### Key Frontend Services

| Service | Purpose | Key Methods |
|---------|---------|------------|
| CandidateApiService | REST API communication | search(), get(), create(), update(), import() |
| CandidateFilterService | Filter state management | applyFilter(), clearFilters(), saveFilter() |
| CandidateTagService | Tag auto-complete | getTags(), addTag(), removeTag() |
| CandidateCardService | Candidate card operations | updateOwner() |

### Key Frontend Utilities

| Utility | Type | Purpose |
|---------|------|---------|
| CandidateOwnerHelper | Helper class | Owner display logic: handles active, resigned, deleted employee statuses |
| OwnerDisplayPipe | Angular Pipe | Template pipe for rendering owner name with status (impure for language switching) |

### Component Implementations

**CandidateSearchComponent** (Container)
- Extends `AppBaseVmStoreComponent<CandidateSearchVm, CandidateSearchStore>`
- State management via PlatformVmStore
- Handles search input with 300ms debounce
- Coordinates filter panel and list updates

**CandidateFilterPanelComponent**
- Extends `AppBaseComponent`
- Emits filter changes to parent
- Persists filter state to localStorage
- Supports saved filter presets

**CandidateListComponent**
- Extends `AppBaseComponent`
- Virtual scrolling for large lists (>1000 items)
- Bulk selection with checkboxes
- Action bar for bulk operations

**CandidateDetailSlidePanel**
- Material Sidenav component
- Lazy loads candidate data on open
- Tabbed interface for profile sections
- Edit mode with form validation

---

## 12. Backend Controllers

### CandidatesController

**Location**: `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs`

| Action | Method | Route | Handler |
|--------|--------|-------|---------|
| Get | GET | `/api/candidates/{id}` | GetCandidateQuery |
| GetCandidates | GET | `/api/candidates` | GetCandidatesQuery |
| GetCandidateFilters | GET | `/api/candidates/filters` | GetCandidateFiltersQuery |
| CreateCandidateManual | POST | `/api/candidates/create-candidate-manual` | CreateCandidateManualCommandHandler |
| ImportCandidateFromFile | POST | `/api/candidates/import-candidate-from-file` | ImportCandidateFromFileCommandHandler |
| UpdateBasicCandidateInfo | PUT | `/api/candidates/{candidateId}/edit-candidate` | UpdateBasicCandidateInfoCommandHandler |
| MarkCandidateAsFollowed | POST | `/api/candidates/mark-candidate-as-followed` | MarkCandidateAsFollowedCommandHandler |
| UnMarkCandidateAsFollowed | POST | `/api/candidates/unmark-candidate-as-followed` | UnmarkCandidateAsFollowedCommandHandler |
| MarkCandidateAsRead | POST | `/api/candidates/{id}/mark-candidate-as-read` | MarkCandidateAsReadCommandHandler |
| AddCandidateTag | PUT | `/api/candidates/add-candidate-tag` | AddCandidateTagCommandHandler |
| RemoveCandidateTag | PUT | `/api/candidates/remove-candidate-tag` | RemoveCandidateTagCommandHandler |
| GetTagSuggestion | GET | `/api/candidates/get-tag-suggestion` | GetTagSuggestionQuery |
| LoadTags | GET | `/api/candidates/load-tags` | GetTagsQuery |
| CheckExistCandidateEmail | GET | `/api/candidates/check-exist-candidate-email/{email}` | CheckExistCandidateEmail |
| CreateCandidateCv | POST | `/api/candidates/{candidateId}/applications/{applicationId}/cv` | CreateCandidateCvInfoCommandHandler |
| UpdateCandidateCv | PUT | `/api/candidates/{candidateId}/applications/{applicationId}/cv` | UpdateCandidateCvInfoCommandHandler |
| DeleteCandidateCv | DELETE | `/api/candidates/{candidateId}/applications/{applicationId}/cv` | DeleteCandidateCvInfoCommandHandler |
| SaveDescription | POST | `/api/candidates/description/save` | SaveCandidateDescriptionCommand |
| GetExportFile | POST | `/api/candidates/export-file` | ExportCandidateQuery |
| UploadFile | POST | `/api/candidates/{candidateId}/application/{applicationId}/upload-file` | UploadFileCommandHandler |
| RemoveAttachment | POST | `/api/candidates/remove-attachment` | RemoveAttachmentCommandHandler |
| GetSuitableCategories | GET | `/api/candidates/suitable-job-categories` | GetSuitableCategoriesQuery |
| UpdateCandidateOwner | POST | `/api/candidates/{candidateId}/owner` | UpdateCandidateOwnerCommand |

### Controller Implementation Pattern

```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CandidatesController : PlatformBaseController
{
    [HttpPost("create-candidate-manual")]
    public async Task<IActionResult> CreateCandidateManual([FromBody] CreateCandidateManualCommand command)
        => Ok(await Cqrs.SendAsync(command));
}
```

---

## 13. Cross-Service Integration

### Message Bus Events

| Event | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| CandidateEntityEventBusMessage | Candidate.Service | Growth, Employee, Talent services | Sync candidate data across services |
| CandidateApplicationEntityEventBusMessage | Candidate.Service | Job service | Sync application state |

### Event Flow

```
Candidate.Service (MongoDB)
     │
     │  1. Candidate Created/Updated/Deleted
     ▼
┌─────────────────────────────┐
│ CandidateEntity             │
│  (Root aggregate)           │
└─────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────┐
│ EntityEventProducer                         │
│  Emits: CandidateEntityEventBusMessage      │
└─────────────────────────────────────────────┘
     │
     │   RabbitMQ (Message Bus)
     │
     ├──────────────────┬──────────────────┬──────────────────┐
     ▼                  ▼                  ▼                  ▼
Growth.Service    Employee.Service   Talent.Service    Other Services
(PostgreSQL)      (SQL Server)       (Depends on)      (Future)
(Candidate Sync)  (Candidate Sync)   (Candidate Sync)
```

### Event Message Structure

```json
{
  "eventId": "event-ulid",
  "entityId": "candidate-id",
  "entityType": "CandidateEntity",
  "eventType": "Created|Updated|Deleted",
  "timestamp": "2026-01-10T10:30:00Z",
  "payload": {
    "crudAction": "Created",
    "entityData": {
      "id": "candidate-id",
      "email": "john@example.com",
      "firstname": "John",
      "lastname": "Doe",
      "tags": ["javascript", "senior"]
    }
  }
}
```

### Consumer Implementation

**Candidate Sync Consumer** (Growth Service)

```csharp
internal sealed class UpsertCandidateConsumer : PlatformApplicationMessageBusConsumer<CandidateEntityEventBusMessage>
{
    public override async Task<bool> HandleWhen(CandidateEntityEventBusMessage msg, string routingKey) => true;

    public override async Task HandleLogicAsync(CandidateEntityEventBusMessage msg, string routingKey)
    {
        if (msg.Payload.CrudAction == Created || msg.Payload.CrudAction == Updated)
        {
            var existing = await repository.FirstOrDefaultAsync(e => e.Id == msg.Payload.EntityData.Id);
            if (existing == null)
                await repository.CreateAsync(msg.Payload.EntityData.ToEntity());
            else
                await repository.UpdateAsync(msg.Payload.EntityData.UpdateEntity(existing));
        }
        if (msg.Payload.CrudAction == Deleted)
            await repository.DeleteAsync(msg.Payload.EntityData.Id);
    }
}
```

---

## 14. Security Architecture

### Authentication & Authorization

**Authentication**: JWT Bearer tokens via ASP.NET Core Identity

**Authorization Levels**:

| Role | View | Create | Edit | Delete | Special |
|------|:----:|:------:|:----:|:------:|---------|
| Admin | ✅ | ✅ | ✅ | ✅ | Full access, no restrictions |
| HR Manager | ✅ | ✅ | ✅ | ❌ | Can manage company candidates |
| Recruiter | ✅ | ✅ | ✅ | ❌ | Job-scoped candidates |
| Employee | ✅ | ❌ | ❌ | ❌ | Own profile only |

### Permission Checks

**Backend Authorization**:
```csharp
[Authorize]
[Route("api/[controller]")]
public class CandidatesController : BaseController
{
    // All endpoints require [Authorize] attribute
    // Evidence: CandidatesController.cs:58
}
```

**Access Control**:
- **Job Access Rights**: Verified via `JobAccessRightsHelper.CanAccessToSpecificApplicationAsync()`
- **Ownership Check**: Via `OwnedByUserIds` and `RequestContext.UserId()`
- **Company Scope**: All queries filtered by `CurrentCompanyId()`

### Data Privacy & Compliance

**GDPR Compliance**:
- Right to access: Export candidate data via Excel export
- Right to erasure: Soft-delete with purge after retention period
- Data portability: Export API with configurable formats
- Audit trail: All modifications tracked with user ID and timestamp

**Data Retention**:
- Active candidates: Indefinite
- Soft-deleted candidates: 90 days (configurable)
- Audit logs: 7 years (compliance)

**Sensitive Data Handling**:
- No SSN/tax ID storage
- Email/phone encrypted at rest (MongoDB encryption)
- File uploads scanned for malware
- Access logs for all candidate views

### Security Controls

| Control | Implementation |
|---------|---------------|
| **Input Validation** | FluentValidation in command handlers |
| **SQL Injection** | N/A (MongoDB with parameterized queries) |
| **XSS Prevention** | Angular sanitization, CSP headers |
| **CSRF Protection** | Anti-forgery tokens on state-changing operations |
| **File Upload Security** | Type whitelist, size limits, malware scanning |
| **Rate Limiting** | 100 requests/minute per user (configurable) |

---

## 15. Performance Considerations

### Performance Targets

| Operation | Target | Current | Status |
|-----------|--------|---------|--------|
| **Candidate Search** | <1s | 0.6s avg | ✅ Met |
| **Candidate Detail Load** | <500ms | 320ms avg | ✅ Met |
| **Bulk Import (1000 records)** | <30s | 18s avg | ✅ Met |
| **Excel Export (10k records)** | <5s | 3.2s avg | ✅ Met |
| **Tag Autocomplete** | <200ms | 120ms avg | ✅ Met |

### Optimization Strategies

**Database Optimization**:
- MongoDB text index on `firstname`, `lastname`, `email`, `tags`
- Compound index on `organizationalUnitId + createdDate` for list queries
- Covered queries for search (project only required fields)
- Connection pooling (min: 10, max: 100 connections)

**Caching Strategy**:
- Filter configuration data: 1 hour TTL (Redis)
- Tag suggestions: 5 minutes TTL (Redis)
- Candidate details: No cache (data changes frequently)

**API Optimization**:
- Pagination: Default 20 items, max 100 per page
- Lazy loading for nested objects (Applications, CV sections)
- Compression: Gzip for responses >1KB
- CDN for profile images and file attachments

**Frontend Optimization**:
- Virtual scrolling for candidate list (>100 items)
- Debounced search input (300ms)
- Lazy loading for detail panel components
- Service worker caching for static assets

### Scalability

**Horizontal Scaling**:
- Stateless API servers (can scale to N instances)
- MongoDB sharding by `organizationalUnitId` (company scope)
- RabbitMQ clustering for high availability

**Vertical Scaling**:
- MongoDB: 16GB RAM recommended for 1M+ candidates
- API servers: 4 CPU cores, 8GB RAM per instance

**Capacity Planning**:
- Current: 500k candidates across 200 companies
- Projected: 5M candidates by 2027
- Scaling plan: Shard MongoDB at 2M candidates

---

## 16. Implementation Guide

### Prerequisites

- .NET 9 SDK
- MongoDB 7.0+
- RabbitMQ 3.12+
- Node.js 20+ (for frontend)
- Redis 7.0+ (for caching)

### Setup Steps

**1. Database Setup**

```bash
# Start MongoDB
docker run -d -p 27017:27017 --name mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=root \
  -e MONGO_INITDB_ROOT_PASSWORD=rootPass \
  mongo:7.0

# Create indexes
mongo candidates --eval 'db.candidates.createIndex({firstname: "text", lastname: "text", email: "text"})'
mongo candidates --eval 'db.candidates.createIndex({organizationalUnitId: 1, createdDate: -1})'
```

**2. Backend Configuration**

`appsettings.json`:
```json
{
  "MongoDB": {
    "ConnectionString": "mongodb://root:rootPass@localhost:27017",
    "Database": "bravoTALENTS_Candidates"
  },
  "RabbitMQ": {
    "Host": "localhost",
    "Username": "guest",
    "Password": "guest"
  },
  "FileStorage": {
    "Provider": "Azure|AWS",
    "ConnectionString": "..."
  }
}
```

**3. Run Backend**

```bash
cd src/Services/bravoTALENTS/Candidate.Service
dotnet run
```

**4. Frontend Setup**

```bash
cd src/WebV2
npm install
npm run dev-start:growth
```

### Feature Flags

| Flag | Purpose | Default |
|------|---------|---------|
| `EnableCandidateImport` | Enable file import feature | true |
| `EnableVIP24Integration` | Interest profile integration | false |
| `EnableAdvancedSearch` | Full-text search with ML ranking | false |

### Migration Guide

**From Legacy System**:

1. Export candidates from legacy system to CSV
2. Map legacy fields to new schema (see mapping table)
3. Use bulk import API with `IsOverride=true`
4. Validate imported data via reconciliation report
5. Run data quality checks (duplicates, missing fields)

**Field Mapping**:

| Legacy Field | New Field | Transformation |
|--------------|-----------|----------------|
| `Full_Name` | `Firstname`, `Lastname` | Split on space |
| `Contact_Email` | `Email` | Trim, lowercase |
| `Resume_Path` | `CVFile.Path` | Copy to blob storage |
| `Category_Tags` | `Tags` | Split on comma |

---

## 17. Test Specifications

### Test Summary

| Category | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) | Total |
|----------|:-------------:|:---------:|:-----------:|:--------:|:-----:|
| Candidate CRUD | 3 | 2 | 1 | 0 | 6 |
| Search & Filter | 2 | 2 | 1 | 0 | 5 |
| Tagging | 2 | 1 | 1 | 0 | 4 |
| Engagement | 2 | 1 | 0 | 0 | 3 |
| CV & Attachments | 2 | 1 | 1 | 0 | 4 |
| Data Management | 1 | 1 | 1 | 1 | 4 |
| Ownership | 2 | 3 | 1 | 0 | 6 |
| **Withdrawal** | **2** | **5** | **1** | **0** | **8** |
| **Total** | **16** | **16** | **7** | **1** | **40** |

### Candidate CRUD Test Specs

#### TC-CM-001: Create Candidate Manually with Required Fields [P0]

**Acceptance Criteria**:
- ✅ Candidate record created in MongoDB
- ✅ Unique ID (ULID) generated automatically
- ✅ Timestamps (CreatedDate, ModifiedDate) set to current UTC
- ✅ CompanyId set from RequestContext.CurrentCompanyId()
- ✅ Response includes newly created CandidateDto with ID

**Preconditions**:
- User authenticated and has [Authorize] permission
- User belongs to valid company with OrganizationalUnitId

**Test Data**:
```json
{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+84912345678"
}
```

**GIVEN** authenticated HR user with create permission
**WHEN** POST /api/candidates/create-candidate-manual with valid candidate data
**THEN** candidate created successfully and returns 200 OK with new candidate ID

**Evidence**: `CandidatesController.cs:416-421`, `ErrorMessage.cs:70-77,83`, `CandidateEntity.cs:1-55`

---

#### TC-CM-002: Update Candidate Basic Information [P0]

**Acceptance Criteria**:
- ✅ ModifiedDate updated to current UTC
- ✅ ModifiedByUserId set to current user ID
- ✅ Email uniqueness re-validated on update
- ✅ All editable fields updated (firstname, lastname, email, phone, education, gender, DOB)

**Test Data**:
```json
{
  "candidateId": "existing-candidate-id",
  "firstname": "Jane",
  "email": "jane.doe@example.com",
  "educationLevel": 5
}
```

**GIVEN** existing candidate record in database
**WHEN** PUT /api/candidates/{candidateId}/edit-candidate with updated fields
**THEN** candidate updated and returns 200 OK

**Evidence**: `CandidatesController.cs:449-456`, `UpdateBasicCandidateInfoCommand.cs`, `ErrorMessage.cs:5,94`

---

#### TC-CM-003: Retrieve Complete Candidate Profile [P0]

**Acceptance Criteria**:
- ✅ Returns full CandidateDto with all related data
- ✅ Includes all collections: Applications, Tags, Followers, Owners, ReadBy
- ✅ Includes nested CV data with all sections (experience, education, skills, etc.)
- ✅ Access control applied based on job assignments

**GIVEN** valid candidate ID and user with view permission
**WHEN** GET /api/candidates/{id}
**THEN** returns complete candidate profile with all nested objects

**Evidence**: `CandidatesController.cs:175-179`, `GetCandidateQuery.cs`, `ErrorMessage.cs:5,95`

---

#### TC-CM-004: Import Candidates from CSV File [P1]

**Acceptance Criteria**:
- ✅ Parses CSV format correctly
- ✅ Extracts firstname, lastname, email, phone from columns
- ✅ Auto-detects email duplicates within file
- ✅ Respects IsOverride parameter (true = update, false = skip)
- ✅ Returns detailed import summary with success/failure counts

**Test Data**: CSV file with columns: FirstName, LastName, Email, Phone

**GIVEN** valid CSV file with 10 candidate records
**WHEN** POST /api/candidates/import-candidate-from-file
**THEN** imports candidates and returns ImportResult {Created: 9, Updated: 1, Failed: 0}

**Evidence**: `CandidatesController.cs:533-541`, `ImportCandidateFromFileCommandHandler.cs`, `ErrorMessage.cs:89-91`

---

#### TC-CM-005: Check Email Uniqueness [P1]

**Acceptance Criteria**:
- ✅ Returns true if email exists in company
- ✅ Returns false if email available
- ✅ Company-scoped check (not global)

**GIVEN** email "john@example.com" already in database
**WHEN** GET /api/candidates/check-exist-candidate-email/john@example.com
**THEN** returns true

**Evidence**: `CandidatesController.cs:423-427`, `CheckExistCandidateEmail.cs`

---

#### TC-CM-006: Delete Candidate Soft Delete [P2]

**Acceptance Criteria**:
- ✅ Candidate marked as deleted/archived
- ✅ Not returned in searches
- ✅ Data retained for audit purposes

**Evidence**: Candidate.Domain entity soft-delete pattern

---

### Search & Filter Test Specs

#### TC-CM-007: Full-Text Search Candidates by Name [P0]

**Acceptance Criteria**:
- ✅ Matches partial first/last name
- ✅ Case-insensitive matching
- ✅ Returns paginated results
- ✅ Response time < 1 second

**GIVEN** 1000+ candidates in database
**WHEN** GET /api/candidates?query=john&skip=0&take=20
**THEN** returns matches with "John" in name

**Evidence**: `CandidatesController.cs:203-214`, `GetCandidateSearchResultsQuery.cs`

---

#### TC-CM-008: Apply Multiple Filters [P0]

**Acceptance Criteria**:
- ✅ Supports AND logic for multiple filters
- ✅ Filters by: status, tags, education, job categories, **withdrawal status**
- ✅ Maintains filter state across pagination
- ✅ Withdrawn filter combines with other filters (AND logic)

**GIVEN** filter params: education=5&tags=senior&jobCategoryId=dev&anyApplicationsIsWithdraw=true
**WHEN** GET /api/candidates with filters
**THEN** returns candidates matching ALL criteria (including withdrawn status)

**Evidence**: `CandidatesController.cs:181-189`, `GetCandidateFiltersQuery.cs`, `Candidate.FilterByApplicationsExpr:57-80`

---

#### TC-CM-009: Get Filter Configuration/Dropdown Options [P1]

**Acceptance Criteria**:
- ✅ Returns list of education levels
- ✅ Returns list of available jobs for filtering
- ✅ Returns list of status options
- ✅ Returns list of withdraw reasons (CompanyLibraryItems)
- ✅ Cached for performance

**GIVEN** authenticated user
**WHEN** GET /api/candidates/filters
**THEN** returns FilterConfig with all available options including withdraw reasons

**Evidence**: `CandidatesController.cs:191-195`, `GetCandidateFilterDataQuery.cs`, `CompanyLibraryType.WithdrawReason`

---

#### TC-CM-010: Tag-Based Filtering [P1]

**Acceptance Criteria**:
- ✅ Filter candidates by single or multiple tags
- ✅ AND logic: only candidates with ALL selected tags
- ✅ Returns matching candidates

**GIVEN** filters: tags=["senior","javascript"]
**WHEN** GET /api/candidates?tags=senior&tags=javascript
**THEN** returns only candidates with BOTH tags

**Evidence**: `GetCandidateFiltersQuery.cs`, `Candidate.Tags:43`

---

#### TC-CM-010a: Job Opening Filter [P1]

**Acceptance Criteria**:
- ✅ Filter candidates by assigned job opening
- ✅ Returns candidates whose applications are linked to specified opening
- ✅ Supports multiple opening selection

**GIVEN** filter: jobOpeningIds=["opening-123"]
**WHEN** GET /api/candidates with jobOpeningIds filter
**THEN** returns only candidates with applications linked to that opening

**Evidence**: `GetCandidateFiltersQuery.cs`, `candidate-filter-option.model.ts:48-63`, `CandidateListQueryModel.cs`

---

#### TC-CM-011: Search with Pagination [P2]

**Acceptance Criteria**:
- ✅ Respects skip and take parameters
- ✅ Returns total count for UI pagination
- ✅ Consistent sort order across pages

**GIVEN** skip=20, take=10
**WHEN** GET /api/candidates?skip=20&take=10
**THEN** returns results 20-30 with totalCount

**Evidence**: `CandidatesController.cs:203-214`

---

### Tagging Test Specs

#### TC-CM-012: Add Tag to Candidate [P0]

**Acceptance Criteria**:
- ✅ Tag added to CandidateEntity.Tags collection
- ✅ ModifiedDate updated
- ✅ Duplicate tags prevented
- ✅ Company-scoped tag vocabulary

**Test Data**:
```json
{
  "candidateId": "candidate123",
  "tag": "senior-developer"
}
```

**GIVEN** candidate without "senior-developer" tag
**WHEN** PUT /api/candidates/add-candidate-tag with tag data
**THEN** tag added and returns updated candidate

**Evidence**: `CandidatesController.cs:499-504`, `AddCandidateTagCommand.cs`, `Candidate.Tags:43`

---

#### TC-CM-013: Get Tag Auto-Complete Suggestions [P0]

**Acceptance Criteria**:
- ✅ Returns suggestions matching input substring
- ✅ Limited to 10 results max
- ✅ Company-scoped suggestions
- ✅ Alphabetically sorted

**GIVEN** existing tags: ["senior", "senior-dev", "javascript", "juniper"]
**WHEN** GET /api/candidates/get-tag-suggestion?tag=sen
**THEN** returns ["senior", "senior-dev"] (max 10)

**Evidence**: `CandidatesController.cs:506-511`, `GetTagSuggestionQuery.cs`

---

#### TC-CM-014: Remove Tag from Candidate [P0]

**Acceptance Criteria**:
- ✅ Tag removed from CandidateEntity.Tags
- ✅ ModifiedDate updated
- ✅ Returns updated candidate

**GIVEN** candidate with tag "senior"
**WHEN** PUT /api/candidates/remove-candidate-tag with tag data
**THEN** tag removed from candidate.Tags

**Evidence**: `CandidatesController.cs:520-525`, `RemoveCandidateTagCommand.cs`

---

#### TC-CM-015: Load All Company Tags [P1]

**Acceptance Criteria**:
- ✅ Returns all unique tags used by company
- ✅ Company-scoped (no cross-company leak)
- ✅ Sorted alphabetically

**GIVEN** company with 50+ candidates having various tags
**WHEN** GET /api/candidates/load-tags
**THEN** returns List<string> of all unique tags

**Evidence**: `CandidatesController.cs:513-518`, `GetTagsQuery.cs`

---

### Candidate Engagement Test Specs

#### TC-CM-016: Mark Candidate as Followed [P0]

**Acceptance Criteria**:
- ✅ Adds current user ID to FollowedByUserIds
- ✅ Supports bulk operation (multiple candidates)
- ✅ Returns updated candidates

**Test Data**:
```json
{
  "candidateIds": ["candidate1", "candidate2", "candidate3"]
}
```

**GIVEN** authenticated user with IDs [candidate1, candidate2]
**WHEN** POST /api/candidates/mark-candidate-as-followed with candidate IDs
**THEN** user ID added to FollowedByUserIds for each candidate

**Evidence**: `CandidatesController.cs:226-235`, `MarkCandidateAsFollowedCommand.cs`, `Candidate.FollowedByUserIds:45`

---

#### TC-CM-017: Unmark Candidate as Followed [P0]

**Acceptance Criteria**:
- ✅ Removes current user ID from FollowedByUserIds
- ✅ Supports bulk operation
- ✅ Returns updated candidates

**GIVEN** user following candidates [candidate1, candidate2]
**WHEN** POST /api/candidates/unmark-candidate-as-followed with candidate IDs
**THEN** user ID removed from FollowedByUserIds

**Evidence**: `CandidatesController.cs:237-246`, `UnmarkCandidateAsFollowedCommand.cs`

---

#### TC-CM-018: Mark Candidate as Read [P1]

**Acceptance Criteria**:
- ✅ Adds current user ID to ReadByUserIds
- ✅ Tracked for analytics/notifications
- ✅ Single candidate operation

**GIVEN** candidate viewed by user
**WHEN** POST /api/candidates/{id}/mark-candidate-as-read
**THEN** user ID added to ReadByUserIds

**Evidence**: `CandidatesController.cs:216-224`, `MarkCandidateAsReadCommand.cs`, `Candidate.ReadByUserIds:44`

---

### CV & Attachments Test Specs

#### TC-CM-019: Create CV Information Section [P0]

**Acceptance Criteria**:
- ✅ Creates nested CV object with work experience, education, skills, etc.
- ✅ Supports file attachments per section
- ✅ Returns updated candidate with CV

**Test Data**:
```json
{
  "candidateId": "cand123",
  "applicationId": "app456",
  "section": "workExperience",
  "companyName": "Acme Corp",
  "position": "Senior Developer",
  "fromDate": "2020-01-01",
  "toDate": "2025-01-10"
}
```

**GIVEN** candidate application record
**WHEN** POST /api/candidates/{candidateId}/applications/{applicationId}/cv
**THEN** CV section created and linked to application

**Evidence**: `CandidatesController.cs:458-462`, `CreateCandidateCvInfoCommand.cs`, `Application.CV:24`

---

#### TC-CM-020: Upload File Attachment [P0]

**Acceptance Criteria**:
- ✅ Uploads file to cloud storage
- ✅ Stores reference in Attachments collection
- ✅ Returns file metadata (name, path, size)
- ✅ File size and type validation

**Preconditions**:
- File < 50MB
- Supported types: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG

**GIVEN** valid file and candidate application
**WHEN** POST /api/candidates/{candidateId}/application/{applicationId}/upload-file
**THEN** file uploaded and returns FileDto with path

**Evidence**: `CandidatesController.cs:308-320`, `UploadFileCommand.cs`, `ErrorMessage.cs:89-92`

---

#### TC-CM-021: Remove File Attachment [P1]

**Acceptance Criteria**:
- ✅ Deletes file from cloud storage
- ✅ Removes reference from Attachments
- ✅ Confirms deletion with response

**GIVEN** existing file attachment
**WHEN** POST /api/candidates/remove-attachment with attachment ID
**THEN** file deleted and removed from candidate record

**Evidence**: `CandidatesController.cs:443-447`, `RemoveAttachmentCommand.cs`, `ErrorMessage.cs:52`

---

#### TC-CM-022: Update CV Information [P1]

**Acceptance Criteria**:
- ✅ Updates existing CV section data
- ✅ Maintains attachment references
- ✅ Updates ModifiedDate

**GIVEN** existing CV section
**WHEN** PUT /api/candidates/{candidateId}/applications/{applicationId}/cv
**THEN** CV section updated with new values

**Evidence**: `CandidatesController.cs:470-474`, `UpdateCandidateCvInfoCommand.cs`

---

### Data Management Test Specs

#### TC-CM-023: Save Candidate Description [P0]

**Acceptance Criteria**:
- ✅ Stores long-form text (max 1000 chars)
- ✅ Updates ModifiedDate and ModifiedByUserId
- ✅ Returns updated candidate

**Test Data**:
```json
{
  "candidateId": "cand123",
  "description": "Experienced developer with 10+ years in full-stack development. Strong leadership skills."
}
```

**GIVEN** candidate record
**WHEN** POST /api/candidates/description/save with description
**THEN** description saved and returns 200 OK

**Evidence**: `CandidatesController.cs:598-602`, `SaveCandidateDescriptionCommand.cs`, `ErrorMessage.cs:131`, `Candidate.Description:53`

---

#### TC-CM-024: Export Candidates to Excel [P1]

**Acceptance Criteria**:
- ✅ Generates XLSX file with headers
- ✅ Applies same filters as search/list
- ✅ Returns file as attachment
- ✅ Performance: < 5s for 10k records

**GIVEN** search with filters applied
**WHEN** POST /api/candidates/export-file with ExportQuery
**THEN** returns XLSX file as attachment

**Test Data**:
```json
{
  "columns": ["firstname", "lastname", "email", "educationLevel", "tags"],
  "filters": {"educationLevel": 5}
}
```

**Evidence**: `CandidatesController.cs:604-619`, `ExportCandidateQuery.cs`

---

#### TC-CM-025: Get Suitable Job Categories [P2]

**Acceptance Criteria**:
- ✅ Returns job categories matching candidate profile
- ✅ Integrates with VIP24 assessment if enabled
- ✅ Caches results for performance

**GIVEN** candidate with profile/assessment data
**WHEN** GET /api/candidates/suitable-job-categories?candidateIds=cand1,cand2
**THEN** returns List<CandidateWithCategories> with matching categories

**Evidence**: `CandidatesController.cs:332-349`, `GetSuitableCategoriesQuery.cs`

---

#### TC-CM-026: Candidate Statistics by Job [P3]

**Acceptance Criteria**:
- ✅ Returns count of candidates per job status
- ✅ Groups by pipeline stage
- ✅ Used for dashboard widgets

**GIVEN** job IDs [job1, job2, job3]
**WHEN** POST /api/candidates/candidate-statistics with job IDs
**THEN** returns stats { job1: {NewCount: 5, InterviewingCount: 2} }

**Evidence**: `CandidatesController.cs:621-625`, `GetCandidateStatsByJobIdsQuery.cs`

---

### Candidate Ownership Test Specs

#### TC-CM-027: Assign Owner to Candidate [P0]

**Acceptance Criteria**:
- ✅ Sets `OwnerUserId` on CandidateEntity
- ✅ Only HR Manager or Recruiter roles can assign owner
- ✅ Owner employee data included in candidate response (`ownerEmployee` with `fullName`, `status`)
- ✅ Returns updated candidate

**Test Data**:
```json
{
  "candidateId": "candidate123",
  "ownerUserId": "employee-hr-001"
}
```

**GIVEN** authenticated HR Manager and existing candidate without owner
**WHEN** POST /api/candidates/{candidateId}/owner with valid employee ID
**THEN** OwnerUserId set and returns 200 OK with updated candidate including ownerEmployee info

**Evidence**: `CandidatesController.cs:601-612`, `UpdateCandidateOwnerCommand.cs`, `CandidateQueryHelper.cs`

---

#### TC-CM-028: Clear Owner from Candidate [P1]

**Acceptance Criteria**:
- ✅ Sets `OwnerUserId` to null
- ✅ `ownerEmployee` returns null in response
- ✅ Candidate still functional without owner

**Test Data**:
```json
{
  "candidateId": "candidate123",
  "ownerUserId": null
}
```

**GIVEN** candidate with existing owner assignment
**WHEN** POST /api/candidates/{candidateId}/owner with ownerUserId=null
**THEN** OwnerUserId cleared and returns 200 OK

**Evidence**: `UpdateCandidateOwnerCommand.cs`

---

#### TC-CM-029: Filter Candidates by Owner [P0]

**Acceptance Criteria**:
- ✅ Filters candidates by one or more owner user IDs
- ✅ Uses `ByOwnerUserIdsExpr` for query filtering
- ✅ Returns only candidates owned by specified employees
- ✅ Works in combination with other filters (tags, status, job opening)

**Test Data**:
```json
{
  "ownerUserIds": ["employee-hr-001", "employee-hr-002"],
  "skip": 0,
  "take": 20
}
```

**GIVEN** 10 candidates: 5 owned by employee-hr-001, 3 by employee-hr-002, 2 unassigned
**WHEN** GET /api/candidates with ownerUserIds=["employee-hr-001"]
**THEN** returns 5 candidates owned by employee-hr-001

**Evidence**: `GetCandidatesQuery.cs`, `CandidateEntity.ByOwnerUserIdsExpr`, `CandidateListQueryModel.cs`

---

#### TC-CM-030: Owner Display with Resigned/Deleted Employee [P1]

**Acceptance Criteria**:
- ✅ Resigned owner displays as "FullName (Resigned)"
- ✅ Deleted owner displays as "Deleted user"
- ✅ Active owner displays full name only
- ✅ Unassigned displays "Unassigned"
- ✅ Strikethrough styling applied for resigned/deleted owners

**Test Data**:
- Active owner: employee-hr-001 (status: Active) → "Jane Smith"
- Resigned owner: employee-hr-002 (status: Resigned) → "John Doe (Resigned)"
- Deleted owner: employee-hr-003 (status: Deleted) → "Deleted user"
- No owner: ownerUserId=null → "Unassigned"

**GIVEN** candidates with owners of various statuses
**WHEN** viewing candidate list or quick card
**THEN** owner display follows status-based formatting rules

**Evidence**: `CandidateOwnerHelper.ts:6-27`, `OwnerDisplayPipe.ts`, `candidate-quick-card-v2.component.ts`

---

#### TC-CM-031: Owner Included in Excel Export [P1]

**Acceptance Criteria**:
- ✅ Owner name column appears in exported Excel file
- ✅ Owner name resolved from employee lookup
- ✅ Empty cell for candidates without owner

**GIVEN** candidates with and without owner assignments
**WHEN** POST /api/candidates/export-file
**THEN** exported Excel includes owner column with resolved employee names

**Evidence**: `ExportCandidateQuery.cs`, `CandidateQueryHelper.GetOwnerEmployeeDictAsync`

---

#### TC-CM-032: Owner Field in Add Candidate Form [P2]

**Acceptance Criteria**:
- ✅ Owner employee selector available in add-candidate form
- ✅ Optional field (candidate can be created without owner)
- ✅ Owner set on creation via `UpdateBasicCandidateInfoCommand`

**GIVEN** HR user creating new candidate
**WHEN** filling add-candidate form with owner selection
**THEN** candidate created with OwnerUserId set

**Evidence**: `add-candidate-form.component.ts`, `AddCandidateModel.ts`

---

### Application Withdrawal Test Specs

#### TC-CM-033: Withdraw Candidate Application with Reason [P0]

**Acceptance Criteria**:
- ✅ Application `IsWithdrawn` set to `true`
- ✅ `WithdrawnDate` set to current UTC timestamp
- ✅ `WithdrawReason` stored (CompanyLibraryItem ID or "Other")
- ✅ `WithdrawReasonOtherText` stored when reason is "Other"
- ✅ `WithdrawComment` stored for additional notes
- ✅ Application removed from active pipeline stage counts

**Test Data**:
```json
{
  "candidateId": "cand-001",
  "applicationId": "app-001",
  "isWithdrawn": true,
  "withdrawReason": "withdraw-reason-001",
  "withdrawComment": "Candidate accepted offer elsewhere"
}
```

**GIVEN** candidate with active application in "Interview" stage
**WHEN** POST /api/candidates/{id}/applications/{appId}/withdraw with reason
**THEN** application marked as withdrawn, removed from pipeline counts

**Evidence**: `WithdrawApplicationCommandHandler.cs`, `CandidateEntity.WithdrawApplication()`

---

#### TC-CM-034: Undo Withdraw Application [P0]

**Acceptance Criteria**:
- ✅ Application `IsWithdrawn` set to `false`
- ✅ `WithdrawnDate` cleared (set to null)
- ✅ Withdraw reason fields preserved for audit trail
- ✅ Application returns to previous pipeline stage counts

**GIVEN** candidate with withdrawn application
**WHEN** POST /api/candidates/{id}/applications/{appId}/undo-withdraw
**THEN** application reactivated, returns to pipeline stage

**Evidence**: `WithdrawApplicationCommandHandler.cs`, `CandidateEntity.UndoWithdrawApplication()`

---

#### TC-CM-035: Filter Candidates by Withdraw Status [P1]

**Acceptance Criteria**:
- ✅ `anyApplicationsIsWithdraw=true` returns only withdrawn candidates
- ✅ Combined with job/stage filters for precise filtering
- ✅ Withdraw reasons filter works with multi-select

**GIVEN** 5 candidates: 2 with withdrawn applications, 3 with active
**WHEN** GET /api/candidates with `isWithdrawn=true` filter
**THEN** returns only 2 candidates with withdrawn applications

**Evidence**: `GetCandidatesQuery.cs`, `FilterByApplicationsExpr`

---

#### TC-CM-036: Withdraw Reasons in Pipeline Stage View [P1]

**Acceptance Criteria**:
- ✅ Pipeline stages query returns withdraw reason counts
- ✅ "Withdrawn" displayed as virtual stage in filter UI
- ✅ Breakdown by withdraw reason available

**GIVEN** 10 withdrawn applications with various reasons
**WHEN** GET /api/pipeline/stages with withdraw data
**THEN** returns "Withdrawn" stage with reason breakdown counts

**Evidence**: `GetPipelineStagesQuery.cs`, `PipelineStagesQueryModel`

---

#### TC-CM-037: Withdraw with "Other" Free-text Reason [P1]

**Acceptance Criteria**:
- ✅ When `WithdrawReason` is "Other", `WithdrawReasonOtherText` is required
- ✅ Free-text reason stored and displayed
- ✅ Whitespace-only text rejected (validation)

**Test Data**:
```json
{
  "withdrawReason": "other",
  "withdrawReasonOtherText": "Personal reasons - family relocation"
}
```

**GIVEN** HR withdrawing application with custom reason
**WHEN** selecting "Other" and entering free-text explanation
**THEN** both reason code and text stored, displayed in UI

**Evidence**: `withdraw-candidates.component.ts`, `ApplicationEntity.WithdrawReasonOtherText`

---

#### TC-CM-038: Withdraw Filter in Candidate Filter Panel [P2]

**Acceptance Criteria**:
- ✅ "Show Withdrawn" checkbox toggles withdraw filter
- ✅ Withdraw reasons multi-select appears when checkbox enabled
- ✅ Filter state persisted in URL query params
- ✅ NgRx state updated correctly

**GIVEN** candidate filter panel open
**WHEN** enabling "Show Withdrawn" and selecting reasons
**THEN** candidate list filtered, URL updated, state persisted

**Evidence**: `candidate-filters.component.ts`, `candidates.action.ts`

---

#### TC-CM-039: Withdraw Application with Missing Required Reason [P1]

**Acceptance Criteria**:
- ❌ Request without `withdrawReason` returns validation error
- ❌ Empty string `withdrawReason` rejected
- ✅ Clear error message: "Withdraw reason is required"
- ✅ Application state unchanged on validation failure

**Test Data**:
```json
{
  "candidateId": "cand-001",
  "applicationId": "app-001",
  "isWithdrawn": true,
  "withdrawReason": ""
}
```

**GIVEN** HR attempting to withdraw application without reason
**WHEN** POST /api/candidates/{id}/applications/{appId}/withdraw with empty reason
**THEN** returns 400 Bad Request with validation error

**Evidence**: `WithdrawApplicationCommandHandler.cs`, `PlatformValidationResult`

---

#### TC-CM-040: Withdraw Application on Non-Existent Candidate [P1]

**Acceptance Criteria**:
- ❌ Returns 404 Not Found for non-existent candidate
- ❌ Returns 404 Not Found for non-existent application
- ✅ Error message: "Candidate not found" or "Application not found"
- ✅ No database changes on failure

**Test Data**:
```json
{
  "candidateId": "non-existent-candidate",
  "applicationId": "app-001"
}
```

**GIVEN** non-existent candidate ID
**WHEN** POST /api/candidates/{id}/applications/{appId}/withdraw
**THEN** returns 404 Not Found

**Evidence**: `WithdrawApplicationCommandHandler.cs`, `CandidateRepository.GetById()`

---

## 18. Test Data Requirements

### Seed Data Structure

**Companies** (2 companies for multi-tenancy testing)

```json
[
  { "id": "company-001", "name": "Acme Corp" },
  { "id": "company-002", "name": "TechCo Ltd" }
]
```

**Users** (4 users with different roles)

```json
[
  { "id": "user-admin", "companyId": "company-001", "role": "Admin" },
  { "id": "user-hr", "companyId": "company-001", "role": "HR Manager" },
  { "id": "user-recruiter", "companyId": "company-001", "role": "Recruiter" },
  { "id": "user-employee", "companyId": "company-001", "role": "Employee" }
]
```

**Owner Employees** (3 employees with different statuses for owner testing)

```json
[
  { "id": "employee-hr-001", "companyId": "company-001", "fullName": "Jane Smith", "status": "Active" },
  { "id": "employee-hr-002", "companyId": "company-001", "fullName": "John Doe", "status": "Resigned" },
  { "id": "employee-hr-003", "companyId": "company-001", "fullName": "Alice Johnson", "status": "Deleted" }
]
```

**Candidates** (50 candidates for performance testing)

```json
{
  "company-001": [
    {
      "id": "cand-001",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@test.com",
      "tags": ["javascript", "senior"],
      "educationLevel": 5,
      "ownerUserId": "employee-hr-001",
      "applications": [
        { "jobId": "job-001", "pipelineStage": "interview" }
      ]
    }
    // ... 49 more candidates
  ],
  "company-002": [
    // 50 candidates for second company
  ]
}
```

**Jobs** (10 jobs for filtering tests)

```json
[
  { "id": "job-001", "companyId": "company-001", "title": "Senior Developer" },
  { "id": "job-002", "companyId": "company-001", "title": "Product Manager" }
  // ... 8 more jobs
]
```

### Test Data Generation Scripts

**MongoDB Seed Script** (`seed-candidates.js`)

```javascript
db.candidates.insertMany([
  // Generate 100 candidates with random data
  ...Array.from({ length: 100 }, (_, i) => ({
    _id: `cand-${String(i).padStart(3, '0')}`,
    firstname: faker.name.firstName(),
    lastname: faker.name.lastName(),
    email: faker.internet.email(),
    tags: faker.helpers.arrayElements(['javascript', 'python', 'java', 'senior', 'mid'], 2),
    educationLevel: faker.helpers.arrayElement([3, 4, 5, 6]),
    organizationalUnitId: faker.helpers.arrayElement(['company-001', 'company-002']),
    createdDate: faker.date.past()
  }))
]);
```

### Test Data Cleanup

**Automated Cleanup** (after each test run)

```csharp
[TearDown]
public async Task CleanupTestData()
{
    await candidateRepository.DeleteManyAsync(c => c.Email.EndsWith("@test.com"));
    await jobRepository.DeleteManyAsync(j => j.Title.StartsWith("TEST-"));
}
```

---

## 19. Edge Cases Catalog

### Edge Case 1: Duplicate Email Handling

**Scenario**: User tries to create candidate with email that already exists in company

**Input**:
- Email: "existing@company.com" (already in database)
- Company: "company-001"

**Expected Behavior**:
- ❌ Returns 400 Bad Request
- Error message: "Email already exists."
- No record created

**Actual Behavior**: ✅ Works as expected

**Evidence**: `ErrorMessage.cs:83`, `CreateCandidateManualCommand.cs`

---

### Edge Case 2: Cross-Company Email Uniqueness

**Scenario**: Email exists in Company A, user tries to create in Company B

**Input**:
- Email: "john@example.com" exists in company-001
- Creating in company-002

**Expected Behavior**:
- ✅ Succeeds (email unique within company scope)
- New candidate created in company-002

**Actual Behavior**: ✅ Works as expected

**Note**: Email uniqueness is company-scoped, not global

---

### Edge Case 3: Import with Partial Failures

**Scenario**: Import file with 10 records, 3 have validation errors

**Input**:
- Record 1-7: Valid data
- Record 8: Missing email
- Record 9: Invalid email format
- Record 10: Duplicate email

**Expected Behavior**:
- ✅ Import continues for valid records
- ❌ Failed records logged with error messages
- Returns: `{Created: 7, Failed: 3, Errors: [{row: 8, error: "Email required"}, ...]}`

**Actual Behavior**: ✅ Works as expected

**Evidence**: `ImportCandidateFromFileCommandHandler.cs`

---

### Edge Case 4: Tag with Special Characters

**Scenario**: User adds tag with special characters (emoji, unicode)

**Input**:
- Tag: "senior 🚀 developer"

**Expected Behavior**:
- ✅ Tag accepted and stored as-is
- Unicode characters preserved

**Actual Behavior**: ✅ Works as expected (MongoDB supports unicode)

---

### Edge Case 5: Empty Search Query

**Scenario**: User submits search with empty string

**Input**:
- Query: ""
- Filters: none

**Expected Behavior**:
- Returns all candidates in company (paginated)
- No error thrown

**Actual Behavior**: ✅ Works as expected

---

### Edge Case 6: Follow Already Followed Candidate

**Scenario**: User clicks "Follow" on candidate they're already following

**Input**:
- CandidateId: "cand-001"
- UserId: "user-001" (already in FollowedByUserIds)

**Expected Behavior**:
- ✅ Succeeds silently (idempotent)
- No duplicate user ID added

**Actual Behavior**: ✅ Works as expected

**Evidence**: `MarkCandidateAsFollowedCommand.cs`

---

### Edge Case 7: Export with No Results

**Scenario**: Export candidates with filters that match zero records

**Input**:
- Filters: education=6, tags=["nonexistent"]

**Expected Behavior**:
- Returns XLSX file with headers only
- No error thrown

**Actual Behavior**: ✅ Works as expected

---

### Edge Case 8: File Upload Exceeds Size Limit

**Scenario**: User uploads 100MB CV file

**Input**:
- File size: 100MB (limit: 50MB)

**Expected Behavior**:
- ❌ Returns 400 Bad Request
- Error: "File size is too large."
- No file saved to storage

**Actual Behavior**: ✅ Works as expected

**Evidence**: `ErrorMessage.cs:92`, `UploadFileCommand.cs`

---

### Edge Case 9: Candidate Description Exceeds Limit

**Scenario**: User saves description with 2000 characters (limit: 1000)

**Input**:
- Description: 2000-char string

**Expected Behavior**:
- ❌ Returns 400 Bad Request
- Error: "Comment too long."
- No update performed

**Actual Behavior**: ✅ Works as expected

**Evidence**: `ErrorMessage.cs:131`, `SaveCandidateDescriptionCommand.cs`

---

### Edge Case 10: Update Email to Existing Email

**Scenario**: Update candidate email to email already used by another candidate

**Input**:
- CandidateId: "cand-001"
- New Email: "existing@company.com" (used by cand-002)

**Expected Behavior**:
- ❌ Returns 400 Bad Request
- Error: "Email already exists."
- No update performed

**Actual Behavior**: ✅ Works as expected

**Evidence**: `UpdateBasicCandidateInfoCommand.cs`

---

### Edge Case 11: Assign Owner with Resigned Employee

**Scenario**: Owner is assigned, then that employee resigns from company

**Input**:
- OwnerUserId: "employee-hr-002" (status changes to Resigned after assignment)

**Expected Behavior**:
- ✅ Owner remains assigned (no automatic reassignment)
- Display shows "John Doe (Resigned)" with strikethrough styling
- HR can reassign to active employee via owner selector

**Actual Behavior**: ✅ Works as expected

**Evidence**: `CandidateOwnerHelper.ts:17-19`, `candidate-quick-card-v2.component.ts`

---

### Edge Case 12: Clear Owner (Set to Null)

**Scenario**: HR clears owner assignment from candidate

**Input**:
- CandidateId: "cand-001"
- OwnerUserId: null

**Expected Behavior**:
- ✅ OwnerUserId set to null
- Display shows "Unassigned"
- No error thrown
- Candidate remains fully functional

**Actual Behavior**: ✅ Works as expected

**Evidence**: `UpdateCandidateOwnerCommand.cs`, `CandidateOwnerHelper.ts:7-9`

---

### Edge Case 13: Unauthorized Role Attempts Owner Change

**Scenario**: Employee (non-HR) role attempts to change candidate owner

**Input**:
- User role: Employee
- POST /api/candidates/{candidateId}/owner

**Expected Behavior**:
- ❌ Returns 403 Forbidden
- OwnerUserId unchanged

**Actual Behavior**: ✅ Works as expected (role-based authorization enforced)

**Evidence**: `CandidatesController.cs:599-602` (HrManager, Recruiter roles required)

---

### Edge Case 14: Filter by Owner with No Assigned Candidates

**Scenario**: Filter by owner who has no candidates assigned

**Input**:
- ownerUserIds: ["employee-with-no-candidates"]

**Expected Behavior**:
- ✅ Returns empty list (0 results)
- No error thrown
- Pagination shows totalCount: 0

**Actual Behavior**: ✅ Works as expected

**Evidence**: `CandidateEntity.ByOwnerUserIdsExpr`, `GetCandidatesQuery.cs`

---

### Edge Case 15: Withdraw Already Withdrawn Application

**Scenario**: User attempts to withdraw an application that is already withdrawn

**Input**:
- CandidateId: "cand-001"
- ApplicationId: "app-001" (IsWithdrawn = true)

**Expected Behavior**:
- ✅ Succeeds silently (idempotent operation)
- No duplicate withdrawal created
- WithdrawnDate not updated (preserves original)

**Actual Behavior**: ✅ Works as expected

**Evidence**: `WithdrawApplicationCommandHandler.cs`, `CandidateEntity.WithdrawApplication()`

---

### Edge Case 16: Withdraw Rejected Application

**Scenario**: User attempts to withdraw an application that has been rejected

**Input**:
- CandidateId: "cand-001"
- ApplicationId: "app-001" (IsRejected = true)

**Expected Behavior**:
- ⚠️ Currently: Succeeds (withdrawal and rejection can coexist)
- 📋 Business rule clarification needed: Should rejected applications be withdrawable?

**Actual Behavior**: ✅ Withdrawal succeeds, both flags can be true

**Note**: Consider adding business validation to prevent withdrawal of rejected applications

**Evidence**: `ApplicationEntity.IsWithdrawn`, `ApplicationEntity.IsRejected`

---

### Edge Case 17: Undo Withdraw on Non-Withdrawn Application

**Scenario**: User attempts to undo withdraw on application that is not withdrawn

**Input**:
- CandidateId: "cand-001"
- ApplicationId: "app-001" (IsWithdrawn = false)

**Expected Behavior**:
- ✅ Succeeds silently (idempotent operation)
- No error thrown
- Application state unchanged

**Actual Behavior**: ✅ Works as expected

**Evidence**: `CandidateEntity.UndoWithdrawApplication()`

---

### Edge Case 18: Withdraw Reason from Different Company

**Scenario**: User attempts to use withdraw reason from different company

**Input**:
- CompanyId: "company-001"
- WithdrawReason: "withdraw-reason-from-company-002"

**Expected Behavior**:
- ⚠️ Accepts the ID (no cross-company validation currently)
- Reason display may show unknown/empty

**Actual Behavior**: ⚠️ Partial - ID stored but display issues possible

**Note**: Consider validating withdraw reason belongs to user's company

**Evidence**: `WithdrawApplicationCommandHandler.cs`, `CompanyLibraryItemApiService`

---

### Edge Case 19: Bulk Withdraw Multiple Applications for Same Candidate

**Scenario**: Candidate has 3 applications to different jobs, user withdraws 2 of them in quick succession

**Input**:
- CandidateId: "cand-001"
- ApplicationIds: ["app-001", "app-002"] (sequential POST requests)

**Expected Behavior**:
- ✅ Each application withdrawn independently
- ✅ Remaining application (app-003) still active in pipeline
- ✅ No race condition issues with concurrent updates
- ✅ Candidate still visible in candidate list (has active application)

**Actual Behavior**: ✅ Works as expected

**Note**: Uses MongoDB optimistic concurrency via entity versioning

**Evidence**: `CandidateEntity.WithdrawApplication()`, `RootEntity.InternalIncrementVersion()`

---

### Edge Case 20: Withdraw with "Other" Reason but Missing OtherText

**Scenario**: User selects "Other" as withdraw reason but leaves OtherText empty

**Input**:
```json
{
  "withdrawReason": "other",
  "withdrawReasonOtherText": ""
}
```

**Expected Behavior**:
- ⚠️ Currently: May succeed (no strict validation on OtherText when reason is "Other")
- 📋 Recommendation: Add validation to require OtherText when reason is "Other"

**Actual Behavior**: ⚠️ Accepts empty OtherText

**Note**: Consider frontend validation + backend validation for mandatory OtherText

**Evidence**: `withdraw-candidates.component.ts`, `WithdrawApplicationCommandHandler.cs`

---

## 20. Regression Impact

### High-Risk Areas

| Area | Risk | Mitigation |
|------|------|------------|
| **Email Uniqueness Check** | Logic change could allow duplicates | Automated test TC-CM-001, DB constraint |
| **Import Override Logic** | IsOverride flag inversion breaks import | Integration test TC-CM-004 |
| **Access Control Filters** | Job access logic change exposes data | Security test suite, manual audit |
| **Tag Autocomplete** | Performance degradation on large datasets | Load test with 10k tags, query optimization |
| **Excel Export** | Memory leak on large exports | Stress test with 100k records, profiling |
| **Owner Assignment** | Orphaned owner refs if employee deleted | Owner display handles resigned/deleted statuses gracefully |
| **Owner Filter** | Filter returns stale results if owner changes | Uses real-time query via `ByOwnerUserIdsExpr` |
| **Withdrawal State** | Incorrect filter logic excludes/includes wrong candidates | Filter expressions tested via TC-CM-035, TC-CM-039 |
| **Pipeline Stage Counts** | Withdraw not correctly excluded from active counts | Pipeline query integration tests |
| **Withdraw Validation** | Missing reason validation causes orphan records | Validation tests TC-CM-039, TC-CM-040 |

### Regression Test Suite

**Smoke Tests** (runs on every commit, <2 minutes)
- TC-CM-001: Create candidate
- TC-CM-003: Get candidate
- TC-CM-007: Search candidates
- TC-CM-012: Add tag
- TC-CM-033: Withdraw application
- TC-CM-034: Undo withdraw application

**Full Regression** (runs nightly, <30 minutes)
- All 40 test cases (including 6 ownership + 8 withdrawal tests)
- Performance benchmarks
- Security scans
- Withdrawal validation tests (TC-CM-039, TC-CM-040)

### Dependency Impact

**Breaking Changes**:
- MongoDB schema changes → Requires migration script
- Entity event message structure changes → Breaks consumer services
- API route changes → Breaks frontend clients

**Non-Breaking Changes**:
- Adding new fields (optional) → Backward compatible
- Adding new endpoints → No impact on existing clients
- Performance optimizations → Transparent to clients

### Rollback Plan

**Scenario**: Critical bug discovered in production

**Steps**:
1. Immediately rollback to previous version (< 5 minutes)
2. Investigate root cause with logs and metrics
3. Fix bug in development environment
4. Re-deploy with fix after full regression test

**Data Rollback**:
- MongoDB: Point-in-time restore from hourly backups
- File storage: Versioned blobs, can revert to previous version

---

## 21. Troubleshooting

### Common Issues

#### Issue 1: Candidate Email Validation Fails

**Symptoms**: "Email already exists" error appears even when email is different or newly typed

**Causes**:
1. Whitespace in email field not trimmed before validation
2. Email uniqueness check includes soft-deleted candidates
3. Different company scopes not properly isolated

**Resolution**:
- Ensure email input is trimmed: `email.Trim().ToLower()`
- Check CheckExistCandidateEmail implementation includes company scope
- Verify OrganizationalUnitId is set correctly in context

**Log Pattern**: `Email validation failed for {email} in company {companyId}`

---

#### Issue 2: Candidate Import Fails with "Incorrect Format"

**Symptoms**: Import always fails with "Incorrect format file" despite valid CSV

**Causes**:
1. Unsupported file encoding (should be UTF-8)
2. CSV delimiter not recognized (expects comma)
3. File missing required columns

**Resolution**:
- Save CSV with UTF-8 encoding in Excel: File > Save As > CSV UTF-8
- Ensure columns: FirstName, LastName, Email, Phone (headers optional)
- Check file size < 100MB
- Verify no special characters in filename

**Log Pattern**: `Import failed: {error} for file {filename}`

---

#### Issue 3: Candidates Not Appearing in Search Results

**Symptoms**: Created candidate doesn't show in search list

**Causes**:
1. OrganizationalUnitId mismatch (created in different company)
2. Access control filter hiding candidates based on job assignments
3. Soft-deleted candidates included in filter
4. Search index not updated (MongoDB text index)

**Resolution**:
- Verify RequestContext.CurrentCompanyId() matches candidate's OrganizationalUnitId
- Check job access rights: `JobAccessRightsHelper.CanAccessToSpecificApplicationAsync()`
- Confirm candidate not soft-deleted via IsDeleted flag
- Rebuild MongoDB text indexes: `db.candidates.createIndex({firstname: "text", lastname: "text", email: "text"})`

**Log Pattern**: `Search returned {count} results for query {query} in company {companyId}`

---

#### Issue 4: Tag Suggestions Not Showing

**Symptoms**: GetTagSuggestion returns empty list despite existing tags

**Causes**:
1. Tags added by different company not visible (scope issue)
2. Search text too specific with no matches
3. Suggestion query not using company context

**Resolution**:
- Verify tags belong to current company in GetTagSuggestionQuery
- Use substring matching instead of exact match
- Check that RequestContext.CurrentCompanyId() is applied in query

**Log Pattern**: `Tag suggestion for '{input}' returned {count} results`

---

#### Issue 5: File Upload Fails Silently

**Symptoms**: Upload endpoint returns without error but file not saved

**Causes**:
1. Cloud storage credentials not configured
2. Directory permissions insufficient for uploads
3. File extension not in allowed list

**Resolution**:
- Verify cloud storage configuration in appsettings.json
- Check WriteAllowedExtensions configuration
- Review application logs for storage service errors
- Ensure file size < configured maximum

**Log Pattern**: `File upload failed: {error} for candidate {candidateId}`

---

### Diagnostic Queries

```javascript
// MongoDB: Check all candidates in company
db.candidates.find({ organizationalUnitId: "company-001" }).sort({ createdDate: -1 });

// MongoDB: Find candidates with specific email
db.candidates.find({ email: "john@example.com", organizationalUnitId: "company-001" });

// MongoDB: Check candidates with specific tag
db.candidates.find({ tags: "javascript", organizationalUnitId: "company-001" });

// MongoDB: Find candidates followed by user
db.candidates.find({ followedByUserIds: "user-001", organizationalUnitId: "company-001" });

// MongoDB: Get candidate applications by job
db.candidates.aggregate([
  { $match: { organizationalUnitId: "company-001" } },
  { $unwind: "$applications" },
  { $match: { "applications.jobId": "job-001" } },
  { $sort: { "applications.appliedDate": -1 } }
]);
```

### Log Locations

| Service | Log Path | Key Patterns |
|---------|----------|--------------|
| Candidate.Service | `logs/candidate-service-*.log` | `[CRUD]`, `[SEARCH]`, `[ERROR]` |
| MongoDB | `logs/mongodb-*.log` | `insert`, `update`, `query slow` |
| Message Bus | `logs/rabbitmq-*.log` | `CandidateEntityEventBusMessage` |

---

## 22. Operational Runbook

### Daily Operations

**Monitoring Dashboards**:
- Candidate search response time (target: <1s)
- Import success rate (target: >95%)
- File upload success rate (target: >99%)
- MongoDB query performance (slow queries >1s)

**Alerts**:
- Search response time >2s for 5 minutes → Page on-call
- Import failures >10% for 1 hour → Slack notification
- MongoDB connection failures → Page on-call immediately
- Disk space <20% → Slack notification

### Weekly Maintenance

**Tasks**:
1. Review slow query logs, optimize indexes if needed
2. Clean up soft-deleted candidates older than retention period (90 days)
3. Archive candidate data for inactive companies
4. Review and optimize MongoDB storage (compact collections)
5. Validate message bus consumer lag (<1 minute)

**Scripts**:

```bash
# Cleanup soft-deleted candidates
mongo candidates --eval 'db.candidates.deleteMany({ isDeleted: true, deletedDate: { $lt: new Date(Date.now() - 90*24*60*60*1000) } })'

# Compact MongoDB collections
mongo candidates --eval 'db.runCommand({ compact: "candidates" })'

# Check message bus lag
rabbitmqctl list_queues name messages consumers
```

### Incident Response

**Incident Type 1: Search Unavailable**

**Symptoms**: Users report "Search failed" errors

**Diagnosis**:
1. Check MongoDB connection status
2. Review MongoDB slow query log
3. Check if text index is intact

**Resolution**:
1. Restart MongoDB if connection issue
2. Rebuild text index if corrupted: `db.candidates.createIndex({firstname: "text", lastname: "text", email: "text"})`
3. If high load, scale MongoDB horizontally

**Communication**: Notify users via status page, ETA for resolution

---

**Incident Type 2: Import Failures**

**Symptoms**: Batch imports failing for all users

**Diagnosis**:
1. Check application logs for errors
2. Review file storage service health
3. Check MongoDB write performance

**Resolution**:
1. If file storage issue, switch to backup storage
2. If MongoDB write lock, wait for long-running operations to complete
3. If validation issue, fix validation logic and redeploy

**Communication**: Email users with workaround (smaller batch sizes)

---

### Capacity Planning

**Current Capacity**:
- 500k candidates across 200 companies
- 10k searches per day
- 100 imports per day (avg 500 records each)

**Scaling Thresholds**:
- MongoDB: Shard at 2M candidates
- API servers: Add instance at 80% CPU utilization
- File storage: Add CDN at 1TB total storage

**Growth Projections**:
- 2026: 1M candidates (double current)
- 2027: 5M candidates (10x current)
- Action: Plan MongoDB sharding for Q2 2026

---

## 23. Roadmap and Dependencies

### Current Version: 1.1.0 (2026-01-10)

**Completed Features**:
- ✅ Candidate CRUD operations
- ✅ Search & filtering
- ✅ Tag management
- ✅ File upload/attachments
- ✅ Excel export
- ✅ Bulk import from CSV/Excel
- ✅ Engagement tracking (follow, read)

### Planned Features

**Version 1.2.0 (Q1 2026)**:
- AI-powered candidate matching to jobs
- Advanced search with Boolean operators
- Custom field support (company-defined fields)
- Candidate merge/deduplication tool
- Automated email campaigns for candidates

**Version 1.3.0 (Q2 2026)**:
- Video resume support
- LinkedIn profile import
- Candidate portal (self-service profile updates)
- Interview scheduling integration
- Reference check automation

**Version 2.0.0 (Q4 2026)**:
- ML-powered candidate ranking
- Predictive analytics (time-to-hire, success prediction)
- Mobile app for recruiters
- Advanced reporting and dashboards
- GDPR compliance automation

### Dependencies

**External Dependencies**:

| Dependency | Version | Purpose | Risk |
|------------|---------|---------|------|
| MongoDB | 7.0+ | Primary database | Low (stable) |
| RabbitMQ | 3.12+ | Message bus | Low (stable) |
| Redis | 7.0+ | Caching | Low (optional, degrades gracefully) |
| Cloud Storage | Azure/AWS | File storage | Medium (vendor lock-in) |

**Internal Dependencies**:

| Service | Dependency Type | Impact if Unavailable |
|---------|----------------|----------------------|
| Job Service | Read jobs for filtering | Filters unavailable, search works |
| User Service | Authentication | Complete feature unavailable |
| Company Service | OrganizationalUnit data | Complete feature unavailable |
| VIP24 Assessment | Interest profiles | Optional feature unavailable |

### Migration Path

**From Legacy System** (6-month plan):

**Phase 1 (Month 1-2)**: Pilot with 5 companies
- Export legacy data to CSV
- Bulk import via API
- Validate data accuracy (>99%)
- User acceptance testing

**Phase 2 (Month 3-4)**: Rollout to 50 companies
- Automated migration scripts
- Parallel run with legacy system
- Monitor for issues, rollback plan ready

**Phase 3 (Month 5-6)**: Complete migration
- Migrate remaining 145 companies
- Decommission legacy system
- Post-migration validation

---

## 24. Related Documentation

### BravoSUITE Documentation

- [Recruitment Pipeline Feature](README.RecruitmentPipelineFeature.md)
- [Job Board Integration](README.JobBoardIntegrationFeature.md)
- [Employee Settings Feature](README.EmployeeSettingsFeature.md)
- [Backend Patterns - CQRS](../../../../docs/claude/backend-patterns.md#cqrs-patterns)
- [Backend Patterns - Entity Events](../../../../docs/claude/backend-patterns.md#entity-event-handlers)
- [BravoSUITE Architecture](../../../../docs/claude/architecture.md)
- [API Design Standards](../../../../docs/claude/api-design-standards.md)

### Technical Guides

- [MongoDB Query Optimization](https://docs.mongodb.com/manual/core/query-optimization/)
- [RabbitMQ Best Practices](https://www.rabbitmq.com/best-practices.html)
- [Angular Performance Guide](https://angular.io/guide/performance-best-practices)
- [.NET 9 Performance Tips](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-9)

### Compliance & Legal

- [GDPR Compliance Guide](https://gdpr.eu/)
- [Data Retention Policy](../../../../docs/policies/data-retention.md)
- [Privacy Policy](../../../../docs/policies/privacy-policy.md)

---

## 25. Glossary

| Term | Definition |
|------|------------|
| **Candidate** | Individual applying for or being considered for a job position |
| **Application** | A candidate's submission for a specific job position |
| **CV (Curriculum Vitae)** | Structured resume data including education, experience, skills |
| **Tag** | Free-form text label for organizing candidates (e.g., "senior", "javascript") |
| **Pipeline Stage** | Current step in recruitment process (e.g., "screening", "interview", "offer") |
| **Follow** | User-initiated tracking of candidate for future reference |
| **Company Scope** | Data isolation boundary (OrganizationalUnitId) ensuring multi-tenancy |
| **ULID** | Universally Unique Lexicographically Sortable Identifier (candidate ID format) |
| **Soft Delete** | Marking record as deleted (IsDeleted=true) without physical removal |
| **CQRS** | Command Query Responsibility Segregation (separate read and write models) |
| **Message Bus** | RabbitMQ-based event distribution for cross-service communication |
| **Repository** | Data access abstraction layer (e.g., `ICandidatePlatformRootRepository`) |
| **DTO (Data Transfer Object)** | Object for API request/response (e.g., `CandidateDto`) |
| **Value Object** | Immutable domain object without identity (e.g., `CV`, `File`) |
| **Entity Event** | Domain event triggered on entity CRUD operations |
| **Job Access Rights** | Permission system limiting candidate visibility by job assignment |
| **VIP24** | External assessment system for interest profile testing |
| **Idempotent** | Operation that produces same result when repeated (e.g., follow/unfollow) |

---

## 26. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.4.0 | 2026-01-30 | **Application Withdrawal Feature**<br>- Added FR-CM-24: Withdraw Candidate Application<br>- Added FR-CM-25: Undo Withdraw Application<br>- Added FR-CM-26: Filter by Withdrawal Status<br>- Added `IsWithdrawn`, `WithdrawReason`, `WithdrawReasonOtherText`, `WithdrawnDate`, `WithdrawComment` properties to ApplicationEntity<br>- Added `POST /api/candidates/{id}/applications/{appId}/withdraw` endpoint<br>- Added `POST /api/candidates/{id}/applications/{appId}/undo-withdraw` endpoint<br>- Added `CompanyLibraryType.WithdrawReason` for company-specific reasons<br>- Added `WithdrawCandidatesComponent` frontend UI<br>- Added withdraw filter in candidate filter panel<br>- Added "Withdrawn" virtual stage in pipeline filter<br>- Added TC-CM-033 to TC-CM-040: 8 withdrawal test specs (2 P0, 5 P1, 1 P2)<br>- Added Edge Cases 15-20: withdrawal lifecycle scenarios, validation edge cases<br>- Updated test summary: 32→40 test cases, regression suite updated<br>- Updated TC-CM-008, TC-CM-009: Include withdrawal filters | Documentation Team |
| 1.3.0 | 2026-01-28 | **Candidate Owner Field**<br>- Added FR-CM-23: Assign/Change Candidate Owner<br>- Added `OwnerUserId` property to domain model<br>- Added `POST /api/candidates/{candidateId}/owner` endpoint<br>- Added owner filter in candidate list (FR-CM-06)<br>- Added `CandidateOwnerHelper`, `OwnerDisplayPipe` in frontend<br>- Owner included in candidate Excel export<br>- Added TC-CM-027 to TC-CM-032: 6 ownership test specs (2 P0, 3 P1, 1 P2)<br>- Added Edge Cases 11-14: owner status handling, clear owner, unauthorized access, empty filter<br>- Updated test summary: 26→32 test cases, regression suite updated | Documentation Team |
| 1.2.0 | 2026-01-23 | **Job Opening Integration**<br>- Added Job Opening filter to FR-CM-06 and FR-CM-07<br>- Added TC-CM-010a: Job Opening Filter test spec<br>- Cross-reference to Job Openings feature | Documentation Team |
| 1.1.0 | 2026-01-10 | **Migration to 26-section structure**<br>- Added Executive Summary<br>- Added Business Value with ROI analysis<br>- Added Business Rules section<br>- Added Design Reference<br>- Added System Design section<br>- Added Security Architecture<br>- Added Performance Considerations<br>- Added Implementation Guide<br>- Added Test Data Requirements<br>- Added Edge Cases Catalog<br>- Added Regression Impact<br>- Added Operational Runbook<br>- Added Roadmap and Dependencies<br>- Added Glossary<br>- Enhanced all existing sections with deeper detail | Documentation Team |
| 1.0.0 | 2026-01-10 | Initial Candidate Management Feature documentation with 26 test cases and complete API reference | Documentation Team |

---

_Last Updated: 2026-01-30_
**Location**: `docs/business-features/bravoTALENTS/detailed-features/recruitment/README.CandidateManagementFeature.md`
**Maintained By**: BravoSUITE Documentation Team
