# Project Structure Reference

> **Companion doc for generic skills.** Contains project-specific service list, directory tree, ports, module codes, and detection keywords. Generic skills reference this file via "MUST READ `project-structure-reference.md`".

## BravoSUITE Service Architecture

| Service | Port | Database | Type | Directory |
|---|---|---|---|---|
| Accounts (account-api) | 5000 | Accounts | PostgreSQL | `src/Services/Accounts/` |
| bravoGROWTH (growth-api) | 5100 | Growth | MongoDB | `src/Services/bravoGROWTH/` |
| bravoTALENTS (candidate-api) | 5202 | Candidate | MongoDB | `src/Services/bravoTALENTS/Candidate.Service/` |
| bravoTALENTS (email-api) | 5204 | — | — | `src/Services/bravoTALENTS/Email.Service/` |
| bravoTALENTS (job-api) | 5207 | Job | MongoDB | `src/Services/bravoTALENTS/Job.Service/` |
| bravoTALENTS (talent-api) | 5209 | Talent | MongoDB | `src/Services/bravoTALENTS/Talent.Service/` |
| bravoTALENTS (employee-api) | 5210 | Employee | SQL Server | `src/Services/bravoTALENTS/Employee.Service/` |
| bravoTALENTS (setting-api) | 5213 | Setting | MongoDB | `src/Services/bravoTALENTS/Setting.Service/` |
| bravoSURVEYS (survey-api) | 5400 | Surveys | MongoDB | `src/Services/bravoSURVEYS/LearningPlatform/` |
| bravoINSIGHTS (insights-api) | 5500 | Insights | MongoDB | `src/Services/bravoINSIGHTS/Analyze/` |

## Infrastructure Ports

| Service | Port | Credentials |
|---|---|---|
| MongoDB | 127.0.0.1:27017 | root / rootPassXXX |
| Elasticsearch | 127.0.0.1:9200 | (no auth) |
| RabbitMQ | 127.0.0.1:5672 (AMQP), :15672 (UI) | guest / guest |
| Redis | 127.0.0.1:6379 | — |
| PostgreSQL | 127.0.0.1:54320 | postgres / postgres |
| SQL Server | 127.0.0.1:14330 | sa / 123456Abc |

## Project Directory Tree

```
BravoSuite3/
├── src/
│   ├── Services/                    # Microservices
│   │   ├── Accounts/                # Auth, users, permissions
│   │   ├── bravoGROWTH/             # Goals, kudos, performance, timesheets
│   │   │   ├── Growth.Domain/
│   │   │   ├── Growth.Application/
│   │   │   ├── Growth.Persistence/
│   │   │   ├── Growth.Service/
│   │   │   └── Growth.IntegrationTests/
│   │   ├── bravoTALENTS/            # Recruitment, candidates, jobs, employees
│   │   │   ├── Candidate.Service/
│   │   │   ├── Talent.Service/
│   │   │   ├── Job.Service/
│   │   │   ├── Employee.Service/
│   │   │   ├── Email.Service/
│   │   │   └── Setting.Service/
│   │   ├── bravoSURVEYS/            # Surveys, questionnaires
│   │   │   └── LearningPlatform/
│   │   ├── bravoINSIGHTS/           # Analytics, dashboards
│   │   │   └── Analyze/
│   │   └── Shared/                  # Bravo.Shared cross-service
│   ├── Platform/
│   │   └── Easy.Platform/           # Framework core
│   └── WebV2/                       # Angular 19 frontend (Nx)
│       ├── apps/
│       │   ├── growth-for-company/  # HR app (port 4206)
│       │   └── employee/            # Employee self-service (port 4205)
│       └── libs/
│           ├── platform-core/       # Frontend framework
│           ├── bravo-common/        # Shared UI components
│           ├── bravo-domain/        # Business domain APIs/models
│           └── apps-domains/        # Cross-app shared logic
├── docs/
│   ├── business-features/           # 18 feature docs across 5 apps
│   ├── design-system/               # Design tokens, SCSS
│   ├── claude/                      # AI dev docs
│   └── test-specs/                  # Test specifications
└── .claude/                         # Claude Code skills/agents/hooks
```

## Tech Stack Summary

- **Backend:** .NET 9 + Easy.Platform framework + CQRS + MongoDB/SQL Server/PostgreSQL
- **Frontend:** Angular 19 + Nx monorepo + TypeScript
- **Messaging:** RabbitMQ (cross-service communication)
- **Search:** Elasticsearch
- **Caching:** Redis
- **Containerization:** Docker + Kubernetes (AKS)

## Module Codes

Used in test case IDs (`TC-{SVC}-{NNN}`):

| Code | Service/Module |
|---|---|
| TAL | bravoTALENTS |
| GRO | bravoGROWTH |
| SUR | bravoSURVEYS |
| INS | bravoINSIGHTS |
| ACC | Accounts |
| COM | Common/Shared |
| NOT | NotificationMessage |
| PAR | ParserApi |
| PER | PermissionProvider |

### Feature-Level Codes

| Code | Feature | Service |
|---|---|---|
| GM/GOL | Goals | bravoGROWTH |
| CI/CHK | CheckIns | bravoGROWTH |
| PR/REV | PerformanceReviews | bravoGROWTH |
| TM | TimeManagement | bravoGROWTH |
| FT | FormTemplates | bravoGROWTH |
| KD/KUD | Kudos | bravoGROWTH |
| BG | BackgroundJobs | bravoGROWTH |
| AUTH | Authentication | Accounts |
| CAN | Candidate | bravoTALENTS |
| JOB | Job | bravoTALENTS |
| INT | Interview | bravoTALENTS |
| USR | User | Accounts |
| SUR | Survey | bravoSURVEYS |

## Module Detection Keywords

### bravoTALENTS (TAL)
talent, candidate, recruitment, job, application, interview, cv, resume, hire, hiring, onboarding, employee management, job posting, job board, applicant, screening, offer, employment, workforce

### bravoGROWTH (GRO)
goal, kudos, performance, review, check-in, timesheet, recognition, feedback, 1:1, objectives, OKR, KPI, performance cycle, evaluation, appraisal, development plan

### bravoSURVEYS (SUR)
survey, questionnaire, poll, feedback form, engagement, pulse, NPS, response, question, survey template, distribution, analytics

### bravoINSIGHTS (INS)
dashboard, report, analytics, metrics, KPI, visualization, chart, data, widget, insight, business intelligence, reporting, export

### Accounts (ACC)
user, login, authentication, SSO, permissions, role, access, profile, tenant, organization, authorization, identity, security, session
