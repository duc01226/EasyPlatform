# Talent Matching Feature - Quick Reference Guide

> Fast lookup reference for developers integrating with the Talent Matching API

## API Endpoints Quick Lookup

### Get Matched Candidates

```bash
GET /api/job-matching/get-matched-candidates-from-candidate-hub?jobId={jobId}&pageIndex={page}&pageSize={size}
```

| Parameter    | Type     | Required | Default | Notes                      |
|--------------|----------|----------|---------|----------------------------|
| `jobId`      | string   | Yes      | -       | Must be valid job ID       |
| `pageIndex`  | int      | No       | 1       | 1-based indexing           |
| `pageSize`   | int      | No       | 20      | Recommend max 100          |

**Response**: `IEnumerable<TalentResultModel>` with JobMatchingScore breakdown

---

### Get Candidate Scores

```bash
GET /api/job-matching/get-candidates-score?candidateIds={id1}&candidateIds={id2}&jobIds={job1}&jobIds={job2}
```

| Parameter        | Type       | Required | Notes                      |
|------------------|------------|----------|----------------------------|
| `candidateIds[]` | string[]   | Yes      | Must match jobIds length   |
| `jobIds[]`       | string[]   | Yes      | Paired with candidateIds   |

**Response**: `IEnumerable<CandidateScoreResultModel>` with score components

---

## Response Models

### TalentResultModel (Matched Candidate)

```csharp
public class TalentResultModel
{
    public string ExternalId { get; set; }                    // CandidateHub ID
    public string UserObjectId { get; set; }                  // Azure AD ID
    public JobMatchingScore MatchingScore { get; set; }       // Score breakdown
    public double? Score { get; set; }                        // Overall (0-100)
    public string PreviousJob { get; set; }                   // Last job title
    public List<string> Skills { get; set; }                  // Matching skills
    public int TotalSkills { get; set; }                      // Total in profile
    public List<string> InterestProfileCodes { get; set; }    // Interest tags
    public double? Vip24Score { get; set; }                   // Job family score
    public double? SkillScore { get; set; }                   // Technical score
    public double? SkillRelevanceScore { get; set; }          // Relevance (0-100)
}
```

### JobMatchingScore

```csharp
public class JobMatchingScore
{
    public double Score { get; set; }         // 0-100
    public string SkillMatch { get; set; }    // Excellent/Good/Fair/Poor
    public string ProfileMatch { get; set; }  // Excellent/Good/Fair/Poor
}
```

### CandidateScoreResultModel

```csharp
public class CandidateScoreResultModel
{
    public string CandidateId { get; set; }
    public string JobId { get; set; }
    public double? Score { get; set; }
    public double? Vip24Score { get; set; }
    public double? SkillScore { get; set; }
    public double? SkillRelevanceScore { get; set; }
}
```

---

## Authorization Requirements

| Layer          | Requirement                                      |
|----------------|--------------------------------------------------|
| **Header**     | `Authorization: Bearer {JWT_TOKEN}`            |
| **Claim**      | `bravoTALENTS` subscription claim required      |
| **Policy**     | `Policies.BravoTALENTS` authorization policy   |
| **Data Level** | User's organizational units only                |

---

## Common Errors & Fixes

| Status | Error | Fix |
|--------|-------|-----|
| 400 | "CannotGetMatchedCandidates" | Ensure jobId is not null/empty |
| 401 | Unauthorized | Check JWT token validity |
| 403 | Forbidden | Verify bravoTALENTS subscription claim |
| 403 | Forbidden | Verify BravoTALENTS policy assigned |
| 404 | Not Found | Verify job exists in your org unit |
| 500 | Timeout | CandidateHub service unresponsive |

---

## Key Domain Models

### Job Entity

Required fields for matching:
- `Id`: Job identifier
- `Name`: Job title
- `Description`: Job details (will be sanitized)
- `Summary`: Brief description (will be sanitized)
- `PositionLevel`: Seniority (Internship-Executive)
- `RequiredSkills`: List of skills to match
- `CategoryIds`: Job categories for SOC mapping
- `OrganizationalUnitId`: Must match user's org unit

### Candidate Entity

Key fields used in matching:
- `Id`: Candidate identifier
- `ExternalId`: CandidateHub identifier
- `UserObjectId`: Azure AD identifier
- `Skills`: Technical skills list
- `InterestProfileCodes`: Interest classifications
- `IsFullPurchased`: If true, excluded from results
- `OrganizationalUnitId`: Must match user's org unit

---

## Workflows at a Glance

### Workflow 1: Match Candidates to Job

```
1. User selects Job
2. GET /get-matched-candidates-from-candidate-hub?jobId={id}
3. System validates org unit access
4. System retrieves job details & category
5. System sanitizes HTML content
6. System calls CandidateHub AI service
7. System filters full-purchase candidates
8. System returns ranked list by match score
9. Frontend displays candidates
```

### Workflow 2: Get Score Details

```
1. User selects candidate-job pair
2. GET /get-candidates-score?candidateIds={id}&jobIds={id}
3. System validates org unit access
4. System builds score request
5. System calls CandidateHub scoring service
6. System maps results
7. Frontend displays score breakdown
```

---

## Performance Considerations

| Operation | Typical Time | Notes |
|-----------|--------------|-------|
| Get 20 candidates | < 1 second | CandidateHub cached |
| Get 100 candidates | 2-3 seconds | Pagination recommended |
| Score 1 pair | < 500ms | Simple lookup |
| Score 10 pairs | < 2 seconds | Batch processed |
| Timeout threshold | 30 seconds | Global API timeout |

**Optimization Tips**:
- Use pagination for large result sets
- Batch score requests instead of individual calls
- Cache job/candidate data where possible
- Consider pagination size < 50 for best UX

---

## Score Interpretation Guide

### Overall Score (0-100)

| Range | Interpretation |
|-------|-----------------|
| 85-100 | Excellent match - Strong candidate |
| 70-84 | Good match - Viable candidate |
| 50-69 | Fair match - Consider other options |
| 1-49 | Poor match - Not recommended |
| < 1 | Filtered out - Below minimum threshold |

### Skill Score

- **90-100**: All required skills present
- **70-89**: Most required skills present
- **50-69**: Some required skills present
- **< 50**: Few skills match

### Profile Match

- **Excellent**: Experience level, education align
- **Good**: Most profile elements align
- **Fair**: Some profile alignment
- **Poor**: Significant profile mismatch

---

## Required Skills for Implementation

### Backend (C#)

- CQRS command/query pattern understanding
- MongoDB data access layer
- ASP.NET Core controller implementation
- JWT token validation
- External service integration

### Frontend (TypeScript/Angular)

- Angular 19+ component structure
- RxJS observable patterns
- Form validation and error handling
- API service integration
- BEM CSS class naming (for templates)

### Testing

- Unit tests for query handlers
- Integration tests with CandidateHub
- API endpoint testing
- Authorization/permission testing
- Edge case scenario coverage

---

## File Locations Reference

| Component | Location |
|-----------|----------|
| Controller | `src/Services/bravoTALENTS/Talent.Service/Controllers/JobMatchingController.cs` |
| Query Handler 1 | `src/Services/bravoTALENTS/Talent.Application/JobMatching/Queries/.../GetMatchedCandidatesFromCandidateHubQuery.cs` |
| Query Handler 2 | `src/Services/bravoTALENTS/Talent.Application/JobMatching/Queries/.../GetCandidatesScoreFromCandidateHubQuery.cs` |
| Job Entity | `src/Services/bravoTALENTS/Talent.Domain/AggregatesModel/Job.cs` |
| Candidate Entity | `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Candidate.cs` |
| Response Models | `src/Services/bravoTALENTS/Talent.Application/JobMatching/Queries/.../Model/` |

---

## Useful Code Snippets

### C# - Call Matching API

```csharp
public async Task<IEnumerable<TalentResultModel>> GetMatchedCandidatesAsync(
    string jobId, int pageIndex = 1, int pageSize = 20)
{
    var request = new TalentRequestModel
    {
        JobId = jobId,
        PageIndex = pageIndex,
        PageSize = pageSize
    };

    return await queryHandler.ExecuteAsync(request, currentUser);
}
```

### TypeScript - Angular Service

```typescript
getMatchedCandidates(jobId: string, pageIndex = 1, pageSize = 20): Observable<TalentMatch[]> {
    const params = new HttpParams()
        .set('jobId', jobId)
        .set('pageIndex', pageIndex.toString())
        .set('pageSize', pageSize.toString());

    return this.http.get<TalentMatch[]>(
        `${this.apiUrl}/get-matched-candidates-from-candidate-hub`,
        { params }
    );
}
```

### TypeScript - Score Batch Request

```typescript
getCandidateScores(
    candidateIds: string[],
    jobIds: string[]
): Observable<CandidateScore[]> {
    let params = new HttpParams();
    candidateIds.forEach(id => params = params.append('candidateIds', id));
    jobIds.forEach(id => params = params.append('jobIds', id));

    return this.http.get<CandidateScore[]>(
        `${this.apiUrl}/get-candidates-score`,
        { params }
    );
}
```

---

## Testing Checklist

- [ ] Request with valid jobId returns 200 OK
- [ ] Request with invalid jobId returns 400
- [ ] Request without auth token returns 401
- [ ] Request without subscription returns 403
- [ ] Job from different org unit returns 404
- [ ] Response contains JobMatchingScore object
- [ ] Candidates ranked by score descending
- [ ] Pagination works correctly
- [ ] Full-purchase candidates excluded
- [ ] Skills extracted correctly
- [ ] HTML content sanitized
- [ ] Score components reasonable (0-100)
- [ ] Batch scoring works with pairs
- [ ] Timeout handled gracefully
- [ ] Error messages clear and helpful

---

## Useful Links

| Resource | Path |
|----------|------|
| Full Documentation | `docs/business-features/bravoTALENTS/detailed-features/matching/README.TalentMatchingFeature.md` |
| Test Specifications | Same file, Section 12 |
| Troubleshooting Guide | Same file, Section 13 |
| bravoTALENTS Module | `docs/business-features/bravoTALENTS/README.md` |
| API Documentation | `docs/business-features/bravoTALENTS/API-REFERENCE.md` |

---

## Quick Tips

1. **Always validate org unit access** - Never assume user can see all data
2. **Handle null scores gracefully** - Some scores may be null/0
3. **Use pagination** - Never request all candidates at once
4. **Sanitize input** - Backend does it, but validate on frontend too
5. **Cache when possible** - Job/candidate data changes infrequently
6. **Test error cases** - 400, 401, 403, 404 are common
7. **Monitor CandidateHub** - Timeouts indicate service issues
8. **Log match reasons** - Debug why score is low

---

**Last Updated**: 2026-01-10
**Status**: Quick Reference Guide v1.0
**Quick Links**: [Full Documentation](#file-locations-reference) | [Test Cases](#testing-checklist)
