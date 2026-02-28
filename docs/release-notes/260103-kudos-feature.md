# Release Notes: Kudos Feature (Bravo Kudos)

**Date:** 2026-01-03
**Version:** 1.0.0
**Status:** Released
**Service:** bravoGROWTH

---

## Summary

The Kudos Feature introduces an internal peer recognition platform enabling employees to send appreciation ("cookies") to colleagues. This feature supports dual platforms - Microsoft Teams Plugin for end-users and Angular Admin Portal for HR/Admin management, with comprehensive quota management, gamification, and real-time notifications.

## New Features

### End-User Features (Teams Plugin)

- **Send Kudos**: Send 1-5 kudos per transaction with personalized messages and value-based tags
- **Weekly Quota System**: Default 5 kudos per week, auto-resets every Monday at 00:00 (timezone-aware)
- **Kudos Feed**: Real-time activity feed with 30-second polling for live updates
- **My History**: View received and sent kudos with infinite scroll and employee filtering
- **Leaderboard**: Gamified display with podium for Top 3 and ranked list for positions 4-10
- **Tag Categories**: 7 predefined value tags (Collaborative, Supportive, Open, Creative, Ambitious, Reliable, Leader)
- **Teams Notifications**: Automatic activity notifications via Microsoft Graph API

### Admin Features (WebV2 Portal)

- **Dashboard**: Summary statistics, trend charts, and quick transaction access
- **Transaction Management**: Paginated table with advanced filtering
- **Export Reports**: Excel (.xlsx) export for quarterly reward compilation
- **Statistics & Reporting**: Summary by individual, branch, and company-wide
- **Fraud Detection**: Circular kudos pattern detection with flagging system
- **Full-Text Search**: PostgreSQL GIN index on message field

## Improvements

- **Infinite Scroll**: Virtualized lists using react-virtuoso for optimal performance
- **Dual Authentication**: Seamless support for BravoJwt (web) and Azure AD SSO (Teams)
- **Multi-Platform Design**: Consistent UX across Teams Plugin and Admin Portal
- **Timezone-Aware Quota**: Weekly quota respects user's local timezone

## Technical Details

### Backend

**Service:** bravoGROWTH

**Domain Entities:**
- `KudosTransaction`: Main transaction with sender, receiver, quantity, message, tags
- `KudosUserQuota`: Weekly quota management with auto-reset
- `KudosCompanySetting`: Per-company configuration and notification providers
- `NotificationProviderConfig`: Provider settings (Microsoft Teams, future: Slack)

**CQRS Commands:**
- `SendKudosCommand`: Validate quota, create transaction, send notification

**CQRS Queries:**
- `GetKudosQuotaCurrentUserQuery`: Current user quota and remaining balance
- `GetKudosByCurrentUserQuery`: User's recent kudos summary
- `GetKudosHistoryQuery`: Paginated history (sent/received)
- `GetKudosLeaderboardQuery`: Top givers and receivers
- `GetKudosQuery`: Admin transaction list with filters
- `GetKudosLatestQuery`: Polling endpoint for live updates
- `GetKudosEmployeesQuery`: Company employees for recipient selection
- `GetKudosOrganizationsQuery`: Organization structure for filtering

**Background Jobs:**
- `KudosQuotaResetBackgroundJobExecutor`: Hourly job for weekly quota reset (Monday 00:00)

**API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/Kudos/send` | POST | Send kudos to recipient |
| `/api/Kudos/quota` | GET | Get current user quota |
| `/api/Kudos/me` | GET | Get current user summary |
| `/api/Kudos/history` | POST | Get sent/received history |
| `/api/Kudos/history-latest` | POST | Polling for new transactions |
| `/api/Kudos/leaderboard` | POST | Get leaderboard data |
| `/api/Kudos/list` | POST | Admin: Get transactions |
| `/api/Kudos/employees` | GET | Get employee list |
| `/api/Kudos/organizations` | GET | Get organization structure |

### Frontend

**Teams Plugin (React + Fluent UI):**
- `Home.tsx`: Main kudos feed with create card
- `MyHistory.tsx`: Sent/received history tabs
- `Leaderboard.tsx`: Gamified leaderboard display

**Admin Portal (Angular):**
- `/kudos/dashboard`: Statistics and charts
- `/kudos/transactions`: Transaction management

**Shared Components:**
- `KudosCard`: Feed card display
- `KudosHistoryCard`: History entry display
- `SendKudosDialog`: Transaction creation modal
- `TimePeriodBox`: Date range filtering
- `SearchEmployeeBox`: Employee selection

### Database

**PostgreSQL with EF Core:**
- JSONB column for `NotificationProviders`
- GIN full-text search index on `Message` field
- Composite indexes on `CompanyId+SentAt` and `CompanyId+SenderId+SentAt`
- Default values: `WeeklyQuotaTotal=5`, `MaxKudosPerTransaction=5`

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Weekly Quota | 5 | Kudos per user per week |
| Max Per Transaction | 5 | Maximum kudos in single send |
| Reset Day | Monday | Weekly quota reset day |
| Reset Time | 00:00 | Reset time (user timezone) |
| Polling Interval | 30 seconds | Live feed update frequency |

## Related Documentation

- [Feature Documentation](../business-features/bravoGROWTH/detailed-features/README.KudosFeature.md)
- [Design Reference](https://skew-flyer-95361144.figma.site/)

## Future Roadmap

- **Phase 2**: Native Bravo app notifications
- **Phase 2**: Slack integration
- **Phase 2**: Enhanced anti-spam mechanisms
- **Phase 2**: Private kudos mode

---

*Generated with [Claude Code](https://claude.com/claude-code)*
