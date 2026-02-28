# bravoTALENTS - Recruitment & Applicant Tracking System (ATS)

> Comprehensive recruitment and talent management platform for enterprise hiring, candidate pipelines, interviews, offers, and employee onboarding.

---

## Module Overview

**bravoTALENTS** is a complete Applicant Tracking System (ATS) and recruitment management platform that enables organizations to:

- Post and manage job openings
- Build and manage candidate pipelines
- Track applications through recruitment stages
- Schedule and conduct interviews
- Manage job offers and acceptance
- Onboard new employees
- Manage email templates and communications
- Configure recruitment workflows and settings

**Architecture**: Modular microservices with dedicated domains for Candidates, Jobs, Employees, Interviews, Offers, Emails, Scheduling, Settings, and Talent Matching.

**Core Technologies**:
- Backend: .NET 8 microservices with CQRS pattern
- Frontend: Angular 12 (TypeScript)
- Database: SQL Server + MongoDB
- Messaging: RabbitMQ for cross-service events
- Cache: Redis for performance optimization

---

## Sub-Modules Architecture

```
bravoTALENTS Platform
├── Candidate Management (Candidate Service)
├── Job Management (Job Service)
├── Employee Management (Employee Service)
├── Interview Management (Candidate Service - Interviews)
├── Offer Management (Candidate Service - Offers)
├── Email Management (Email Service)
├── Schedule Management (Schedule Service)
├── Resource Management (Resource Service)
├── Talent Matching (Talent Service)
├── Settings & Configuration (Setting Service)
└── Common Services (Profile, Subscription)
```

---

## 1. Candidate Management Module

**Purpose**: Manage candidate profiles, applications, CVs, and candidate data throughout the recruitment lifecycle.

**Key Entities**: Candidate, Application, CV, Activity, Attachment, Tag, InterestProfile

**Controllers**: `CandidatesController`, `ActivitiesController`, `AttachmentsController`, `AccessRightController`

### 1.1 Create Candidate

**Description**: Add a new candidate to the system manually or through CV upload.

- **Backend API**: `POST /api/candidates/create`
- **Commands**:
  - `CreateSourcedCandidateCommand` - From external source
  - `CreateCandidateManualCommand` - Manual entry
- **Queries**: `CheckExistCandidateEmail` - Verify email uniqueness
- **Frontend Component**: `AddCandidateFormComponent`, `AddCandidatePanelComponent`
- **Key Fields**: Email, Full Name, Phone, Source, CVId, Tags
- **Business Workflow**:
  1. User opens "Add Candidate" form
  2. System validates email is unique
  3. User enters candidate details and CV information
  4. System saves candidate and creates initial application record
  5. Candidate appears in candidate list with status "New"

---

### 1.2 Search and Filter Candidates

**Description**: Search candidates by multiple criteria with advanced filtering and pagination.

- **Backend API**: `POST /api/candidates/search`
- **Commands**: None (read-only)
- **Queries**:
  - `GetCandidateSearchResultsQuery` - Full search with filters
  - `GetCandidateFiltersQuery` - Available filter options
  - `GetCandidateFilterDataQuery` - Filter data for UI
- **Frontend Component**: `CandidateListComponent`, `CandidateFilterPanelComponent`, `CandidateAdvancedFilterComponent`
- **Filter Criteria**: Name, Email, Phone, Tags, Source, Status, Date Range, Custom Fields
- **Business Workflow**:
  1. User navigates to Candidates list page
  2. System loads all candidates with default pagination
  3. User applies filters (name, tags, source, date range)
  4. System returns matching candidates
  5. User can sort by column or apply advanced filters
  6. System displays pagination controls for large result sets

---

### 1.3 View Candidate Profile

**Description**: Display complete candidate information including CV, activities, applications, and interactions.

- **Backend API**: `GET /api/candidates/{candidateId}`
- **Commands**: None (read-only)
- **Queries**:
  - `GetCandidateQuery` - Full candidate profile
  - `GetApplicationCvQuery` - CV for specific application
  - `GetInterestProfileQuery` - Candidate interest data
  - `GetSuitableJobCategoriesQuery` - Recommended jobs
- **Frontend Components**:
  - `CandidateProfileComponent` - Profile container
  - `CvContainerComponent` - CV display (Work Experience, Education, Certifications, Languages, Projects, References)
  - `ActivitiesComponent` - Timeline of interactions
  - `JobApplicationPanelComponent` - Applications overview
- **Business Workflow**:
  1. User clicks candidate name from list
  2. System loads full candidate profile
  3. User views CV sections (expandable)
  4. User sees activity timeline (applications, notes, communications)
  5. User views current applications and pipeline stage

---

### 1.4 Update Candidate Information

**Description**: Modify candidate basic info, CV details, and tags.

- **Backend API**:
  - `PUT /api/candidates/{candidateId}/basic-info`
  - `PUT /api/candidates/{candidateId}/cv-info`
- **Commands**:
  - `UpdateBasicCandidateInfoCommand` - Update basic fields
  - `UpdateCandidateCvInfoCommand` - Update CV sections
  - `CreateCandidateCvInfoCommand` - Add CV items
  - `DeleteCandidateCvInfoCommand` - Remove CV items
- **Frontend Components**: `CandidateFormComponent`, `CvContainerComponent` (with edit mode)
- **CV Sections**: WorkExperience, Education, Certification, Course, Language, Project, Reference, Skill
- **Business Workflow**:
  1. User opens candidate profile in edit mode
  2. User modifies candidate fields or CV sections
  3. System validates input data
  4. User saves changes
  5. System updates record and logs activity

---

### 1.5 Tag and Categorize Candidates

**Description**: Add and manage tags for candidate organization and segmentation.

- **Backend API**:
  - `POST /api/candidates/{candidateId}/tags`
  - `DELETE /api/candidates/{candidateId}/tags/{tagId}`
- **Commands**:
  - `AddCandidateTagCommand` - Add tag to candidate
  - `RemoveCandidateTagCommand` - Remove tag
- **Queries**:
  - `GetTagsQuery` - Available tags
  - `GetTagSuggestionQuery` - Tag suggestions based on patterns
- **Frontend Component**: Tag selection UI in candidate profile
- **Business Workflow**:
  1. User views candidate profile
  2. User selects or creates tags (e.g., "Senior Developer", "Referred", "High Priority")
  3. System adds tag to candidate
  4. Tags appear in candidate list and filters
  5. User can bulk tag candidates from list view

---

### 1.6 Mark Candidate as Followed

**Description**: Mark candidates for follow-up and track engagement.

- **Backend API**:
  - `POST /api/candidates/{candidateId}/follow`
  - `DELETE /api/candidates/{candidateId}/follow`
- **Commands**:
  - `MarkCandidateAsFollowedCommand`
  - `UnmarkCandidateAsFollowedCommand`
- **Frontend Component**: Follow button in profile
- **Business Workflow**:
  1. User views candidate profile
  2. User clicks "Follow" button
  3. Candidate is added to user's followed list
  4. System shows followed indicator in list view
  5. User receives notifications for followed candidates' activities

---

### 1.7 Manage CV Attachments

**Description**: Upload, view, and delete candidate CV files.

- **Backend API**:
  - `POST /api/candidates/attachments/upload`
  - `GET /api/candidates/attachments/{attachmentId}`
  - `DELETE /api/candidates/attachments/{attachmentId}`
- **Commands**:
  - `UploadFileCommand` - Upload CV file
  - `UpdateFileCommand` - Update file info
  - `RemoveAttachmentCommand` - Delete file
- **Queries**: `GetAttachmentQuery` - Retrieve file
- **Frontend Components**: `CvFileManagementComponent`, `AttachmentsController`
- **Supported Formats**: PDF, DOC, DOCX
- **Business Workflow**:
  1. User opens candidate profile
  2. User uploads CV file from device or selects from existing files
  3. System stores file and associates with candidate
  4. User can preview, download, or delete files
  5. System shows file list with upload dates

---

### 1.8 Import Candidates from File

**Description**: Bulk import multiple candidates from CSV/Excel file.

- **Backend API**: `POST /api/candidates/import`
- **Commands**: `ImportCandidateFromFileCommand`
- **Frontend Component**: `BulkUploadCvPanelComponent`
- **Supported Formats**: CSV, Excel
- **File Structure**: Email, Name, Phone, Source, Education, Experience
- **Business Workflow**:
  1. User opens "Bulk Upload" modal
  2. User selects Excel/CSV file with candidate data
  3. System validates file format and data
  4. System shows preview of candidates to import
  5. User confirms import
  6. System creates all candidates and shows results

---

### 1.9 Assign and Reassign Applications

**Description**: Assign candidate applications to recruiters or other team members.

- **Backend API**:
  - `POST /api/candidates/applications/assign`
  - `PUT /api/candidates/applications/reassign`
- **Commands**:
  - `AssignApplicationCommand` - Initial assignment
  - `ReassignApplicationCommand` - Change assignee
- **Frontend Component**: Assignment UI in application card
- **Business Workflow**:
  1. User views candidate application
  2. User selects recruiter to assign application
  3. System updates assignment
  4. Recruiter receives notification
  5. Recruiter can now manage the application

---

### 1.10 Manage Access Rights

**Description**: Control which recruiters can view/manage specific candidates or jobs.

- **Backend API**:
  - `POST /api/access-rights/candidates/add`
  - `DELETE /api/access-rights/candidates/remove`
- **Commands**:
  - `AddCandidateAccessRightCommand`
  - `RemoveCandidateAccessRightCommand`
- **Queries**: `GetCandidateAccessRightsQuery` - View current permissions
- **Frontend Component**: Access management in candidate profile or bulk operations
- **Permission Types**: View, Edit, Delete, Manage Pipeline
- **Business Workflow**:
  1. User (manager) opens candidate or job record
  2. User clicks "Manage Access"
  3. User selects team members to grant access
  4. System updates permissions
  5. Team members can now see/edit the record

---

## 2. Job Management Module

**Purpose**: Create, publish, and manage job openings across multiple boards and recruitment channels.

**Key Entities**: Job, JobVersion, JobStatus, JobType, Category, Location, PublishingPortal, SkillTaxonomy

**Controllers**: `JobsController`, `JobsForPortalController`, `OrganizationalUnitController`, `TemplatesController`, `CurrenciesController`

### 2.1 Create Job Opening

**Description**: Create a new job posting with comprehensive details, requirements, and qualifications.

- **Backend API**: `POST /api/jobs`
- **Commands**: `CreateJobCommand`
- **Queries**: `GetInfoForCreationJobQuery` - Required data for job form (categories, locations, etc.)
- **Frontend Components**: `JobFormComponent`, `JobDetailComponent`
- **Key Fields**:
  - Job Title, Description, Requirements, Benefits
  - Department/Org Unit, Job Category, Job Family, Position Level
  - Salary Range, Currency, Job Type (Full-time, Contract, etc.)
  - Locations, Working Arrangement
  - Required Skills, Education Level, Experience
  - Application Deadline, Start Date
- **Business Workflow**:
  1. Hiring manager clicks "Create Job Opening"
  2. System loads job creation form with available options
  3. User fills job details across tabs (general, requirements, qualifications, salary)
  4. System validates required fields
  5. Job is created in "Draft" status
  6. User can preview and then publish

---

### 2.2 Search and Filter Jobs

**Description**: Search jobs by title, department, status with filtering and pagination.

- **Backend API**: `POST /api/jobs/search`
- **Commands**: None (read-only)
- **Queries**: `GetJobsQuery` - List with filters and pagination
- **Frontend Component**: `JobListComponent`, `JobFilterComponent`
- **Filter Criteria**: Title, Department, Job Category, Status, Publishing Status, Date Range, Created By
- **Business Workflow**:
  1. User navigates to Jobs list
  2. System loads all jobs with default pagination
  3. User applies filters (status, department, category)
  4. System returns matching jobs
  5. User can sort by column or view job details

---

### 2.3 View Job Details

**Description**: Display complete job posting with details, requirements, current applications, and publishing status.

- **Backend API**: `GET /api/jobs/{jobId}`
- **Commands**: None (read-only)
- **Queries**: `GetJobQuery` - Full job details
- **Frontend Components**:
  - `JobDetailComponent` - Full job view
  - `JobApplicationCardComponent` - Applications section
  - `JobAnalyticsComponent` - Views and applications metrics
- **Business Workflow**:
  1. User clicks job title from list
  2. System loads full job details
  3. User views job description, requirements, qualifications
  4. User sees current applications count
  5. User views publishing status across portals

---

### 2.4 Edit Job Posting

**Description**: Modify job details, requirements, and job advertisement across posting platforms.

- **Backend API**:
  - `PUT /api/jobs/{jobId}`
  - `PUT /api/jobs/{jobId}/ad` - Edit job advertisement
- **Commands**:
  - `UpdateJobCommand` - Modify job details
  - `EditJobAdCommand` - Update job ad for publishers
- **Frontend Component**: `JobFormComponent` (edit mode)
- **Business Workflow**:
  1. User opens job details page
  2. User clicks "Edit" button
  3. System loads job form with current values
  4. User modifies fields and saves
  5. System updates job and may update published ads if already published
  6. System creates job version for audit trail

---

### 2.5 Publish Job Opening

**Description**: Publish job to internal portal and/or external job boards.

- **Backend API**: `POST /api/jobs/{jobId}/publish`
- **Commands**: `PublishJobCommand`
- **Queries**:
  - `GetPublishingPortalsQuery` - Available job boards
  - `GetSkillTaxonomiesQuery` - Skill data for job board mapping
- **Frontend Components**: `PublishJobDialogComponent`
- **Available Portals**: Internal Portal, ITviec, LinkedIn, Indeed, Job boards configured
- **Business Workflow**:
  1. User opens job details page
  2. User clicks "Publish" button
  3. System shows available publishing portals
  4. User selects portals for publishing
  5. System maps job skills to job board taxonomy
  6. Job is published and becomes visible on portals
  7. Applications can now be received

---

### 2.6 Change Job Status

**Description**: Update job status through its lifecycle (Draft -> Open -> Closed -> On Hold).

- **Backend API**: `PUT /api/jobs/{jobId}/status`
- **Commands**: `UpdateJobStatusCommand`
- **Frontend Component**: Status dropdown in job header
- **Available Statuses**:
  - Draft (not published)
  - Open (actively recruiting)
  - On Hold (paused recruitment)
  - Closed (no longer recruiting)
  - Filled (position filled)
- **Business Workflow**:
  1. User views job details
  2. User clicks status dropdown
  3. User selects new status
  4. System updates status
  5. If status is "Closed", system hides job from portals

---

### 2.7 Mark Job as Read

**Description**: Track which recruiters have viewed the job posting.

- **Backend API**: `POST /api/jobs/{jobId}/mark-as-read`
- **Commands**: `MarkJobAsReadCommand`
- **Frontend Component**: Automatic on job view
- **Business Workflow**:
  1. User opens job details page
  2. System automatically marks job as read
  3. Read indicator appears in list view

---

### 2.8 Toggle Job Follow

**Description**: Mark jobs for follow-up and tracking.

- **Backend API**:
  - `POST /api/jobs/{jobId}/follow`
  - `DELETE /api/jobs/{jobId}/follow`
- **Commands**: `ToggleFollowedCommand`
- **Frontend Component**: Follow button in job header
- **Business Workflow**:
  1. User opens job details page
  2. User clicks "Follow" button
  3. Job is added to user's followed jobs
  4. User sees followed indicator

---

## 3. Interview Management Module

**Purpose**: Schedule, manage, and track interviews with candidates throughout the interview process.

**Key Entities**: Interview, InterviewSchedule, InterviewType, Interviewer, InterviewFeedback, InterviewScore

**Controllers**: `InterviewsController`, `InterviewTypesController`, `OrganizationInterviewersController`

### 3.1 Create Interview

**Description**: Schedule a new interview with a candidate for a specific job application.

- **Backend API**: `POST /api/interviews`
- **Commands**: `CreateInterviewCommand`
- **Queries**:
  - `GetInterviewTypesQuery` - Available interview types
  - `GetAvailableInterviewersQuery` - Potential interviewers
- **Frontend Components**: `InterviewScheduleComponent`, `InterviewFormComponent`
- **Key Fields**:
  - Candidate ID, Job ID, Interview Type
  - Date, Time, Duration, Location (on-site/remote)
  - Interviewers, Interview Format (1-on-1, panel, group)
  - Meeting link (for remote), Notes
- **Business Workflow**:
  1. Recruiter views candidate application
  2. Recruiter clicks "Schedule Interview"
  3. System shows interview schedule form
  4. Recruiter selects interview type and interviewers
  5. Recruiter picks available date and time
  6. System creates interview and sends notifications
  7. Interviewers receive calendar invites

---

### 3.2 View Interview Schedule

**Description**: Display candidate's interview history and upcoming interviews.

- **Backend API**: `GET /api/interviews/candidates/{candidateId}`
- **Commands**: None (read-only)
- **Queries**: `GetCandidateInterviewsQuery` - Interview history
- **Frontend Component**: Interview timeline in candidate profile
- **Business Workflow**:
  1. User views candidate profile
  2. System shows interview section
  3. User sees past and upcoming interviews
  4. User can click interview to view details

---

### 3.3 Cancel Interview

**Description**: Cancel a scheduled interview and notify participants.

- **Backend API**: `DELETE /api/interviews/{interviewId}`
- **Commands**: `CancelInterviewScheduleCommand`
- **Frontend Component**: Cancel button in interview details
- **Business Workflow**:
  1. User views interview details
  2. User clicks "Cancel Interview"
  3. System removes from calendar
  4. All participants receive cancellation notice
  5. Candidate is notified

---

### 3.4 Record Interview Feedback

**Description**: Submit feedback and scoring after interview completion.

- **Backend API**: `POST /api/interviews/{interviewId}/feedback`
- **Commands**: `SubmitInterviewFeedbackCommand`
- **Frontend Components**: `InterviewFeedbackComponent`
- **Feedback Fields**:
  - Interviewer Rating (1-5 scale)
  - Technical Skills Rating
  - Communication Rating
  - Cultural Fit Rating
  - Overall Recommendation (Approve, Conditional, Reject)
  - Comments and Notes
- **Business Workflow**:
  1. Interviewer opens interview details after meeting
  2. Interviewer submits feedback and scores
  3. System saves feedback
  4. Recruiter can review all interview feedback
  5. Feedback influences hiring decision

---

### 3.5 Add Interview Participants

**Description**: Manage who will participate in an interview (interviewers, observers).

- **Backend API**: `POST /api/interviews/{interviewId}/interviewers`
- **Commands**: `AddInterviewerCommand`
- **Queries**: `GetOrganizationInterviewersQuery` - Available interviewers
- **Frontend Component**: Interviewer selection in form
- **Business Workflow**:
  1. User creates or edits interview
  2. User searches and selects interviewers
  3. System adds interviewers and sends invitations

---

## 4. Offer Management Module

**Purpose**: Create, send, and manage job offers to selected candidates.

**Key Entities**: Offer, OfferTemplate, OfferStatus, OfferHistory

**Controllers**: `OffersController`, `OfferEmailTemplatesController`, `CurrenciesController`

### 4.1 Create Job Offer

**Description**: Generate a formal job offer for a selected candidate with salary and benefits details.

- **Backend API**: `POST /api/offers`
- **Commands**: `CreateOfferCommand`
- **Queries**:
  - `GetCurrenciesQuery` - Available currencies
  - `GetOfferTemplatesQuery` - Template options
- **Frontend Components**: `OfferFormComponent`, `OfferDetailComponent`
- **Key Fields**:
  - Candidate ID, Job ID
  - Job Title, Department
  - Start Date, Contract Duration (if temporary)
  - Salary, Currency, Payment Frequency
  - Benefits (insurance, stock options, bonuses)
  - Leave Allowance, Work Schedule
  - Manager Name, Department
  - Offer Template (optional)
  - Notes for Internal Use
- **Business Workflow**:
  1. Hiring manager views candidate who passed interviews
  2. Manager clicks "Create Offer"
  3. System loads offer form with job details pre-filled
  4. Manager enters salary and benefits
  5. Manager selects offer template
  6. System generates offer document
  7. Manager reviews and sends to candidate

---

### 4.2 Send Offer to Candidate

**Description**: Send formal offer via email to candidate for acceptance or negotiation.

- **Backend API**: `POST /api/offers/{offerId}/send`
- **Commands**: `SendOfferCommand`, `CreateOfferEmailCommand`
- **Queries**: `GetOfferEmailTemplateQuery` - Email template
- **Frontend Component**: "Send Offer" button in offer details
- **Email Template**: Offer details, acceptance deadline, contact information
- **Business Workflow**:
  1. Manager opens offer details
  2. Manager clicks "Send Offer"
  3. System prepares email with offer attachment
  4. Manager can customize email message
  5. System sends email to candidate
  6. Candidate receives offer with deadline
  7. System tracks email delivery status

---

### 4.3 Manage Offer Status

**Description**: Track offer lifecycle from creation through acceptance, rejection, or withdrawal.

- **Backend API**: `PUT /api/offers/{offerId}/status`
- **Commands**: `UpdateOfferStatusCommand`
- **Frontend Component**: Status dropdown in offer header
- **Offer Statuses**:
  - Draft (created, not sent)
  - Sent (sent to candidate)
  - Accepted (candidate accepted)
  - Rejected (candidate declined)
  - Withdrawn (company revoked)
  - Expired (deadline passed)
  - Negotiating (terms being discussed)
- **Business Workflow**:
  1. Manager sends offer to candidate
  2. System shows status as "Sent"
  3. Candidate opens email and reviews offer
  4. Candidate accepts or rejects in offer portal
  5. System updates status automatically
  6. Manager receives notification

---

### 4.4 Update Offer Terms

**Description**: Modify offer details before sending to candidate.

- **Backend API**: `PUT /api/offers/{offerId}`
- **Commands**: `UpdateOfferCommand`
- **Frontend Component**: Edit mode in offer form
- **Business Workflow**:
  1. Manager opens offer form
  2. Manager modifies salary, benefits, or start date
  3. System validates changes
  4. Manager saves offer
  5. System updates document

---

### 4.5 Create Offer Email Template

**Description**: Design custom email templates for sending offers to candidates.

- **Backend API**: `POST /api/offer-email-templates`
- **Commands**: `CreateOfferEmailTemplateCommand`
- **Queries**: `GetOfferEmailTemplatesQuery` - List templates
- **Frontend Component**: Template builder in settings
- **Template Variables**: {{candidateName}}, {{jobTitle}}, {{startDate}}, {{salary}}, {{acceptanceDeadline}}
- **Business Workflow**:
  1. Admin opens email template settings
  2. Admin creates new template
  3. Admin customizes email content
  4. Admin adds template variables
  5. Admin saves template
  6. Managers can select template when sending offers

---

## 5. Application Pipeline Management

**Purpose**: Manage candidate applications through recruitment stages and move candidates in pipeline.

**Key Entities**: Application, CurrentPipelineStage, Pipeline, PipelineStage, StageType

**Controllers**: `ManagementController`, `CandidatesController`

### 5.1 Move Application in Pipeline

**Description**: Progress candidate applications through recruitment stages.

- **Backend API**: `POST /api/applications/pipeline/move`
- **Commands**: `MoveApplicationInPipelineCommand`
- **Queries**: `GetPipelineStagesQuery` - Available stages for job
- **Frontend Component**: Kanban board, drag-and-drop in pipeline view
- **Pipeline Stages**:
  - Applied (initial stage)
  - Screening (CV review)
  - Phone Interview
  - First Interview
  - Second Interview
  - Final Interview
  - Offer Approved (ready for offer)
  - Offer Extended
  - Rejected
- **Business Workflow**:
  1. Recruiter views job pipeline (Kanban board)
  2. Recruiter reviews candidate application
  3. Recruiter moves candidate card to next stage
  4. System updates application stage
  5. Candidate receives notification of progress

---

### 5.2 Reject Application

**Description**: Reject a candidate's application and optionally send rejection email.

- **Backend API**: `POST /api/applications/reject`
- **Commands**: `RejectApplicationCommand`, `SendRejectionEmailCommand`
- **Queries**: `GetCandidatesToSendRejectionEmailQuery` - Candidates for bulk rejection
- **Frontend Component**: "Reject" button in application card
- **Rejection Types**:
  - Not Qualified
  - Experience Not Matching
  - Salary Expectation Mismatch
  - Position Filled
  - Other
- **Business Workflow**:
  1. Recruiter reviews application
  2. Recruiter clicks "Reject"
  3. System shows rejection reason options
  4. Recruiter selects reason and adds note
  5. Recruiter can send rejection email to candidate
  6. System sends email notification
  7. Application moves to "Rejected" stage

---

### 5.3 Set Invitation Date

**Description**: Schedule candidate interview invitation for a specific date.

- **Backend API**: `POST /api/applications/invitation-date`
- **Commands**: `SetInvitationDateCommand`
- **Frontend Component**: Date picker in application actions
- **Business Workflow**:
  1. Recruiter reviews application ready for interview
  2. Recruiter clicks "Set Invitation Date"
  3. Recruiter selects interview date
  4. System saves planned date
  5. System shows reminder on scheduled date

---

## 6. Employee Management Module

**Purpose**: Manage employee records, onboarding, profiles, and organizational structure.

**Key Entities**: Employee, PendingEmployee, OrganizationalUnit, User, CompanySettings

**Controllers**: `EmployeeController`, `PendingEmployeeController`, `UserController`, `OrganizationalUnitsController`

### 6.1 Create Employee Record

**Description**: Create employee profile for newly hired candidate or manual employee entry.

- **Backend API**: `POST /api/employees`
- **Commands**: `CreateEmployeeCommand`
- **Queries**: `GetOrganizationalUnitsQuery` - Department options
- **Frontend Components**: `EmployeeFormComponent`
- **Key Fields**:
  - Employee ID (auto-generated or manual)
  - Full Name, Email, Phone
  - Department/Org Unit, Manager
  - Job Title, Job Position, Job Category
  - Start Date, Employment Type
  - Salary Grade, Cost Center
  - Office Location, Office Address
  - Manager Assignment
- **Business Workflow**:
  1. HR admin opens employee creation form
  2. HR admin enters employee basic information
  3. System assigns employee ID
  4. HR admin assigns department and manager
  5. System sends invitation email
  6. Employee receives welcome communication
  7. Employee completes onboarding

---

### 6.2 Search and Filter Employees

**Description**: Search and filter employees by department, status, manager, job title.

- **Backend API**: `POST /api/employees/search`
- **Commands**: None (read-only)
- **Queries**: `GetEmployeesQuery` - List with filters
- **Frontend Component**: `EmployeeListComponent`
- **Filter Criteria**: Name, Email, Department, Manager, Job Title, Status (Active/Inactive), Hire Date
- **Business Workflow**:
  1. HR manager opens employee list
  2. System loads all employees
  3. HR manager applies filters (by department or manager)
  4. System returns filtered employees
  5. HR manager can export list

---

### 6.3 View Employee Profile

**Description**: Display complete employee information including personal data, employment history, and records.

- **Backend API**: `GET /api/employees/{employeeId}`
- **Commands**: None (read-only)
- **Queries**:
  - `GetEmployeeQuery` - Full employee profile
  - `GetEmployeeRecordsQuery` - Salary, allowance, contract records
- **Frontend Components**:
  - `EmployeeProfileComponent` - Personal info
  - `EmployeeRecordsComponent` - Salary, contract, bonuses
  - `EmployeeAttachmentsComponent` - Documents
- **Business Workflow**:
  1. HR manager clicks employee name
  2. System loads employee profile
  3. User views personal information
  4. User can see employment records (salary, contracts, bonuses)
  5. User can view attached documents

---

### 6.4 Update Employee Information

**Description**: Modify employee personal data, job assignment, and organizational details.

- **Backend API**: `PUT /api/employees/{employeeId}`
- **Commands**: `UpdateEmployeeCommand`
- **Frontend Component**: `EmployeeFormComponent` (edit mode)
- **Business Workflow**:
  1. HR manager opens employee profile
  2. HR manager clicks "Edit"
  3. HR manager updates employee fields
  4. System validates changes
  5. HR manager saves changes
  6. System updates record and logs change

---

### 6.5 Import Employees

**Description**: Bulk import employee records from CSV/Excel file.

- **Backend API**: `POST /api/employees/import`
- **Commands**: `ImportEmployeesCommand`
- **Frontend Component**: File upload in employee settings
- **File Format**: Email, Name, Department, Manager, StartDate, JobTitle
- **Business Workflow**:
  1. HR admin selects Excel/CSV file
  2. System validates file
  3. System shows preview
  4. HR admin confirms import
  5. System creates all employee records

---

### 6.6 Manage Pending Employees

**Description**: Track and manage employees awaiting profile completion or invitation acceptance.

- **Backend API**: `GET /api/pending-employees`
- **Commands**: `RemovePendingInvitedCommand`
- **Queries**: `GetPendingEmployeesQuery` - List pending
- **Frontend Component**: `PendingEmployeeComponent`
- **Pending Statuses**: Invitation Sent, Awaiting Info, Profile Incomplete
- **Business Workflow**:
  1. HR manager views pending employees
  2. System shows employees awaiting action
  3. HR manager can resend invitations
  4. HR manager can remove pending records after deadline

---

### 6.7 Manage Organizational Units (Departments)

**Description**: Create and manage company organizational structure (departments, teams).

- **Backend API**: `GET /api/organizational-units`, `POST /api/organizational-units`
- **Commands**: `CreateOrganizationalUnitCommand`, `UpdateOrganizationalUnitCommand`
- **Queries**: `GetOrganizationalUnitsQuery` - List hierarchy
- **Frontend Component**: `OrganizationalUnitTreeComponent`
- **Key Fields**: Unit Name, Parent Unit, Manager, Location, Cost Center
- **Business Workflow**:
  1. HR manager opens organization structure view
  2. System displays hierarchical organization tree
  3. HR manager can add new department
  4. HR manager assigns manager to department
  5. System updates tree structure

---

## 7. Email Management Module

**Purpose**: Manage email templates, send communications, and track email delivery.

**Key Entities**: Email, EmailTemplate, EmailContent, Notification

**Controllers**: `EmailController`, `TemplatesController`, `NotificationsController`, `ContentsController`

### 7.1 Create Email Template

**Description**: Design email templates for candidate communications (offers, interviews, rejections).

- **Backend API**: `POST /api/email-templates`
- **Commands**: `CreateEmailTemplateCommand`
- **Queries**: `GetEmailTemplatesQuery` - List templates
- **Frontend Components**: `EmailTemplateBuilderComponent`, `TemplatesController`
- **Template Types**:
  - Offer Letter
  - Interview Invitation
  - Rejection Notice
  - Welcome Email
  - Reminder Notifications
  - Custom Templates
- **Template Variables**: {{candidateName}}, {{jobTitle}}, {{interviewDate}}, {{salaryOffer}}, {{managerName}}, {{startDate}}
- **Business Workflow**:
  1. Admin opens email template settings
  2. Admin creates new template
  3. Admin designs email content with variables
  4. Admin adds attachments (offer documents)
  5. Admin saves template
  6. Template available for use in workflows

---

### 7.2 Send Email to Candidate

**Description**: Send custom or template-based emails to candidates.

- **Backend API**: `POST /api/email/send-email`
- **Commands**: `SendEmailCommand`
- **Queries**: `GetEmailTemplatesQuery` - Template options
- **Frontend Component**: Email compose dialog
- **Email Types**: Manual send, template-based, with attachments
- **Business Workflow**:
  1. Recruiter opens candidate profile or application
  2. Recruiter clicks "Send Email"
  3. System shows email compose window
  4. Recruiter can select template or write custom message
  5. Recruiter adds attachments if needed
  6. System sends email and logs delivery

---

### 7.3 Manage Email Templates

**Description**: View, edit, activate/deactivate, and delete email templates.

- **Backend API**:
  - `PUT /api/email-templates/{templateId}`
  - `DELETE /api/email-templates/{templateId}`
- **Commands**:
  - `UpdateEmailTemplateCommand`
  - `DeleteEmailTemplateCommand`
  - `UpdateEmailTemplateStatusCommand` (activate/deactivate)
- **Frontend Component**: `TemplatesListComponent`, `TemplateEditorComponent`
- **Business Workflow**:
  1. Admin opens email templates list
  2. Admin selects template to edit
  3. Admin modifies content
  4. Admin saves changes
  5. Admin can toggle template active/inactive

---

### 7.4 Send Support Email

**Description**: Send technical support or administrative emails.

- **Backend API**: `POST /api/email/send-support-email`
- **Commands**: `SendSupportEmailCommand`
- **Frontend Component**: Support email form
- **Business Workflow**:
  1. User opens feedback form
  2. User submits issue or feedback
  3. System sends email to support team
  4. Support team receives email notification

---

## 8. Schedule & Calendar Management Module

**Purpose**: Manage candidate schedules, interview calendar, and appointment scheduling.

**Key Entities**: Schedule, ScheduleEntry, Appointment, CalendarBlock

**Controllers**: `ScheduleController`

### 8.1 Schedule Interview

**Description**: Schedule candidate interview with automatic calendar management.

- **Backend API**: `POST /api/schedule/interviews`
- **Commands**: `ScheduleInterviewCommand`
- **Queries**: `GetAvailableSlotQuery` - Check interviewer availability
- **Frontend Component**: Calendar view, schedule form
- **Calendar Integration**: iCal, Outlook, Google Calendar
- **Business Workflow**:
  1. Recruiter opens candidate application
  2. Recruiter clicks "Schedule Interview"
  3. System shows calendar with available slots
  4. Recruiter selects date and time
  5. System checks interviewer availability
  6. Recruiter adds interviewers from available pool
  7. System creates interview and sends calendar invites

---

### 8.2 View Interview Calendar

**Description**: Display interview schedule for recruiter or interviewer.

- **Backend API**: `GET /api/schedule/calendar`
- **Commands**: None (read-only)
- **Queries**: `GetCalendarQuery` - User's schedule
- **Frontend Component**: `CalendarViewComponent`, interview list view
- **Business Workflow**:
  1. User opens Calendar section
  2. System displays user's scheduled interviews
  3. User can view by day, week, or month
  4. User can see candidate and interviewer details
  5. User can reschedule or cancel from calendar

---

### 8.3 Create Quick Appointment

**Description**: Quickly create informal appointments or reminders.

- **Backend API**: `POST /api/schedule/quick-appointment`
- **Commands**: `CreateQuickAppointmentCommand`
- **Frontend Component**: Quick create dialog
- **Business Workflow**:
  1. User clicks quick appointment button
  2. User enters description and time
  3. System creates appointment
  4. User receives reminder notification

---

## 9. Settings & Configuration Module

**Purpose**: Configure system settings, user roles, permissions, and recruitment workflows.

**Key Entities**: CompanyClassFieldTemplate, JobBoardProviderConfiguration, OrganizationalUnit, FeatureToggle

**Controllers**: `CompanyClassFieldTemplateController`, `JobBoardProviderConfigurationController`

### 9.1 Configure Job Board Integration

**Description**: Set up connections to external job boards (ITviec, LinkedIn, Indeed, etc.).

- **Backend API**: `POST /api/settings/job-board-providers`
- **Commands**: `ConfigureJobBoardProviderCommand`
- **Queries**: `GetJobBoardProvidersQuery` - Available providers
- **Frontend Component**: Job board settings page
- **Configuration**: API keys, connection details, sync settings
- **Supported Providers**: ITviec, LinkedIn Recruiter, Indeed, CareerBuilder, Local Portals
- **Business Workflow**:
  1. Admin opens job board settings
  2. Admin selects provider to configure
  3. Admin enters API credentials
  4. Admin configures sync preferences
  5. Admin tests connection
  6. System starts syncing applications from provider

---

### 9.2 Manage Custom Fields

**Description**: Create and manage custom fields for candidates, employees, and jobs.

- **Backend API**: `POST /api/settings/custom-fields`
- **Commands**: `CreateCustomFieldCommand`
- **Queries**: `GetCustomFieldsQuery` - Available custom fields
- **Frontend Component**: Custom fields configuration page
- **Field Types**: Text, Number, Dropdown, Date, Checkbox, Multiple choice
- **Business Workflow**:
  1. Admin opens custom fields settings
  2. Admin creates new field (e.g., "University Name", "Interview Difficulty")
  3. Admin sets field type and options
  4. Admin makes field mandatory/optional
  5. Field becomes available in all related forms

---

### 9.3 Configure Email Settings

**Description**: Set up email providers, SMTP settings, and notification preferences.

- **Backend API**: `POST /api/settings/email-configuration`
- **Commands**: `ConfigureEmailSettingsCommand`
- **Queries**: `GetEmailSettingsQuery` - Current configuration
- **Frontend Component**: Email settings page
- **Configuration**: SMTP server, sender email, reply-to, notification triggers
- **Business Workflow**:
  1. Admin opens email settings
  2. Admin configures SMTP provider
  3. Admin enters sender email address
  4. Admin configures notification triggers
  5. System tests SMTP connection
  6. System starts sending emails

---

### 9.4 Configure Subscription Limits

**Description**: Set up free tier limitations and feature access for organizations.

- **Backend API**: `POST /api/settings/subscription`
- **Commands**: `ConfigureSubscriptionCommand`
- **Queries**: `GetSubscriptionLimitQuery` - Current limits
- **Frontend Component**: Subscription settings page
- **Limits**: Max candidates, max jobs, template usage, CV uploads
- **Business Workflow**:
  1. Account manager opens subscription settings
  2. Account manager sets candidate limit
  3. Account manager sets job posting limit
  4. Account manager enables/disables features
  5. System enforces limits in application

---

## 10. Talent Matching & Insights Module

**Purpose**: Match candidates to jobs and provide recruitment analytics.

**Key Entities**: TalentMatch, MatchScore, MatchReason

**Controllers**: `TalentsController`, `JobMatchingController`

### 10.1 Match Candidates to Jobs

**Description**: Use AI-based matching to recommend candidate-job pairs.

- **Backend API**: `POST /api/talents/match`
- **Commands**: None (query-based)
- **Queries**: `GetCandidateJobMatchesQuery` - Get matches for candidate
- **Frontend Component**: Matching recommendations panel
- **Match Criteria**:
  - Skill match percentage
  - Experience level match
  - Salary range compatibility
  - Location match
  - Education match
  - Job category match
- **Business Workflow**:
  1. Recruiter opens candidate profile
  2. System automatically shows matching job opportunities
  3. Recruiter can view match scores and reasons
  4. Recruiter can assign candidate to matching job
  5. System suggests as strong candidate

---

### 10.2 View Match Analysis

**Description**: Detailed analysis of why candidate and job match or don't match.

- **Backend API**: `GET /api/talents/{candidateId}/matches/{jobId}/analysis`
- **Commands**: None (read-only)
- **Queries**: `GetMatchAnalysisQuery` - Detailed match reasoning
- **Frontend Component**: Match analysis panel
- **Analysis Shows**:
  - Matching criteria with scores
  - Missing qualifications
  - Exceeding qualifications
  - Salary alignment
  - Recommendations for interviewer questions
- **Business Workflow**:
  1. Recruiter views candidate/job match
  2. System shows match score and details
  3. Recruiter sees pros and cons
  4. Recruiter makes informed decision on pursuing candidate

---

## Cross-Module Workflows

### Recruitment Workflow: From Job to Hire

```
1. Create Job Opening
   ↓
2. Publish to Job Boards
   ↓
3. Receive Applications / Add Candidates Manually
   ↓
4. Screen Applications (Filter, Tag, Rate)
   ↓
5. Schedule Interviews
   ↓
6. Conduct Interviews & Record Feedback
   ↓
7. Review Feedback (Multi-level Review)
   ↓
8. Create & Send Job Offer
   ↓
9. Receive Acceptance
   ↓
10. Create Employee Record
    ↓
11. Initiate Onboarding (bravoGROWTH integration)
```

### Application Lifecycle

```
Applied → Screening → Phone Interview → 1st Interview → 2nd Interview → Offer → Accepted → Hired
                   ↓                      ↓                ↓              ↓
                 Rejected            Rejected         Rejected    Offer Rejected
```

### Data Sync Between Services

```
bravoTALENTS (Job, Candidate)
    ↓ (When offer accepted)
    → Accounts (Create Employee user)
    ↓
    → bravoGROWTH (Create employee record, assign OKRs)
    ↓
    → bravoSURVEYS (Add to survey groups)
```

---

## User Roles & Permissions

### Recruiter Role
- **Access**: Candidate Management, Job Management, Interview Scheduling
- **Permissions**:
  - Create/Edit/View Candidates
  - Create/Edit/View/Publish Jobs
  - Schedule Interviews
  - Create Offers
  - View all candidates and jobs
  - Manage pipeline stages

### HR Manager Role
- **Access**: All Recruiter access + Employee Management
- **Permissions**:
  - All Recruiter permissions
  - Create/Edit/View Employees
  - Configure organizational units
  - Manage custom fields
  - View company-wide analytics
  - Approve offers

### Hiring Manager Role
- **Access**: Job Management, Offer Management, Limited Candidate Access
- **Permissions**:
  - View jobs in their department
  - View applications for their jobs
  - Create/Send offers
  - Approve candidates for next stage
  - View interview feedback
  - Limited to their department candidates

### Admin Role
- **Access**: Full system access
- **Permissions**:
  - All user permissions
  - Configure job board integrations
  - Manage email templates
  - Manage system settings
  - View audit logs
  - Configure access rights

### Candidate Portal Role
- **Access**: Job Postings, Application Status
- **Permissions**:
  - Browse available jobs
  - Submit applications
  - View application status
  - Upload CV
  - Receive and respond to offers
  - Cannot see other candidates

---

## Backend Architecture

### Service Structure
```
Candidate.Service/
  ├── Controllers/
  │   ├── CandidatesController
  │   ├── Interviews/
  │   │   ├── InterviewsController
  │   │   └── InterviewTypesController
  │   ├── Offers/
  │   │   └── OffersController
  │   └── ActivitiesController
  ├── Application/
  │   ├── UseCaseCommands/
  │   │   ├── Candidates/
  │   │   ├── Interviews/
  │   │   └── Offers/
  │   └── UseCaseQueries/
  └── Domain/
      ├── AggregatesModel/
      └── Repositories/

Employee.Service/
  ├── Controllers/
  │   ├── EmployeeController
  │   └── OrganizationalUnitsController
  ├── Application/
  │   ├── UseCaseCommands/
  │   └── UseCaseQueries/
  └── Domain/

Job.Service/
  ├── Controllers/
  │   └── JobsController
  ├── Application/
  │   ├── UseCaseCommands/
  │   └── UseCaseQueries/
  └── Domain/

Email.Service/
  ├── Controllers/
  │   ├── EmailController
  │   └── TemplatesController
  └── Application/

Setting.Service/
  ├── Controllers/
  │   └── ConfigurationControllers
  └── Application/
```

### CQRS Pattern
- **Commands**: CreateCandidateCommand, UpdateCandidateCommand, CreateOfferCommand
- **Queries**: GetCandidatesQuery, GetJobsQuery, GetCandidateMatchesQuery
- **Command Handlers**: Business logic implementation
- **Query Handlers**: Read operations

### Database Models
- **Candidate**: Candidate, Application, CV, Activity, Tag, Attachment
- **Job**: Job, JobVersion, JobStatus, Publish Portal
- **Employee**: Employee, OrganizationalUnit, User
- **Interview**: Interview, InterviewType, Feedback, Score
- **Offer**: Offer, OfferTemplate, OfferHistory

---

## Frontend Architecture

### Component Structure
```
app/
├── candidates/
│   ├── pages/
│   │   ├── candidate-list.page
│   │   ├── candidate-detail.page
│   │   └── candidate-pipeline.page
│   ├── components/
│   │   ├── candidate-form.component
│   │   ├── cv-container.component
│   │   ├── candidate-list.component
│   │   └── profile-container.component
│   ├── services/
│   │   └── candidate.service
│   └── _store/
│       └── candidate.store

├── jobs/
│   ├── pages/
│   │   ├── job-list.page
│   │   └── job-detail.page
│   ├── components/
│   │   └── job-form.component
│   ├── services/
│   │   └── job.service
│   └── _store/

├── interviews/
│   ├── pages/
│   │   └── interview-list.page
│   ├── components/
│   │   └── interview-schedule.component
│   └── services/

├── offers/
│   ├── pages/
│   ├── components/
│   │   └── offer-form.component
│   └── services/

└── shared/
    ├── components/
    │   └── reusable UI components
    ├── services/
    │   ├── api.service
    │   └── auth.service
    └── models/
        └── DTOs and interfaces
```

### State Management
- **Angular RxJS**: Observable patterns for reactive data flow
- **Services**: Centralized data services with caching
- **NgRx Store** (optional): Centralized state management for complex flows

### API Services
- `CandidateService`: Candidate CRUD and queries
- `JobService`: Job management operations
- `InterviewService`: Interview scheduling and feedback
- `OfferService`: Offer creation and management
- `EmployeeService`: Employee operations
- `EmailService`: Email sending and templates

---

## Integration Points

### With bravoGROWTH
- When candidate is hired (offer accepted), employee record created in bravoGROWTH
- Employee receives initial OKR assignment
- Manager assignment from bravoTALENTS transfers to bravoGROWTH

### With Accounts Service
- User creation when employee record created
- Multi-tenant data isolation
- User authentication and authorization

### With bravoSURVEYS
- New employees added to onboarding surveys
- Integration with employee lifecycle events

### With bravoINSIGHTS
- Recruitment metrics and analytics
- Time-to-hire metrics
- Application funnel analysis
- Recruiter performance metrics

---

## Common Use Cases

### Use Case 1: End-to-End Recruitment
1. Hiring manager creates job opening
2. Recruiter publishes to job boards
3. Candidates apply or are added manually
4. Candidates move through interview pipeline
5. Offer is created and sent
6. Upon acceptance, employee record created
7. Onboarding process initiated

### Use Case 2: Bulk Candidate Import
1. Recruiter prepares Excel with candidate list
2. Recruiter imports candidates using bulk upload
3. System creates candidate records
4. Candidates automatically tagged per source
5. Recruiter can review and assign to jobs

### Use Case 3: Interview Management
1. Application passes screening stage
2. Recruiter schedules interview
3. Interviewer receives calendar invitation
4. Interview meeting conducted
5. Interviewer submits feedback and score
6. Recruiter reviews and approves next stage
7. Candidate moves to next interview round

---

## Database Schema Overview

### Key Tables
- **Candidates**: Core candidate master data
- **Applications**: Job applications per candidate
- **Jobs**: Job postings
- **Interviews**: Interview records
- **Offers**: Offer details
- **Employees**: Employee master data
- **EmailTemplates**: Email template storage
- **CustomFields**: User-defined fields

### Relationships
- Candidate → Application → Job → Interview → Offer
- Employee → OrganizationalUnit → Manager
- Interview → InterviewType, Interviewer, Feedback

---

## Performance Considerations

### Caching Strategy
- **Job Listings**: 5-minute cache
- **Job Board Providers**: 1-hour cache
- **Email Templates**: 1-hour cache
- **Organizational Units**: 1-day cache
- **User Access Rights**: Session cache

### Search Optimization
- Full-text search index on candidate names, emails
- Job search indexed by title, category, department
- Interview search by date and participant

### Pagination
- Default page size: 20 records
- Maximum records: 10,000 (use export for larger sets)
- Sort by: Name, Date, Status

---

## Error Handling

### Common Errors
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: User not authenticated
- **403 Forbidden**: User lacks permission for resource
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Duplicate record (e.g., email already exists)
- **500 Server Error**: Unexpected system error

### Validation Rules
- **Candidate Email**: Must be unique and valid format
- **Job Title**: Required, max 200 characters
- **Offer Salary**: Must be positive number
- **Interview Date**: Must be future date
- **Application Status**: Must be valid stage in job's pipeline

---

## Audit & Compliance

### Tracking
- All record changes logged with timestamp and user
- Activity timeline on candidate/employee records
- Email delivery status tracked
- Offer acceptance/rejection logged
- Interview feedback audit trail

### Retention
- Candidate data: 7 years (per employment law)
- Interview feedback: 3 years
- Rejected application data: 1 year
- Email logs: 6 months

---

## Document Metadata

| Property | Value |
|----------|-------|
| Module | bravoTALENTS |
| Version | 2.0 |
| Last Updated | 2025-12-30 |
| Status | Complete |
| Created By | Documentation System |
| Reviewed By | Architecture Team |

---

## Related Documentation

- [bravoGROWTH Documentation](../bravoGROWTH/README.md)
- [bravoSURVEYS Documentation](../bravoSURVEYS/README.md)
- [System Architecture](../../claude/architecture.md)
- [Backend Patterns](../../claude/backend-patterns.md)
- [Frontend Patterns](../../claude/frontend-patterns.md)

---

*Last Updated: 2025-12-30*
*Version: 2.0 - Enterprise Release*
*For bravoSUITE v2.0 - HR & Talent Management Platform*
