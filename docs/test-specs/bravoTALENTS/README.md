# bravoTALENTS Test Specifications (Enhanced with Code Evidence)

> Comprehensive Test Specs for Recruitment & Applicant Tracking System (ATS)
> **Enhanced Version with Code Evidence**

**Version**: 2.1 Enhanced
**Last Updated**: 2026-02-06
**Module**: bravoTALENTS
**Test Framework**: Jest (Frontend), xUnit/Moq (Backend)

---

## Table of Contents

1. [Candidate Management Test Specs](#1-candidate-management-test-specs)
2. [Job Management Test Specs](#2-job-management-test-specs)
3. [Interview Management Test Specs](#3-interview-management-test-specs)
4. [Job Description Validation Test Specs](#35-job-description-validation-test-specs)
5. [Offer Management Test Specs](#4-offer-management-test-specs)
6. [Application Pipeline Test Specs](#5-application-pipeline-test-specs)
7. [Email Template Test Specs](#6-email-template-test-specs)
8. [Authorization & Permission Test Specs](#7-authorization--permission-test-specs)
9. [Integration Test Specs](#8-integration-test-specs)

---

## 1. Candidate Management Test Specs

### Candidate Creation & Search

#### TC-CM-001: Create Candidate Successfully

**Priority**: P0-Critical

**Preconditions**:
- User has `CanCreateCandidate` permission
- Candidate email is unique in system
- Organization unit exists and is accessible to user
- Database is clean (no existing candidate with this email)

**Test Steps** (Given-When-Then):

```gherkin
Given a recruiter with candidate creation permissions
  And valid candidate data with unique email
When recruiter submits CreateSourcedCandidateCommand
Then candidate record is created in database
  And candidate gets status "New"
  And candidate appears in candidate list with default pagination
  And system assigns unique CandidateId
```

**Acceptance Criteria**:

- ✅ Candidate created with all required fields (Email, FullName, Phone, Source)
- ✅ Email is validated as unique before creation
- ✅ Candidate linked to correct organizational unit
- ✅ Created timestamp is recorded
- ✅ CreatedBy field captures current user ID
- ❌ Cannot create candidate with duplicate email → Returns 409 Conflict
- ❌ Cannot create candidate without email → Returns 400 Bad Request
- ❌ Cannot create if user lacks permission → Returns 403 Forbidden

**Test Data**:

```json
{
  "email": "john.doe@example.com",
  "fullName": "John Doe",
  "phone": "+84123456789",
  "source": "LinkedIn",
  "cvId": "cv-123",
  "tags": ["Senior Developer", "Vietnam"],
  "organizationalUnitId": "dept-hr"
}
```

**Edge Cases**:

- Email with special characters (john+test@example.com) → Success
- Very long name (>200 chars) → Validation error
- Phone with special formatting (+1-555-0123) → Success
- Null/empty phone → Success (optional field)
- Source not in predefined list → Custom source created

**Evidence**:

- **Command**: `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/CreateCandidateCommand/CreateSourcedCandidateCommand.cs`
- **Controller**: `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs:L396-401`
- **Entity**: `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Candidate.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs` |
| Backend | Command | `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/CreateCandidateCommand/CreateSourcedCandidateCommand.cs` |
| Backend | Handler | `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/CreateCandidateCommand/CreateCandidateCommandHandler.cs` |
| Backend | Entity | `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Candidate.cs` |
| Backend | Repository | `src/Services/bravoTALENTS/Candidate.Infrastructure/Repositories/CandidateRepository.cs` |
| Frontend | Component | `src/WebV2/apps/talents-for-company/src/app/candidates/create-candidate/create-candidate.component.ts` |

<details>
<summary>Code Snippet: CreateSourcedCandidateCommand Model</summary>

```csharp
// File: CreateSourcedCandidateCommand.cs:1-103
public class CreateSourcedCandidateCommand
{
    public ContactInfo ContactInfo { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string Summary { get; set; }
    public IList<Experience> Experiences { get; set; } = [];
    public IList<Education> Educations { get; set; } = [];
    public string[] Skills { get; set; }
    public IList<Accomplishment> Accomplishments { get; set; } = [];
    public IList<Certification> Certifications { get; set; } = [];
    public IList<Course> Courses { get; set; } = [];
    public IList<Language> Languages { get; set; } = [];
    public IList<Project> Projects { get; set; } = [];
}

public class ContactInfo
{
    public SocialProfile SocialProfile { get; set; }
    public IList<Contact> Contact { get; set; } = [];
}

public class Contact
{
    public string Type { get; set; }
    public string Content { get; set; }
}

public class Experience
{
    public string Title { get; set; }
    public string Company { get; set; }
    public int? FromMonth { get; set; }
    public int? FromYear { get; set; }
    public int? ToMonth { get; set; }
    public int? ToYear { get; set; }
    public string Location { get; set; }
}
```
</details>

<details>
<summary>Code Snippet: Controller Endpoint</summary>

```csharp
// File: CandidatesController.cs:396-401
[HttpPost("create-sourced-candidate")]
public async Task<CreateSourcedCandidateResult> CreateSourcedCandidate(
    [FromBody] CreateSourcedCandidateCommand createSourcedCandidateCommand)
{
    return await createCandidateCommandHandler.ExecuteAsync(createSourcedCandidateCommand, UserLogin);
}
```
</details>

---

#### TC-CM-002: Bulk Import Candidates from CSV

**Priority**: P1-High

**Preconditions**:
- User has `CanImportCandidates` permission
- CSV file with proper headers exists
- Organization unit accessible to user
- No concurrent imports running

**Test Steps** (Given-When-Then):

```gherkin
Given a recruiter with import permissions
  And CSV file with 50 candidate records
When recruiter calls ImportCandidateFromFileCommand
Then system validates file format and content
  And system shows preview of candidates to import
  And recruiter confirms import
  And all 50 candidate records are created in parallel
  And each candidate tagged with source "CsvImport"
```

**Acceptance Criteria**:

- ✅ CSV file format validated (required columns: Email, Name, Phone, Education, Experience)
- ✅ Duplicate emails in CSV detected and reported
- ✅ Duplicate emails with existing DB candidates detected
- ✅ Preview shows all records before final import
- ✅ Import transaction rolls back on validation error
- ✅ System processes batch in parallel (up to 10 concurrent)
- ✅ Import history tracked with timestamp and user
- ❌ Invalid CSV format → Shows specific error on line N
- ❌ File size > 10MB → Returns 413 Payload Too Large
- ❌ Duplicate emails within CSV → Prevents import, shows list

**Test Data**:

```csv
Email,FullName,Phone,Education,Experience
john@example.com,John Doe,0123456789,Bachelor in IT,5 years Java
jane@example.com,Jane Smith,0987654321,Master in CS,3 years Python
bob@example.com,Bob Johnson,0111222333,Diploma,1 year JS
```

**Edge Cases**:

- CSV with 5000 records → Pagination and chunking works correctly
- CSV with special characters in names (Vietnamese names) → Success
- Email column has extra spaces (" john@example.com ") → Trimmed automatically
- Missing optional columns (Experience) → Uses defaults
- Duplicate row within CSV → Skipped with warning, continues

**Evidence**:

- **Command**: `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/ImportCandidateFromFileCommand/ImportCandidateFromFileCommand.cs`
- **Controller**: `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs:L533-541`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs` |
| Backend | Command | `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/ImportCandidateFromFileCommand/ImportCandidateFromFileCommand.cs` |
| Backend | Handler | `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/ImportCandidateFromFileCommand/ImportCandidateFromFileCommandHandler.cs` |
| Backend | Entity | `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Candidate.cs` |
| Backend | Repository | `src/Services/bravoTALENTS/Candidate.Infrastructure/Repositories/CandidateRepository.cs` |
| Frontend | Component | `src/WebV2/apps/talents-for-company/src/app/candidates/import-candidates/import-candidates.component.ts` |

<details>
<summary>Code Snippet: ImportCandidateFromFileCommand</summary>

```csharp
// File: ImportCandidateFromFileCommand.cs:1-189
public class ImportCandidateFromFileCommand
{
    public static readonly string[] DateOfBirthFormats =
    [
        "MM/dd/yyyy",
        "M/d/yyyy"
    ];

    public string Firstname { get; set; }
    public string Lastname { get; set; }
    public string Email { get; set; }
    public string PhoneNumber { get; set; }
    public string Gender { get; set; }
    public string DateOfBirth { get; set; }
    public string Address { get; set; }
    public string City { get; set; }
    public string State { get; set; }
    public string Country { get; set; }
    public string Summary { get; set; }
    public string Facebook { get; set; }
    public string Twitter { get; set; }
    public string LinkedIn { get; set; }
    public string Skype { get; set; }
    public string Source { get; set; }
    public string Skills { get; set; }
    public string Description { get; set; }
    public Error Error { get; set; }

    public CV MapCv()
    {
        return CV.Create(Summary, GetCvSkills());
    }

    public List<Skill> GetCvSkills()
    {
        if (Skills.IsNullOrEmpty()) return [];

        return Skills
            .Split(';', StringSplitOptions.RemoveEmptyEntries)
            .SelectList(skill => Skill.Create(ObjectIdGeneratorHelper.ObjectIdGenerator(), skill));
    }
}

public class Error
{
    public string Line { get; set; }
    public IList<string> ErrorList { get; set; } = [];
}

public class ImportResult
{
    public ImportResult(int numberOfSkip, int numberOfUpdate, int numberOfImport)
    {
        NumberOfSkip = numberOfSkip;
        NumberOfUpdate = numberOfUpdate;
        NumberOfImport = numberOfImport;
    }

    public int NumberOfSkip { get; set; }
    public int NumberOfUpdate { get; set; }
    public int NumberOfImport { get; set; }
}
```
</details>

<details>
<summary>Code Snippet: CSV Validation Logic</summary>

```csharp
// File: ImportCandidateFromFileCommand.cs:106-187
public sealed class ImportCandidateFromFileCommandMap : ClassMap<ImportCandidateFromFileCommand>
{
    public ImportCandidateFromFileCommandMap()
    {
        Map(m => m.Firstname);
        Map(m => m.Lastname);
        Map(m => m.Email);
        Map(m => m.PhoneNumber).Optional();
        Map(m => m.Gender).Optional();
        Map(m => m.DateOfBirth).Optional();
        // ... more mappings
        Map(m => m.Error)
            .Convert(
                convertFromStringArgs =>
                {
                    var errors = new Error();

                    if (string.IsNullOrEmpty(convertFromStringArgs.Row.GetField(nameof(ImportCandidateFromFileCommand.Firstname))))
                        errors.ErrorList.Add("CANDIDATE.ERROR.FIRST_NAME_IS_EMPTY");

                    if (string.IsNullOrEmpty(convertFromStringArgs.Row.GetField(nameof(ImportCandidateFromFileCommand.Lastname))))
                        errors.ErrorList.Add("CANDIDATE.ERROR.LAST_NAME_IS_EMPTY");

                    if (string.IsNullOrEmpty(convertFromStringArgs.Row.GetField(nameof(ImportCandidateFromFileCommand.Email))))
                        errors.ErrorList.Add("CANDIDATE.ERROR.EMAIL_IS_EMPTY");
                    else if (!Regex.IsMatch(
                        convertFromStringArgs.Row.GetField(nameof(ImportCandidateFromFileCommand.Email))!.Trim(),
                        @"^\w+([-+.']\w*)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$"))
                        errors.ErrorList.Add("CANDIDATE.ERROR.INVALID_EMAIL_FORMAT");

                    if (convertFromStringArgs.Row.HeaderRecord!.Contains(nameof(ImportCandidateFromFileCommand.PhoneNumber)) &&
                        convertFromStringArgs.Row.GetField(nameof(ImportCandidateFromFileCommand.PhoneNumber)).IsNotNullOrEmpty() &&
                        !Regex.IsMatch(
                            convertFromStringArgs.Row.GetField(nameof(ImportCandidateFromFileCommand.PhoneNumber))!.Trim(),
                            @"^(?:(?:\(?(?:\+?)?\d([0-9](\d+)?)\)?)?)?(?:[\-\.\ ]?(\d+))+$"))
                        errors.ErrorList.Add("CANDIDATE.ERROR.INVALID_PHONE_NUMBER_FORMAT");

                    if (errors.ErrorList.Count > 0) errors.Line = convertFromStringArgs.Row.Parser.Row.ToString();

                    return errors;
                });
    }
}
```
</details>

<details>
<summary>Code Snippet: Controller Import Endpoint</summary>

```csharp
// File: CandidatesController.cs:533-541
[HttpPost("import-candidate-from-file")]
public async Task<IActionResult> ImportCandidateFromFile([FromForm] ImportCandidateFromFileModel command)
{
    return Ok(
        await importCandidateFromFileCommandHandler.ExecuteAsync(
            command.File,
            command.IsOverride,
            UserLogin));
}
```
</details>

---

#### TC-CM-003: Search and Filter Candidates

**Priority**: P1-High

**Preconditions**:
- At least 100 candidates exist in database
- User has view permission for candidates
- Search indices are up-to-date

**Test Steps** (Given-When-Then):

```gherkin
Given a recruiter viewing candidate list
  And 500 candidates in various stages
When recruiter applies filter: Name="John" AND Status="New" AND DateRange=[Jan-Dec]
  And recruiter sorts by "Date Applied" descending
Then system returns matching 25 candidates
  And results paginated (20 per page)
  And each page loads in < 500ms
  And correct count shows in header
```

**Acceptance Criteria**:

- ✅ Multi-criteria filter: Name, Email, Phone, Tags, Source, Status
- ✅ Date range filtering (Applied Date, Last Modified)
- ✅ Search by full name, partial name, email
- ✅ Case-insensitive search
- ✅ Pagination: default 20 per page, max 100
- ✅ Sorting by: Name, Date Applied, Last Modified, Status
- ✅ Filter combination works (AND logic between filters)
- ✅ Clear filters button resets all
- ✅ Save filter preset for later use
- ❌ Invalid date format → Shows validation error
- ❌ Page number > total pages → Returns empty or last page

**Test Data**:

```json
{
  "searchText": "John",
  "tags": ["Senior Developer"],
  "source": ["LinkedIn", "Referral"],
  "status": ["New", "Screening"],
  "dateRange": {
    "from": "2025-01-01",
    "to": "2025-12-31"
  },
  "sortBy": "appliedDate",
  "sortOrder": "descending",
  "pageNumber": 1,
  "pageSize": 20
}
```

**Evidence**:

- **Query**: `src/Services/bravoTALENTS/Candidate.Application/Candidates/Queries/GetCandidateSearchResults/GetCandidateSearchResultsQuery.cs`
- **Controller**: `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs:L410-414`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs` |
| Backend | Query | `src/Services/bravoTALENTS/Candidate.Application/Candidates/Queries/GetCandidateSearchResults/GetCandidateSearchResultsQuery.cs` |
| Backend | Handler | `src/Services/bravoTALENTS/Candidate.Application/Candidates/Queries/GetCandidateSearchResults/GetCandidateSearchResultsQueryHandler.cs` |
| Backend | Repository | `src/Services/bravoTALENTS/Candidate.Infrastructure/Repositories/CandidateRepository.cs` |
| Frontend | Component | `src/WebV2/apps/talents-for-company/src/app/candidates/candidate-list/candidate-list.component.ts` |

<details>
<summary>Code Snippet: Search Controller Endpoint</summary>

```csharp
// File: CandidatesController.cs:410-414
[HttpGet("search")]
public async Task<IActionResult> Search(ApplicationSource applicationSource, string searchText)
{
    return Ok(await getCandidateSearchResultsQuery.ExecuteAsync(applicationSource, searchText, UserLogin));
}
```
</details>

---

#### TC-CM-006: Tag and Categorize Candidates

**Priority**: P2-Medium

**Preconditions**:
- Candidate exists
- User has `CanTagCandidates` permission
- Tag values are predefined or allow custom

**Test Steps** (Given-When-Then):

```gherkin
Given a recruiter viewing candidate "John"
When recruiter adds tags: ["Senior Dev", "Java Expert", "High Priority"]
Then system creates/updates tag records
  And tags appear in candidate profile
  And tags become filterable in candidate list
```

**Acceptance Criteria**:

- ✅ Add single tag to candidate
- ✅ Add multiple tags in bulk
- ✅ Remove tag from candidate
- ✅ Tags auto-suggest based on existing tags
- ✅ Case-insensitive tag matching (normalized)
- ✅ Tags appear in filter options once used
- ✅ Tag suggestion query for autocomplete
- ✅ Duplicate tags prevented (same tag twice)
- ❌ Tag with special chars (#$%) → Sanitized or rejected
- ❌ Tag exceeding length limit (> 50 chars) → Validation error

**Evidence**:

- **Command**: `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/AddCandidateTagCommand/AddCandidateTagCommand.cs`
- **Handler**: `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/AddCandidateTagCommand/AddCandidateTagCommandHandler.cs:L20-73`
- **Controller**: `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs:L499-504`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs` |
| Backend | Command | `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/AddCandidateTagCommand/AddCandidateTagCommand.cs` |
| Backend | Handler | `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/AddCandidateTagCommand/AddCandidateTagCommandHandler.cs` |
| Backend | Entity | `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Tag.cs` |
| Backend | Repository | `src/Services/bravoTALENTS/Candidate.Infrastructure/Repositories/TagRepository.cs` |
| Frontend | Component | `src/WebV2/apps/talents-for-company/src/app/candidates/candidate-detail/candidate-tags.component.ts` |

<details>
<summary>Code Snippet: AddCandidateTagCommandHandler Business Logic</summary>

```csharp
// File: AddCandidateTagCommandHandler.cs:20-73
public sealed class AddCandidateTagCommandHandler : IAddCandidateTagCommandHandler
{
    private readonly ICandidateRepository candidateRepository;
    private readonly ITagRepository tagRepository;

    public AddCandidateTagCommandHandler(ICandidateRepository candidateRepository, ITagRepository tagRepository)
    {
        this.candidateRepository = candidateRepository;
        this.tagRepository = tagRepository;
    }

    public async Task ExecuteAsync(AddCandidateTagCommand command, string organizationalUnitId)
    {
        command.EnsureApplicationLogicValid(
            must: command => command != null &&
                             command.CandidateId.IsNotNullOrEmpty() &&
                             organizationalUnitId.IsNotNullOrEmpty(),
            ErrorMessage.CannotAddCandidateTag);

        // Tag normalization: capitalize first letter
        var normalizedTag = command.Tag.ToLower();
        normalizedTag = normalizedTag[0].ToString().ToUpper().ConcatString(normalizedTag.AsSpan(1, normalizedTag.Length - 1));

        await InsertNewTagForOrganizationAsync(normalizedTag, command.CandidateId, organizationalUnitId);
        await InsertTagForCandidateAsync(normalizedTag, command.CandidateId);
    }

    private async Task InsertTagForCandidateAsync(string tagValue, string candidateId)
    {
        var candidate = await candidateRepository.GetCandidateByIdAsync(candidateId);

        // Prevent duplicate tags
        if (candidate.Tags.IndexOf(tagValue) == -1)
        {
            candidate.Tags.Add(tagValue);
            await candidateRepository.UpdateAsync(candidate);
        }
    }

    private async Task InsertNewTagForOrganizationAsync(
        string tagValue,
        string candidateId,
        string organizationalUnitId)
    {
        var existedTag = await tagRepository.GetTagByTagNameAsync(organizationalUnitId, tagValue);

        if (existedTag == null)
        {
            var tagModel = new Tag
            {
                Name = tagValue,
                OrganizationalUnitId = organizationalUnitId,
                CandidateIds = [ candidateId ]
            };

            await tagRepository.InsertTagAsync(tagModel);
        }
        else if (existedTag.CandidateIds.NotExist(id => id == candidateId))
            await tagRepository.InsertCandidateIdIntoTagAsync(organizationalUnitId, tagValue, candidateId);
    }
}
```
</details>

<details>
<summary>Code Snippet: Tag Controller Endpoints</summary>

```csharp
// File: CandidatesController.cs:499-525
[HttpPut("add-candidate-tag")]
public async Task AddCandidateTag([FromBody] AddCandidateTagCommand command)
{
    var organizationalUnitId = UserLogin.CurrentCompanyId();
    await addCandidateTagCommandHandler.ExecuteAsync(command, organizationalUnitId);
}

[HttpGet("get-tag-suggestion")]
public async Task<IActionResult> GetTagSuggestion([FromQuery] string tag)
{
    var organizationalUnitId = UserLogin.CurrentCompanyId();
    return Ok(await getTagSuggestionQuery.ExecuteAsync(tag, organizationalUnitId));
}

[HttpGet("load-tags")]
public async Task<IActionResult> LoadTags()
{
    var organizationalUnitId = UserLogin.CurrentCompanyId();
    return Ok(await getTagsQuery.ExecuteAsync(organizationalUnitId));
}

[HttpPut("remove-candidate-tag")]
public async Task RemoveCandidateTag([FromBody] RemoveCandidateTagCommand command)
{
    var organizationalUnitId = UserLogin.CurrentCompanyId();
    await removeCandidateTagCommandHandler.ExecuteAsync(command, organizationalUnitId);
}
```
</details>

---

#### TC-CM-007: Follow and Unfollow Candidates

**Priority**: P2-Medium

**Preconditions**:
- Candidate exists
- User authenticated
- User not already following (for follow case)

**Test Steps** (Given-When-Then):

```gherkin
Given a recruiter viewing candidate profile
When recruiter clicks "Follow" button
Then candidate added to recruiter's followed list
  And follow indicator shows in candidate list
  And recruiter receives notifications for candidate activities
```

**Evidence**:

- **Command**: `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/MarkCandidateAsFollowedCommand/`
- **Controller**: `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs:L226-246`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs` |
| Backend | Command | `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/MarkCandidateAsFollowedCommand/MarkCandidateAsFollowedCommand.cs` |
| Backend | Handler | `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/MarkCandidateAsFollowedCommand/MarkCandidateAsFollowedCommandHandler.cs` |
| Backend | Entity | `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Candidate.cs` |
| Frontend | Component | `src/WebV2/apps/talents-for-company/src/app/candidates/candidate-detail/candidate-detail.component.ts` |

<details>
<summary>Code Snippet: Follow/Unfollow Endpoints</summary>

```csharp
// File: CandidatesController.cs:226-246
[HttpPost("mark-candidate-as-followed")]
public async Task MarkCandidateAsFollowed(
    [FromBody] MarkCandidateAsFollowedCommand markCandidateAsFollowedCommand)
{
    var command = new MarkCandidateAsFollowedCommand
    {
        CandidateIds = markCandidateAsFollowedCommand?.CandidateIds
    };
    await markCandidateAsFollowedCommandHandler.ExecuteAsync(command, UserLogin);
}

[HttpPost("unmark-candidate-as-followed")]
public async Task UnMarkCandidateAsFollowed(
    [FromBody] UnmarkCandidateAsFollowedCommand unmarkCandidateAsFollowedCommand)
{
    var command = new UnmarkCandidateAsFollowedCommand
    {
        CandidateIds = unmarkCandidateAsFollowedCommand?.CandidateIds
    };
    await unmarkCandidateAsFollowedCommandHandler.ExecuteAsync(command, UserLogin);
}
```
</details>

---

## 3. Interview Management Test Specs

#### TC-IM-001: Schedule Interview Successfully

**Priority**: P0-Critical

**Preconditions**:
- Candidate and job exist
- Interviewers available
- Interview type defined
- User has scheduling permission
- Calendar integration ready (optional)

**Test Steps** (Given-When-Then):

```gherkin
Given a recruiter scheduling interview for "John Doe" for "Java Dev" job
When recruiter submits ScheduleInterviewCommand:
  - Interview Type: "Technical Round 1"
  - Date: 2026-01-15, Time: 14:00
  - Duration: 60 minutes
  - Interviewers: ["Alice", "Bob"]
  - Format: "1-on-1"
Then system:
  - Validates date is in future
  - Checks interviewer availability
  - Creates interview record
  - Sends calendar invites to interviewers
  - Notifies candidate of interview
```

**Acceptance Criteria**:

- ✅ Schedule interview with past interview types
- ✅ Support 1-on-1, Panel, Group formats
- ✅ Check interviewer availability (if integrated)
- ✅ Duration options: 30, 60, 90, 120 minutes
- ✅ Location: On-site with address OR Remote with meeting link
- ✅ Interview created in database with all details
- ✅ Calendar invites sent to interviewers (iCal format)
- ✅ Candidate receives interview invite email with meeting link
- ✅ Interview date/time stored with timezone
- ❌ Schedule in past date → Validation error
- ❌ Interviewer has conflict → Show error, suggest alternatives
- ❌ Duration > 480 minutes → Validation error (max 8 hours)

**Evidence**:

- **Command**: `src/Services/bravoTALENTS/Candidate.Application/Interviews/Interviews/Commands/ScheduleInterview/ScheduleInterviewCommand.cs:L1-31`
- **Controller**: `src/Services/bravoTALENTS/Candidate.Service/Controllers/Interviews/InterviewsController.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoTALENTS/Candidate.Service/Controllers/Interviews/InterviewsController.cs` |
| Backend | Command | `src/Services/bravoTALENTS/Candidate.Application/Interviews/Interviews/Commands/ScheduleInterview/ScheduleInterviewCommand.cs` |
| Backend | Handler | `src/Services/bravoTALENTS/Candidate.Application/Interviews/Interviews/Commands/ScheduleInterview/ScheduleInterviewCommandHandler.cs` |
| Backend | Entity | `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Interview.cs` |
| Backend | Repository | `src/Services/bravoTALENTS/Candidate.Infrastructure/Repositories/InterviewRepository.cs` |
| Frontend | Component | `src/WebV2/apps/talents-for-company/src/app/interviews/schedule-interview/schedule-interview.component.ts` |

<details>
<summary>Code Snippet: ScheduleInterviewCommand</summary>

```csharp
// File: ScheduleInterviewCommand.cs:1-31
public class ScheduleInterviewCommand
{
    public string CandidateId { get; set; }
    public string ApplicationId { get; set; }
    public string JobId { get; set; }
    public string JobTitle { get; set; }
    public DateTime FromTime { get; set; }
    public DateTime CreatedDate { get; set; }
    public IList<UpdateInterviewRequest> Interviews { get; set; } = [];
    public bool IsSentEmail { get; set; }
    public SendInterviewEmailRequest InterviewEmail { get; set; }
    public string ActivityHistoryData { get; set; }
    public string CurrentLink { get; set; }
    public int TimeZone { get; set; }
    public string TimeZoneName { get; set; }
    public string ApplicationExtId { get; set; }
    public bool SendToExternalCalendar { get; set; }
    public ExternalCalendarIntegration ExternalCalendarIntegration { get; set; }
}

public class ExternalCalendarIntegration
{
    public string LocationName { get; set; }
    public string LocationEmail { get; set; }
    public bool IsOnlineMeeting { get; set; }
}
```
</details>

---

## 3.5. Job Description Validation Test Specs

### Job Posting Content Validation

#### TC-JDV-001: Job Description Flexible HTML Format Validation [P0]

**Priority**: P0-Critical

**Objective**: Verify job description validation accepts various HTML formats from copy-paste sources

**Preconditions**:
- Job creation form is accessible
- User has job posting permission
- CKEditor is initialized

**Test Steps** (Given-When-Then):

```gherkin
Given a recruiter creating a job posting
When recruiter pastes content from Word/Google Docs containing:
  - Headings in <H2> tags
  - Description text in <DIV>, <SPAN>, <LI>, <P>, or <TD> tags
Then system validates content structure
  And accepts any text-bearing HTML container tags
  And does NOT show "Please enter description for your title" error
  And job can be published successfully
```

**Acceptance Criteria**:

- ✅ Content with `<P>` tags passes validation
- ✅ Content with `<DIV>` tags passes validation (common in Google Docs paste)
- ✅ Content with `<SPAN>` tags passes validation
- ✅ Content with `<LI>` tags (lists) passes validation
- ✅ Content with `<TD>` or `<TH>` tags (tables) passes validation
- ✅ Mixed format content (DIV + SPAN + P) passes validation
- ✅ At least one `<H2>` (heading) tag required
- ✅ At least one text-bearing container required after heading
- ✅ Empty tags ignored (whitespace-only content)
- ❌ No `<H2>` tags → Error: "Please add at least one heading format"
- ❌ No text containers → Error: "Please enter description for your title"
- ❌ Heading without following content → Error: "Please add at least one heading and content below it"

**Test Data**:

```html
<!-- Valid: Google Docs paste format (uses DIV) -->
<h2>Job Responsibilities</h2>
<div>Lead development team</div>
<div>Code reviews and mentoring</div>

<!-- Valid: Word paste format (uses SPAN) -->
<h2>Requirements</h2>
<span>5+ years Java experience</span>
<span>Strong communication skills</span>

<!-- Valid: List format -->
<h2>Benefits</h2>
<ul>
  <li>Health insurance</li>
  <li>Remote work options</li>
</ul>

<!-- Valid: Mixed formats -->
<h2>About the Role</h2>
<p>This is a senior position...</p>
<div>Key responsibilities include:</div>
<ul>
  <li>Team leadership</li>
  <li>Technical design</li>
</ul>

<!-- Invalid: No heading -->
<p>Just description without heading</p>

<!-- Invalid: Heading without content -->
<h2>Empty Section</h2>
<h2>Another Heading</h2>
```

**Edge Cases**:

| Scenario | Input | Expected | Notes |
|----------|-------|----------|-------|
| Plain text paste | No HTML tags, auto-wrapped by editor | Validation should still work | Depends on CKEditor behavior |
| Nested tags | `<div><span>Text</span></div>` | Success | Text content exists |
| Empty tags with spaces | `<p>   </p>` | Ignored | Whitespace-only treated as empty |
| Multiple headings | `<h2>A</h2><p>Text</p><h2>B</h2><p>Text2</p>` | Success | Multiple sections allowed |
| Table content | `<table><tr><td>Data</td></tr></table>` | Success | TD/TH are valid text containers |

**Evidence**:

- **Frontend Constants**: `src/Web/bravoTALENTSClient/src/app/jobs/constants/job-detail.constant.ts:4-10`
- **Frontend Validation Utils**: `src/Web/bravoTALENTSClient/src/app/jobs/services/jobs.utils.ts:18-55`
- **Frontend Component**: `src/Web/bravoTALENTSClient/src/app/shared/components/job-detail/job-detail.component.ts:1018-1035`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Frontend | Constants | `src/Web/bravoTALENTSClient/src/app/jobs/constants/job-detail.constant.ts` |
| Frontend | Validation Utils | `src/Web/bravoTALENTSClient/src/app/jobs/services/jobs.utils.ts` |
| Frontend | Component | `src/Web/bravoTALENTSClient/src/app/shared/components/job-detail/job-detail.component.ts` |
| Frontend | Template | `src/Web/bravoTALENTSClient/src/app/shared/components/job-detail/job-detail.component.html` |

<details>
<summary>Code Snippet: Acceptable Text Container Tags</summary>

```typescript
// File: job-detail.constant.ts:9-10
// Acceptable tags that can contain job description text content
export const JobDescriptionTextContentTags = ['P', 'DIV', 'SPAN', 'LI', 'TD', 'TH'];
```
</details>

<details>
<summary>Code Snippet: Flexible Validation Logic</summary>

```typescript
// File: jobs.utils.ts:18-29
/**
 * Checks if elements array has at least one element with any of the specified tag names
 * and contains meaningful text content (not just whitespace)
 */
public static elementsHasAtLeastOneOfTags(elements: Element[], tagNames: string[]): boolean {
    if (!elements || !tagNames || tagNames.length === 0) return false;

    return elements.some(element =>
        tagNames.includes(element.tagName) &&
        !StringHelper.isEmpty(element.textContent)
    );
}

// File: jobs.utils.ts:41-55
/**
 * Checks if after the first occurrence of tag1, there's at least one element
 * with any of the tag names from tagNames2 array
 */
public static elementsHasWrongTagsOrderFlexible(elements: Element[], tagName1: string, tagNames2: string[]): boolean {
    const tag1Index = elements.findIndex(node => node.tagName === tagName1);
    if (tag1Index < 0) return false;

    // Check if there's any tag from tagNames2 after tag1Index
    const hasAnyTag2 = elements.slice(tag1Index + 1).some(node =>
        tagNames2.includes(node.tagName) && !StringHelper.isEmpty(node.textContent)
    );

    return !hasAnyTag2;
}
```
</details>

<details>
<summary>Code Snippet: Component Validation Method</summary>

```typescript
// File: job-detail.component.ts:1018-1035
private getJobDescriptionErrors() {
    this.jobDescriptionErrors.noHeading = !JobsUtils.elementsHasAtLeastOneTag(this.jobDescriptionElements, JobDescriptionContentTagName.heading);

    // Check for any text content in common HTML containers (P, DIV, SPAN, LI, etc.)
    // This allows various paste formats to pass validation
    this.jobDescriptionErrors.noNormalText = !JobsUtils.elementsHasAtLeastOneOfTags(this.jobDescriptionElements, JobDescriptionTextContentTags);

    if (!this.jobDescriptionErrors.noHeading && !this.jobDescriptionErrors.noNormalText) {
        // Use flexible check that accepts any text-bearing element after heading
        this.jobDescriptionErrors.wrongHeadingAndNormalTextOrder = JobsUtils.elementsHasWrongTagsOrderFlexible(
            this.jobDescriptionElements,
            JobDescriptionContentTagName.heading,
            JobDescriptionTextContentTags
        );
    }

    this.jobDescriptionErrors.hasError = Object.values(this.jobDescriptionErrors).some((value: boolean) => value === true);
}
```
</details>

---

#### TC-JDV-002: Copy-Paste from External Sources [P1]

**Priority**: P1-High

**Objective**: Verify job description validation handles content from various external sources

**Preconditions**:
- Job creation form is accessible
- Various external content sources available (Word, Google Docs, Notion, etc.)
- User has job posting permission

**Test Steps** (Given-When-Then):

```gherkin
Given a recruiter creating job posting
When recruiter copies job ad content from:
  - Microsoft Word document
  - Google Docs
  - Notion page
  - Email body
  - Plain text editor
And pastes into job description field
Then CKEditor processes pasted content
  And system validates HTML structure
  And accepts content with proper headings and text
  And does NOT show false validation errors
```

**Acceptance Criteria**:

- ✅ Word doc paste → DIV/SPAN tags accepted
- ✅ Google Docs paste → DIV tags accepted
- ✅ Notion paste → various formatting accepted
- ✅ Email paste → P/DIV tags accepted
- ✅ Plain text paste → auto-wrapped by CKEditor, validated
- ✅ Content with bold/italic formatting → accepted
- ✅ Content with links → accepted
- ✅ Content with bullet lists → LI tags accepted
- ✅ Content with tables → TD/TH tags accepted
- ❌ Malformed HTML → sanitized by CKEditor, then validated

**Test Matrix**:

| Source | Primary Tags Used | Validation Result | Notes |
|--------|------------------|-------------------|-------|
| Microsoft Word | `DIV`, `SPAN`, `P` | ✅ Pass | Most common paste format |
| Google Docs | `DIV`, `SPAN` | ✅ Pass | Rarely uses P tags |
| Notion | `DIV`, `P` | ✅ Pass | Clean HTML |
| Gmail/Outlook | `DIV`, `P` | ✅ Pass | Email body format |
| Plain Text | Auto-wrapped by CKEditor | ✅ Pass | Editor creates P or DIV |
| Rich Text Editors | `P`, `DIV`, `SPAN` | ✅ Pass | Various combinations |

**Evidence**:

- **Frontend Validation**: `src/Web/bravoTALENTSClient/src/app/jobs/services/jobs.utils.ts:22-29`
- **Component Validation**: `src/Web/bravoTALENTSClient/src/app/shared/components/job-detail/job-detail.component.ts:1001-1016`

---

#### TC-JDV-003: Job Description Structure Validation Errors [P1]

**Priority**: P1-High

**Objective**: Verify proper error messages when job description structure is invalid

**Preconditions**:
- Job creation form is accessible
- User has job posting permission

**Test Steps** (Given-When-Then):

```gherkin
Given a recruiter creating job posting
When recruiter enters content with:
  Scenario A: No headings (H2), only text
  Scenario B: Headings but no text content
  Scenario C: Multiple headings with no content between them
Then system validates structure
  And shows specific error message for each scenario
  And prevents job publishing until fixed
```

**Acceptance Criteria**:

**Scenario A: No Headings**
- Content: `<p>Just description text</p>`
- Error: "Please add at least one heading format"
- Validation: `noHeading = true`

**Scenario B: No Text Content**
- Content: `<h2>Title</h2>`
- Error: "Please enter description for your title"
- Validation: `noNormalText = true`

**Scenario C: Wrong Order (Heading without following content)**
- Content: `<h2>Title 1</h2><h2>Title 2</h2>`
- Error: "Please add at least one heading and content below it"
- Validation: `wrongHeadingAndNormalTextOrder = true`

**Test Data**:

```typescript
// Scenario A: No headings
{
  html: '<p>Description without heading</p>',
  expectedError: 'noHeading',
  errorMessage: 'JOB_DESCRIPTION.ERRORS.AT_LEAST_ONE_HEADING_FORMAT'
}

// Scenario B: No content
{
  html: '<h2>Job Title</h2>',
  expectedError: 'noNormalText',
  errorMessage: 'JOB_DESCRIPTION.ERRORS.AT_LEAST_ONE_NORMAL_FORMAT'
}

// Scenario C: Wrong order
{
  html: '<h2>Section 1</h2><h2>Section 2</h2>',
  expectedError: 'wrongHeadingAndNormalTextOrder',
  errorMessage: 'JOB_DESCRIPTION.ERRORS.AT_LEAST_ONE_HEADING_AND_CONTENT'
}

// Valid: Proper structure
{
  html: '<h2>Responsibilities</h2><div>Lead team</div>',
  expectedError: null,
  isValid: true
}
```

**Evidence**:

- **Frontend Component**: `src/Web/bravoTALENTSClient/src/app/shared/components/job-detail/job-detail.component.ts:1018-1035`
- **Error Display Template**: `src/Web/bravoTALENTSClient/src/app/shared/components/job-detail/job-detail.component.html:43-59`
- **Translation Keys**: `src/Web/bravoTALENTSClient/src/assets/i18n/en.json:1832`

---

## 4. Offer Management Test Specs

#### TC-OM-001: Create Job Offer

**Priority**: P0-Critical

**Preconditions**:
- Candidate passed interviews
- Job still open
- Currency data available
- Offer templates configured
- User has offer creation permission

**Test Steps** (Given-When-Then):

```gherkin
Given a hiring manager for passed interview candidate "Jane"
When hiring manager submits CreateOfferCommand:
  - Candidate: "Jane Smith"
  - Job: "Senior Java Dev"
  - Salary: 100000 USD
  - Start Date: 2026-03-01
  - Expiration Date: 2026-02-01
Then system:
  - Validates all required fields
  - Calculates offer expiration period
  - Creates offer record in "Draft" status
  - Generates offer document
```

**Acceptance Criteria**:

- ✅ Create offer with: Candidate, Job, Salary, Currency, Start Date
- ✅ Optional: Benefits, Leave Allowance, Signing Bonus, Stock Options
- ✅ Expiration date defaults to 7 days from now (configurable)
- ✅ Offer starts in "Draft" status
- ✅ Offer document generated from template
- ✅ Manager and position info auto-populated
- ✅ Offer can be edited before sending
- ✅ Salary validation: Must be positive number
- ❌ Offer for rejected candidate → Validation error
- ❌ Offer with expiration < today → Validation error
- ❌ Currency not found → Validation error

**Evidence**:

- **Command**: `src/Services/bravoTALENTS/Candidate.Application/Offers/Commands/CreateOfferCommand/CreateOfferCommand.cs:L1-15`
- **Controller**: `src/Services/bravoTALENTS/Candidate.Service/Controllers/OffersController.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoTALENTS/Candidate.Service/Controllers/OffersController.cs` |
| Backend | Command | `src/Services/bravoTALENTS/Candidate.Application/Offers/Commands/CreateOfferCommand/CreateOfferCommand.cs` |
| Backend | Handler | `src/Services/bravoTALENTS/Candidate.Application/Offers/Commands/CreateOfferCommand/CreateOfferCommandHandler.cs` |
| Backend | Entity | `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Offer.cs` |
| Backend | Repository | `src/Services/bravoTALENTS/Candidate.Infrastructure/Repositories/OfferRepository.cs` |
| Frontend | Component | `src/WebV2/apps/talents-for-company/src/app/offers/create-offer/create-offer.component.ts` |

<details>
<summary>Code Snippet: CreateOfferCommand</summary>

```csharp
// File: CreateOfferCommand.cs:1-15
public class CreateOfferCommand
{
    public string CandidateId { get; set; }
    public string ApplicationId { get; set; }
    public string JobId { get; set; }
    public string ReportTo { get; set; }
    public string Position { get; set; }
    public decimal? Salary { get; set; }
    public string CurrencyId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime ExpirationDate { get; set; }
    public DateTime JoiningDate { get; set; }
}
```
</details>

---

## 5. Application Pipeline Test Specs

#### TC-AP-001: Move Application in Pipeline

**Priority**: P0-Critical

**Preconditions**:
- Application exists
- Pipeline defined for job
- Application current stage valid
- User has permission to move

**Test Steps** (Given-When-Then):

```gherkin
Given a recruiter viewing application "John Doe" for "Java Dev" job
When recruiter drags application from "Screening" to "Phone Interview" stage
Then system:
  - Validates stage transition allowed
  - Updates application's CurrentPipelineStage
  - Sends notification to assigned recruiter
  - Records transition in activity log
  - Updates dashboard metrics
```

**Acceptance Criteria**:

- ✅ Move application between pipeline stages via drag-drop or button
- ✅ Validate transition is allowed (no backward moves unless configured)
- ✅ Update application's current stage
- ✅ Timestamp stage transition
- ✅ Activity log shows: "Moved from X to Y on [Date] by [User]"
- ✅ Candidate notified of progress (if configured)
- ✅ Kanban board updates in real-time
- ✅ Bulk move: Select multiple applications and move all
- ❌ Move to invalid stage → Validation error
- ❌ Move without permission → 403 Forbidden

**Evidence**:

- **Command**: `src/Services/bravoTALENTS/Candidate.Application/ApplyPlatform/UseCaseCommands/MoveApplicationInPipelineCommand.cs:L22-158`
- **Controller**: `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs:L248-266`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs` |
| Backend | Command | `src/Services/bravoTALENTS/Candidate.Application/ApplyPlatform/UseCaseCommands/MoveApplicationInPipelineCommand.cs` |
| Backend | Handler | `src/Services/bravoTALENTS/Candidate.Application/ApplyPlatform/UseCaseCommands/MoveApplicationInPipelineCommand.cs` |
| Backend | Entity | `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Application.cs` |
| Backend | Repository | `src/Services/bravoTALENTS/Candidate.Infrastructure/Repositories/PipelineRepository.cs` |
| Frontend | Component | `src/WebV2/apps/talents-for-company/src/app/pipelines/pipeline-board/pipeline-board.component.ts` |

<details>
<summary>Code Snippet: MoveApplicationInPipelineCommand</summary>

```csharp
// File: MoveApplicationInPipelineCommand.cs:22-40
public sealed class MoveApplicationInPipelineCommand : PlatformCqrsCommand
{
    public string CandidateId { get; set; }
    public string ApplicationId { get; set; }
    public string PipelineStageId { get; set; }
    public int CustomerId { get; set; }
    public int ProductScope { get; set; }
    public DateTime? OfferDate { get; set; }
    public string TimeZone { get; set; }
    public string Culture { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(p => PipelineStageId.IsNotNullOrEmpty(), "PipelineStageId is required")
            .And(p => CandidateId.IsNotNullOrEmpty(), "CandidateId is required")
            .And(p => ApplicationId.IsNotNullOrEmpty(), "ApplicationId is required");
    }
}
```
</details>

<details>
<summary>Code Snippet: MoveApplicationInPipelineCommandHandler Validation</summary>

```csharp
// File: MoveApplicationInPipelineCommand.cs:77-92
protected override async Task<PlatformValidationResult<MoveApplicationInPipelineCommand>> ValidateRequestAsync(
    PlatformValidationResult<MoveApplicationInPipelineCommand> requestSelfValidation,
    CancellationToken cancellationToken
)
{
    return await requestSelfValidation.AndAsync(request =>
        candidateRepository
            .GetCandidateByIdAsync(request.CandidateId)
            .ThenValidateAsync(
                candidate =>
                    RequestContext.AvailableCompanyIds().Contains(candidate.OrganizationalUnitId)
                    && candidate.Applications.Any(x => x.Id == request.ApplicationId),
                ErrorMessage.CandidateNotFound
            )
    );
}
```
</details>

<details>
<summary>Code Snippet: Pipeline Move Handler Business Logic</summary>

```csharp
// File: MoveApplicationInPipelineCommand.cs:94-129
public override async Task HandleNoResult(MoveApplicationInPipelineCommand request, CancellationToken cancellationToken)
{
    var application = await candidateRepository
        .GetApplicationByIdAsync(request.CandidateId, request.ApplicationId)
        .EnsureFound(ErrorMessage.ApplicationNotFound);

    var originalApplication = application.DeepClone();
    var pipeline = await pipelineRepository
        .FirstOrDefaultAsync(
            x => RequestContext.AvailableCompanyIds().Contains(x.OrganizationalUnitId) && x.Stages.Any(m => m.Id == request.PipelineStageId),
            cancellationToken
        )
        .EnsureFound(ErrorMessage.PipelineNotFound)!;

    PipelineHelper.AddPipelineStageToApplication(application, pipeline, newPipelineStage: pipeline.FindPipelineStage(request.PipelineStageId));

    await candidateRepository
        .UpdateAsync(request.CandidateId, application)
        .ThenActionAsync(async () =>
            {
                var pipelineStageFrom = pipeline.FindPipelineStage(originalApplication.CurrentPipelineStage.PipelineStageId);
                var pipelineStageTo = pipeline.FindPipelineStage(request.PipelineStageId);
                var candidate = await candidateRepository.GetCandidateByIdAsync(request.CandidateId);

                await SendCandidateNewCandidateHiredEventBusMessage(
                    cancellationToken,
                    pipelineStageFrom,
                    pipelineStageTo,
                    candidate,
                    application,
                    request
                );
                await insightsIntegrationEventService.SyncCandidateAndApplicationsToInsights(logger, request.CandidateId);
            }
        );
}
```
</details>

<details>
<summary>Code Snippet: Controller Pipeline Move Endpoint</summary>

```csharp
// File: CandidatesController.cs:248-266
[HttpPost("{id}/applications/{applicationId}/move-in-pipeline")]
public async Task MoveApplicationInPipeline(
    string id,
    string applicationId,
    [FromBody] MoveApplicationInPipelineRequestModel query)
{
    var command = new MoveApplicationInPipelineCommand
    {
        PipelineStageId = query?.PipelineStageId,
        CandidateId = id,
        ApplicationId = applicationId,
        CustomerId = CustomerId,
        ProductScope = ProductScope,
        OfferDate = query?.OfferDate,
        TimeZone = query?.TimeZone,
        Culture = query?.Culture
    };
    await cqrs.SendCommand(command);
}
```
</details>

---

#### TC-AP-002: Reject Application with Email

**Priority**: P1-High

**Preconditions**:
- Application exists
- User has rejection permission
- Rejection email template configured

**Test Steps** (Given-When-Then):

```gherkin
Given a recruiter rejecting candidate "Jane" for "Dev" role
When recruiter clicks "Reject" and selects reason: "Not Qualified"
  And includes comment: "Good background but lacks specific tech"
Then system:
  - Validates application can be rejected
  - Marks application as IsRejected=true
  - Records rejection date and reason
  - Sends rejection email to candidate (if checked)
  - Updates application stage to "Rejected"
```

**Acceptance Criteria**:

- ✅ Reject application with reason
- ✅ Rejection reasons: NotQualified, ExperienceMismatch, SalaryMismatch, PositionFilled, Other
- ✅ Optional comment field
- ✅ Optional rejection email send
- ✅ RejectedDate and RejectReason recorded
- ✅ Application moves to "Rejected" stage
- ✅ Can undo rejection (RestoreApplication)
- ✅ Bulk reject: Select multiple and reject all with reason
- ✅ Rejection email customizable
- ❌ Reject already rejected application → Idempotent (no error)
- ❌ Reject without reason selected → Validation error?

**Test Data**:

```json
{
  "isRejected": true,
  "candidateId": "cand-222",
  "applicationId": "app-333",
  "recipients": "jane@example.com",
  "body": "Thank you for applying. We have decided not to proceed.",
  "subject": "Application Status Update",
  "isSendEmail": true,
  "rejectReason": "NotQualified",
  "rejectComment": "Good background but lacks specific tech",
  "companyName": "TechCorp",
  "isSendNotification": true
}
```

**Evidence**:

- **Command**: `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/RejectApplicationCommand/RejectApplicationCommand.cs:L1-21`
- **Controller**: `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs:L268-306`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs` |
| Backend | Command | `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/RejectApplicationCommand/RejectApplicationCommand.cs` |
| Backend | Handler | `src/Services/bravoTALENTS/Candidate.Application/Candidates/Commands/RejectApplicationCommand/RejectApplicationCommandHandler.cs` |
| Backend | Entity | `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Application.cs` |
| Backend | Repository | `src/Services/bravoTALENTS/Candidate.Infrastructure/Repositories/CandidateRepository.cs` |
| Frontend | Component | `src/WebV2/apps/talents-for-company/src/app/applications/reject-application/reject-application.component.ts` |

<details>
<summary>Code Snippet: RejectApplicationCommand</summary>

```csharp
// File: RejectApplicationCommand.cs:1-21
public class RejectApplicationCommand
{
    public bool IsRejected { get; set; }
    public string CandidateId { get; set; }
    public string ApplicationId { get; set; }
    public string Recipients { get; set; }
    public string Body { get; set; }
    public string Subject { get; set; }
    public bool IsSendEmail { get; set; }
    public string RejectReason { get; set; }
    public string RejectComment { get; set; }
    public string CompanyName { get; set; }
    public bool IsSendNotification { get; set; } = false;
    public IList<string> Ccs { get; set; } = [];
    public IList<string> Bccs { get; set; } = [];
    public List<IFormFile> Attachments { get; set; } = [];
}
```
</details>

<details>
<summary>Code Snippet: Controller Reject/Undo Endpoints</summary>

```csharp
// File: CandidatesController.cs:268-306
[HttpPost("{id}/applications/{applicationId}/reject")]
public async Task RejectApplication(
    string id,
    string applicationId,
    [FromForm] RejectApplicationRequestModel query)
{
    var command = new RejectApplicationCommand
    {
        IsRejected = true,
        ApplicationId = applicationId,
        CandidateId = id,
        IsSendEmail = query.IsSendEmail,
        IsSendNotification = query.IsSendNotification,
        Recipients = query.Recipients,
        Body = query.Body,
        Subject = query.Subject,
        RejectReason = query.RejectReason,
        RejectComment = query.RejectComment,
        Ccs = query.Ccs,
        Bccs = query.Bccs,
        CompanyName = query.CompanyName,
        Attachments = query.Attachments
    };
    await rejectApplicationCommandHandler.ExecuteAsync(command, UserLogin);
}

[HttpPost("{id}/applications/{applicationId}/undo-reject")]
public async Task UndoRejectApplication(string id, string applicationId, [FromForm] RejectApplicationCommand command)
{
    await rejectApplicationCommandHandler.ExecuteAsync(
        new RejectApplicationCommand
        {
            IsRejected = false,
            ApplicationId = applicationId,
            CandidateId = id,
            Attachments = command.Attachments
        },
        UserLogin);
}
```
</details>

---

## 7. Authorization & Permission Test Specs

#### TC-AUTH-002: Candidate Access Rights Management

**Priority**: P1-High

**Preconditions**:
- Candidates exist
- Multiple users with varying permissions
- User has permission to manage access rights

**Test Steps** (Given-When-Then):

```gherkin
Given a manager managing access for candidate "Jane"
When manager adds Recruiter "Bob" with permissions: [View, Edit]
Then system:
  - Grants Bob access to view Jane's profile
  - Allows Bob to edit Jane's CV
  - Prevents Bob from deleting Jane's record
  - Activity log shows: "Access granted to Bob by Manager"
```

**Acceptance Criteria**:

- ✅ Grant View permission (read-only access)
- ✅ Grant Edit permission (modify profile/CV)
- ✅ Grant Delete permission (rare, usually manager only)
- ✅ Grant Manage Pipeline permission
- ✅ Revoke individual permissions
- ✅ Revoke all access from user
- ✅ Bulk grant access: Select multiple candidates and grant to user
- ✅ Access rights show in candidate profile
- ❌ Granted user cannot grant to others (no cascading)
- ❌ Cannot grant higher permission than own level

**Evidence**:

- **Command**: `src/Services/bravoTALENTS/Candidate.Application/AccessRight/Commands/AddCandidateAccessRightCommand.cs`
- **Controller**: `src/Services/bravoTALENTS/Candidate.Service/Controllers/AccessRightController.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoTALENTS/Candidate.Service/Controllers/AccessRightController.cs` |
| Backend | Command | `src/Services/bravoTALENTS/Candidate.Application/AccessRight/Commands/AddCandidateAccessRightCommand.cs` |
| Backend | Handler | `src/Services/bravoTALENTS/Candidate.Application/AccessRight/Commands/AddCandidateAccessRightCommandHandler.cs` |
| Backend | Entity | `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/AccessRight.cs` |
| Backend | Repository | `src/Services/bravoTALENTS/Candidate.Infrastructure/Repositories/AccessRightRepository.cs` |
| Frontend | Component | `src/WebV2/apps/talents-for-company/src/app/candidates/access-rights/access-rights.component.ts` |

---

## Test Execution Summary

### Test Coverage by Module

| Module | Test Cases | Priority P0 | Priority P1 | Priority P2 |
|--------|-----------|-----------|-----------|-----------|
| Candidate Management | 8 | 1 | 5 | 2 |
| Job Management | 3 | 2 | 1 | 0 |
| Interview Management | 3 | 1 | 2 | 0 |
| **Job Description Validation** | **3** | **1** | **2** | **0** |
| Offer Management | 3 | 2 | 1 | 0 |
| Application Pipeline | 3 | 1 | 2 | 0 |
| Email Templates | 1 | 0 | 0 | 1 |
| Authorization | 2 | 1 | 1 | 0 |
| Integration | 3 | 1 | 2 | 0 |
| **TOTAL** | **29** | **10** | **16** | **3** |

### Critical Path Testing (P0 Priority)

1. **TC-CM-001** - Candidate creation (foundation)
2. **TC-JM-001** - Job creation (foundation)
3. **TC-JM-002** - Job publishing (enables applications)
4. **TC-IM-001** - Interview scheduling (interview process)
5. **TC-OM-001** - Offer creation (offer management)
6. **TC-OM-002** - Offer sending (candidate communication)
7. **TC-AP-001** - Pipeline movement (application tracking)
8. **TC-AUTH-001** - Permission controls (security)
9. **TC-INT-002** - Offer acceptance workflow (hiring completion)

### Recommended Test Execution Order

**Phase 1: Foundation (Day 1)**
- TC-CM-001, TC-CM-002 (Candidate creation/import)
- TC-JM-001 (Job creation)
- Verify database integrity

**Phase 2: Publishing & Applications (Day 2)**
- TC-JM-002 (Job publishing)
- TC-INT-001 (External application sync)
- Verify application creation

**Phase 3: Interview & Feedback (Day 3)**
- TC-IM-001, TC-IM-002 (Interview scheduling/cancellation)
- TC-IM-003 (Feedback recording)
- Verify interview workflow

**Phase 4: Offers & Hiring (Day 4)**
- TC-OM-001, TC-OM-002, TC-OM-003 (Offer lifecycle)
- TC-INT-002 (Offer acceptance workflow)
- Verify employee creation

**Phase 5: Pipeline & Permissions (Day 5)**
- TC-AP-001, TC-AP-002, TC-AP-003 (Pipeline management)
- TC-AUTH-001, TC-AUTH-002 (Authorization)
- Verify access control

**Phase 6: Supporting Features (Day 6)**
- TC-CM-003 through TC-CM-007 (Search, tags, follow)
- TC-CM-008 (Attachments)
- TC-ET-001 (Email templates)
- Load testing for search with large datasets

---

## References

- `docs/business-features/bravoTALENTS/README.md` - Feature documentation
- `src/Services/bravoTALENTS/Candidate.Application/` - Command/Query implementations
- `src/Services/bravoTALENTS/Candidate.Service/Controllers/` - API endpoints
- `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/` - Domain entities
- `docs/features/README.GoalManagementFeature.md:1957-2260` - Test spec format template

---

**Document Status**: Enhanced with Code Evidence
**Code Evidence Coverage**: P0 and P1 test cases
**Approval Required**: QA Lead, Product Manager
**Last Review**: 2026-02-06

---

## Notes

This enhanced test specification includes:
- ✅ Real file paths to Commands, Handlers, Controllers, Entities
- ✅ Line number references for precise code location
- ✅ Code snippets showing validation logic and business rules
- ✅ Evidence for all P0 (Critical) test cases
- ✅ Evidence for all P1 (High Priority) test cases
- ✅ **Related Files section** for easy navigation to implementation files
- ⚠️ P2/P3 test cases have file path references only (to conserve space)

All code evidence is extracted from actual codebase files in `src/Services/bravoTALENTS/` and `src/Web/bravoTALENTSClient/`.

### Recent Updates (2026-02-06)

**Added Section 3.5: Job Description Validation Test Specs**
- TC-JDV-001: Flexible HTML Format Validation [P0] — Validates job descriptions with various HTML container tags (DIV, SPAN, LI, TD, TH, P)
- TC-JDV-002: Copy-Paste from External Sources [P1] — Tests content pasted from Word, Google Docs, Notion, email
- TC-JDV-003: Structure Validation Errors [P1] — Verifies proper error messages for invalid structures

**Context**: Fixed bug where job description validation was too strict, rejecting valid content from Word/Google Docs that used DIV/SPAN tags instead of P tags. New validation accepts any text-bearing HTML containers.
