# bravoSURVEYS Documentation Index

Complete documentation for the bravoSURVEYS survey and feedback management platform.

## Documentation Files

### 1. README.md (Main Reference - 37.5 KB)
Comprehensive documentation covering all features, APIs, data models, and workflows.

**Contents:**
- Module overview and key capabilities
- System architecture (backend and frontend)
- 9 sub-modules with 24 features
- Complete API endpoint specifications
- Request/response examples with HTTP methods
- Business workflows and use cases
- Data models and entity relationships
- User roles and permissions
- Technical patterns (CQRS, concurrency control, logic branching)
- Performance considerations
- Testing strategies
- Future enhancement roadmap

**Best for:** Complete technical reference, API integration, system architecture understanding, workflow comprehension

### 2. API-REFERENCE.md (API Endpoint Guide)
Quick reference for all REST API endpoints with request/response examples.

**Contents:**
- API endpoints organized by module
- HTTP methods and paths
- Request/response schemas
- Error codes and status codes
- Authentication and authorization
- Rate limiting information
- Code examples for common operations
- Pagination and filtering parameters

**Best for:** API integration, endpoint discovery, request/response format validation

### 3. TROUBLESHOOTING.md (Support Guide)
Common issues, debugging steps, FAQ, and solutions.

**Contents:**
- Common problems and their solutions
- Debugging techniques and tools
- Frequently asked questions
- Configuration issues
- Performance troubleshooting
- Testing strategies
- Support contact information

**Best for:** Problem solving, quick resolution, development support

### 4. INDEX.md (This File)
Documentation index and navigation guide for all resources.

## Feature Quick Reference

### Survey Design & Management (6 features)
- Create surveys from scratch with metadata configuration
- Edit survey structure including pages and properties
- Manage survey pages with display logic
- Manage questions with 9+ question types
- Configure question branching logic
- Create and manage question libraries

Reference: README.md sections 1.1-1.6

### Survey Respondent Management (4 features)
- Create and manage respondent lists with custom fields
- Import respondents from CSV/Excel with validation
- Manage respondent profile data and personalization
- Track respondent status and invitation delivery

Reference: README.md sections 2.1-2.4

### Survey Distribution & Delivery (4 features)
- Distribute surveys via email with personalization
- Distribute surveys via SMS with tracking
- Schedule distributions and manage reminders
- Monitor distribution status and delivery metrics

Reference: README.md sections 3.1-3.4

### Survey Execution & Response Handling (4 features)
- Provide public respondent portal for survey completion
- Generate test responses for validation
- Import pre-collected responses from external sources
- Export responses in CSV, Excel, or JSON formats

Reference: README.md sections 4.1-4.4

### Results & Analytics (5 features)
- View real-time survey dashboard with completion metrics
- Analyze individual question results with visualizations
- Analyze open-ended text responses
- Create custom analytical reports
- Save and reuse report templates

Reference: README.md sections 5.1-5.5

### Survey Design & Theming (2 features)
- Apply color schemes and branding to survey interface
- Choose survey layout styles (multi-page, single-page, modal)

Reference: README.md sections 6.1-6.2

### Contact & List Management (2 features)
- Maintain central contact database
- Group contacts into lists for distribution

Reference: README.md sections 7.1-7.2

### Survey Translation & Localization (2 features)
- Create and manage multi-language survey versions
- Manage translator assignments and translation status

Reference: README.md sections 8.1-8.2

### Access Control & Permissions (2 features)
- Grant/revoke survey access with granular permissions
- Manage user roles and default permissions

Reference: README.md sections 9.1-9.2

## Controllers Overview

| Controller | Endpoints | Purpose |
|------------|-----------|---------|
| SurveyDefinitionController | 6 | Survey CRUD and lifecycle |
| PageDefinitionController | 5 | Page management and reordering |
| QuestionDefinitionController | 6 | Question design and logic |
| LibraryQuestionController | 3 | Question template management |
| RespondentListController | 4 | Respondent group management |
| RespondentsController | 5 | Respondent import and status |
| FieldController | 2 | Custom respondent fields |
| DistributionController | 7 | Email/SMS distribution and scheduling |
| SurveyHandlerController | 2 | Public survey respondent portal |
| GenerateResponseController | 1 | Test response generation |
| SyncResponsesController | 1 | Response import from files |
| ExportResponsesController | 1 | Response export to formats |
| SurveyDashboardController | 1 | Real-time metrics dashboard |
| SurveyResultController | 2 | Question results and analysis |
| ReportDefinitionController | 4 | Custom report builder |
| ThemeController | 2 | Survey theming and branding |
| LayoutController | 1 | Survey layout selection |
| ContactController | 3 | Contact CRUD operations |
| ContactListController | 2 | Contact list management |
| SurveyTranslationController | 3 | Multi-language support |
| SurveyAccessController | 2 | Access control and permissions |

## Reading Guides by User Role

### For Developers
1. Start with: README.md "Architecture Overview" and "API Patterns & Endpoints"
2. Review: API-REFERENCE.md for endpoint specifications
3. Check: TROUBLESHOOTING.md for common implementation issues
4. Study: README.md "Data Models" and "Key Technical Patterns"
5. Reference: Specific feature sections with CQRS command/query patterns

### For Product Managers
1. Start with: README.md "Overview" and "Key Capabilities"
2. Review: README.md "Sub-Modules" for feature organization
3. Check: Feature workflow descriptions in each section
4. Reference: "User Roles & Permissions" and "Related Modules"

### For System Administrators
1. Start with: README.md "Deployment & Infrastructure"
2. Review: README.md "Architecture Overview"
3. Check: TROUBLESHOOTING.md "Configuration Issues"
4. Reference: API-REFERENCE.md for integration endpoints

### For Business Analysts
1. Start with: README.md "Sub-Modules" overview
2. Review: README.md "Results & Analytics" (section 5)
3. Check: Feature descriptions for report and analysis capabilities
4. Reference: README.md "Data Models" for entity understanding

### For Support/Operations
1. Start with: TROUBLESHOOTING.md
2. Review: Common issues and resolution steps
3. Check: API-REFERENCE.md for endpoint status codes
4. Reference: README.md "Error Handling" section

## Key Concepts

- **Survey:** Container for questions, pages, and logic; can be in Draft, Active, or Closed status
- **Page:** Organizational unit within a survey; contains questions and display logic rules
- **Question:** Individual survey item with 9+ supported types; can have skip/display logic
- **Respondent:** Survey recipient with contact info and custom profile fields
- **Distribution:** Survey delivery via email or SMS with tracking and scheduling
- **Response:** Survey answer submitted by respondent; type-specific storage and validation
- **Display Logic:** Conditional rule determining page/question visibility during response
- **Skip Logic:** Advanced branching that determines next page based on answers
- **Report:** Custom analytical view of survey responses with visualizations

## API Endpoints Summary

**Total Endpoints:** 60+ REST endpoints organized across 20+ controllers

**Methods:**
- GET: 25+ endpoints (read-only operations)
- POST: 25+ endpoints (create, import, generate, sync operations)
- PUT: 5+ endpoints (full updates)
- PATCH: 5+ endpoints (partial updates, scheduling)
- DELETE: 3+ endpoints (soft deletes, archives)

**Key Routes:**
- `/api/surveys` - Survey management
- `/api/surveys/{surveyId}/pages` - Page management
- `/api/surveys/{surveyId}/pages/{pageId}/questions` - Question design
- `/api/surveys/{surveyId}/distributions` - Distribution management
- `/api/surveys/{surveyId}/respondents` - Respondent management
- `/api/surveys/{surveyId}/result` - Results and analytics
- `/api/reports` - Report builder
- `/api/contacts` - Contact management
- `/api/survey-handler/surveys/{surveyId}` - Public respondent portal

## Detailed Features Documentation

### Overview
The `detailed-features/` directory contains in-depth technical documentation for individual features and advanced capabilities.

**Current Structure:**
- Directory created for future feature-specific documentation
- Will contain detailed guides for complex operations and workflows
- Each feature documented with architecture, implementation details, and code examples

**Planned Contents:**
- Advanced branching and skip logic documentation
- Survey template creation and management
- Response analytics and reporting deep-dives
- Multi-language survey workflows
- Distribution scheduling and delivery optimization
- Custom theming and layout specifications

**Access:** See `detailed-features/` directory for expanded documentation on specific topics

## Data Models

**Core Entities:**
- Survey (with pages, questions, distributions, results)
- SurveyPage (with questions, display logic)
- Question (with options, answer types, validation)
- QuestionOption (for choice-based questions)
- Respondent (with custom fields, profile data)
- RespondentList (for grouping respondents)
- Distribution (email/SMS with templates)
- Response (answers with type-specific storage)
- Report/ReportDefinition (custom analytics layouts)
- Contact/ContactList (contact database)

See README.md "Data Models" section for complete entity specifications and relationships.

## Security & Authorization

**Authentication:**
- OAuth 2.0 / JWT token-based
- User context via RequestContext

**Authorization Policies:**
- CompanyRoleAuthorizationPolicies.EmployeePolicy (standard employee access)
- Permission levels: None, View, Edit, Distribute, Full
- Survey-level access controls override role-based defaults
- Admin role bypasses permission checks

**Data Protection:**
- Concurrency control via ETags and version fields
- Soft deletes for data retention
- Audit trails on modifications

See README.md "Access Control & Permissions" section.

## Common Questions

**How do I create a survey?**
See Features 1.1-1.3 in README.md for creating blank surveys or from templates.

**How do I add questions with logic?**
See Features 1.4-1.5 in README.md for question types and branching logic.

**How do I import and distribute to respondents?**
See Features 2.1-2.2 (import) and 3.1-3.2 (distribute) in README.md.

**How do I analyze survey responses?**
See Features 5.1-5.5 in README.md for dashboard, analytics, and reporting.

**How do I handle multi-language surveys?**
See Feature 8.1-8.2 in README.md for translation management.

**What are my customization options?**
See Features 6.1-6.2 (themes/layouts) and 7.1-7.2 (contacts) in README.md.

**How do I manage survey access and permissions?**
See Features 9.1-9.2 in README.md for access control and user roles.

## Document Statistics

- **Files:** 4 comprehensive documents (README, API-REFERENCE, TROUBLESHOOTING, INDEX)
- **Total Size:** 50+ KB
- **Features:** 29 complete features across 9 sub-modules
- **Controllers:** 20+ controllers
- **API Endpoints:** 60+ total endpoints
- **Code Examples:** 15+ JSON/CQRS samples
- **Workflows:** 29 business workflows with step-by-step instructions
- **Data Models:** 10+ core entities with relationships

## Navigation Tips

1. **For quick lookup:** Use this INDEX.md
2. **For API integration:** Use API-REFERENCE.md
3. **For complete reference:** Use README.md
4. **For troubleshooting:** Use TROUBLESHOOTING.md
5. **Use browser search:** Ctrl+F within documents
6. **Use bookmarks:** Save frequently accessed sections

## Updates & Maintenance

**Current Version:** 1.0
**Last Updated:** 2025-12-31
**Status:** Production Ready

**Documentation Coverage:** 100% of major features and APIs documented with workflows and examples

## Related Services

- **bravoTALENTS:** Talent and HR management platform
- **bravoGROWTH:** Learning and development platform
- **bravoINSIGHTS:** Analytics and business intelligence
- **Easy.Platform:** Framework core libraries and CQRS patterns
- **bravo-accounts:** User authentication and company management

## Support Resources

1. **Main Documentation:** README.md (complete technical reference)
2. **API Integration:** API-REFERENCE.md (endpoint specifications)
3. **Troubleshooting:** TROUBLESHOOTING.md (common issues and solutions)
4. **Navigation Guide:** INDEX.md (this file)
5. **Source Code:** src/Services/bravoSURVEYS/ (implementation reference)
6. **API Explorer:** Service /swagger endpoint (interactive API testing)

## Quick Links by Task

| Task | Reference |
|------|-----------|
| Create a new survey | README.md 1.1 |
| Design survey questions | README.md 1.4 |
| Set up branching logic | README.md 1.5 |
| Import respondents | README.md 2.2 |
| Distribute surveys via email | README.md 3.1 |
| Schedule distributions | README.md 3.3 |
| View response analytics | README.md 5.1 |
| Create custom reports | README.md 5.4 |
| Apply survey theming | README.md 6.1 |
| Manage access control | README.md 9.1 |
| Import pre-collected responses | README.md 4.3 |
| Export survey data | README.md 4.4 |

---

**Documentation Version:** 1.0
**Last Updated:** 2025-12-31
**Owner:** Documentation Team
**Status:** Complete and Production Ready

**Related Files:**
- [README.md](README.md) - Complete technical reference
- [API-REFERENCE.md](API-REFERENCE.md) - API endpoint specifications
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions
