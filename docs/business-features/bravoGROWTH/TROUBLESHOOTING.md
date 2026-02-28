# bravoGROWTH Troubleshooting & Common Scenarios

> Solutions for common issues and best practices for bravoGROWTH operations

---

## Common Issues & Solutions

### Goal Management

#### Issue: "Access Denied" When Viewing Goal

**Error Message**:
```
403 Forbidden: You do not have permission to access this goal
```

**Causes**:
1. Goal visibility is set to "Private" and user is not the owner
2. Goal is in a team with restricted access
3. User lacks required company role (Employee or higher)
4. Goal scope changed after creation

**Solutions**:
1. Check goal visibility setting
   - Ask goal owner to change visibility to "Team" or "Organization"
   - Or request explicit access to goal
2. Verify user company role
   - User must have Employee or higher role
   - HR/Admin can assign roles in Settings
3. Confirm goal is not deleted
   - Deleted goals appear in trash/archive only to admins
4. Check company subscription
   - Goal feature must be subscribed for the company

**Prevention**:
- Set appropriate default visibility when creating goals
- Use team-level goals for collaborative work
- Communicate goal visibility settings to team
- Document goal sharing policies

---

#### Issue: Cannot Update Goal Progress - "Invalid Value"

**Error Message**:
```
400 Bad Request: Current value must be between 0 and target value
```

**Causes**:
1. Current value exceeds target value
2. Value type mismatches measurement unit (e.g., text for numeric)
3. Goal is in completed or cancelled status
4. Decimal precision exceeds allowed digits

**Solutions**:
1. Check measurement unit
   - Percentage goals: value should be 0-100
   - Currency goals: use numeric format with 2 decimals
   - Quantity goals: use whole numbers
2. Verify goal status
   - Progress updates only allowed for Active goals
   - Completed goals are read-only
   - Reopen goal if needed (Admin only)
3. Enter valid value
   - Don't exceed target value
   - Match measurement unit type
   - Use correct decimal precision

**Prevention**:
- Display measurement unit clearly in UI
- Add input validation on client side
- Show example values in help text
- Warn before completing goal if progress is incomplete

---

#### Issue: Goal Appears Deleted But Shows in History

**Symptoms**:
- Goal not visible in main list
- Appears in historical/archived views
- Cannot reopen or edit

**Causes**:
1. Goal was soft-deleted (by design)
2. User filter is hiding completed goals
3. Goal moved to different department/team
4. Goal status changed to Cancelled

**Solutions**:
1. Check filters in goal list view
   - Include "Cancelled" and "Completed" statuses
   - Check date filters are not excluding goal
   - Expand date range to see historical goals
2. Restore from archive (Admin only)
   - Admin can access soft-deleted goals
   - Use "Restore" action to recover
3. Check goal status
   - Completed goals move to history view
   - Cancelled goals are archived
   - Active goals are in main list

**Prevention**:
- Show clear status indicators
- Add confirmation dialog before deletion
- Provide easy access to archived goals
- Include recovery period before permanent deletion

---

#### Issue: Goal Dashboard Shows Incorrect Metrics

**Symptoms**:
- Total goals count doesn't match manual count
- Completion rate percentage seems wrong
- Missing goals in summary

**Causes**:
1. Filter settings excluding goals
2. Soft-deleted goals still in calculation
3. Cache not refreshed after updates
4. Permissions filtering results invisibly
5. Performance review cycle is in progress

**Solutions**:
1. Refresh page (Ctrl+F5)
   - Clear browser cache
   - Force API to recalculate metrics
2. Check filter settings
   - Ensure all goal statuses are included
   - Verify date ranges are correct
   - Check visibility filters
3. Wait for cache refresh
   - Dashboard cache refreshes every 5 minutes
   - Manual "Refresh Dashboard" button
4. Verify permissions
   - You may only see goals you have access to
   - Ask admin if permission issue

**Prevention**:
- Show active filters prominently
- Implement automatic cache invalidation
- Display "last updated" timestamp
- Add filter preset buttons

---

### Check-In Management

#### Issue: Check-In Not Scheduled - "Employee Not Found"

**Error Message**:
```
404 Not Found: Target employee not found in company
```

**Causes**:
1. Employee ID is incorrect
2. Employee deleted from system
3. Employee belongs to different company
4. Employee status is inactive

**Solutions**:
1. Verify employee exists
   - Search for employee in Employee directory
   - Confirm employee is active (not archived/deleted)
   - Verify employee belongs to your company
2. Re-search for employee
   - Use employee search dialog
   - Select from dropdown instead of typing ID
3. If employee was recently deleted
   - Contact HR to restore employee
   - Create check-in after employee is restored
4. Check employee status
   - Inactive employees cannot receive check-ins
   - Ask HR to activate employee

**Prevention**:
- Use employee dropdown selector instead of ID entry
- Validate employee status before scheduling
- Show employee verification before confirming
- Handle deleted employee gracefully

---

#### Issue: Check-In Calendar Invite Not Received

**Symptoms**:
- Check-in scheduled in bravoGROWTH
- Participant doesn't receive calendar invite
- No notification email sent

**Causes**:
1. Email integration not configured
2. Calendar integration disabled
3. Participant email incorrect or invalid
4. Email marked as spam
5. Calendar service down (Office 365, Google Calendar, etc.)

**Solutions**:
1. Verify email address
   - Check participant's email in profile
   - Confirm correct spelling
   - No leading/trailing spaces
2. Resend invitation
   - Open check-in detail
   - Click "Resend Invitation"
   - Participant should receive email within 5 minutes
3. Check email settings
   - Admin: verify email integration in Settings
   - Check "Send Calendar Invites" toggle is enabled
   - Test connection to email service
4. Check spam folder
   - Ask participant to check spam/junk folder
   - Add noreply@bravosuite.com to safe senders
5. Verify calendar integration
   - Participant must authorize calendar access
   - Reauthorize if token expired
   - Check calendar service status

**Prevention**:
- Test email integration after setup
- Validate email addresses on entry
- Show delivery status in UI
- Provide manual reschedule option

---

#### Issue: Check-In Status Won't Update to "Completed"

**Error Message**:
```
400 Bad Request: Cannot complete check-in that is already cancelled
```

**Causes**:
1. Check-in was cancelled
2. Check-in date is in future (cannot complete future check-in)
3. All required discussion points not marked complete
4. User lacks permission (not manager or check-in organizer)
5. Check-in is part of series and rules prevent updates

**Solutions**:
1. Verify check-in can be completed
   - Check-in date must be today or past
   - Status must be "Scheduled" (not Cancelled, Rescheduled)
   - All discussion points should be addressed
2. Check user permissions
   - Only manager can mark complete
   - Employee cannot update status
   - Contact manager if needed
3. Complete discussion points first
   - Mark discussion points as covered
   - Add notes to discussion points
   - This helps track completion
4. Retry after resolving dependencies
   - Wait if recurring series is being updated
   - Try again in 1-2 minutes

**Prevention**:
- Show status clearly
- Disable completion button if not allowed
- Explain why action cannot be performed
- Suggest next valid action

---

#### Issue: Recurring Check-In Series Not Creating New Events

**Symptoms**:
- Set up weekly check-in series
- First check-in created
- No subsequent check-ins auto-generated
- Recurring ended prematurely

**Causes**:
1. Series was manually stopped
2. Employee was terminated (series auto-stops)
3. Frequency setting is wrong
4. Series end date passed
5. Manager disabled recurring

**Solutions**:
1. Check series status
   - Open series settings
   - Verify "Active" toggle is ON
   - Check series end date (if set)
2. Verify frequency setting
   - Confirm frequency is not "One-Time"
   - Check frequency duration (weekly, bi-weekly, etc.)
   - Edit series to change frequency
3. Check employee status
   - If employee is inactive/deleted, series stops
   - Reactivate employee to resume series
   - Create new series if needed
4. Extend series end date
   - Open series
   - Click "Extend" or update end date
   - Save changes
5. Re-enable recurring
   - Edit series settings
   - Toggle recurring ON
   - Set frequency and end date

**Prevention**:
- Show series status clearly
- Warn before stopping recurring series
- Auto-extend series if needed
- Notify manager of series changes

---

### Performance Review Management

#### Issue: "Review Cannot Be Created - Date Conflict"

**Error Message**:
```
409 Conflict: Overlapping performance review already exists for these employees
```

**Causes**:
1. Same employee(s) already in another active review
2. Dates overlap with existing review
3. System prevents simultaneous reviews by design
4. Date range includes dates with active reviews

**Solutions**:
1. Check existing review dates
   - View all active reviews in Performance Reviews list
   - Note the date ranges
   - Schedule new review outside these dates
2. Use different employee population
   - Exclude employees in existing reviews
   - Or wait for existing review to close
3. Check for partial overlaps
   - Ensure new review start is after existing review ends
   - Or ensure new review ends before existing review starts
4. Contact admin
   - Admin can force overlap if needed
   - Provide business justification
   - Document the exception

**Prevention**:
- Check existing reviews before creating new one
- Show calendar view of active reviews
- Warn about overlaps during event creation
- Suggest alternative date ranges

---

#### Issue: Assessment Form Shows Missing Questions

**Symptoms**:
- Assessment form incomplete
- Expected sections/questions not visible
- Error message about form structure

**Causes**:
1. Template was edited after review creation
2. Template was deleted
3. Form corrupted during creation
4. User lacks access to see all questions
5. Questions hidden by conditional logic

**Solutions**:
1. Refresh the form
   - Press F5 or reload page
   - Close and reopen assessment
2. Check template status
   - Verify template still exists
   - Template should be in "Active" status
   - Contact HR if template was modified
3. Contact HR/Admin
   - Template may have been edited
   - Request template be restored
   - May need to recreate assessment from new template
4. Check permissions
   - Verify user has access to review
   - Confirm reviewer role is assigned
   - Ask admin to grant access
5. Check conditional logic
   - Some questions may be conditional
   - Answer parent questions first
   - Questions appear based on previous answers

**Prevention**:
- Lock templates once review starts
- Show template version in assessment
- Warn before modifying active templates
- Provide template history/versioning

---

#### Issue: Calibration Session Shows Wrong Distribution

**Symptoms**:
- Rating distribution doesn't match individual assessments
- Outliers not highlighted
- Competency filters not working

**Causes**:
1. Not all assessments submitted yet
2. Filter is applied but not shown
3. Assessments still in draft status
4. Competency field is empty in some assessments
5. Cache not refreshed

**Solutions**:
1. Wait for all assessments to complete
   - Calibration data includes only submitted assessments
   - Check assessment completion dashboard
   - Remind reviewers to submit
2. Verify filters
   - Check if competency filter is applied
   - Reset filters to see all data
   - Ensure correct competency selected
3. Refresh calibration view
   - Click "Refresh" or reload page
   - Cache updates every 5 minutes
   - Data should update automatically
4. Check assessment status
   - Assessments must be submitted
   - Draft assessments not included
   - Complete or submit pending assessments
5. Verify competency mapping
   - All assessment questions must map to competency
   - Ask HR/Admin to review template mapping
   - Recreate assessment if mapping missing

**Prevention**:
- Show filter status clearly
- Display "last updated" timestamp
- Include only submitted assessments automatically
- Provide data completeness indicator

---

### Time & Attendance Management

#### Issue: Timesheet Shows Missing Time Logs

**Symptoms**:
- Time logs recorded but not appearing in timesheet
- Gaps in daily time entries
- Total hours calculated incorrectly

**Causes**:
1. Time logs deleted by manager
2. Employee added time logs to wrong period
3. Filter is hiding logs (by status, employee, etc.)
4. Cache not refreshed
5. Time logs in different company/department

**Solutions**:
1. Check timesheet period
   - Verify viewing correct timesheet cycle
   - Dates match when logs were entered
   - Not viewing wrong month/week
2. Check for filters
   - No active filters hiding logs
   - Status filter includes "All"
   - Time log type filter not restrictive
3. Refresh page
   - Press F5 or reload
   - Close and reopen timesheet
   - Wait for cache to refresh
4. Check time log status
   - Time logs must be approved (if required)
   - Ask manager to approve logs
   - Resubmit if rejected
5. Contact manager
   - Ask if logs were deleted
   - Request to re-enter logs
   - Check deletion history (admin access)

**Prevention**:
- Show filter status clearly
- Require approval before deletion
- Add undo/recovery period
- Log all deletions to audit trail
- Show "last updated" timestamp

---

#### Issue: Leave Request Approval Takes Too Long

**Symptoms**:
- Request submitted but not approved
- No notification from manager
- Status shows "Pending" for days

**Causes**:
1. Manager hasn't reviewed request
2. Manager busy or out of office
3. Request waiting for additional info
4. Escalation chain misconfigured
5. Notification didn't reach manager

**Solutions**:
1. Follow up with manager
   - Send reminder email to manager
   - Check if manager is out of office
   - Ask for approval status
2. Check request status
   - Open leave request detail
   - Verify all required fields complete
   - No validation errors
3. Escalate if needed
   - HR can override and approve
   - Contact HR directly
   - Provide business justification
4. Verify notification settings
   - Manager has email notifications enabled
   - Check manager's email address
   - Resend notification (if available)
5. Check approval workflow
   - Verify correct manager assigned
   - Multiple approvers might be needed
   - Check workflow configuration

**Prevention**:
- Show approval status clearly
- Send automatic reminders after X days
- Allow employee to request escalation
- Notify HR of delayed approvals
- Document approval SLA

---

#### Issue: "You Cannot Import This Time Log Format"

**Error Message**:
```
400 Bad Request: Invalid file format. Expected columns: Employee ID, Date, Hours
```

**Causes**:
1. File format incorrect (PDF instead of Excel/CSV)
2. Column headers don't match expected format
3. Column order is different
4. Data type mismatches (text for numeric)
5. File size exceeds limit (10MB)

**Solutions**:
1. Verify file format
   - Use Excel (.xlsx, .xls) or CSV
   - Not PDF or other formats
   - Download template from system
2. Check column headers
   - First row must have column headers
   - Headers must match exactly:
     - Employee ID
     - Date
     - Hours Worked (or Clock In/Out times)
   - Check column names in error message
3. Verify data types
   - Date column: ISO format (YYYY-MM-DD)
   - Hours: Numeric (8.5, not "8 hours 30 min")
   - Employee ID: String matching system IDs
4. Reduce file size
   - If file > 10MB, split into multiple files
   - Remove unnecessary columns
   - Compress if needed
5. Use import template
   - Download template from Import dialog
   - Fill template with your data
   - Preserve format exactly

**Prevention**:
- Provide downloadable template
- Show preview with validation errors
- Highlight column mismatches
- Suggest corrections in preview
- Link to format documentation

---

#### Issue: Timesheet Locked - "Cannot Submit for Approval"

**Error Message**:
```
403 Forbidden: Timesheet cycle is locked and cannot be modified
```

**Causes**:
1. Timesheet cycle was closed by HR
2. Approval period has passed
3. Payroll already processed
4. Admin locked cycle for corrections
5. Bulk operation in progress

**Solutions**:
1. Check cycle status
   - View timesheet cycle details
   - Status shows if locked/closed
2. Contact HR/Manager
   - Ask why cycle is locked
   - Request unlock if needed
   - May need to modify through manager
3. Check deadline
   - Timesheet deadlines are firm
   - Late submissions need HR approval
   - Ask HR to extend if necessary
4. Use next cycle
   - Submit in next timesheet period
   - Contact HR for back-dating if urgent
5. Check for bulk operations
   - HR might be performing batch updates
   - Wait and try again in a few minutes

**Prevention**:
- Show lock status clearly
- Warn before submitting after deadline
- Provide grace period
- Notify of upcoming deadlines
- Allow HR to unlock for editing

---

### Form Template Issues

#### Issue: "Cannot Delete Template - Still in Use"

**Error Message**:
```
400 Bad Request: Template cannot be deleted as it is used by 3 active reviews
```

**Causes**:
1. Template is used by active performance reviews
2. Completed reviews still reference template
3. Draft reviews in progress
4. Template is default template (cannot delete)

**Solutions**:
1. Deactivate instead of delete
   - Use "Deactivate" option
   - Template remains available for history
   - Future reviews won't use template
2. Wait for reviews to complete
   - Once all reviews close, template can be deleted
   - Or ask HR to close reviews first
3. Edit reviews to use different template
   - Change reviews to use alternative template
   - Then delete original template
4. Contact HR/Admin
   - Admin can force delete if needed
   - But may break completed review viewing
   - Consider just deactivating instead

**Prevention**:
- Show usage count before deletion
- Suggest deactivation as alternative
- Archive instead of delete
- Keep historical templates for compliance

---

#### Issue: Form Questions Not Showing in Assessment

**Symptoms**:
- Created template with 10 questions
- Assessment form shows only 5 questions
- Some sections missing

**Causes**:
1. Questions marked as optional and not visible
2. Conditional logic hiding questions
3. Template was edited after review creation
4. Question visibility restricted by role
5. Browser cache issue

**Solutions**:
1. Refresh assessment form
   - Reload page (Ctrl+F5)
   - Close browser tab and reopen
2. Check question settings
   - Open template
   - Verify questions are not hidden
   - Check visibility settings
   - Confirm questions not deleted
3. Check conditional logic
   - Some questions appear based on answers
   - Answer parent questions first
   - Questions appear dynamically
4. Verify template not modified
   - Template shouldn't change during review
   - If modified, some questions may not match
   - Ask HR about template changes
5. Check role-based visibility
   - Some questions only visible to specific roles
   - Verify you have correct role
   - Ask admin to check permissions

**Prevention**:
- Lock templates once review starts
- Show all questions in preview
- Explain conditional logic
- Warn about template modifications
- Test forms before using in reviews

---

### Kudos Management

#### Issue: "Cannot Send Kudos - Insufficient Quota"

**Error Message**:
```
400 Bad Request: You have exhausted your weekly kudos quota. Try again next week.
```

**Causes**:
1. User has used all kudos points for the week
2. Weekly quota configured is too low
3. Quota reset not processed yet (usually Monday 00:00 UTC)
4. User attempting to send more points than remaining quota
5. Company configuration missing or incomplete

**Solutions**:
1. Wait for quota reset
   - Weekly quota resets every Monday at midnight UTC
   - Check current remaining quota in profile
   - Plan kudos distribution throughout the week
2. Verify quota balance
   - Check `/api/Kudos/quota` endpoint
   - View "Remaining Points" in UI
   - Ensure not exceeding allowed amount
3. Contact HR/Admin
   - Request quota increase if needed
   - Admin can adjust company's weekly quota setting
   - Consider business justification for increase
4. Check company configuration
   - Admin: verify KudosCompanySetting exists in database
   - Check DefaultWeeklyCredit value is set
   - Ensure DefaultPointsPerTransaction is configured

**Prevention**:
- Display remaining quota prominently in Send Kudos dialog
- Warn when quota is running low
- Show quota reset countdown
- Distribute kudos throughout the week

---

#### Issue: "Kudos Not Appearing in Feed"

**Symptoms**:
- Kudos sent successfully
- Transaction not visible in kudos feed
- Recipient says they haven't received kudos
- No Teams notification received

**Causes**:
1. Cache not refreshed
2. Filter is hiding kudos (date range, employee, etc.)
3. Kudos sent to wrong recipient
4. Network/API failure during send
5. Company configuration incomplete

**Solutions**:
1. Refresh the feed
   - Press F5 or reload page
   - Close and reopen Teams plugin
   - Wait 30 seconds for cache refresh
2. Check filters
   - Reset all filters to default
   - Expand date range
   - Clear search text
3. Verify transaction created
   - Check in Admin dashboard (HR/Admin only)
   - Use `/api/Kudos/list` to view all transactions
   - Confirm transaction exists with correct recipient
4. Check recipient details
   - Verify correct employee was selected
   - Confirm recipient is active employee
   - Check recipient's company matches yours
5. Verify company configuration
   - Ensure NotificationProvider is configured for Teams notifications
   - Check tenant ID and channel webhook URL
   - Verify Graph API permissions if using adaptive cards

**Prevention**:
- Show confirmation dialog after sending
- Display sent kudos immediately (optimistic UI)
- Provide "View Sent" section
- Log all send attempts for troubleshooting

---

#### Issue: "Cannot React to Transaction - Already Reacted"

**Error Message**:
```
400 Bad Request: This user has reacted
```

**Causes**:
1. User already liked this kudos transaction
2. Double-click on reaction button
3. Network delay caused duplicate request
4. Browser cached old state

**Solutions**:
1. Refresh to see current state
   - Reaction may already be recorded
   - UI should show reaction count updated
   - Reload page to sync state
2. Unlike if needed
   - Click reaction again to toggle (if implemented)
   - If toggle not available, reaction is permanent
3. Check reaction status
   - API returns `liked: true` if user has reacted
   - UI should reflect this state
   - Report bug if UI shows wrong state
4. Clear browser cache
   - Ctrl+Shift+Delete to clear cache
   - Reload page
   - Try reacting again

**Prevention**:
- Disable reaction button after first click
- Show loading state during API call
- Update UI immediately (optimistic update)
- Show clear "already liked" state

---

#### Issue: "Comment Not Saving"

**Error Message**:
```
400 Bad Request: Transaction not found
```
or
```
500 Internal Server Error
```

**Causes**:
1. Transaction was deleted
2. Comment text is empty or whitespace only
3. Network connectivity issue
4. Server timeout on long comments
5. Special characters causing parsing issues

**Solutions**:
1. Verify transaction exists
   - Refresh kudos feed
   - Transaction may have been deleted
   - Contact admin if transaction missing
2. Check comment content
   - Ensure text is not empty
   - Remove special characters if issues persist
   - Keep comments concise (under 500 characters)
3. Retry submission
   - Wait a few seconds and try again
   - Check network connection
   - Try from different browser
4. Simplify comment
   - Remove emojis temporarily
   - Use plain text only
   - Shorten comment length

**Prevention**:
- Validate comment before submitting
- Show character count
- Display error message clearly
- Auto-save draft comments
- Confirm comment posted successfully

---

#### Issue: "Teams Notification Not Received"

**Symptoms**:
- Kudos sent successfully
- Recipient never received Teams notification
- Channel notification not posted
- No adaptive card appeared

**Causes**:
1. NotificationProvider not configured
2. Webhook URL invalid or expired
3. Graph API permissions missing
4. Tenant ID mismatch
5. Teams channel deleted or renamed
6. Recipient not in Teams tenant

**Solutions**:
1. Verify NotificationProvider configuration
   - Check KudosCompanySetting in database
   - Ensure NotificationProviders JSON is valid
   - Verify TenantId matches Azure AD tenant
2. Test webhook URL
   - Manually POST to webhook URL
   - Check for 2xx response
   - Recreate webhook if expired
3. Check Graph API permissions
   - Verify app registration in Azure AD
   - Ensure ChannelMessage.Send permission
   - Check admin consent granted
4. Verify recipient mapping
   - Recipient email must match Teams user
   - Check email domain matches tenant
   - Verify recipient has Teams license
5. Check Teams channel
   - Ensure channel still exists
   - Verify bot/connector is still added
   - Re-add webhook if removed

**Prevention**:
- Test notification setup after configuration
- Log notification delivery status
- Provide fallback (email) notification
- Monitor webhook health
- Alert admin of delivery failures

---

#### Issue: "Leaderboard Shows Wrong Rankings"

**Symptoms**:
- Known top receiver not appearing at top
- Point totals don't match manual calculation
- Some employees missing from leaderboard

**Causes**:
1. Date range filter applied
2. Cache not refreshed
3. Calculating sent vs received points
4. Employee no longer active
5. Cross-company visibility rules

**Solutions**:
1. Check date range
   - Leaderboard may be filtered by month/quarter/year
   - Expand date range to see all-time rankings
   - Verify filter matches expectation
2. Refresh leaderboard
   - Press F5 or reload page
   - Leaderboard caches for performance
   - Manual refresh updates data
3. Verify calculation type
   - "Received" leaderboard: total points received
   - "Sent" leaderboard: total kudos sent (not points)
   - Ensure viewing correct leaderboard type
4. Check employee status
   - Inactive/deleted employees may be excluded
   - Contact HR to verify employee status
5. Wait for sync
   - Recent transactions may take 1-5 minutes
   - Leaderboard updates on interval
   - Try again shortly

**Prevention**:
- Show filter status prominently
- Display "last updated" timestamp
- Include calculation explanation
- Provide refresh button

---

## Best Practices

### Goal Management Best Practices

1. **Set Clear, Measurable Goals**
   - Use SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)
   - Define measurement unit and target value clearly
   - Include timeline/target date

2. **Align Goals Vertically**
   - Link individual goals to team goals
   - Link team goals to organizational objectives
   - Use parent goal linking

3. **Regular Progress Tracking**
   - Update goal progress weekly or bi-weekly
   - Don't wait until end of period
   - Use check-ins to discuss progress
   - Document blockers and solutions

4. **Use Appropriate Visibility**
   - Private: Personal development goals
   - Team: Collaborative team goals
   - Organization: Company-wide objectives
   - Don't hide goals that should be shared

5. **Review and Adapt**
   - Quarterly goal reviews
   - Adjust goals based on business changes
   - Cancel goals that no longer align
   - Learn from completed goals

---

### Check-In Best Practices

1. **Regular Cadence**
   - Weekly for high-touch relationships
   - Bi-weekly for moderate engagement
   - Monthly for stable, experienced employees
   - Be consistent with scheduling

2. **Prepare in Advance**
   - Review employee's goals before check-in
   - Note recent accomplishments
   - Identify discussion topics
   - Gather relevant metrics/feedback

3. **Use Discussion Templates**
   - Start with template (don't start blank)
   - Customize for specific employee
   - Include goal reviews
   - Include development conversation

4. **Document Outcomes**
   - Record notes during/after meeting
   - Document action items
   - Assign owners and due dates
   - Share notes with employee

5. **Build on Continuity**
   - Review previous check-in notes
   - Track action item completion
   - Monitor trend of topics
   - Use history to improve conversations

---

### Performance Review Best Practices

1. **Plan Early**
   - Schedule review cycles in advance
   - Announce timeline to organization
   - Prepare assessors ahead of time
   - Ensure template selection finalized

2. **Diverse Feedback Sources**
   - Use 360 reviews when possible
   - Include peer feedback
   - Include manager assessment
   - Include self-assessment

3. **Structured Process**
   - Clear assessment criteria
   - Defined rating scales
   - Use consistent templates
   - Follow defined workflow

4. **Calibration & Consistency**
   - Conduct calibration sessions
   - Ensure rating consistency across raters
   - Discuss outliers
   - Document decisions

5. **Timely & Constructive Feedback**
   - Deliver feedback soon after review closes
   - Focus on development, not just evaluation
   - Provide specific examples
   - Create action plans for growth

---

### Time & Attendance Best Practices

1. **Clear Policies**
   - Define working hours
   - Document shift schedules
   - Communicate overtime rules
   - Set holiday calendar annually

2. **Regular Submission**
   - Submit timesheets weekly/bi-weekly
   - Don't accumulate late submissions
   - Review before submitting
   - Keep time entries current

3. **Accurate Tracking**
   - Record actual hours worked
   - Include breaks as required
   - Note any exceptions/special times
   - Flag overtime immediately

4. **Timely Approvals**
   - Manager reviews within 2 business days
   - Address discrepancies quickly
   - Resubmit if rejected
   - Communicate any issues early

5. **Leave Planning**
   - Request leave in advance when possible
   - Follow company leave policies
   - Arrange coverage/backup
   - Update team on availability

---

### Kudos Management Best Practices

1. **Foster Recognition Culture**
   - Encourage regular peer-to-peer recognition
   - Lead by example (managers send kudos too)
   - Celebrate both big wins and small contributions
   - Make recognition visible to the team

2. **Be Specific and Meaningful**
   - Mention specific actions or behaviors
   - Explain the impact of the contribution
   - Tie recognition to company values
   - Avoid generic "good job" messages

3. **Distribute Recognition Evenly**
   - Don't exhaust quota on one person
   - Recognize diverse contributions across team
   - Include quiet contributors, not just vocal ones
   - Spread kudos throughout the week

4. **Leverage Social Features (v1.1.0)**
   - React to kudos to amplify recognition
   - Add comments to share additional context
   - Engage with team's recognition activities
   - Build community through interactions

5. **Monitor and Celebrate**
   - Review leaderboard monthly
   - Highlight top givers and receivers
   - Share recognition trends in team meetings
   - Adjust quota if engagement is high

6. **Configure Properly (Admins)**
   - Set appropriate weekly quota per company size
   - Configure Teams notifications for visibility
   - Enable admin dashboard for monitoring
   - Document configuration for new admins

---

## FAQ

### General Questions

**Q: Who has access to bravoGROWTH?**
A: All employees with Employee or higher role in the company. Feature access depends on company subscription:
- Goal Management: Included in all plans
- Check-In Management: Added in Growth plan
- Performance Review: Added in Growth+ plan
- Time & Attendance: Added with specific subscription

**Q: What browsers are supported?**
A: Chrome, Firefox, Safari, Edge (latest versions). Recommend clearing cache if experiencing issues.

**Q: Is bravoGROWTH GDPR compliant?**
A: Yes, all data is encrypted and handled per GDPR requirements. See privacy policy for details.

---

### Goal Management FAQ

**Q: Can I edit a goal after employees have discussed it in check-ins?**
A: Yes, goals can be edited at any time while in Active status. However, changes may affect related discussions. Notify employees of significant changes.

**Q: What happens to goals when an employee leaves?**
A: Employee's own goals are archived. Shared goals remain active for team. Manager can reassign goal ownership.

**Q: Can I set a goal with no target value?**
A: No, target value is required for measuring progress. Use a metric that makes sense (units, percentage, amount, etc.).

---

### Check-In FAQ

**Q: How often should we conduct check-ins?**
A: Recommended: Weekly for new employees, Bi-weekly for standard engagement, Monthly for senior/experienced. Adjust based on need.

**Q: Can employees schedule their own check-ins?**
A: No, only managers can schedule. Employees can request or suggest dates, but manager must formally schedule.

**Q: What if a check-in is cancelled?**
A: Cancelled check-ins appear in history. If it's recurring, next check-in still generates on schedule. Manager can manually reschedule if needed.

---

### Performance Review FAQ

**Q: How long does a review cycle typically take?**
A: 4-8 weeks depending on organization size and review type. 360 reviews take longer than manager-only reviews.

**Q: Can reviewers change their assessment after submitting?**
A: No, once submitted, assessment is locked. Manager must unlock for revision if needed.

**Q: What if an employee disagrees with their review?**
A: Employee can add response comments. Formal appeals process handled outside of system (check HR policy).

**Q: Can reviews be done outside the scheduled cycle?**
A: Ad-hoc reviews must be created as separate events. Avoid overlapping review dates for same employee.

---

### Time & Attendance FAQ

**Q: What if I forgot to clock out?**
A: Manager can manually add time log for the day. Email manager with the hours and explanation.

**Q: Can I submit a timesheet late?**
A: Depends on company policy and whether timesheet cycle is closed. Contact manager or HR for late submissions.

**Q: How are overtime hours calculated?**
A: Company policy defines threshold (typically 40 hours/week). Hours over threshold multiplied by overtime rate (typically 1.5x).

**Q: What's the difference between Leave Request and Attendance Exception?**
A: Leave Request: Taking full day or multiple days off (PTO, sick, unpaid). Attendance Exception: Temporary deviation from schedule (late, early, WFH for part of day).

---

### Kudos Management FAQ

**Q: How many kudos can I send per week?**
A: The weekly quota is configured by your company administrator. Typical values range from 3-10 kudos per week. Check your remaining quota in the Send Kudos dialog or profile page.

**Q: When does my kudos quota reset?**
A: Weekly quota resets every Monday at midnight UTC. Any unused quota does not carry over to the next week.

**Q: Can I see who liked my kudos? (v1.1.0)**
A: Yes, the reaction count is visible on each kudos card. In future updates, clicking the count may show the list of people who reacted.

**Q: Is there a limit on comments per kudos? (v1.1.0)**
A: Currently no limit on the number of comments per transaction. However, individual comments should be kept concise for readability.

**Q: Can I delete a kudos I sent?**
A: No, once sent, kudos cannot be deleted by the sender. Contact your HR administrator if you sent kudos in error.

**Q: Why don't I see the Kudos feature?**
A: Kudos must be enabled for your company. Contact your administrator to:
1. Add the KudosCompanySetting record to the database
2. Configure the weekly quota and notification settings
3. Ensure the Microsoft Teams plugin is deployed (if using Teams)

**Q: Can I send kudos to someone in a different company?**
A: No, kudos can only be sent within your own company. Cross-company recognition is not supported.

**Q: How are leaderboard points calculated?**
A: The leaderboard shows total points received (not number of kudos). If each kudos is worth 10 points and you received 5 kudos, your score is 50 points.

**Q: Do reactions and comments affect leaderboard scores?**
A: No, reactions and comments are social engagement features only. They do not affect point totals or leaderboard rankings.

---

## Performance Tips

### For Slow Dashboard Loading

1. Clear browser cache
   - Chrome: Ctrl+Shift+Delete
   - Firefox: Ctrl+Shift+Delete
2. Reduce data range
   - Filter to specific teams/departments
   - Use date range filters
3. Try different browser
   - Rule out browser-specific issues
4. Contact support
   - Provide timeframe when slowness occurred
   - Note which dashboard/report

### For Large Bulk Operations

1. Break into smaller batches
   - Import 500 records at a time instead of 5000
   - Use pagination for processing
2. Schedule during off-hours
   - Run bulk imports evening/weekend
   - Less impact on other users
3. Use background jobs
   - Large operations run as background jobs
   - Check progress in notifications

---

## Support & Contact

For additional help:

1. **Check This Documentation** - Most common issues covered
2. **Check Knowledge Base** - Additional articles and examples
3. **Contact Support** - Email: support@bravosuite.com
4. **Contact HR Team** - Internal HR support for feature questions
5. **System Status** - Check status.bravosuite.com for incidents

---

**Last Updated:** 2025-12-31
**Troubleshooting Version:** 1.1 (Added Kudos Management)
