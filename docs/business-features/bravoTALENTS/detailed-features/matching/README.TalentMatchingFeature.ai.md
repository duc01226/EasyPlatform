# Talent Matching Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.TalentMatchingFeature.md](./README.TalentMatchingFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoTALENTS |
| Service | Talent.Service (SQL Server) |
| Database | SQL Server |
| External Integration | CandidateHub (HTTP API) |
| Full Docs | [README.TalentMatchingFeature.md](./README.TalentMatchingFeature.md) |

### File Locations

```
Entities:    src/Services/bravoTALENTS/Talent.Domain/AggregatesModel/Job.cs
Candidates:  src/Services/bravoCANDIDATES/Candidate.Domain/AggregatesModel/Candidate.cs
Commands:    src/Services/bravoTALENTS/Talent.Application/UseCaseCommands/JobMatching/
Queries:     src/Services/bravoTALENTS/Talent.Application/UseCaseQueries/JobMatching/
Controllers: src/Services/bravoTALENTS/Talent.Service/Controllers/JobMatchingController.cs
Frontend:    src/WebV2/apps/hr-portal/ (Implementation pending)
External:    src/Services/CandidateHub/ (Matching engine)
```

---

## Domain Model

### Entities

```
Job : RootEntity<Job, string>
├── Id: string
├── Name: string
├── OrganizationalUnitId: string
├── Summary: string (HTML sanitized for matching)
├── Description: string (HTML sanitized for matching)
├── JobType: JobType enum
├── PositionLevel: PositionLevel enum
├── Status: JobStatus enum
├── CategoryIds: List<string>
└── RequiredSkills: List<string>

Candidate : RootEntity<Candidate, string>
├── Id: string
├── ExternalId: string (CandidateHub identifier)
├── UserObjectId: string (Azure AD object ID)
├── Firstname: string
├── Lastname: string
├── Email: string
├── PreviousJob: string
├── PreviousCompany: string
├── OrganizationalUnitId: string
├── InterestProfileCodes: List<string>
├── SuitableJobCategories: List<string>
└── IsFullPurchased: bool
```

### Response Models

```
CandidateResponseModel {
  externalId: string
  userObjectId: string
  matchingScore: JobMatchingScore
  score: double? (0-100 overall)
  previousJob: string
  email: string
  skills: List<string> (matching skills only)
  totalSkills: int
  interestProfileCodes: List<string>
  vip24Score: double?
  skillScore: double?
  skillRelevanceScore: double?
}

JobMatchingScore {
  score: double (0-100 composite)
  skillMatch: string (Excellent|Good|Fair|Poor)
  profileMatch: string (Excellent|Good|Fair|Poor)
}

CandidateScoreResultModel {
  candidateId: string
  jobId: string
  score: double?
  vip24Score: double?
  skillScore: double?
  skillRelevanceScore: double?
}

TalentRequestModel {
  jobId: string (required)
  pageIndex: int = 1
  pageSize: int = 20
  minMatchingScore: double? = 1.01
}
```

### Enums

```
JobStatus: Open | Closed | OnHold | Draft | Archived
JobType: FullTime | PartTime | Contract | Temporary | Permanent
PositionLevel: Entry | Intermediate | Senior | Lead | Manager | Director | Executive
AccessRightAction: None | View | Edit
```

---

## API Contracts

### Commands

```
(This feature is read-only matching - no Create/Update/Delete commands)
```

### Queries

```
GET /api/job-matching/get-matched-candidates-from-candidate-hub
├── Request:  { jobId: string, pageIndex?: int, pageSize?: int }
├── Response: List<CandidateResponseModel>
├── Handler:  GetMatchedCandidatesFromCandidateHubQuery
└── Evidence: JobMatchingController.cs:33-37, GetMatchedCandidatesFromCandidateHubQuery.cs:31-90

GET /api/job-matching/get-candidates-score
├── Request:  { candidateIds: string[], jobIds: string[] }
├── Response: List<CandidateScoreResultModel>
├── Handler:  GetCandidatesScoreFromCandidateHubQuery
└── Evidence: JobMatchingController.cs:39-52, GetCandidatesScoreFromCandidateHubQuery.cs:116-123
```

### Request/Response Field Casing

**All API fields use camelCase in JSON requests/responses:**
```json
{
  "jobId": "job-123",
  "pageIndex": 1,
  "pageSize": 20,
  "externalId": "ext-456",
  "userObjectId": "azure-uuid",
  "matchingScore": {
    "score": 85.5,
    "skillMatch": "Excellent",
    "profileMatch": "Good"
  }
}
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-TM-001 | Minimum match score ≤ 1.01 excluded from results | `GetMatchedCandidatesFromCandidateHubQuery.cs:107` |
| BR-TM-002 | Full purchased candidates (IsFullPurchased=true) excluded | `GetMatchedCandidatesFromCandidateHubQuery.cs:62-75` |
| BR-TM-003 | Users only access jobs in their organizational units | `GetMatchedCandidatesFromCandidateHubQuery.cs:34-36` |
| BR-TM-004 | HTML in job descriptions sanitized before matching | `GetMatchedCandidatesFromCandidateHubQuery.cs:112-131` |
| BR-TM-005 | Batch scoring: candidateIds.Length == jobIds.Length | `JobMatchingController.cs:42-48` |
| BR-TM-006 | Results ordered by match score descending | `GetMatchedCandidatesFromCandidateHubQuery` |
| BR-TM-007 | bravoTALENTS subscription required | `JobMatchingController.cs:13` |
| BR-TM-008 | BravoTALENTS policy authorization required | `JobMatchingController.cs:14` |

### Validation Patterns

```csharp
// Job validation
if (string.IsNullOrEmpty(request.JobId))
    return BadRequest("CannotGetMatchedCandidates", "JobId required");

// Org unit access check
if (!user.OrgUnits.Contains(job.OrganizationalUnitId))
    throw new NotFoundException($"Job not accessible");

// HTML sanitization
var sanitizedDescription = HtmlHelper.RemoveInnerHtml(job.Description);
var sanitizedSummary = HtmlHelper.RemoveInnerHtml(job.Summary);

// Full purchase filtering
var fullPurchasedIds = candidates.Where(c => c.IsFullPurchased).Select(c => c.ExternalId).ToList();
var filtered = results.Where(r => !fullPurchasedIds.Contains(r.ExternalId)).ToList();

// Minimum score filtering (hardcoded minimum 1.01)
var scored = results.Where(r => r.MatchingScore?.Score > 1.01).ToList();

// Array length validation
if (request.CandidateIds.Length != request.JobIds.Length)
    return BadRequest("Array length mismatch");
```

---

## Service Boundaries

### External Integration (CandidateHub Service)

```
Talent.Service ──HTTP API──▶ [CandidateHub]
├── Service: ICandidateHubService
├── Methods: GetCandidates(JobQueryModel), GetCandidatesScore(CandidateHubScoreRequestModel)
└── Response: CandidateResponseModel[], ScoreResponse[]
```

### Data Flow to CandidateHub

**GetCandidates() Input (JobQueryModel)**:
```
Job Details:
  ├── Id: Job.Id
  ├── Name: Job.Name
  ├── Description: Job.Description (sanitized)
  ├── Summary: Job.Summary (sanitized)
  ├── Code: SocCategory.SocCode (mapped from Job.CategoryIds)
  ├── Category: Category.Name
  ├── PositionLevel: Job.PositionLevel.Description()
  ├── RequiredSkills: Job.RequiredSkills
  └── MinMatchingScore: 1.01 (hardcoded)

Pagination:
  ├── PageIndex: request.PageIndex
  └── PageSize: request.PageSize
```

**GetCandidatesScore() Input (CandidateHubScoreItemModel)**:
```
For each [candidateId, jobId] pair:
  ├── CandidateId: candidateId
  ├── UserObjectId: Candidate.UserObjectId
  ├── ExternalId: Candidate.ExternalId
  ├── JobId: jobId
  ├── Description: Job.Description (sanitized)
  ├── Summary: Job.Summary (sanitized)
  ├── Category: Category.Code
  ├── Code: SocCategory.SocCode
  ├── PositionLevel: Job.PositionLevel
  └── RequiredSkills: Job.RequiredSkills
```

### No Message Bus Events

Talent Matching is a read-only feature with no entity events published or consumed.

---

## Critical Paths

### Get Matched Candidates

```
1. Validate input
   ├── BR-TM-007: Check bravoTALENTS subscription claim
   ├── BR-TM-008: Check BravoTALENTS policy authorization
   └── BR-TM-001: JobId not empty
2. Load job → BR-TM-003: Verify in user's org units
3. Prepare job query model
   ├── Sanitize description/summary: BR-TM-004
   ├── Map category to SOC code
   └── Set pagination & minScore = 1.01
4. Call CandidateHub.GetCandidates(jobQueryModel)
5. Filter results
   ├── BR-TM-002: Exclude IsFullPurchased=true candidates
   └── BR-TM-006: Sort by match score descending
6. Return paginated CandidateResponseModel list
```

### Get Batch Candidate Scores

```
1. Validate input
   ├── BR-TM-007: Check subscription
   ├── BR-TM-008: Check authorization
   └── BR-TM-005: Verify candidateIds.Length == jobIds.Length
2. Prepare batch request model (parallel arrays)
   ├── For each pair [candidateId, jobId]:
   │   ├── Load candidate & job
   │   ├── BR-TM-003: Verify job in user's org units
   │   ├── BR-TM-004: Sanitize job description/summary
   │   └── Build CandidateHubScoreItemModel
   └── Collect all items into request
3. Call CandidateHub.GetCandidatesScore(request)
4. Return List<CandidateScoreResultModel> with scores
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-TM-001 | Get matched candidates - valid job | Returns 200, ranked by score desc, BR-TM-003 check |
| TC-TM-002 | Pagination (pageIndex=2, pageSize=10) | Returns correct page offset, candidates 11-20 |
| TC-TM-003 | Match score calculation | Response includes JobMatchingScore with all components |
| TC-TM-004 | Full purchase filtering | Candidates with IsFullPurchased=true excluded |
| TC-TM-005 | Batch scoring - parallel arrays | Returns scores for all pairs in order |
| TC-TM-006 | Authorization & subscription | Returns 403 if missing bravoTALENTS claim/policy |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Empty jobId | 400 Bad Request: "CannotGetMatchedCandidates" | `JobMatchingController.cs:34` |
| Non-existent jobId | 404 Not Found | `JobMatchingController.cs:36` |
| Job in different org unit | 404 Not Found (access denied) | `GetMatchedCandidatesFromCandidateHubQuery.cs:34-36` |
| Score ≤ 1.01 | Filtered out automatically | `GetMatchedCandidatesFromCandidateHubQuery.cs:107` |
| HTML in description | Sanitized via RemoveInnerHtml() | `GetMatchedCandidatesFromCandidateHubQuery.cs:112-131` |
| Missing subscription | 403 Forbidden | `JobMatchingController.cs:13` |
| Unequal array lengths | 400 Bad Request | `JobMatchingController.cs:42-48` |
| Candidates with IsFullPurchased=null | Included in results (not filtered) | Null != true |
| pageIndex=0 | Treated as page 1 (1-based) | `TalentRequestModel.cs` |
| pageSize=1000 | May exceed max (recommend limit to 100) | Implementation dependent |
| CandidateHub timeout | 500 Internal Server Error | External service failure |

---

## Key Dependencies

### Required Services

- **ICandidateHubService**: External matching engine (HTTP API)
- **Job Repository**: Load job entity with sanitization
- **Candidate Repository**: Check IsFullPurchased status
- **Category/SOC Mapping**: Job category to SOC code translation

### Authorization Dependencies

- **BravoTALENTS Subscription Claim**: `[BravoTalentsSubscriptionClaimAuthorize]`
- **BravoTALENTS Policy**: `Policies.BravoTALENTS`
- **Organizational Unit Access**: User.OrgUnits filtering

### HTML Sanitization

- **HtmlHelper.RemoveInnerHtml()**: Strip HTML from descriptions before CandidateHub call
- Applied to: Job.Description, Job.Summary
- Purpose: Prevent matching algorithm corruption from HTML markup

---

## Usage Notes

### When to Use This File

- Implementing job matching features
- Adding new query endpoints
- Debugging score calculation issues
- Understanding CandidateHub integration
- Code review context

### When to Use Full Documentation

- Understanding business value & ROI
- Stakeholder communication
- Comprehensive test planning
- Troubleshooting production issues
- Understanding UI/UX requirements

---

*Generated from comprehensive documentation. For full details, see [README.TalentMatchingFeature.md](./README.TalentMatchingFeature.md)*
