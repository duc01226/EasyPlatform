# bravoSURVEYS Troubleshooting Guide

Comprehensive troubleshooting guide for common issues, debugging techniques, and frequently asked questions.

## Table of Contents

1. [Common Issues & Solutions](#common-issues--solutions)
2. [Debugging Techniques](#debugging-techniques)
3. [Configuration Issues](#configuration-issues)
4. [API Troubleshooting](#api-troubleshooting)
5. [Performance Issues](#performance-issues)
6. [Data Issues](#data-issues)
7. [Frequently Asked Questions (FAQ)](#frequently-asked-questions-faq)
8. [Getting Help & Support](#getting-help--support)

---

## Common Issues & Solutions

### Issue: Survey Not Appearing in List

**Symptoms:**
- Created a survey but cannot find it in the survey list
- Survey shows in one location but not another
- Status filter hides survey unexpectedly

**Root Causes:**
1. Survey in Draft status and list filtered to Active only
2. Incorrect user permissions
3. Survey soft-deleted
4. Pagination skip/take parameters hiding the survey

**Solutions:**

1. **Check Survey Status:**
   - Go to list view
   - Remove or change status filter to include "Draft"
   - Ensure you're looking at all statuses, not filtered view

2. **Verify Permissions:**
   - Check if you have at least "View" permission on survey
   - Ask survey owner to grant access if needed
   - Check user role in the system (Admin role sees all surveys)

3. **Check Pagination:**
   - If survey list is paginated, navigate through pages
   - Use search to find survey by title
   - Check total count shown at bottom of list

4. **Restore if Deleted:**
   - Deleted surveys are soft-deleted (recoverable)
   - Contact admin to restore from backup if necessary

**Example API Debugging:**
```bash
# Get all surveys including Draft status
GET /api/surveys?skip=0&take=100&status=Draft

# Search for specific survey by title
GET /api/surveys?searchText=MySurveyTitle
```

---

### Issue: Questions Not Saving

**Symptoms:**
- Question appears to save but reverts when page refreshed
- Save button doesn't respond
- Error message appears about validation failure

**Root Causes:**
1. Required fields missing (question text, question type)
2. Invalid question type or configuration
3. Concurrency conflict (another user modified simultaneously)
4. ETag mismatch
5. Permission denied (Edit permission required)

**Solutions:**

1. **Verify Required Fields:**
   - Ensure "Question Text" is not empty
   - Select a valid "Question Type"
   - For choice questions, ensure at least one option is defined
   - Check that answer options have text (not just empty)

2. **Check Validation Requirements:**
   - If "Required" toggle is on, ensure answer type is appropriate
   - Verify display logic doesn't create impossible conditions
   - Check for circular dependencies in skip logic

3. **Handle Concurrency Issues:**
   - If you see "Precondition Failed" error (412)
   - Close and reopen the page to reload latest version
   - Only one person should edit survey at a time
   - Communicate with team to coordinate editing

4. **Verify Permissions:**
   - Check that you have "Edit" permission on survey
   - If denied, ask survey owner to grant Edit access

**Example Debugging:**
```
Check browser console for error messages:
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for error messages with details
4. Note the error code (e.g., "400 Bad Request")
```

---

### Issue: Import Respondents Fails

**Symptoms:**
- File upload fails or hangs
- Error message about file format
- Some rows import but others fail
- Validation errors during preview

**Root Causes:**
1. File format not supported (must be CSV or Excel)
2. File is too large
3. Column names don't match expected format
4. Data validation failures (invalid email, phone formats)
5. Permission denied (need access to survey)

**Solutions:**

1. **Check File Format:**
   - Use CSV (comma-separated) or Excel (.xlsx)
   - Ensure file is not corrupted
   - Check that file size is under limit (usually 10MB)
   - Export from Excel as CSV (UTF-8 encoded)

2. **Validate Column Names:**
   - Required columns: Email (or Phone for SMS)
   - Optional columns: FirstName, LastName, custom fields
   - Column names are case-sensitive in some cases
   - Ensure no special characters in column names

3. **Fix Data Issues:**
   - Email format: must contain @ and domain
   - Phone format: should include country code for international
   - No duplicate email addresses within import
   - Required fields cannot be empty

4. **Use Preview Feature:**
   - Always use "Preview Data" before final import
   - Review first rows to spot issues
   - Check error count in preview results
   - Correct source file if errors found

**Example Data Validation:**
```
✓ Valid email: john.smith@company.com
✗ Invalid email: john.smith@
✗ Invalid email: john.smith

✓ Valid phone: +1-555-0100 or 5550100
✗ Invalid phone: 555 (too short)

✓ Valid row: John | Smith | john@company.com
✗ Invalid row: | | (empty required fields)
```

**Resolution Steps:**
1. Open import file in Excel
2. Correct identified issues
3. Save as CSV (UTF-8)
4. Return to survey and retry import
5. Use preview to validate before final import

---

### Issue: Survey Distribution Not Sending

**Symptoms:**
- Distribution status shows "Draft" or "Scheduled" but not "Sent"
- No emails/SMS messages received by respondents
- Distribution appears stuck
- Status says "Sending" for extended period

**Root Causes:**
1. Distribution not actually sent (still in Draft state)
2. Email/SMS template validation failed
3. No valid respondent contacts
4. Permission denied
5. Email delivery service issue
6. Scheduled date in the future

**Solutions:**

1. **Verify Distribution Status:**
   - Check distribution status in list
   - If status is "Draft", you haven't initiated send
   - Send manually by clicking "Send Now" button
   - For scheduled, check if scheduled date is in future

2. **Validate Email Configuration:**
   - Verify "From" address is valid and configured
   - Check "Subject" line is not empty
   - Review email body for personalization variable errors
   - Ensure {SurveyLink} variable is included for respondent access

3. **Check Respondent List:**
   - Verify respondent list has contacts
   - Check that respondents have email (for email distribution) or phone (for SMS)
   - Remove respondents with invalid contact info
   - Verify respondent count matches expected

4. **Check Email Delivery Status:**
   ```
   GET /api/surveys/{surveyId}/distributions/{distributionId}/status
   ```
   - Review metrics for bounced, failed, or pending emails
   - Check delivery logs for specific failures
   - Look for bounce reasons (invalid email, mailbox full, etc.)

5. **Verify Permissions:**
   - Ensure you have "Distribute" permission on survey
   - Admin can distribute on behalf of others

**Email Template Troubleshooting:**
```
Check personalization variables:
✓ {FirstName} - replaced with respondent first name
✓ {LastName} - replaced with respondent last name
✓ {Email} - replaced with respondent email
✓ {SurveyLink} - replaced with unique survey access URL
✗ {InvalidField} - will show as literal text if field not found

Check for common issues:
- Missing closing brace: {FirstName (missing )
- Typo in field name: {firstname} (case sensitive)
- Space in variable: { FirstName } (no spaces)
```

---

### Issue: Survey Display Logic Not Working

**Symptoms:**
- Questions appear when they shouldn't
- Questions don't appear when they should
- Skip logic not functioning correctly
- Pages show out of expected order

**Root Causes:**
1. Logic conditions incorrectly configured
2. Circular dependency in logic rules
3. Logical operator (AND/OR) misunderstanding
4. Question not saved properly
5. Browser cache issue

**Solutions:**

1. **Review Logic Configuration:**
   - Click "Edit Logic" on affected question
   - Verify condition references correct parent question
   - Check operator (equals, not equals, contains, etc.) matches intent
   - Verify comparison value matches actual response option

2. **Check for Circular Dependencies:**
   - Question A cannot depend on Question B if B depends on A
   - Avoid chains that loop back: A→B→C→A
   - Test logic path with sample responses

3. **Understand Logic Operators:**
   ```
   equals: exact match (use for single-choice)
   notEquals: opposite of equals
   contains: for text/open-ended questions
   greaterThan: for numeric comparisons
   lessThan: for numeric comparisons
   isEmpty: for optional questions
   isNotEmpty: for answered questions
   ```

4. **Test Logic with Preview:**
   - Use survey preview feature
   - Go through responses following logic conditions
   - Verify each path works as expected
   - Test edge cases and combinations

5. **Clear Browser Cache:**
   - Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear browser cookies for survey domain
   - Try in incognito/private mode to eliminate cache

**Logic Testing Checklist:**
```
For each logic rule:
□ Parent question ID is correct
□ Operator matches data type
□ Comparison value exists as option
□ AND/OR operators make logical sense
□ No circular dependencies exist
□ Default path (no condition match) defined
```

---

### Issue: Survey Responses Not Recording

**Symptoms:**
- Survey appears to submit successfully
- Response not visible in results/dashboard
- Response count not increasing
- Responses disappear after submission

**Root Causes:**
1. Response not actually submitted (validation error)
2. Respondent lost connection during submission
3. Browser cache showing stale data
4. Database issue
5. Permission denied (can't view results)

**Solutions:**

1. **Verify Submission:**
   - Check if respondent received confirmation message
   - Look for validation errors on survey (red highlights)
   - Verify all required questions answered
   - Try submitting again from fresh survey load

2. **Check Connection:**
   - Ensure stable internet connection
   - Check for network errors in browser console
   - Wait for all questions to load before submitting
   - Avoid closing browser during submission

3. **Refresh Results View:**
   - Hard refresh dashboard (Ctrl+Shift+R)
   - Close and reopen browser
   - Check different browser (Chrome, Firefox, Safari)
   - Wait a few seconds for backend to process

4. **Verify Response Storage:**
   - Check test mode vs. production responses
   - Ensure responses not accidentally in test mode
   - Check response filters aren't hiding responses
   - Verify response date range filter includes submission

5. **Check Permissions:**
   - Verify you have "View" permission on results
   - Results might not show to all users
   - Admin should be able to see all responses

**Debug Steps:**
```
1. Open Browser Developer Tools (F12)
2. Go to Console tab
3. Go to Network tab
4. Submit survey response
5. Look for POST request to /api/response
6. Check response status (should be 200 or 201)
7. Check response body for errors
```

---

## Debugging Techniques

### Using Browser Developer Tools

**Network Tab Analysis:**
1. Open DevTools (F12)
2. Go to Network tab
3. Clear network log
4. Perform action that's failing
5. Look for failed requests (red icons)
6. Click request to see details:
   - Request headers (authentication, content-type)
   - Request payload (what you sent)
   - Response status (200 = success, 400+ = error)
   - Response body (error message details)

**Console Tab for JavaScript Errors:**
1. Go to Console tab
2. Look for red error messages
3. Click on error to see stack trace
4. Note line numbers where errors occur
5. Check for network-related errors

### API Testing with Postman or cURL

**Test Survey Creation:**
```bash
curl -X POST https://api.company.com/api/surveys \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Survey",
    "description": "Testing",
    "language": "en"
  }'
```

**Check Response Status:**
- 200-299: Success
- 400-499: Client error (check request)
- 500+: Server error (contact support)

### Logging & Monitoring

**Enable Debug Logging:**
1. Check if survey service has debug logging
2. Look for detailed error logs in server
3. Correlate timestamps with issue occurrence
4. Check for related errors in other services

**Monitor Performance:**
1. Check page load times
2. Monitor API response times
3. Look for timeouts or slow requests
4. Check server resource usage

---

## Configuration Issues

### Issue: Email Distribution Not Configured

**Symptoms:**
- Cannot create email distribution
- "Email not configured" error message
- Email option disabled or grayed out

**Root Causes:**
1. Email service not configured in system
2. Email credentials not set up
3. Email feature not enabled for company
4. Permission denied

**Solutions:**

1. **Contact System Administrator:**
   - Email service requires backend configuration
   - Admin must configure email provider (SendGrid, SMTP, etc.)
   - Ask admin to verify email credentials

2. **Check Feature License:**
   - Email distribution may be premium feature
   - Company may need appropriate subscription
   - Contact account manager to enable feature

3. **Verify Email Setup:**
   - Ask admin to check email configuration file
   - Verify sender email address is valid
   - Test email connection to SMTP server

---

### Issue: SMS Distribution Issues

**Symptoms:**
- SMS option not available
- SMS messages not delivering
- SMS costs higher than expected
- Undeliverable phone numbers

**Root Causes:**
1. SMS service not configured
2. Phone numbers in wrong format
3. Invalid carrier or region
4. Account credits exhausted

**Solutions:**

1. **Verify SMS Configuration:**
   - SMS service requires setup (Twilio, etc.)
   - Contact admin to confirm SMS is configured
   - Check account credentials and API keys

2. **Validate Phone Numbers:**
   - Include country code: +1-555-0100
   - Remove special characters: 15550100
   - Verify format matches carrier requirements
   - Test with known valid number first

3. **Check Account Status:**
   - Verify SMS account has credits/balance
   - Check for account suspension
   - Review SMS service status page

4. **Test SMS Delivery:**
   - Send test SMS to your own number
   - Verify message content and link
   - Check delivery confirmation

---

## API Troubleshooting

### Issue: 401 Unauthorized - Authentication Failed

**Symptoms:**
- "Unauthorized" error on API calls
- "Invalid token" message
- Cannot access any endpoints
- Works in browser but not in API

**Root Causes:**
1. Missing or invalid access token
2. Token expired
3. Wrong token format
4. Token issued for different application

**Solutions:**

1. **Verify Token Format:**
   ```
   ✓ Correct: Authorization: Bearer eyJhbGc...
   ✗ Wrong: Authorization: eyJhbGc... (missing Bearer)
   ✗ Wrong: token=eyJhbGc... (wrong header)
   ```

2. **Check Token Expiration:**
   - Tokens typically expire after 1 hour
   - Request new token from auth service
   - In browser: tokens renewed automatically
   - In API calls: manually refresh token

3. **Verify Token Scope:**
   - Token must have appropriate scopes
   - Contact admin if scopes need updating

---

### Issue: 403 Forbidden - Permission Denied

**Symptoms:**
- "Access denied" error
- "Insufficient permissions" message
- Can view survey but cannot edit/distribute
- Admin features disabled

**Root Causes:**
1. User role doesn't have required permission
2. Survey-level access not granted
3. User removed from role
4. Permission level too low

**Solutions:**

1. **Check User Role:**
   - Verify your role in system
   - Admin: can do everything
   - Manager: can create and distribute surveys
   - Editor: can create and edit surveys
   - Analyst: can view results
   - Respondent: can only take surveys

2. **Request Survey Access:**
   - Ask survey owner to grant access
   - Request appropriate permission level
   - Provide your user ID or email
   - Wait for access to be granted

3. **Check Permission Level:**
   - View: read-only
   - Edit: can modify design
   - Distribute: can send surveys
   - Full: all permissions

---

### Issue: 404 Not Found - Resource Missing

**Symptoms:**
- "Not found" error
- Resource ID appears correct
- Error on specific endpoint

**Root Causes:**
1. Wrong resource ID
2. Resource was deleted
3. Typo in URL
4. Resource in different survey/company

**Solutions:**

1. **Verify Resource ID:**
   - Double-check ID is correct
   - Use list endpoint to find correct ID
   - Example: `GET /api/surveys` to find survey IDs

2. **Check if Deleted:**
   - Deleted resources are soft-deleted
   - Can be restored by admin
   - Check deletion date if possible

3. **Verify URL Path:**
   - Check for typos in endpoint path
   - Ensure all path parameters filled in
   - Use correct HTTP method (GET vs POST)

---

### Issue: 400 Bad Request - Validation Error

**Symptoms:**
- "Validation failed" error message
- Specific field errors listed
- Request appears correct
- Same code works in browser

**Root Causes:**
1. Missing required field
2. Invalid field format
3. Field value out of range
4. Unsupported value

**Solutions:**

1. **Review Error Details:**
   - Error response lists specific fields with issues
   - Check each mentioned field
   - Verify data type and format

2. **Common Validation Issues:**
   ```
   title: must be non-empty string
   email: must match pattern user@domain.com
   status: must be one of: Draft, Active, Closed
   pageNumber: must be positive integer
   ```

3. **Correct Data Format:**
   - String: "survey title"
   - Number: 123 (not "123")
   - Boolean: true/false (not "true")
   - Date: "2025-12-31T00:00:00Z" (ISO 8601)
   - Array: ["item1", "item2"]

---

### Issue: 412 Conflict - Concurrency Error

**Symptoms:**
- "Precondition Failed" error
- ETag mismatch message
- Cannot save after viewing
- Another user modified error

**Root Causes:**
1. Resource modified by another user
2. ETag in request doesn't match current version
3. Attempting to update stale version

**Solutions:**

1. **Reload Resource:**
   - Close and reopen survey
   - Get latest version from API
   - ETag will be updated

2. **Avoid Concurrent Edits:**
   - Only one person should edit at a time
   - Communicate with team members
   - Notify when you're editing
   - Wait for other editor to finish

3. **Merge Changes If Needed:**
   - Review what changed
   - Decide if changes conflict
   - Reload and reapply your changes if non-conflicting

---

## Performance Issues

### Issue: Survey Editor Slow to Load

**Symptoms:**
- Long delay when opening survey editor
- Freezing or unresponsiveness
- High CPU usage
- Browser becomes laggy

**Root Causes:**
1. Large survey with many questions (100+)
2. Large response dataset
3. Browser resources exhausted
4. Network latency
5. Browser cache issues

**Solutions:**

1. **Check Survey Size:**
   - Large surveys (50+ pages, 500+ questions) are slower
   - Consider splitting into multiple surveys
   - Archive old/completed surveys

2. **Improve Browser Performance:**
   - Close other tabs and applications
   - Clear browser cache
   - Restart browser
   - Try different browser
   - Increase available system RAM

3. **Optimize Network:**
   - Check internet connection speed
   - Move closer to WiFi router
   - Reduce other network usage
   - Try wired connection if available

4. **Upgrade Browser:**
   - Update to latest browser version
   - Modern browsers have better performance
   - Try Chrome, Firefox, or Edge for best performance

---

### Issue: Report Generation Slow or Timing Out

**Symptoms:**
- Report takes very long to generate
- "Request timeout" error
- Frozen progress bar
- Browser unresponsive

**Root Causes:**
1. Very large dataset (100,000+ responses)
2. Complex aggregation queries
3. Server resource constraints
4. Network timeout

**Solutions:**

1. **Filter Results:**
   - Use date range filter to reduce data
   - Filter by respondent segment
   - Exclude incomplete responses if possible
   - Generate report for smaller subset

2. **Simplify Report:**
   - Remove unnecessary questions
   - Reduce visualization complexity
   - Use summary instead of detailed report
   - Generate report in multiple parts

3. **Increase Timeout:**
   - Check API timeout settings
   - Increase timeout in client configuration
   - Request longer timeout from admin

4. **Schedule Report Generation:**
   - For large surveys, use background processing
   - Schedule report generation at off-peak hours
   - Download report when ready

---

### Issue: Import Process Very Slow

**Symptoms:**
- Respondent import takes very long
- Progress bar stuck
- "Operation timeout" error
- Server becoming unresponsive

**Root Causes:**
1. Very large import file (10,000+ rows)
2. Complex data validation
3. Network issues
4. Server load high

**Solutions:**

1. **Reduce Import Size:**
   - Split large file into smaller batches
   - Import 5,000 rows at a time
   - Perform multiple imports sequentially

2. **Optimize Import:**
   - Remove unnecessary columns from import
   - Pre-validate data before import
   - Remove duplicate records before import

3. **Import at Off-Peak Hours:**
   - Perform imports when server load low
   - Avoid peak usage times
   - Schedule large imports during off-hours

4. **Check Network:**
   - Verify stable internet connection
   - Upload to server closer geographically
   - Check file transfer speed

---

## Data Issues

### Issue: Response Data Seems Incorrect or Missing

**Symptoms:**
- Response counts don't match distribution counts
- Some responses missing from results
- Duplicate responses appear
- Response data corrupted or incomplete

**Root Causes:**
1. Data sync delay
2. Responses not fully processed
3. Database issue
4. Respondent submitted multiple times
5. Test mode responses mixed with production

**Solutions:**

1. **Wait for Processing:**
   - Responses may not appear immediately
   - Wait a few seconds before checking results
   - Dashboard may cache results briefly
   - Hard refresh (Ctrl+Shift+R) to see latest

2. **Check Response Status:**
   - Verify responses are marked "Complete"
   - Partial responses may be excluded from some reports
   - Check response date range in filters
   - Look for test mode responses

3. **Identify Duplicates:**
   - Check if same respondent submitted multiple times
   - Policy allows multiple responses: filter duplicates manually
   - Policy disallows: investigate why second submission allowed
   - Manually delete duplicate if necessary

4. **Separate Test from Production:**
   - Ensure test responses not included in analysis
   - Use separate survey for testing
   - Or mark test responses and filter out

---

### Issue: Translation Data Missing or Incorrect

**Symptoms:**
- Translation not appearing for respondent
- Respondent sees English instead of selected language
- Translated text incorrect or partial
- Language selector not working

**Root Causes:**
1. Translation not completed
2. Translation not published
3. Language setting not enabled
4. Translation data corrupted

**Solutions:**

1. **Check Translation Status:**
   - Go to survey translations
   - Verify all required elements translated
   - Check status is "Published" not "Draft" or "InProgress"
   - Translate missing elements

2. **Enable Language for Survey:**
   - Survey must explicitly support language
   - Add language in survey settings
   - Ensure language selector visible to respondents

3. **Test Translation:**
   - Preview survey in different language
   - Verify all text appears translated
   - Check for placeholder variables
   - Test with actual respondent link

---

## Frequently Asked Questions (FAQ)

### General Questions

**Q: How do I get started with bravoSURVEYS?**
A:
1. Create a new survey (title and description)
2. Add pages to organize questions
3. Add questions with appropriate types
4. Optionally set up logic/branching
5. Publish when ready
6. Import respondents or create respondent list
7. Create distribution (email or SMS)
8. Send to respondents
9. Monitor results in dashboard

See README.md "Quick Start" section for detailed walkthrough.

---

**Q: Can I edit a survey after sending it?**
A:
- Yes, you can edit survey design anytime
- Changes apply only to new/future responses
- Existing responses remain unchanged
- Be cautious editing live surveys due to response inconsistency
- Consider creating new version if major changes needed

---

**Q: How long do surveys stay available to respondents?**
A:
- Default: indefinite (until you close survey)
- You can set expiration date when creating distribution
- You can manually close survey anytime
- Respondents get "Survey Closed" message if try to access closed survey
- Consider closing after survey deadline passes

---

### Survey Design Questions

**Q: What's the maximum number of questions allowed?**
A:
- No hard limit, but performance degrades with 500+ questions
- Recommend keeping surveys under 50 questions
- Use skip logic to show different questions to different respondents
- Consider breaking into multiple surveys if too long

---

**Q: Can I require respondents to answer all questions?**
A:
- Yes, set "Required" toggle for each question
- Respondent cannot submit without answering required questions
- System shows validation error if attempt to skip
- Consider impact on completion rates (required fields reduce completion)

---

**Q: How do I prevent respondents from changing answers?**
A:
- Surveys allow editing answers before submission
- After submission, responses locked
- Currently no feature to lock while survey in progress
- Use "Prevent Back Button" option if available
- Alternatively, require submission after each question

---

### Respondent & Distribution Questions

**Q: Can I send the same survey to the same person twice?**
A:
- Default settings prevent duplicate responses
- Can enable "Allow Multiple Responses" in survey settings
- Duplicate emails in import: system prevents adding same email twice
- For legitimately different respondents, use different email addresses

---

**Q: What happens if email bounces?**
A:
- Bounced emails tracked in distribution status
- Status shows "Bounced" for that respondent
- System records bounce reason if available
- You can manually resend to non-bounced addresses
- Invalid emails should be removed from future distributions

---

**Q: Can I schedule survey to send later?**
A:
- Yes, use "Schedule Distribution" feature
- Set date/time for sending
- Optionally set reminders to non-respondents
- Schedule displayed in distribution status
- You can cancel scheduled distribution if needed

---

**Q: How do I send survey to a large list (100,000+ respondents)?**
A:
- System can handle large distributions
- Performance: may take time to send all
- Consider scheduling during off-peak hours
- Monitor delivery status as emails send
- Use import batching for very large lists
- Contact support for lists over 1 million

---

### Results & Analytics Questions

**Q: When do response results appear?**
A:
- Results appear almost immediately (within seconds)
- Dashboard may cache results, hard refresh to see latest
- Aggregations update in real-time
- Heavy traffic may cause brief delays
- Results include only completed responses by default

---

**Q: Can I edit or delete responses?**
A:
- Delete: soft-deleted responses hidden but recoverable
- Edit: some systems allow response editing, others don't
- Contact admin if need to modify submitted response
- Document reason for any response modifications
- Maintain audit trail of changes

---

**Q: How do I export survey responses?**
A:
- Use "Export Responses" feature
- Choose format: CSV, Excel (xlsx), or JSON
- Filter by date range or response status
- Select which fields to include
- Download file to your computer
- Import into analytics tool if needed

---

### Technical & Support Questions

**Q: What browsers are supported?**
A:
- Chrome (latest version recommended)
- Firefox (latest version recommended)
- Safari (latest version recommended)
- Edge (latest version recommended)
- Mobile browsers: iOS Safari, Chrome for Android
- Avoid very old browsers (IE11 not supported)

---

**Q: Is my data secure?**
A:
- All data encrypted in transit (HTTPS)
- User authentication required (OAuth 2.0)
- Role-based access control
- Soft deletes preserve data
- Regular backups maintained
- Comply with data protection regulations
- Contact admin for detailed security info

---

**Q: What's included in my subscription?**
A:
- Number of surveys allowed
- Number of respondents allowed
- Response data retention period
- Advanced features (custom branding, API access, etc.)
- Email and SMS distribution capabilities
- Support level and response time

Contact sales or account manager for subscription details.

---

**Q: How do I get API access?**
A:
- API available for premium/enterprise accounts
- Request API credentials from admin
- Receive access token for authentication
- See API-REFERENCE.md for endpoint documentation
- Rate limits apply (typically 1000 req/hour)

---

**Q: Can I integrate with third-party tools?**
A:
- Export data to integrate with other systems
- Limited direct API integrations currently available
- Webhook support may be available in future
- Custom integrations possible with enterprise plan
- Contact support for integration options

---

### Performance & Troubleshooting Questions

**Q: Why is my survey so slow?**
A:
- Size: large surveys (500+ questions) slower
- Data: many responses (100,000+) slow reporting
- Network: check internet connection
- Browser: try different browser or clear cache
- See "Performance Issues" section for detailed help

---

**Q: What should I do if I lose access to my survey?**
A:
- Check if you still have login access to account
- Verify user hasn't been deleted or deactivated
- Ask survey owner to grant access again
- Contact admin to restore account if deleted
- Verify survey wasn't soft-deleted

---

**Q: How do I contact support?**
A:
See "Getting Help & Support" section below.

---

## Getting Help & Support

### Support Channels

**Documentation:**
- **README.md** - Complete technical reference
- **API-REFERENCE.md** - API endpoint documentation
- **INDEX.md** - Navigation guide
- **This document** - Troubleshooting guide

**Internal Support:**
1. Check this troubleshooting guide first
2. Search README.md for related topics
3. Check API-REFERENCE.md for API issues
4. Search browser console for error messages

**External Support:**
1. Contact your system administrator
2. Email support team: support@company.com
3. Check system status page: status.company.com
4. Submit support ticket through company portal

### Information to Include in Support Request

When requesting help, include:
1. **What you were trying to do** - Step-by-step reproduction
2. **What went wrong** - Exact error message
3. **When it happened** - Date and time with timezone
4. **Error details:**
   - HTTP status code (200, 400, 404, etc.)
   - Error message from system
   - Any codes or IDs involved
5. **Your environment:**
   - Browser type and version
   - Operating system
   - Network conditions
6. **Screenshots:**
   - Screenshot of error
   - Screenshot of what you tried
   - Screenshot of data involved

### Reporting a Bug

**Include in bug report:**
1. Reproduction steps (numbered list)
2. Expected behavior
3. Actual behavior
4. Error message (exact text)
5. Screenshots or video
6. Affected browser/device
7. When issue started (if known)

### Feature Requests

**Submit feature ideas:**
1. Describe the feature
2. Explain why it's needed
3. Provide use cases
4. Include any mock-ups or examples
5. Indicate priority/urgency

---

**Last Updated:** 2025-12-31
**Version:** 1.0
**Status:** Production Ready

**Related Documentation:**
- [README.md](README.md) - Complete technical reference
- [API-REFERENCE.md](API-REFERENCE.md) - API endpoint specifications
- [INDEX.md](INDEX.md) - Documentation index and navigation guide
