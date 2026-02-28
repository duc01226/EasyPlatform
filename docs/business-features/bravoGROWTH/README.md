# bravoGROWTH - Performance & OKR Management

## Overview

bravoGROWTH is a comprehensive performance management and organizational development module within the BravoSUITE platform. It provides integrated tools for managing employee goals (OKRs), conducting check-ins, running performance reviews, managing time and attendance, and handling leave requests. The module supports both individual contributor and management workflows, enabling data-driven conversations around employee development and organizational performance.

**Key Capabilities:**
- Objective and Key Result (OKR) management with alignment tracking
- Regular check-in meetings between managers and employees
- 360-degree performance review cycles with multi-rater feedback
- Time and attendance management with timesheet tracking
- Leave and attendance request management
- Organization and team dashboards for performance visibility
- Customizable form templates for performance assessments

---

## Architecture

### Backend Services
- **Service:** `Growth.Service` (.NET 8)
- **API Route:** `/api/[Controller]`
- **Authentication:** Company Role Authorization Policies
- **Subscription Gating:** Feature-level subscription policies

### Frontend Applications
- **Company Dashboard:** `growth-for-company` (Angular 19)
- **Employee Portal:** `employee` (Angular 19)
- **Shared Library:** `bravo-domain` (domain models and API services)

### Technology Stack
- **Backend:** C# / .NET 8, Entity Framework Core, CQRS pattern
- **Frontend:** Angular 19, Reactive Forms, State Management
- **Database:** SQL Server, MongoDB (for audit logs)
- **Messaging:** RabbitMQ (for cross-service events)

---

## Sub-Modules & Feature Architecture

### 1. Goal Management (OKR)

**Description:** Comprehensive goal and key result management system enabling employees and managers to set, track, and align organizational goals with individual development objectives.

**Domain Entities:**
- `Goal` - Main goal aggregate with title, description, measurement, target value
- `GoalEmployee` - Goal ownership and assignment
- `GoalCheckIn` - Connection between goals and check-in discussions
- `GoalPerformanceReviewParticipant` - Goal assessment in performance reviews

**Controllers & Endpoints:**
- `GoalController` - POST `api/goal`, GET `api/goal/by-id`, POST `api/goal/update-goal-current-value`, GET `api/goal/get-goal-list`, POST `api/goal/delete`

#### Features

##### 1.1 Create/Edit Goal
- **Description:** Allows users to create new goals with key results, measurement criteria, and target values. Goals can be personal, team, or organizational level.
- **Backend API:** `POST /api/goal`
- **Commands:** `SaveGoalCommand`
- **Queries:** `GetGoalDetailByIdQuery`
- **Frontend:** Goals module with form-based goal creation/editing
- **Workflow:**
  1. User navigates to Goals > Create New Goal
  2. Fills in goal title, description, measurement unit, target value, and timeline
  3. Optionally aligns goal with parent goals (hierarchy)
  4. Sets visibility (private, team, organizational)
  5. System validates goal uniqueness and saves with audit trail

##### 1.2 View Goal List
- **Description:** Displays all goals assigned to or created by the current user, with filtering by status, date range, and alignment.
- **Backend API:** `GET /api/goal/get-goal-list`
- **Queries:** `GetGoalListQuery`, `GetCurrentEmployeeGoalsQueryResult`
- **Frontend:** GoalOverviewComponent with list view and filtering
- **Workflow:**
  1. User opens Goals dashboard
  2. System retrieves all accessible goals for current user
  3. User applies filters (status, date, team, alignment)
  4. Displays goals in table with progress indicators
  5. User can drill down to goal detail or take actions (edit, update progress)

##### 1.3 Update Goal Progress
- **Description:** Employees and managers update the current measurement value of goals to track progress toward objectives.
- **Backend API:** `POST /api/goal/update-goal-current-value`
- **Commands:** `UpdateGoalCurrentValueMeasurementCommand`
- **Frontend:** Inline progress update or modal form
- **Workflow:**
  1. User views goal detail
  2. Enters current value/progress metric
  3. System validates value is within measurement scale
  4. Saves update with timestamp and creates audit event
  5. Triggers notifications to goal stakeholders

##### 1.4 Goal Visibility & Sharing
- **Description:** Control who can view and discuss specific goals (owner, team members, organization, all employees).
- **Backend API:** `GET /api/goal/goal-visibilities`, `GET /api/goal/goal-owners`
- **Queries:** `GetGoalVisibilityQuery`, `GetGoalOwnerQuery`
- **Frontend:** Goal sharing dialog with granular permission controls
- **Workflow:**
  1. User opens goal settings
  2. Selects visibility level (private, team, org unit, everyone)
  3. Optionally designates additional goal owners/reviewers
  4. System applies access control to all subsequent queries
  5. Restricted users cannot view private goals

##### 1.5 Goal Dashboard & Reporting
- **Description:** Manager and HR dashboards showing goal performance across teams, departments, and organization.
- **Backend API:** `GET /api/goal/dashboard-summary`, `GET /api/goal/dashboard-table`, `GET /api/goal/dashboard-employee`
- **Queries:** `GetGoalDashboardSummaryQuery`, `GetGoalDashBoardTableQuery`, `GetGoalDashboardEmployeeQuery`
- **Frontend:** Dashboard components with charts, tables, and KPI cards
- **Workflow:**
  1. Manager opens Goals dashboard
  2. System aggregates goal completion metrics by team/org unit
  3. Displays summary cards (total goals, on-track, at-risk, completed)
  4. Shows detailed table with drill-down capabilities
  5. Allows export and report generation

##### 1.6 Delete Goals
- **Description:** Remove goals that are no longer relevant or were created in error.
- **Backend API:** `POST /api/goal/delete`
- **Commands:** `DeleteGoalCommand`
- **Frontend:** Bulk delete with confirmation dialog
- **Workflow:**
  1. User selects goals to delete
  2. System validates goals can be deleted (not in active review)
  3. Shows confirmation with impact analysis
  4. Soft-deletes goal and associated records
  5. Logs deletion to audit trail

---

### 2. Check-In Management

**Description:** Structured regular meetings between employees and managers to discuss progress, challenges, and development. Check-ins serve as touchpoints separate from formal performance reviews.

**Domain Entities:**
- `CheckInEvent` - Individual check-in meeting instance
- `CheckInSeriesSetting` - Recurring check-in configuration (frequency, templates, discussion points)
- `DiscussionPoint` - Pre-defined or custom discussion topics for the check-in
- `CheckInEventDiscussionPoint` - Link between check-in and discussion topics

**Controllers & Endpoints:**
- `CheckInController` - POST `api/check-in`, GET `api/check-in/get-employee-list`, POST `api/check-in/partial-update`, GET `api/check-in`, GET `api/check-in/{id}`, POST `api/check-in/update-status`, POST `api/check-in/update`, POST `api/check-in/delete`

#### Features

##### 2.1 Schedule Check-In Series
- **Description:** Create recurring check-in schedules with cadence (weekly, bi-weekly, monthly) and customizable settings.
- **Backend API:** `POST /api/checkin`
- **Commands:** `SaveCheckInCommand`
- **Frontend:** Check-in setup wizard with frequency, duration, and template selection
- **Workflow:**
  1. Manager navigates to Check-Ins > Schedule New
  2. Selects employee(s) to schedule check-ins with
  3. Chooses frequency (weekly/bi-weekly/monthly) and start date
  4. Selects check-in template (quick check-in or full discussion)
  5. Sets discussion points or custom agenda items
  6. System creates recurring check-in series and generates first event

##### 2.2 Create One-Time Check-In
- **Description:** Schedule ad-hoc check-ins outside of regular series for urgent discussions or follow-ups.
- **Backend API:** `POST /api/checkin`
- **Commands:** `SaveCheckInCommand`
- **Frontend:** Quick check-in creation form
- **Workflow:**
  1. User selects "Schedule Check-In"
  2. Chooses employee and meeting date/time
  3. Optionally selects template or adds agenda items
  4. System creates single check-in event
  5. Sends calendar invitation to both parties

##### 2.3 Update Check-In Status
- **Description:** Change check-in status through lifecycle (scheduled, completed, rescheduled, cancelled).
- **Backend API:** `POST /api/checkin/update-status`
- **Commands:** `UpdateCheckInStatusCommand`
- **Frontend:** Status dropdown in check-in detail view
- **Workflow:**
  1. After check-in meeting, manager updates status to "Completed"
  2. System marks check-in and linked discussion points as done
  3. Automatically generates next check-in if part of series
  4. Triggers notifications to track completion rates
  5. Updates manager and team dashboards

##### 2.4 Record Check-In Notes
- **Description:** Document discussion outcomes, action items, and feedback during and after check-ins.
- **Backend API:** `POST /api/checkin/update` or `POST /api/checkin/partial-update`
- **Commands:** `UpdateCheckInCommand`, `PartialUpdateCheckInCommand`
- **Frontend:** Rich text editor for notes, discussion point tracking
- **Workflow:**
  1. Manager opens check-in detail
  2. Records notes on discussion points covered
  3. Marks discussion points complete as covered
  4. Adds action items with due dates (optional)
  5. System saves notes and creates searchable audit record

##### 2.5 View Check-In History
- **Description:** Access past check-in records, notes, and discussion history with individual or team views.
- **Backend API:** `GET /api/checkin`, `GET /api/checkin/{id}`
- **Queries:** `GetCheckInListQuery`, `GetCheckInEventRequestQuery`, `GetMyCheckInListOverviewQuery`
- **Frontend:** Check-in list component with date filtering and search
- **Workflow:**
  1. Employee or manager opens Check-In history
  2. System displays all check-ins chronologically
  3. User can filter by date range, status, or participant
  4. Selects check-in to view notes and outcomes
  5. Can download or export check-in summaries

##### 2.6 Check-In Dashboard
- **Description:** Team and organizational dashboards showing check-in completion rates and pending check-ins.
- **Backend API:** `GET /api/checkin/dashboard-summary`, `GET /api/checkin/dashboard-team`, `GET /api/checkin/dashboard-organization`
- **Queries:** `GetCheckInDashboardSummaryQuery`, `GetDirectReportCheckInsDashboardQuery`, `GetOrganizationWithCheckInsDashboardInfoQuery`
- **Frontend:** Dashboard with KPI cards, completion progress, and pending actions
- **Workflow:**
  1. Manager opens Check-Ins dashboard
  2. System aggregates check-in completion metrics (by team/org)
  3. Shows summary: total scheduled, completed, pending, overdue
  4. Displays drill-down table with individual check-in status
  5. Highlights overdue check-ins requiring scheduling

##### 2.7 Delete Check-In
- **Description:** Cancel or remove check-in meetings (restricted to managers).
- **Backend API:** `POST /api/checkin/delete`
- **Commands:** `DeleteCheckInCommand`
- **Frontend:** Delete confirmation dialog with reason entry
- **Workflow:**
  1. Manager right-clicks or opens check-in actions menu
  2. Selects Delete/Cancel Check-In
  3. Optionally provides cancellation reason
  4. System soft-deletes event and notifies employee
  5. If part of series, allows rescheduling next check-in

---

### 3. Performance Review

**Description:** Formal, structured performance assessment cycles supporting 360-degree reviews, calibration sessions, and multi-stage evaluation workflows. Enables organizations to conduct periodic reviews with multiple reviewers.

**Domain Entities:**
- `PerformanceReviewEvent` - Review cycle instance (dates, participant list, status)
- `PerformanceReviewEventParticipantInfo` - Employee being reviewed and their reviewers
- `PerformanceReviewAssessment` - Individual assessment/evaluation from one rater
- `PerformanceReviewAssessmentTemplate` - Form template used for assessments
- `PerformanceReviewCalendar` - Calendar and scheduling for review events
- `PerformanceReviewCollaborator` - Admin users managing the review cycle

**Controllers & Endpoints:**
- `PerformanceReviewController` - POST `api/performancereview/save-event`, GET `api/performancereview/{eventId}`, GET `api/performancereview/assessment`, POST `api/performancereview/assessment/answer-assessment`, POST `api/performancereview/assessment/save-assessment`, GET `api/performancereview/events`

#### Features

##### 3.1 Create Performance Review Event
- **Description:** Initialize a new performance review cycle defining scope, timeline, participants, and assessment templates.
- **Backend API:** `POST /api/performancereview/save-event`
- **Commands:** `SavePerformanceReviewEventCommand`
- **Queries:** `CheckOverlapPerformanceReviewQuery`, `CheckValidPerformanceReviewReviewerQuery`
- **Frontend:** Event creation wizard in performance-reviews module
- **Workflow:**
  1. HR or Performance Admin creates new review cycle
  2. Enters review name, start/end dates, and review type (360, manager-only, etc.)
  3. Selects employee population (department, org unit, custom list)
  4. Assigns primary and additional reviewers/assessors
  5. Selects assessment templates/forms for the review
  6. System validates reviewer availability and scheduling conflicts
  7. Creates review event and generates participant tasks

##### 3.2 Add Participants to Review
- **Description:** Add individual employees to existing review cycles, including self-selection of additional reviewers (360 reviews).
- **Backend API:** `POST /api/performancereview/employee-to-add-into-event`, `POST /api/performancereview/add-participant-into-event`
- **Queries:** `GetParticipantInfoToAddIntoPerformanceReviewEventQuery`, `GetEmployeeForAddIntoPerformanceReviewEventQuery`
- **Commands:** `AddParticipantIntoPerformanceReviewEventCommand`
- **Frontend:** Participant selection dialog with employee search
- **Workflow:**
  1. Admin opens review event detail
  2. Clicks "Add Participants" or "Add Reviewers"
  3. Searches for employees by name/department
  4. For 360 reviews, employee can nominate peer/skip-level reviewers
  5. System validates reviewer relationships and adds to event
  6. Sends notifications to new participants with assessment deadlines

##### 3.3 Answer Performance Assessment
- **Description:** Reviewers complete assessment forms rating employees on competencies, behaviors, or performance dimensions.
- **Backend API:** `POST /api/performancereview/assessment/answer-assessment`, `POST /api/performancereview/assessment/save-assessment`
- **Commands:** `AnswerPerformanceReviewAssessmentCommand`, `SavePerformanceReviewAssessmentCommand`
- **Queries:** `GetPerformanceReviewAssessmentQuery`
- **Frontend:** Assessment form component with rating scales and open-ended questions
- **Workflow:**
  1. Reviewer receives notification to complete assessment
  2. Opens assessment form from task list or email link
  3. Completes structured form (ratings, comments, examples)
  4. Can save as draft and return later
  5. Submits assessment when ready
  6. System validates responses and marks assessment complete
  7. Manager/employee notified of completion

##### 3.4 Final Assessment & Feedback
- **Description:** Consolidate multi-rater feedback and prepare final assessment summary with calibrated ratings.
- **Backend API:** `POST /api/performancereview/assessment/save-final-assessment`, `POST /api/performancereview/assessment/answer-final-assessment`
- **Commands:** `SavePerformanceReviewFinalAssessmentCommand`, `AnswerPerformanceReviewFinalAssessmentCommand`
- **Queries:** `CheckAllCompletedAssessmentResultQuery`
- **Frontend:** Final assessment form combining all feedback with overall rating
- **Workflow:**
  1. When all individual assessments complete, manager proceeds to final assessment
  2. System displays summary of all feedback received
  3. Manager assigns final ratings and writes summary comments
  4. Can view all assessor feedback in collapsible sections
  5. Optionally schedules feedback meeting with employee
  6. Submits final assessment to HR/system

##### 3.5 Calibration Session
- **Description:** Facilitate discussion between managers to calibrate ratings, ensure consistency, and align talent decisions.
- **Backend API:** `GET /api/performancereview/assessment/get-calibration-session`
- **Queries:** `GetPerformanceReviewCalibrationAssessmentsQuery`
- **Frontend:** Calibration session view with peer group comparisons
- **Workflow:**
  1. Calibration moderator opens calibration session
  2. System displays assessments for specific competency or peer group
  3. Shows distribution of ratings across population
  4. Managers discuss outliers and ensure rating consistency
  5. Can unlock assessments for revision if needed
  6. Moderator closes calibration when consensus achieved

##### 3.6 View Performance Review Event
- **Description:** Access full review event details including participant list, assessment status, and timeline.
- **Backend API:** `GET /api/performancereview/{eventId}`, `GET /api/performancereview/events`
- **Queries:** `GetPerformanceReviewEventDetailQuery`, `GetActivePerformanceReviewEventQuery`
- **Frontend:** Event detail page with participant status and action items
- **Workflow:**
  1. Admin or manager opens review event
  2. System displays event summary (dates, scope, status)
  3. Shows participant list with assessment completion status
  4. Displays timeline/progress of review cycle
  5. Can manage participants, unlock assessments, or close event

##### 3.7 Export Review Results
- **Description:** Generate reports of review assessments and results for data analysis or talent discussions.
- **Backend API:** `POST /api/performancereview/export-file`
- **Queries:** `ExportPerformanceReviewQuery`
- **Frontend:** Export dialog with format and data selection options
- **Workflow:**
  1. HR user opens review event
  2. Clicks "Export Results" button
  3. Selects export format (Excel, PDF)
  4. Optionally filters data (assessments only, with comments, etc.)
  5. System generates file and downloads to user's computer

##### 3.8 Delete Performance Review Event
- **Description:** Remove review events that were created in error or no longer needed (restricted to HR/Performance Admins).
- **Backend API:** `POST /api/performancereview/delete`
- **Commands:** `DeletePerformanceReviewEventCommand`
- **Frontend:** Delete confirmation with validation checks
- **Workflow:**
  1. Admin right-clicks review event
  2. Selects Delete
  3. System checks if assessments exist (warns of data loss)
  4. Shows confirmation dialog with list of affected employees
  5. Admin confirms deletion
  6. Soft-deletes event and all associated assessments

---

### 4. Time & Attendance Management

**Description:** Comprehensive time tracking, timesheet management, and attendance-related request handling (leaves, attendance exceptions). Includes working shift assignment, leave request workflows, and time log tracking.

**Domain Entities:**
- `TimeSheet` - Employee's aggregated time entries for a period
- `TimeLog` - Individual time entry (clock in/out or time entry)
- `WorkingShift` - Company-defined work schedules (9-5, flexible, etc.)
- `LeaveRequest` - Employee request to take leave (PTO, sick, unpaid, etc.)
- `AttendanceRequest` - Exception to normal schedule (late arrival, early departure, etc.)
- `CompanyHolidayPolicy` - Holiday and non-working day definitions
- `RemainingLeave` - Calculated leave balance for employee by type

**Controllers & Endpoints:**
- `TimeSheetController` - GET `api/timesheet/time-sheet-cycle`, POST `api/timesheet`, POST `api/timesheet/add-time-log-for-employee`, POST `api/timesheet/toggle-time-sheet-cycle`, GET `api/timesheet/validate/check-time-sheet-cycle-blocked`, GET `api/timesheet/get-locking-timesheet-cycle-status`, GET `api/timesheet/get-setting-of-current-company`, POST `api/timesheet/save-setting`
- `LeaveRequestController` - Handles leave request submission and approval workflows
- `AttendanceRequestController` - Manages attendance exceptions and special requests
- `TimeLogController` - Records individual time entries

#### Features

##### 4.1 View Timesheet
- **Description:** Employees view their own timesheet showing daily time logs, total hours, and status (pending review, approved, rejected).
- **Backend API:** `POST /api/timesheet`
- **Queries:** `GetEmployeeWithTimeLogsListQuery`
- **Frontend:** Employee timesheet view with date range filtering
- **Workflow:**
  1. Employee navigates to Timesheet
  2. System displays current or selected period with daily breakdown
  3. Shows time logs (clock in/out times or hours entered)
  4. Calculates total hours with overtime flagging
  5. Displays status and manager comments if rejected
  6. Allows employee to submit for approval

##### 4.2 Add Time Log for Employee
- **Description:** Managers can manually add time entries for employees (for correction, retroactive entry, or system adjustments).
- **Backend API:** `POST /api/timesheet/add-time-log-for-employee`
- **Commands:** `AddTimeLogToEmployeeCommand`
- **Frontend:** Time log entry form (date, hours, type)
- **Workflow:**
  1. Manager opens employee timesheet
  2. Clicks "Add Time Log"
  3. Fills date, hours/clock times, and optional notes
  4. System validates entry is within valid period
  5. Adds entry to timesheet
  6. Triggers recalculation of totals and overtime

##### 4.3 Configure Timesheet Settings
- **Description:** HR admins configure company-wide timesheet policies (cycle frequency, approval workflow, overtime rules).
- **Backend API:** `GET /api/timesheet/get-setting-of-current-company`, `POST /api/timesheet/save-setting`
- **Queries:** `GetTimeSheetSettingOfCurrentCompanyQuery`
- **Commands:** `SaveTimeSheetSettingCommand`
- **Frontend:** Settings form for HR configuration
- **Workflow:**
  1. HR opens Timesheet Settings
  2. Configures timesheet cycle (weekly, bi-weekly, monthly)
  3. Sets approval workflow (direct manager, HR review, system auto-approve)
  4. Defines overtime rules (hours threshold, multiplier)
  5. Saves settings which apply to all employees
  6. Changes take effect for next timesheet cycle

##### 4.4 Submit Timesheet for Approval
- **Description:** Employees submit completed timesheets for manager or HR review and approval.
- **Backend API:** Typically combined with timesheet update commands
- **Frontend:** Submit button on timesheet view
- **Workflow:**
  1. Employee completes all time entries for period
  2. Reviews timesheet for accuracy
  3. Clicks "Submit for Approval"
  4. System validates all required days have entries
  5. Changes status to "Pending Review"
  6. Notifies manager to review and approve

##### 4.5 Request Leave
- **Description:** Employees submit leave requests with type (PTO, sick, unpaid, etc.) and approval workflow.
- **Backend API:** `LeaveRequestController` endpoints
- **Commands:** Leave request submission commands
- **Frontend:** Leave request form in employee app
- **Workflow:**
  1. Employee navigates to Leave Management > Request Leave
  2. Selects leave type from available options
  3. Chooses start/end dates
  4. Optionally adds reason/comments
  5. Selects backup coverage if required by policy
  6. Submits request
  7. System checks leave balance and sends to manager for approval
  8. Manager approves/rejects with comments
  9. System updates employee's remaining leave balance

##### 4.6 Request Attendance Exception
- **Description:** Employees request exceptions to normal schedule (late arrival, early departure, work from home, etc.).
- **Backend API:** `AttendanceRequestController` endpoints
- **Commands:** Attendance request submission commands
- **Frontend:** Attendance exception request form
- **Workflow:**
  1. Employee opens Attendance > Request Exception
  2. Selects exception type (late, early, WFH, other)
  3. Provides date/time and reason
  4. Optionally attaches supporting documentation
  5. Submits request
  6. Manager reviews and approves/rejects
  7. System records decision in timesheet audit trail

##### 4.7 View/Manage Working Shifts
- **Description:** Configuration and assignment of company working shift patterns to employees or teams.
- **Backend API:** `WorkingShiftController` endpoints
- **Frontend:** Working shift management views for HR
- **Workflow:**
  1. HR opens Organization > Working Shifts
  2. Views defined shifts (9-5, flexible, part-time, etc.)
  3. Can assign shifts to employees or org units
  4. Tracks shift assignment history
  5. Can update shifts with new start/end times

##### 4.8 Holiday and Day-off Management
- **Description:** Define company holidays and non-working days; manage special calendar adjustments.
- **Backend API:** `CompanyHolidayPolicyController` endpoints
- **Frontend:** Holiday configuration in settings
- **Workflow:**
  1. HR opens Holiday Policy settings
  2. Adds/edits company holidays for the year
  3. Can set org-unit specific holidays
  4. Marks "makeup" work days if needed
  5. System excludes holidays from timesheet requirements
  6. Employees see holidays in their calendar

##### 4.9 Timesheet Export & Reporting
- **Description:** Generate timesheet reports for payroll, compliance, or audit purposes.
- **Backend API:** `POST /api/timesheet/export-file`
- **Queries:** `ExportTimeSheetQuery`
- **Frontend:** Export dialog with period and format selection
- **Workflow:**
  1. Manager or HR opens Timesheet module
  2. Selects period and employee(s) to export
  3. Clicks Export
  4. Selects format (Excel, PDF)
  5. System generates report with hours, overtime, leave
  6. File downloads to computer
  7. Can be used for payroll integration or compliance reporting

##### 4.10 Bulk Import Timesheet
- **Description:** Import time entries from external timekeeping systems (clock devices, legacy systems).
- **Backend API:** `POST /api/timesheet/import-from-file`
- **Commands:** `BulkImportTimeSheetCommand`
- **Frontend:** File upload dialog with mapping configuration
- **Workflow:**
  1. HR opens Timesheet > Bulk Import
  2. Selects CSV or Excel file from external system
  3. Maps file columns to system fields (employee ID, date, hours, etc.)
  4. Previews import with validation errors
  5. Confirms import to process
  6. System creates time logs for all rows
  7. HR reviews for any import errors

---

### 5. Form Templates

**Description:** Reusable questionnaire templates for performance assessments, surveys, and feedback forms. Enables consistent, standardized evaluation forms across review cycles.

**Domain Entities:**
- `FormTemplate` - Template definition with sections and questions
- `FormTemplateQuestionSection` - Grouped sections within a template
- `FormTemplateQuestion` - Individual question with answer options
- `FormTemplateResponse` - Completed form response (answer data)
- `SharedQuestion` - Organization-wide library of reusable questions

**Controllers & Endpoints:**
- `FormTemplateController` - GET `api/formtemplate`, GET `api/formtemplate/{id}`, POST `api/formtemplate`, POST `api/formtemplate/delete`, POST `api/formtemplate/clone`

#### Features

##### 5.1 Create Form Template
- **Description:** Design new form templates with sections, questions, and answer options for use in performance reviews.
- **Backend API:** `POST /api/formtemplate`
- **Commands:** `SaveFormTemplateCommand`
- **Frontend:** Form builder with visual question editor
- **Workflow:**
  1. HR opens Form Templates > Create New
  2. Enters template name and description
  3. Adds sections (e.g., "Core Competencies", "Leadership")
  4. Within each section, adds questions (text, rating scale, multiple choice, etc.)
  5. Configures answer options and scales
  6. Sets required fields and question logic
  7. Saves template for future use

##### 5.2 Clone Form Template
- **Description:** Duplicate existing templates as basis for new versions or reviews.
- **Backend API:** `POST /api/formtemplate/clone`
- **Commands:** `CloneFormTemplateCommand`
- **Frontend:** Clone action in template list view
- **Workflow:**
  1. HR right-clicks existing template
  2. Selects "Clone"
  3. System creates copy with "(Copy)" in name
  4. HR can optionally rename and edit cloned version
  5. Original template remains unchanged

##### 5.3 Edit Form Questions
- **Description:** Modify questions, sections, and answer options within template.
- **Backend API:** `POST /api/formtemplate`, `POST /api/formtemplate/save-question`, `POST /api/formtemplate/save-question-section`
- **Commands:** `SaveFormTemplateQuestionCommand`, `SaveFormTemplateQuestionSectionCommand`
- **Frontend:** Form builder with inline editing
- **Workflow:**
  1. HR opens template for editing
  2. Can add/edit/delete sections
  3. Can add/edit/delete/reorder questions
  4. Modifies answer options and scales
  5. Saves changes (only affects future uses, not completed forms)

##### 5.4 Reorder Questions & Sections
- **Description:** Change the display order of sections and questions within the template.
- **Backend API:** `POST /api/formtemplate/reorder-items`
- **Commands:** `ReorderFormTemplateItemsCommand`
- **Frontend:** Drag-and-drop reordering in form builder
- **Workflow:**
  1. HR opens form builder for template
  2. Drags sections/questions to new positions
  3. System updates order
  4. Changes take effect for next form response

##### 5.5 Manage Template Status
- **Description:** Activate/deactivate templates to control which templates are available for new reviews.
- **Backend API:** `POST /api/formtemplate/change-status`
- **Commands:** `ChangeFormTemplateStatusCommand`
- **Frontend:** Status toggle in template list
- **Workflow:**
  1. HR right-clicks template in list
  2. Selects "Activate" or "Deactivate"
  3. Only active templates appear in review form selection
  4. Deactivated templates can't be used for new reviews
  5. Completed forms using old templates remain accessible

##### 5.6 Delete Form Template
- **Description:** Remove templates that are no longer needed (can only delete if unused).
- **Backend API:** `POST /api/formtemplate/delete`
- **Commands:** `DeleteFormTemplateCommand`
- **Frontend:** Delete confirmation with usage check
- **Workflow:**
  1. HR opens template list
  2. Right-clicks template to delete
  3. System checks if template is used by completed reviews
  4. If not used, allows deletion with confirmation
  5. If used, shows warning and prevents deletion

---

### 6. Kudos Management

**Description:** Peer recognition system enabling employees to send kudos (digital appreciation tokens) to colleagues. Includes Microsoft Teams plugin integration, leaderboard rankings, and social engagement features (reactions and comments). Designed to boost employee morale and foster a culture of appreciation.

**Domain Entities:**
- `KudosTransaction` - Main kudos record with sender, receiver, quantity, message, tags
- `KudosUserQuota` - Weekly quota tracking per employee
- `KudosCompanySetting` - Company-level configuration (enabled, quota limits, notification providers)
- `KudosReaction` - "Like" reaction on kudos transactions (v1.1.0)
- `KudosComment` - Comment on kudos transactions (v1.1.0)
- `KudosCommentReaction` - "Like" reaction on comments (v1.1.0)

**Controllers & Endpoints:**
- `KudosController` - POST `/api/Kudos/send`, GET `/api/Kudos/quota`, GET `/api/Kudos/me`, POST `/api/Kudos/history`, POST `/api/Kudos/leaderboard`, POST `/api/Kudos/list`
- Social engagement (v1.1.0): POST `/api/Kudos/reaction-transaction`, POST `/api/Kudos/comment-transaction`, POST `/api/Kudos/reaction-comment`

**Frontend Applications:**
- **Teams Plugin:** React-based Microsoft Teams personal app (`kudos-plugin`)
- **Admin Portal:** Angular component in `growth-for-company`

#### Features

##### 6.1 Send Kudos
- **Description:** Employees send kudos tokens (1-5 per transaction) to colleagues with optional message and category tags.
- **Backend API:** `POST /api/Kudos/send`
- **Commands:** `SendKudosCommand`
- **Frontend:** Teams plugin dialog with recipient picker, quantity slider, message field, tags
- **Workflow:**
  1. User clicks "Give Kudos" button
  2. Selects recipient from company employee list
  3. Chooses quantity (1 to remaining weekly quota)
  4. Writes optional message and selects tags
  5. System validates quota and sends notification to receiver

##### 6.2 View Kudos Feed
- **Description:** Real-time feed of recent kudos within the organization.
- **Backend API:** `POST /api/Kudos/list`, `POST /api/Kudos/list-latest`
- **Queries:** `GetKudosQuery`, `GetKudosLatestQuery`
- **Frontend:** Home page in Teams plugin with infinite scroll
- **Workflow:**
  1. User opens Kudos Teams app
  2. Sees recent kudos from colleagues (30-day default)
  3. Real-time polling updates feed every 30 seconds
  4. Can react and comment on kudos (v1.1.0)

##### 6.3 View Personal History
- **Description:** Personal sent/received kudos history with filtering options.
- **Backend API:** `POST /api/Kudos/history`, `POST /api/Kudos/history-latest`
- **Queries:** `GetKudosHistoryQuery`, `GetKudosLatestHistoryQuery`
- **Frontend:** My History tab in Teams plugin
- **Workflow:**
  1. User navigates to "My History" tab
  2. Toggles between Received (amber) and Sent (blue) tabs
  3. Filters by time period and specific employees
  4. Views kudos cards with sender/receiver info

##### 6.4 View Leaderboard
- **Description:** Rankings of top kudos givers and receivers with podium visualization.
- **Backend API:** `POST /api/Kudos/leaderboard`
- **Queries:** `GetKudosLeaderboardQuery`
- **Frontend:** Leaderboard tab in Teams plugin
- **Workflow:**
  1. User opens Leaderboard tab
  2. Views "Most Appreciated" (receivers) or "Top Givers" (senders)
  3. Sees podium with top 3 and list of ranks 4-10
  4. Filters by time period and organization units

##### 6.5 React to Kudos (v1.1.0)
- **Description:** Users can "like" kudos transactions to show appreciation.
- **Backend API:** `POST /api/Kudos/reaction-transaction`
- **Commands:** `ReactionTransactionCommand`
- **Frontend:** Heart icon on KudosCard component
- **Workflow:**
  1. User clicks heart icon on kudos card
  2. System validates unique reaction (one per user)
  3. Reaction count increments
  4. Heart icon fills in to show liked state

##### 6.6 Comment on Kudos (v1.1.0)
- **Description:** Users can add comments to kudos transactions.
- **Backend API:** `POST /api/Kudos/comment-transaction`, `POST /api/Kudos/reaction-comment`
- **Commands:** `CommentTransactionCommand`, `ReactionCommentCommand`
- **Frontend:** Comment section in KudosCard component
- **Workflow:**
  1. User clicks comment button to expand section
  2. Types comment and clicks Send
  3. Comment appears with sender info and timestamp
  4. Other users can like individual comments

**For complete documentation:** See [detailed-features/README.KudosFeature.md](detailed-features/README.KudosFeature.md)

---

## User Roles & Permissions

### Role-Based Access Control

| Role | Goal Mgmt | Check-In | Perf Review | Time & Leave | Can Manage |
|------|-----------|----------|-------------|--------------|-----------|
| **Employee** | Create/edit own goals | Participate in check-ins | Answer self-assessment | Submit leave & timesheet | Own goals only |
| **Line Manager** | Manage team goals | Schedule & conduct check-ins | Conduct assessments | Review team timesheet | Team members |
| **Leader/Dept Head** | Org-level goals | Team check-in oversight | Manage review events | Department timesheet | Department |
| **HR Manager** | All goals | All check-ins | All reviews | All time/leave | All employees |
| **Performance Admin** | View all | View all | Manage cycles & events | View all | All review events |

### Feature Authorization Policies

**Goal Management:**
- `CompanySubscriptionAuthorizationPolicies.GoalPolicy` - Requires Goal feature subscription
- `CompanyRoleAuthorizationPolicies.EmployeePolicy` - Employee or higher role required

**Check-In:**
- `CompanySubscriptionAuthorizationPolicies.CheckInPolicy` - Requires Check-In feature subscription
- `CompanyRoleAuthorizationPolicies.EmployeePolicy` - Employee or higher role required
- `CompanyRoleAuthorizationPolicies.LeaderOrLineManagerPolicy` - Required for deletion

**Performance Review:**
- `CompanySubscriptionAuthorizationPolicies.PerformanceReviewPolicy` - Requires Performance Review feature subscription
- `CompanyRoleAuthorizationPolicies.EmployeePolicy` - Employee or higher role required
- `CompanyRoleAuthorizationPolicies.HrManagerOrPerformanceReviewAdminPolicy` - Required for deletion

**Time Management:**
- `CompanySubscriptionAuthorizationPolicies.TimeManagementPolicy` - Requires Time Management feature subscription
- `CompanyRoleAuthorizationPolicies.HrOrLeaderOrLineManagerPolicy` - Required for most administrative actions
- `CompanyRoleAuthorizationPolicies.HrManagerPolicy` - Required for settings and cycle configuration

---

## Key Data Models

### Goal
```csharp
public class Goal : RootAuditedEntity
{
    public string Title { get; set; }
    public string Description { get; set; }
    public string MeasurementUnit { get; set; }
    public decimal TargetValue { get; set; }
    public decimal CurrentValue { get; set; }
    public string Status { get; set; }  // Draft, Active, Completed, Cancelled
    public DateTime? TargetDate { get; set; }
    public string VisibilityScope { get; set; }  // Private, Team, Organization
    public List<GoalEmployee> GoalEmployees { get; set; }
    public List<GoalCheckIn> CheckIns { get; set; }
}
```

### CheckInEvent
```csharp
public class CheckInEvent : RootAuditedEntity
{
    public string CheckInSeriesSettingId { get; set; }
    public string TargetEmployeeId { get; set; }
    public string CheckingEmployeeId { get; set; }
    public DateTime CheckInDate { get; set; }
    public LanguageString Title { get; set; }
    public CheckInStatuses Status { get; set; }  // Scheduled, Completed, Cancelled
    public int DurationInMinutes { get; set; }
    public List<CheckInEventDiscussionPoint> DiscussionPoints { get; set; }
    public List<CheckInEventNote> Notes { get; set; }
}
```

### PerformanceReviewEvent
```csharp
public class PerformanceReviewEvent : RootAuditedEntity
{
    public string Title { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public PerformanceReviewEventStatuses Status { get; set; }  // Planning, Active, Completed, Closed
    public string ReviewType { get; set; }  // 360, Manager, Self
    public List<PerformanceReviewEventParticipantInfo> Participants { get; set; }
    public List<PerformanceReviewAssessment> Assessments { get; set; }
}
```

### TimeSheet
```csharp
public class TimeSheet : RootEntity
{
    public string EmployeeId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal TotalHours { get; set; }
    public decimal OvertimeHours { get; set; }
    public string Status { get; set; }  // Draft, Submitted, Approved, Rejected
    public List<TimeLog> TimeLogs { get; set; }
}
```

---

## Integration Points

### Cross-Module Integration

**Goal ↔ Check-In Connection:**
- Goals referenced in check-in discussions via `GoalCheckIn` entity
- Check-in notes update goal progress
- Manager can link goal progress to check-in outcomes

**Goal ↔ Performance Review Connection:**
- Goals referenced in performance reviews as context for assessment
- `GoalPerformanceReviewParticipant` links goals to review assessments
- Goal achievement can factor into performance ratings

**Check-In ↔ Performance Review Connection:**
- Check-in history provides context for performance review assessments
- Reviewed employee's check-in notes visible to reviewers
- Pattern of check-in performance feeds into review calibration

**Time Management ↔ Leave Management Connection:**
- Leave requests deduct from available hours/days
- Approved leave reflects in timesheet (marked as leave type, not absence)
- Leave balance tied to company holiday calendar

### Message Bus Integration

**Entity Events Published by bravoGROWTH:**
- `GoalCreatedEvent`, `GoalUpdatedEvent`, `GoalDeletedEvent`
- `CheckInCompletedEvent` - Triggers notifications to participants
- `PerformanceReviewEventCreatedEvent`, `PerformanceReviewAssessmentSubmittedEvent`
- `LeaveRequestApprovedEvent`, `LeaveRequestRejectedEvent`

**External Events Consumed:**
- `EmployeeDeletedEvent` - Cascade delete employee's goals, check-ins
- `OrganizationUpdatedEvent` - Update goal/review scope assignments
- `CompanySubscriptionUpdatedEvent` - Enable/disable feature access

---

## Dashboard & Reporting

### Employee Portal Dashboards
- **My Goals:** Personal goal list with progress
- **My Check-Ins:** Upcoming and past check-ins
- **My Performance:** Current review status and feedback
- **My Timesheet:** Time log entry and submission status
- **My Leave:** Remaining balance and request history

### Manager Dashboards
- **Team Goals:** All team member goals with progress
- **Team Check-Ins:** Completion status and pending actions
- **Direct Reports:** Performance review overview
- **Team Time:** Timesheet approval queue
- **Team Development:** Insights on team performance trends

### HR/Admin Dashboards
- **Organization Goals:** Company-wide goal completion
- **Review Cycles:** Status of all active performance reviews
- **Time Analytics:** Overtime trends, leave patterns
- **Compliance:** Policy adherence, audit logs
- **Talent Insights:** Calibration data, performance distribution

---

## API Authentication & Caching

### Request Context
- Uses `IPlatformApplicationRequestContextAccessor` to get current user, company, roles
- All queries filtered by `RequestContext.CurrentCompanyId()` for data isolation
- Subscription policies enforce feature access at controller level

### Caching Strategy
- `GetEmployeeWithTimeLogsListQuery` uses `GetEmployeeWithTimeLogsListQueryCacheKeyProvider` for performance
- Cache invalidated on timesheet updates
- Goal and check-in dashboards cached for dashboard queries
- Cache key includes user ID, company ID, and product scope for isolation

### CQRS Architecture
- Commands: `SaveGoalCommand`, `SaveCheckInCommand`, `SavePerformanceReviewEventCommand`
- Queries: `GetGoalListQuery`, `GetCheckInEventRequestQuery`, `GetPerformanceReviewEventDetailQuery`
- Handlers implement business logic with validation and repository operations

---

## Common Workflows

### Quarterly Goal Setting & Tracking
1. HR announces OKR cycle with objectives and timeline
2. Employees set personal goals aligned with organizational objectives
3. Managers review and approve team goals
4. Weekly check-ins discuss goal progress
5. Mid-cycle review adjusts goals if needed
6. End-of-quarter performance review includes goal achievement as assessment factor
7. HR generates goal completion report for analysis

### Performance Review Cycle
1. HR creates review event with participant pool
2. System auto-selects managers as primary reviewers
3. Employees select peer/skip-level reviewers (360 reviews)
4. All reviewers complete assessment forms
5. Manager conducts calibration with peers
6. HR conducts final calibration session
7. Managers deliver feedback to employees
8. System archives completed reviews and generates talent analytics

### Regular One-on-One Check-ins
1. Manager schedules weekly/bi-weekly check-in series
2. Automatic reminders sent 24 hours before meeting
3. Manager prepares agenda from discussion point templates
4. Meeting occurs (in-person or virtual)
5. Manager documents outcomes and action items
6. Follow-up actions tracked for next check-in
7. Check-in history builds picture of employee development over time

### Timesheet Submission & Approval
1. Employees enter time logs throughout the week (auto or manual)
2. At end of period, timesheet shows total hours and overtime
3. Employee reviews for accuracy and submits
4. Manager receives notification and reviews
5. Manager may request revisions or approve
6. Approved timesheet sent to payroll
7. System retains audit trail of all changes

---

## Configuration & Customization

### Company Settings
- Goal templates and discussion point libraries
- Check-in frequency defaults and templates
- Performance review form selection and assessment scales
- Timesheet cycle definition (weekly, bi-weekly, monthly)
- Holiday calendar and working shifts
- Leave types and balances
- Approval workflow routing (direct manager, HR, auto-approve)

### Supported Languages
- Form templates support multi-language question sets via `LanguageString` value object
- Check-in titles auto-generate in employee's language preference
- All system messages and notifications localized

---

## Migration & Data Sync

### Cross-Service Data Synchronization
- Employee data synced from bravoTALENTS via message bus
- Organization structure updates propagate to goal/review scoping
- Leave and shift definitions may come from separate HR module

### Legacy System Integration
- Bulk import for historical timesheet data
- Bulk import for existing goals/reviews from legacy systems
- Entity event bus triggers consumer processes in other services

---

## Audit & Compliance

### Audit Trail
- All entities inherit from `RootAuditedEntity` with CreatedBy/UpdatedBy/Timestamps
- Field-level updates tracked via `[TrackFieldUpdatedDomainEvent]` attribute
- Goal progress updates, check-in status changes, assessment submissions logged
- Performance review audit trail records all reviewer actions and changes

### Compliance Features
- Goal visibility controls restrict access per organizational policy
- Performance review access logging (who viewed which reviews)
- Leave request approval workflows enforce company policy
- Timesheet approval required before payroll processing
- Export audit trail available for HR review

### Data Retention
- Soft-delete pattern allows recovery of accidentally deleted data
- Historical records maintained in separate audit table
- Performance review cycles archived for compliance (typically 3-7 years)

---

## Support & Maintenance

### Troubleshooting
- Check authorization policies if user cannot access features
- Verify subscription policies are active for company
- Review request context for user role and company ID
- Check cache invalidation if data appears stale after update

### Performance Optimization
- Dashboard queries implement caching for high-traffic endpoints
- Pagination on large result sets (goal lists, check-in lists)
- Lazy loading of related entities (employees, reviews, assessments)
- Index recommendations for frequently filtered columns (date, status)

### Known Limitations
- Bulk operations on large datasets (>10K records) should use background jobs
- Real-time check-in scheduling conflicts prevent double-booking
- Performance review cycles cannot overlap by design
- Goal hierarchy depth limited to prevent circular dependencies

---

## Related Documentation

- **Backend Patterns:** See `docs/claude/backend-patterns.md` for CQRS, Repository, and Validation patterns
- **Frontend Patterns:** See `docs/claude/frontend-patterns.md` for Component and Store patterns
- **API Security:** See `docs/claude/architecture.md` for authorization policy details
- **Entity Relationships:** Refer to Growth.Domain.Entities for comprehensive ER model
