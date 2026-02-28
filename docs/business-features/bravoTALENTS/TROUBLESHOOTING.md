# bravoTALENTS Troubleshooting & Common Scenarios

> Solutions for common issues and best practices for bravoTALENTS operations

---

## Common Issues & Solutions

### Candidate Management

#### Issue: "Duplicate Email" Error When Creating Candidate

**Error Message**:
```
409 Conflict: Candidate with this email already exists
```

**Causes**:
1. Candidate already exists in system
2. Email is associated with another candidate record
3. Import includes existing candidate

**Solutions**:
1. Check if candidate exists by searching email
2. If duplicate, update existing record instead of creating new
3. For imports, enable "Skip Duplicates" option
4. Review and merge duplicate records if needed

**Prevention**:
- Always search before creating candidate
- Use import with duplicate detection enabled
- Implement email validation in forms

---

#### Issue: CV Upload Fails with "File Too Large" Error

**Error Message**:
```
413 Payload Too Large: File exceeds maximum size (10MB)
```

**Causes**:
1. File size exceeds 10MB limit
2. PDF is scanned/low-quality image
3. File is corrupted

**Solutions**:
1. Compress PDF before upload (use PDF compression tool)
2. Reduce image quality in PDF
3. Try uploading in different format (PDF, DOC, DOCX)
4. Check file is not corrupted

**Prevention**:
- Encourage candidates to submit optimized CVs
- Show file size limit in UI
- Provide compression guidelines

---

#### Issue: Bulk Import Shows "Invalid Email Format"

**Error Message**:
```
Row 3: Invalid email format - "john.example.com"
```

**Causes**:
1. Missing @ symbol in email
2. Invalid domain format
3. Extra spaces in email field
4. Non-ASCII characters in email

**Solutions**:
1. Correct email format in source file
2. Check for leading/trailing spaces
3. Use standard ASCII characters only
4. Validate emails before import
5. Use "Fix & Retry" feature to correct errors inline

**Prevention**:
- Provide CSV template with examples
- Add email format validation in import tool
- Show preview with highlighted errors before import

---

#### Issue: Candidate Appears in Multiple Lists/Duplicated

**Causes**:
1. Multiple email addresses for same person
2. Import created duplicate record
3. Manual entry missed checking for existing record

**Solutions**:
1. Identify all records for same person
2. Review and consolidate data from both records
3. Use "Merge Records" feature (if available)
4. Keep most complete record, delete other
5. Update all related applications to point to consolidated record

**Prevention**:
- Require email verification in forms
- Search before creating new record
- Show search results when similar names detected

---

### Job Management

#### Issue: Job Published to Job Board But Applications Not Syncing

**Symptoms**:
- Job appears on job board
- Applications on job board not appearing in bravoTALENTS
- Applicant count on board differs from system count

**Causes**:
1. Job board integration not properly configured
2. API credentials invalid or expired
3. Sync job failed (no error notification)
4. Applications filtered by job board criteria

**Solutions**:
1. Verify job board integration configuration
   - Check API credentials in Settings
   - Test connection to job board
   - Verify authentication token not expired
2. Check job board sync logs
   - Look for sync errors
   - Verify sync is enabled
3. Manually trigger sync
   - Use "Sync Now" button in settings
   - Wait for sync to complete (may take 5-15 minutes)
4. Check job board for application filtering
   - Ensure "Auto-import" is enabled
   - Check application review status on job board

**Prevention**:
- Set up monitoring for sync failures
- Schedule regular sync audits
- Maintain API credentials documentation
- Notify admins of credential expiration

---

#### Issue: Job Status Changes Not Updating on Job Boards

**Symptoms**:
- Job closed in bravoTALENTS
- Still appears as "Open" on job board
- Manual update required on job board

**Causes**:
1. Status sync not enabled
2. Job board connection interrupted during update
3. Job board API rate limit exceeded
4. Manual override on job board

**Solutions**:
1. Enable automatic status sync in settings
2. Manually sync job status
   - Open job details
   - Click "Sync to Job Boards"
   - Wait for completion
3. Check job board directly
   - Log into job board
   - Verify job status
   - Update manually if needed
4. Check system logs for errors

**Prevention**:
- Enable automatic status sync by default
- Add status sync confirmation dialogs
- Show sync status in UI
- Alert for failed syncs

---

### Interview Management

#### Issue: Interview Calendar Invite Not Received

**Symptoms**:
- Interview scheduled in bravoTALENTS
- Interviewer doesn't receive calendar invite
- No notification in email

**Causes**:
1. Calendar integration not configured
2. Interviewer email incorrect
3. Email system connectivity issue
4. Calendar settings restrict external invites
5. Email marked as spam

**Solutions**:
1. Verify interviewer email address
   - Check email in user profile
   - Confirm spelling
   - Check for extra spaces
2. Resend calendar invite
   - Open interview details
   - Click "Resend Invite"
   - Verify email sent
3. Check email spam/junk folder
4. Verify calendar integration
   - Check if Google/Outlook integration enabled
   - Test email delivery
5. Add system email to trusted senders

**Prevention**:
- Validate email on interviewer creation
- Send test email when setting up interview
- Show invite sent confirmation
- Provide alternative notification method (in-app)

---

#### Issue: Interview Feedback Not Saved

**Symptoms**:
- Interviewer submits feedback
- Page refreshes, feedback appears empty
- Changes not saved

**Causes**:
1. Network connectivity lost during save
2. Browser session expired
3. Interview already has feedback from same interviewer
4. Validation error not shown properly

**Solutions**:
1. Check network connectivity
   - Ensure stable internet connection
   - Retry saving feedback
2. Refresh browser and retry
   - Clear browser cache
   - Log in again
   - Resubmit feedback
3. Check if feedback already exists
   - View existing feedback
   - Update instead of creating new
4. Check for validation errors
   - Look for error messages
   - Ensure all required fields filled
   - Fix validation issues

**Prevention**:
- Show clear error messages
- Add save confirmation dialogs
- Prevent double submission
- Auto-save draft feedback periodically
- Timeout warning before session expires

---

#### Issue: Interview Reminder Not Sent

**Symptoms**:
- Interview scheduled
- No reminder email 24h before
- No reminder notification in app

**Causes**:
1. Email notifications disabled
2. Reminder settings not configured
3. Interview created with past date
4. Job board sync disabled for interview data

**Solutions**:
1. Check notification settings
   - Navigate to Settings > Notifications
   - Verify "Interview Reminder" enabled
   - Check reminder timing (24h, 1h)
2. Check user notification preferences
   - User may have disabled notifications
   - Verify in user profile settings
3. Enable reminder for interview
   - Open interview details
   - Check "Send Reminder" checkbox
   - Save interview
4. For past reminders, manually send
   - Use "Send Reminder" action
   - Select recipients

**Prevention**:
- Enable reminders by default
- Show reminder status in UI
- Allow manual reminder sending
- Log all reminder attempts

---

### Offer Management

#### Issue: Offer Email Includes Incomplete/Wrong Information

**Symptoms**:
- Offer email sent with missing salary
- Offer email shows old job title
- Offer email has wrong candidate name

**Causes**:
1. Email template variables incorrect
2. Offer data not properly saved before sending
3. Template missing required variables
4. Data changed after email sent (too late)

**Solutions**:
1. Draft mode - verify all details before sending
   - Review offer details page completely
   - Check all fields filled correctly
   - Preview email before sending
2. Cancel and resend
   - If email already sent and wrong
   - Create new offer with correct data
   - Send correct version
3. Check email template
   - Verify template has all variables: {{salary}}, {{jobTitle}}, {{candidateName}}
   - Test template with sample data
   - Fix template formatting

**Prevention**:
- Require offer review/approval before sending
- Show "Preview" before sending email
- Highlight missing required fields
- Require explicit confirmation
- Log all offers sent with data snapshot

---

#### Issue: Candidate Receives Offer Email but Deadline Already Passed

**Symptoms**:
- Offer deadline was 3 days ago
- Email delivery delayed
- Candidate cannot respond in time

**Causes**:
1. Email delivery system delay
2. Offer created with deadline less than email delivery time
3. Email stuck in queue or spam
4. System date/time incorrect

**Solutions**:
1. Extend offer deadline
   - Open offer details
   - Change acceptance deadline
   - Notify candidate of extension
2. Resend offer email
   - Click "Resend Offer Email"
   - Update deadline in new email
3. Manual follow-up
   - Contact candidate directly
   - Explain situation
   - Ask for response

**Prevention**:
- Warn if deadline is too soon when creating offer
- Require minimum deadline (e.g., 5 business days)
- Track email delivery status
- Alert if email bounces or delays

---

### Application Pipeline

#### Issue: Application Moves Back to Previous Stage Unexpectedly

**Symptoms**:
- Application was in "Interview Scheduled"
- Now shows "Screening"
- User didn't move it
- No audit trail explanation

**Causes**:
1. Bulk pipeline update affected application
2. Concurrent edit from different user
3. Automated workflow rule triggered
4. System error/inconsistency

**Solutions**:
1. Check activity/audit log
   - View application activity timeline
   - See who made what change and when
2. Review workflow rules
   - Check if automatic rules cause moves
   - Disable if unintended
3. Manual correction
   - Move application back to correct stage
   - Add note explaining what happened
   - Document in activity

**Prevention**:
- Implement audit logging for all moves
- Require confirmation for pipeline moves
- Show who made change in UI
- Lock stage during processing
- Notify team of unexpected changes

---

### Employee Management

#### Issue: Employee Cannot Log In After Creation

**Symptoms**:
- Employee record created
- Employee doesn't receive login invitation
- Employee tries to log in, account not found
- "Invalid credentials" error

**Causes**:
1. Employee invitation email not sent
2. Email address incorrect in employee record
3. User account not created in Accounts service
4. Employee status is "Inactive"

**Solutions**:
1. Check if invitation email sent
   - Navigate to employee record
   - Check "Invitation Sent" status
   - If not sent, click "Resend Invitation"
2. Verify email address
   - Check email in employee record
   - Correct if misspelled
   - Resend invitation after correction
3. Check employee status
   - Verify employee marked as "Active"
   - If inactive, activate employee
   - Resend invitation
4. Verify user created in Accounts
   - May need to sync or manually create
   - Contact system admin if issue persists

**Prevention**:
- Verify email format when creating employee
- Send test email to verify working
- Show invitation status in UI
- Auto-create user account when employee created
- Alert admin if account creation fails

---

#### Issue: Manager Cannot See Team Members in Organizational View

**Symptoms**:
- Manager has no employees showing under them
- "No reports" message when viewing organization
- Manager assignment not working

**Causes**:
1. Manager relationship not properly set
2. Employees assigned to different manager
3. Permission/access restriction
4. Organizational unit configuration issue

**Solutions**:
1. Check employee manager assignment
   - Open employee record
   - Verify correct manager assigned
   - Save if needed
2. Bulk update manager for team
   - Select multiple employees
   - Use bulk action "Change Manager"
   - Assign to correct manager
3. Rebuild organizational hierarchy
   - Run "Rebuild Organization" in admin tools
   - Wait for process to complete
   - Verify in organizational view
4. Check user permissions
   - Verify manager has permission to view team
   - Check role and assigned departments

**Prevention**:
- Validate manager assignment in forms
- Show organization preview during setup
- Require manager confirmation
- Regular audit of organization structure

---

## Email Delivery Issues

### Common Email Problems

#### Emails Not Being Sent

**Diagnosis**:
1. Check email configuration
   ```
   Settings > Email Configuration
   - Verify SMTP server configured
   - Check sender email address
   - Test connection
   ```
2. Check email templates
   - Verify templates exist
   - Check template variables are valid
3. Check email logs
   - Look for error messages
   - Check email queue status

**Solutions**:
- Reconfigure SMTP settings
- Fix email template formatting
- Clear email queue and retry
- Check spam folder for test emails
- Verify firewall allows SMTP

---

#### Emails Going to Spam

**Diagnosis**:
1. Ask candidate to check spam folder
2. Check email headers for issues
3. Review sender reputation

**Solutions**:
- Add system email to trusted senders
- Configure SPF/DKIM records
- Use branded domain for sending
- Check content for spam triggers

---

### Email Template Issues

#### Variables Not Replacing in Sent Email

**Example**:
```
Email shows: "Dear {{candidateName}},"
Instead of: "Dear John Doe,"
```

**Causes**:
1. Variable name misspelled
2. Variable not provided when sending
3. Template syntax error
4. Variable data is null/empty

**Solutions**:
1. Check template variables match actual names
   - {{candidateName}} not {{name}}
   - {{jobTitle}} not {{job}}
2. Provide all required variables when sending
3. Use correct template syntax
   - {{variableName}} for text
   - {{#if condition}} for conditionals
4. Handle null/empty gracefully
   - Add default values
   - Use fallback text

---

## Performance Issues

### System is Slow

**Symptoms**:
- Pages take long to load
- Search results delayed
- Application list hangs
- Reports generation slow

**Diagnosis**:
1. Check system load
   - High CPU/memory usage?
   - Network latency issues?
2. Check database performance
   - Are queries slow?
   - Indexes missing?
3. Check number of records
   - How many candidates?
   - How many applications?

**Solutions**:
1. Optimize search/filters
   - Use specific filters instead of all data
   - Limit date ranges
   - Don't load all records at once
2. Archive old records
   - Move completed applications to archive
   - Delete rejected applications after retention period
3. Upgrade system resources
   - Increase server capacity
   - Upgrade database
4. Use pagination
   - Load only current page
   - Avoid loading thousands of records

---

### Search Results Incomplete

**Symptoms**:
- Search returns 0 results when record exists
- Search misses some matching candidates
- Advanced search returns fewer results than simple search

**Causes**:
1. Text search index not updated
2. Filter criteria too restrictive
3. Candidate status filtered out
4. Search field doesn't include all data

**Solutions**:
1. Try different search terms
2. Review filters applied
3. Clear all filters and retry
4. Check candidate status (might be inactive)
5. Rebuild search indexes (admin action)

**Prevention**:
- Show active filters clearly
- Provide filter suggestions
- Highlight "no results" tips
- Test search regularly

---

## Data Integrity Issues

### Inconsistent or Missing Data

**Symptoms**:
- Candidate count doesn't match applications
- Job applications lost
- Salary figures empty for offers

**Causes**:
1. Failed data migration
2. Partial record update
3. Data corruption
4. System crash during save

**Solutions**:
1. Verify data in database
2. Restore from backup if needed
3. Run data integrity check (admin tool)
4. Manually correct data if possible
5. Contact support if widespread issue

**Prevention**:
- Regular backups
- Data validation rules
- Audit trails
- System monitoring

---

## Access & Permission Issues

### User Cannot Access Feature

**Symptoms**:
- "Access Denied" message
- Menu items not visible
- Feature is grayed out

**Causes**:
1. User doesn't have required role
2. User company has feature disabled
3. Feature access revoked
4. Subscription tier doesn't include feature

**Solutions**:
1. Check user role
   - Go to user management
   - Verify correct role assigned
   - Update role if needed
2. Check company subscription
   - Verify subscription includes feature
   - Check subscription expiration
3. Check feature access
   - Admin can grant access
   - May require subscription upgrade
4. Check feature toggles
   - Admin can enable/disable features
   - Verify feature enabled in settings

**Prevention**:
- Show clear permission errors
- Explain why access denied
- Suggest solutions
- Provide request access flow

---

## Common Best Practices

### Avoiding Common Mistakes

1. **Always Search Before Creating**
   - Check if candidate/job exists
   - Prevents duplicates
   - Saves time

2. **Review Before Sending**
   - Preview offer emails
   - Check all fields filled
   - Verify recipient email correct

3. **Use Bulk Operations Carefully**
   - Test with small batch first
   - Review preview before executing
   - Ensure you understand the action

4. **Archive Old Data Regularly**
   - Remove completed applications
   - Archive closed jobs
   - Keeps system responsive

5. **Keep Data Clean**
   - Fix typos immediately
   - Consolidate duplicates
   - Update when information changes

6. **Maintain Communication**
   - Keep candidate informed
   - Send status updates
   - Respect communication preferences

---

## Getting Help

### Support Channels

1. **In-App Help**
   - Click ? icon for context help
   - Tooltips explain features
   - Live chat with support (if enabled)

2. **Documentation**
   - Search knowledge base
   - Review feature documentation
   - Check FAQ

3. **Contact Support**
   - Email: support@bravosuite.com
   - Phone: [support number]
   - Include error messages and screenshots

4. **System Status**
   - Check status.bravosuite.com
   - Review known issues
   - Check for maintenance windows

### Information to Provide to Support

1. What were you trying to do?
2. What error message did you receive?
3. When did it happen?
4. How many records affected?
5. Screenshots/error details
6. Steps to reproduce

---

## FAQ

**Q: How do I merge duplicate candidates?**
A: See Candidate Management > Issue: Candidate Appears in Multiple Lists

**Q: Can I undo a job closure?**
A: Yes, change job status back to "Open" from job details page.

**Q: How long does job board sync take?**
A: Initial sync 5-15 minutes, then hourly automatic syncs.

**Q: Can candidate apply for multiple jobs?**
A: Yes, each application is separate record in pipeline.

**Q: How is time-to-hire calculated?**
A: From application date to offer acceptance date.

**Q: Can I export candidate list?**
A: Yes, use "Export" button in candidate list view.

**Q: How many users can access one account?**
A: Based on subscription tier (contact sales for limits).

**Q: Is there an API for custom integrations?**
A: Yes, see API-REFERENCE.md for all endpoints.

---

*Last Updated: 2025-12-30*
