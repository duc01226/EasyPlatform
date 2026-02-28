# Supporting Services - Troubleshooting Guide

**Diagnostic guide for common issues, error resolution, and FAQ across all Supporting Services**

---

## Table of Contents

1. [NotificationMessage Service](#notificationmessage-service)
2. [ParserApi Service](#parserapi-service)
3. [PermissionProvider Service](#permissionprovider-service)
4. [CandidateApp Service](#candidateapp-service)
5. [CandidateHub Service](#candidatehub-service)
6. [Cross-Service Integration Issues](#cross-service-integration-issues)
7. [FAQ](#faq)

---

## NotificationMessage Service

### Issue: Push Notifications Not Received on Mobile

**Symptoms**:
- User receives in-app notification but not push notification
- Device appears to be registered but notifications not delivering

**Debugging Steps**:

1. **Check Device Registration**:
   ```bash
   GET /api/notification-receiver/check-receiver-device-existing?deviceTokenId={deviceTokenId}
   ```
   - Verify device is registered in the system
   - Check `registeredAt` timestamp is recent
   - Confirm `applicationId` matches sending application

2. **Verify Push Service Credentials**:
   - Check Firebase Cloud Messaging (FCM) configuration in `appsettings.json`
   - Verify FCM API key is valid and not expired
   - Ensure sender ID matches configuration

3. **Check Notification Status**:
   - Query notification in database: `NotificationMessageEntity` with ID
   - Verify `IsDeleted = false` and notification not archived
   - Check notification `Channels` array includes "push"

4. **Review Service Logs**:
   - Look for push delivery errors in NotificationMessage service logs
   - Search for FCM error responses (401, 403, 404)
   - Check for network timeouts to FCM service

**Common Causes & Solutions**:

| Cause | Solution |
|-------|----------|
| Device token expired | Have user re-register device on login |
| FCM credentials invalid | Update FCM API key in appsettings |
| Device not in registered channel | Check `channels` array includes "push" |
| Device unregistered by user | Verify user didn't manually unregister |
| Notification delivery timeout | Check network connectivity to FCM |
| Device quota exceeded | Check if too many devices registered per user |

---

### Issue: Duplicate Notifications Sent

**Symptoms**:
- Users receive same notification multiple times
- Notification count doesn't match actual sends

**Debugging Steps**:

1. **Check for Duplicate Sends**:
   - Query `NotificationMessageEntity` with same `title`, `message`, `recipientUserId`
   - Look for multiple records created within same minute
   - Check application logs for duplicate command execution

2. **Verify Idempotency**:
   ```bash
   # Check if command handler implements idempotency check
   GET /api/notification/{notificationId}
   ```
   - Verify each send creates unique notification ID
   - Confirm timestamp differences between duplicates

3. **Check Event Bus**:
   - Verify message bus consumer not processing same event twice
   - Look for missing idempotency keys in event processing
   - Check for message bus retry policies causing re-processing

**Solutions**:

| Issue | Fix |
|-------|-----|
| Client sending duplicate | Implement client-side deduplication (check for confirmation) |
| Service processing twice | Add idempotency check to NotifyNewNotificationMessageCommand |
| Event bus re-consuming | Add idempotency tracking to consumer (store processed event IDs) |
| Retry logic too aggressive | Adjust retry policy in service configuration |

**Code Fix Example** (if needed):
```csharp
// Ensure command handler checks for existing notification
protected override async Task<NotifyNewNotificationMessageCommandResult> HandleAsync(
    NotifyNewNotificationMessageCommand req, CancellationToken ct)
{
    // Check if notification already exists (idempotency key)
    var existing = await repository.FirstOrDefaultAsync(
        n => n.IdempotencyKey == req.IdempotencyKey && !n.IsDeleted, ct);

    if (existing != null)
        return new NotifyNewNotificationMessageCommandResult { NotificationId = existing.Id };

    // Create new notification...
}
```

---

### Issue: In-App Messages Not Loading

**Symptoms**:
- `GET /api/notification-receiver/get-in-app-message` returns empty list
- Old messages missing from inbox
- Message count doesn't match database

**Debugging Steps**:

1. **Check Message Retrieval Query**:
   ```bash
   GET /api/notification-receiver/get-in-app-message?skip=0&take=100
   ```
   - Verify response includes proper pagination
   - Check if `items` array is empty or populated

2. **Verify User Context**:
   - Confirm authenticated user matches notifications' `recipientUserId`
   - Check user has correct company context set
   - Verify token claims include correct user identity

3. **Check Message Status Filters**:
   - Query messages with `isRead=false` only (service default)
   - Expand query to include `isRead=true` to find all messages
   - Check deletion filters (soft-deleted messages should be excluded)

4. **Database Query**:
   ```sql
   SELECT * FROM NotificationMessageEntity
   WHERE RecipientUserId = '{userId}'
   AND IsDeleted = 0
   ORDER BY CreatedAt DESC
   LIMIT 100
   ```

**Solutions**:

| Problem | Solution |
|---------|----------|
| No messages created | Check if notification send endpoint being called correctly |
| Wrong user context | Verify authentication token and user claims |
| Messages soft-deleted | Check deletion date vs query date range |
| Query timeout | Add index on `(RecipientUserId, IsDeleted, CreatedAt)` |
| Pagination misconfigured | Verify skip/take parameters valid and positive |

---

### Issue: Device Registration Fails with 409 Conflict

**Symptoms**:
- `POST /api/notification-receiver/save-receiver-device` returns 409
- Client already registered the device
- Unable to re-register after token refresh

**Debugging Steps**:

1. **Check Existing Registration**:
   ```bash
   GET /api/notification-receiver/check-receiver-device-existing?deviceTokenId={token}
   ```
   - If device already registered, decide: update or error
   - Check if previous token still valid or expired

2. **Verify Token Uniqueness**:
   - Confirm token actually changed (FCM issues new token ~monthly)
   - Check database for old token with same device
   - Query for duplicate tokens across different users (should not happen)

3. **Check Application Context**:
   - Verify `applicationId` in request matches registered application
   - Check if device registered for different app ID

**Solutions**:

| Scenario | Action |
|----------|--------|
| Same user re-registering | Return OK without error (idempotent), update registration timestamp |
| Different user same token | This is FCM bug; delete old and register new (should be rare) |
| Token changed from old | Delete old token, register new token |
| Stale registration | Implement 30-day expiration on device registrations, re-register on use |

**Code Example** (idempotent registration):
```csharp
protected override async Task<RegisterNotificationMessageReceiverDeviceCommandResult> HandleAsync(
    RegisterNotificationMessageReceiverDeviceCommand req, CancellationToken ct)
{
    // Check if already registered
    var existing = await repository.FirstOrDefaultAsync(
        d => d.DeviceTokenId == req.DeviceTokenId && d.UserId == RequestContext.UserId(), ct);

    if (existing != null)
    {
        // Update registration timestamp instead of error
        existing.LastSeenAt = Clock.UtcNow;
        await repository.UpdateAsync(existing, ct);
        return new RegisterNotificationMessageReceiverDeviceCommandResult { DeviceId = existing.Id };
    }

    // Create new registration...
}
```

---

## ParserApi Service

### Issue: Resume Parsing Fails with 422 Error

**Symptoms**:
- `POST /api/importPdf2Json` returns 422 Unprocessable Entity
- HTML parsing returns partial or invalid JSON
- Parser timeout on large files

**Debugging Steps**:

1. **Check File Format**:
   - Verify PDF file is valid and not corrupted
   ```bash
   # Test with known good file first
   file /path/to/resume.pdf
   ```
   - For PDF: Check if scanned image (requires OCR) or text-based
   - For HTML: Validate HTML structure with validator

2. **Check PDF Content**:
   ```python
   # Test PDF extraction directly
   import PyPDF2
   with open('resume.pdf', 'rb') as f:
       reader = PyPDF2.PdfReader(f)
       text = reader.pages[0].extract_text()
       print(text[:500])
   ```
   - If text extraction returns empty, PDF is image-based (needs OCR)
   - Check for password-protected PDFs

3. **Verify HTML Structure**:
   - Export fresh LinkedIn profile as HTML
   - Check file size (very large files may timeout)
   - Validate HTML for proper tag structure

4. **Check Service Logs**:
   ```
   Look for: "PDF parsing failed", "Text extraction error", "HTML parsing exception"
   ```
   - Search for specific error in parsing library logs
   - Check for memory/timeout errors on large files

**Common Causes & Solutions**:

| Issue | Cause | Solution |
|-------|-------|----------|
| 422 error | PDF is image-based (scanned) | Use OCR service or upload HTML instead |
| 422 error | Corrupted PDF file | Re-export from LinkedIn or upload new file |
| 422 error | Unsupported file format | Verify file is actually PDF/HTML, not other format |
| Timeout | File too large (>5MB) | Split file or upload smaller resume |
| Empty response | Text extraction returned nothing | Check PDF content is not redacted or blank |
| Partial parsing | HTML structure different from expected | Use updated parser or manually edit fields |

---

### Issue: Parsed Data Missing or Incorrect

**Symptoms**:
- Parser returns incomplete profile (missing experience, education)
- Extracted data has wrong formatting (dates, names)
- Skills or certifications not extracted

**Debugging Steps**:

1. **Inspect Raw Response**:
   - Compare returned JSON with source (PDF/HTML)
   - Check if section exists in source but missing in response

2. **Check Parser CSS Selectors**:
   - For HTML parsing: verify LinkedIn HTML structure hasn't changed
   - Check if LinkedIn updated their profile export format
   - Review parser regex patterns for date/name extraction

3. **Validate Extracted Text**:
   ```python
   # For PDF: check extracted text quality
   parsed_text = extract_text_from_pdf(file)
   print(f"Text length: {len(parsed_text)}")
   print(f"Contains 'Education': {'Education' in parsed_text}")
   ```

**Solutions**:

| Problem | Solution |
|---------|----------|
| Section completely missing | Check if LinkedIn changed export format; update parser CSS selectors |
| Dates wrong format | Update date regex pattern to handle different formats |
| Names missing middle names | Improve name extraction parsing logic |
| Skills empty list | Verify LinkedIn skills section is populated in source; check CSS selector |
| Certifications malformed | Update certification parsing to handle new LinkedIn format |

---

### Issue: Service Timeout or Performance Degradation

**Symptoms**:
- Parsing requests timing out (>30 seconds)
- Service becomes unresponsive after multiple requests
- Memory usage growing continuously

**Debugging Steps**:

1. **Check File Size**:
   - Verify uploaded file is reasonable size (<5MB)
   - Monitor service disk space for temporary files
   - Check if temp files being cleaned up properly

2. **Monitor Service Resources**:
   ```bash
   # Check Python process CPU and memory
   ps aux | grep python
   # Monitor disk space
   df -h
   ```

3. **Check for Memory Leaks**:
   - Review PDF parsing library version (may have leak in old version)
   - Check if temporary objects being released after parsing

4. **Database Connectivity**:
   - If service stores parsed results, check database connection timeout
   - Verify database indexes for result storage query

**Solutions**:

| Issue | Fix |
|-------|-----|
| Large files timing out | Implement file size limit (500KB - 2MB max) |
| Memory growing | Add periodic service restart, check for leaks in PDF library |
| Disk space full | Implement cleanup of temporary parsing files (>1 hour old) |
| Database slow | Add indexes on result storage queries |
| CPU maxed out | Implement request queuing, limit concurrent parsing |

**Configuration Changes**:
```python
# In Django settings for ParserApi
PARSER_CONFIG = {
    'MAX_FILE_SIZE_MB': 2,
    'PARSING_TIMEOUT_SECONDS': 30,
    'MAX_CONCURRENT_REQUESTS': 5,
    'TEMP_FILE_CLEANUP_MINUTES': 60
}
```

---

## PermissionProvider Service

### Issue: Subscription Not Found or Inaccessible

**Symptoms**:
- `GET /api/subscription/{id}` returns 404
- Company can't access subscription details
- Feature access check always returns inactive

**Debugging Steps**:

1. **Verify Subscription Exists**:
   ```bash
   GET /api/subscription/{subscriptionId}
   # Should return 200, not 404
   ```
   - Check if subscription ID is correct
   - Verify subscription not soft-deleted in database

2. **Check Company Context**:
   - Confirm authenticated user belongs to company owning subscription
   - Verify company ID in subscription matches user's company
   - Check user role (must be admin/owner to view details)

3. **Database Query**:
   ```sql
   SELECT * FROM Subscription
   WHERE Id = '{subscriptionId}'
   AND IsDeleted = 0
   ```

**Solutions**:

| Error | Cause | Fix |
|-------|-------|-----|
| 404 | Subscription soft-deleted | Check deletion reason, reinstate if needed |
| 404 | Wrong company context | Verify user company matches subscription company |
| 403 Forbidden | User lacks admin role | Assign admin role or use appropriate account |
| Timeout | Large data load | Add indexes on Subscription queries |

---

### Issue: Payment Declined or Payment Processing Fails

**Symptoms**:
- `POST /api/subscription/pay-invoice` returns 402 Payment Required
- Credit card validation fails during subscription create
- Payment processor returns error

**Debugging Steps**:

1. **Check Card Details**:
   - Verify card number, expiry, CVV are correct
   - Confirm card not expired
   - Check if card blocked by bank

2. **Check Payment Gateway**:
   ```bash
   # Check if payment processor is accessible
   curl https://api.paymentgateway.com/health
   ```
   - Verify payment gateway credentials in appsettings
   - Check API key hasn't expired or been revoked
   - Verify gateway supports card type (Visa, Mastercard, etc.)

3. **Check Payment History**:
   - Query previous transactions for same card
   - Look for patterns (fraud detection, velocity limits)
   - Check if card hitting transaction limits

**Solutions**:

| Error | Solution |
|-------|----------|
| 402 Payment Required | Card declined - try different card or contact issuer |
| Invalid credentials | Update payment gateway API key in appsettings |
| Timeout | Check network connectivity to payment gateway |
| Duplicate charge | Implement idempotency key to prevent re-charges |
| Amount mismatch | Verify prorated calculation is correct |

---

### Issue: User Roles Not Applied or Cached Policies Stale

**Symptoms**:
- `POST /api/user-policy/set-roles` succeeds but permissions not updated
- User still has old roles after update
- `GET /api/user-policy` returns stale data

**Debugging Steps**:

1. **Check Cache**:
   - Verify cache cleared after role update
   - Check cache TTL and expiration time
   ```bash
   # If using Redis
   redis-cli GET user-policy-{userId}
   ```
   - Look for stale timestamp in response

2. **Verify Database Update**:
   ```sql
   SELECT * FROM UserPolicy
   WHERE UserId = '{userId}'
   AND CompanyId = '{companyId}'
   ORDER BY UpdatedAt DESC
   ```
   - Confirm latest record has new roles
   - Check UpdatedAt timestamp matches expected time

3. **Check Event Publishing**:
   - Verify UserPolicyChanged event published after update
   - Look in event log for user policy sync events
   - Check if downstream services received update

**Solutions**:

| Problem | Solution |
|---------|----------|
| Cache not cleared | Clear cache manually: `DELETE user-policy-cache-{userId}` |
| Cache TTL too long | Reduce TTL from 1 hour to 5 minutes, add event-based invalidation |
| Database not updated | Check if update command actually persisted, verify transaction committed |
| Event not published | Verify event publishing after UpdateAsync, add logging |

---

### Issue: Subscription Upgrade Fails with Prorated Calculation Error

**Symptoms**:
- `POST /api/subscription/upgrade` returns error
- Prorated cost calculation appears incorrect
- Invoice adjustment doesn't match expected amount

**Debugging Steps**:

1. **Verify Subscription Status**:
   ```bash
   GET /api/subscription/{subscriptionId}
   ```
   - Check `billingPeriod` (monthly/annual)
   - Verify `nextBillingDate` is correct
   - Confirm current package can upgrade to requested package

2. **Check Proration Calculation**:
   ```
   Days remaining = (NextBillingDate - Today).Days
   DailyRate_OldPackage = MonthlyPrice / 30
   DailyRate_NewPackage = NewMonthlyPrice / 30
   ProratedCredit = DailyRate_OldPackage * DaysRemaining
   ProratedCharge = DailyRate_NewPackage * DaysRemaining
   Adjustment = ProratedCharge - ProratedCredit
   ```
   - Manually calculate to verify logic
   - Check if using 30/31 days correctly for month-end

3. **Check Payment Processing**:
   - Verify payment method valid for new charge
   - Check if account has sufficient balance/credit limit

**Solutions**:

| Issue | Fix |
|-------|-----|
| Calculation incorrect | Review proration logic, handle month-end dates correctly |
| Downgrade fails | Ensure prorated credit correctly applied to next invoice |
| Payment fails | Update payment method before upgrade |
| Effective date wrong | Verify effective date <= next billing date |

---

## CandidateApp Service

### Issue: Applicant Profile Not Loading or Incomplete

**Symptoms**:
- `GET /api/applicant/with-cvs` returns 404 or empty CVs
- Profile data missing fields
- CV list empty despite uploads

**Debugging Steps**:

1. **Verify Applicant Exists**:
   ```bash
   GET /api/applicant/with-cvs
   ```
   - Check if applicant record created for current user
   - Look for applicant creation event or migration

2. **Check User Mapping**:
   ```sql
   SELECT * FROM Applicant
   WHERE UserId = '{objectId}'
   AND IsDeleted = 0
   ```
   - Verify applicant linked to correct user object ID
   - Check if user from different tenant/directory

3. **Verify CV Association**:
   ```sql
   SELECT * FROM CurriculumVitae
   WHERE ApplicantId = '{applicantId}'
   AND IsDeleted = 0
   ```
   - Check if CVs exist for applicant
   - Verify CV not soft-deleted or archived

**Solutions**:

| Problem | Solution |
|---------|----------|
| No applicant record | Create applicant via first login or import workflow |
| User ID mismatch | Map user object ID correctly from authentication token |
| CVs empty | Check if CV import from ParserApi succeeded |
| Fields missing | Verify input form submitted all required fields |
| Data truncated | Check field length limits in database schema |

---

### Issue: Application Submission Fails or Gets Stuck

**Symptoms**:
- `POST /api/application/submit-application` times out or returns error
- Application status stays as "Draft" after submit
- Applicant doesn't receive confirmation

**Debugging Steps**:

1. **Check Application Status**:
   ```bash
   GET /api/application
   # Filter for application ID in list
   ```
   - Verify application exists and is in draft state
   - Check if application has required fields filled

2. **Verify Validation**:
   - Ensure all required responses filled
   - Check if CV selected is valid
   - Verify job still available for application

3. **Check Event Publishing**:
   - Look for ApplicationSubmittedEventBusMessage in event bus logs
   - Verify NotificationMessage service received event
   - Check if employer module created application record

4. **Database Check**:
   ```sql
   SELECT * FROM Application
   WHERE Id = '{applicationId}'
   ```
   - Verify Status field updated to "Submitted"
   - Check SubmittedAt timestamp

**Solutions**:

| Issue | Fix |
|-------|-----|
| Validation fails | Ensure all required fields: CV selected, responses filled |
| Timeout on submit | Check job service availability, verify database connection |
| Event not published | Check event bus connection, verify message broker running |
| Status not updated | Verify transaction committed, check for concurrency issues |
| Notification missing | Verify NotificationMessage service can create notifications |

---

### Issue: File Upload Fails or Files Not Accessible

**Symptoms**:
- `POST /api/attachments` fails with 400 or 413 error
- Uploaded file not retrievable via `GET /api/attachments/get-link-attachment/{id}`
- Download link returns 403 or 404

**Debugging Steps**:

1. **Check File Size**:
   - Verify file < 10MB limit
   - Check configured max upload size in appsettings
   ```
   // appsettings.json
   "FileUpload": {
     "MaxFileSizeBytes": 10485760,  // 10MB
     "AllowedExtensions": [".pdf", ".doc", ".docx"]
   }
   ```

2. **Check Storage Configuration**:
   - Verify Azure Storage or S3 connection
   - Check storage account access keys valid
   - Confirm storage container exists and permissions correct

3. **Verify File Permissions**:
   ```bash
   GET /api/attachments/get-link-attachment/{attachmentId}
   ```
   - Check if user accessing is file owner
   - Verify attachment not soft-deleted
   - Check if download token still valid

4. **Check Attachment Record**:
   ```sql
   SELECT * FROM Attachment
   WHERE Id = '{attachmentId}'
   ```
   - Verify attachment record created successfully
   - Check StorageUrl is populated
   - Verify IsDeleted = 0

**Solutions**:

| Error | Cause | Solution |
|-------|-------|----------|
| 413 Payload Too Large | File >10MB | Reduce file size or increase limit in config |
| 400 Bad Request | Invalid file type | Upload only PDF, DOC, DOCX files |
| 403 Forbidden | Permission denied | Verify user is file owner, check CV ownership |
| 404 Not Found | Attachment not created | Check storage upload succeeded, verify database insert |
| Download link broken | Storage URL expired | Regenerate link, check storage SAS token TTL |

---

### Issue: ETag Caching Not Working

**Symptoms**:
- `GET /api/application` or `GET /api/job` always returns full list, never 304
- ETag header missing from response
- If-None-Match header ignored

**Debugging Steps**:

1. **Check Response Headers**:
   ```bash
   curl -i https://api.example.com/api/application
   # Look for ETag header in response
   ```
   - Verify ETag header present in first response
   - Check ETag value format (should be quoted hash)

2. **Verify Client Caching**:
   ```bash
   # Make second request with ETag
   curl -H "If-None-Match: W/\"hash-value\"" https://api.example.com/api/application
   # Should return 304 if unchanged
   ```
   - Confirm client sending If-None-Match header
   - Check ETag value matches previous response

3. **Check Data Changes**:
   - If data changed since first request, 304 won't return (correct behavior)
   - Verify row versions in database haven't updated
   - Check application/job deleted or modified

**Solutions**:

| Problem | Fix |
|---------|-----|
| ETag not generating | Implement ETag generation from row version hash |
| Header missing | Ensure ETag set in response before returning |
| 304 not returned | Verify If-None-Match comparison matches ETag exactly |
| Client not caching | Update client to send If-None-Match header on repeat requests |

---

## CandidateHub Service

### Issue: Job Matching Returns No Results

**Symptoms**:
- `POST /api/candidates/get-job-matching-scores` returns empty list
- Matched candidates count is 0 despite job posted
- Cache issue suspected

**Debugging Steps**:

1. **Verify Job Exists**:
   ```bash
   # Check if job posted and published
   GET /api/candidates/get-matched-candidates-for-job
   # Should return candidates with same filters as scoring request
   ```

2. **Check Cache State**:
   - Look for cache key in memory: `job-matching-{jobId}-{hash}`
   - If cached, verify cache TTL hasn't expired
   - Check if cache contains stale data

3. **Verify Candidate Data**:
   ```sql
   SELECT COUNT(*) FROM Candidate
   WHERE IsActive = 1
   AND HasRequiredSkills = 1
   ```
   - Confirm candidates exist in hub database
   - Check if candidates match job location/requirements

4. **Check Import Status**:
   - Verify `ImportCandidatesFromCvAppCommand` has run
   - Check candidate sync timestamp from CandidateApp
   - Look for import errors in logs

**Solutions**:

| Issue | Cause | Solution |
|-------|-------|----------|
| 0 results | No matching candidates | Broaden search criteria, check candidate import status |
| Empty DB | Candidates not imported | Run manual import: `GET /api/candidates/import-candidates-from-cv-app` |
| Stale cache | Old results cached | Clear cache: `DELETE job-matching-*` or wait for TTL expire |
| Wrong filters | Job filters too strict | Verify required skills match candidate profiles |

---

### Issue: Candidate Scores Incorrect or Inconsistent

**Symptoms**:
- `POST /api/candidates/get-candidates-score` returns unexpected scores
- Scores vary between requests for same candidate
- Score breakdown doesn't match individual components

**Debugging Steps**:

1. **Verify Score Calculation**:
   - Check score formula: `(experience * 0.4) + (skills * 0.3) + ...`
   - Manually calculate for sample candidate
   - Compare calculated vs returned score

2. **Check Source Data**:
   ```sql
   SELECT * FROM Candidate WHERE Id = '{candidateId}'
   SELECT * FROM CandidateSkill WHERE CandidateId = '{candidateId}'
   SELECT * FROM CandidateExperience WHERE CandidateId = '{candidateId}'
   ```
   - Verify experience years, skills listed
   - Check if data complete or missing fields

3. **Verify Scoring Weights**:
   - Check if weights in request match algorithm weights
   - Confirm all scoring categories enabled
   - Look for configuration overrides

**Solutions**:

| Problem | Solution |
|---------|----------|
| Scores inconsistent | Check if random selection in algorithm, disable randomness |
| Wrong weights applied | Verify weights in request match service configuration |
| Missing data = low score | Encourage candidates to complete profiles |
| Skill level not matching | Update skill matching logic, check for typos |

---

### Issue: Candidate Import from CandidateApp Fails

**Symptoms**:
- `GET /api/candidates/import-candidates-from-cv-app` returns 0 imported
- Manual trigger doesn't import new candidates
- Sync job fails silently

**Debugging Steps**:

1. **Check CandidateApp Connectivity**:
   ```bash
   curl -H "Authorization: Bearer {token}" https://candidateapp-api/api/applicant
   # Should return applicant list
   ```
   - Verify CandidateApp service is running
   - Check network connectivity and firewall
   - Verify API endpoint configuration

2. **Check Credentials**:
   - Verify service-to-service authentication token
   - Check if BasicAuth credentials valid
   - Confirm IdentityServer token not expired

3. **Database Query**:
   ```sql
   SELECT TOP 10 * FROM Applicant
   WHERE LastSyncDate IS NULL
   OR LastSyncDate < DATEADD(day, -1, GETDATE())
   ```
   - Check if candidates marked for sync
   - Verify sync timestamp being updated

4. **Check Logs**:
   - Look for `ImportCandidatesFromCvAppCommand` execution
   - Search for connectivity errors to CandidateApp
   - Check for mapping failures

**Solutions**:

| Issue | Fix |
|-------|-----|
| Connection refused | Verify CandidateApp running, check firewall rules |
| 401 Unauthorized | Update service credentials, renew token |
| Timeout | Increase timeout, check for network latency |
| 0 candidates returned | Verify applicants exist in CandidateApp |

---

### Issue: Vip24 Sync Fails or Doesn't Update

**Symptoms**:
- `PUT /api/candidates/schedule-candidates-weekly` returns error
- Daily sync runs but doesn't pull new Vip24 candidates
- Privacy settings not syncing from Vip24

**Debugging Steps**:

1. **Check Vip24 Connectivity**:
   ```bash
   # Verify Vip24 API accessible
   curl https://vip24-api.example.com/health
   ```
   - Check Vip24 API endpoint in configuration
   - Verify API key/credentials valid
   - Check if Vip24 service maintenance window

2. **Check Import Commands**:
   ```
   Look for logs:
   - "ImportCandidatesFromVip24Command"
   - "UpdateCandidateVip24ProfilesDailyCommand"
   - "UpdateCandidateVip24ProfilesWeeklyCommand"
   ```
   - Verify command execution started
   - Check for completion timestamp

3. **Verify Data Mapping**:
   ```sql
   SELECT * FROM Candidate
   WHERE SourceSystem = 'vip24'
   ORDER BY LastSyncDate DESC
   LIMIT 10
   ```
   - Check if Vip24 candidates in database
   - Verify field mapping (name, email, skills)

**Solutions**:

| Problem | Solution |
|---------|----------|
| API unreachable | Check Vip24 endpoint, verify VPN/firewall access |
| Auth failed | Verify Vip24 API credentials, check for expiration |
| No data mapped | Review field mapping logic, check for structure changes |
| Partial sync | Implement resume capability or batch processing |

---

## Cross-Service Integration Issues

### Issue: ApplicantChanged Event Not Triggering Downstream Services

**Symptoms**:
- Applicant updated in CandidateApp but CandidateHub doesn't reflect change
- NotificationMessage not sending applicant-related notifications
- Event bus shows no consumers for ApplicantChangedEventBusMessage

**Debugging Steps**:

1. **Verify Event Publishing**:
   ```bash
   # In CandidateApp after update
   PUT /api/applicant
   ```
   - Check service logs for event publish call
   - Verify `ApplicantChangedEventBusMessage` created
   - Confirm event serialization successful

2. **Check Event Bus Configuration**:
   - Verify RabbitMQ/message broker running
   - Check connection string in appsettings
   - Confirm exchange/queue declarations

3. **Verify Consumers Registered**:
   - Look for consumer registrations in CandidateHub startup
   - Check PermissionProvider event handlers
   - Verify service subscribed to correct routing key

4. **Check Message Processing**:
   ```
   RabbitMQ Management Console: https://localhost:15672
   - Check for messages in queues
   - Verify no "dead letter" accumulation
   - Check consumer acknowledgments
   ```

**Solutions**:

| Issue | Fix |
|-------|-----|
| Event not published | Add logging to UpdateAsync, verify command completing |
| Message broker down | Restart RabbitMQ/Redis, check configuration |
| No consumers | Verify consumer registration in service startup |
| Messages stuck | Check for exceptions in consumer, implement dead letter handler |
| Event format mismatch | Verify event DTOs aligned across services |

---

### Issue: Subscription Change Not Reflected in Feature Access

**Symptoms**:
- User upgrades subscription but still can't access new features
- Feature access check still returns inactive after subscription activated
- Permission sync delayed or missing

**Debugging Steps**:

1. **Verify Subscription Updated**:
   ```bash
   GET /api/subscription/{subscriptionId}
   ```
   - Confirm status shows "Active"
   - Check features array includes expected feature
   - Verify next billing date updated

2. **Check User Policy Sync**:
   ```bash
   GET /api/user-policy
   # Should reflect new subscription features
   ```
   - Look for cached vs fresh data
   - Check last sync timestamp
   - Verify policy includes new features

3. **Check Permission Cache**:
   - Clear user policy cache for affected user
   - Trigger manual sync: `POST /api/user-policy/sync-all`
   - Wait for eventual consistency (usually <1 minute)

**Solutions**:

| Problem | Solution |
|---------|----------|
| Cache not cleared | Manual cache clear or event-based invalidation |
| Sync delayed | Increase frequency or implement real-time sync |
| Permission not granted | Verify subscription includes feature, check role assignments |

---

## FAQ

### Q: How often should I run CandidateHub sync jobs?

**A**:
- **Daily sync** (`UpdateCandidateVip24ProfilesDailyCommand`): Daily at off-peak hours (3 AM)
- **Weekly sync** (`UpdateCandidateVip24ProfilesWeeklyCommand`): Weekly for comprehensive reconciliation (Sunday 3 AM)
- **CandidateApp import**: Every 6 hours or after major import batches
- Monitor sync duration; if >30 minutes, consider splitting into batches

---

### Q: What's the recommended cache TTL for job matching scores?

**A**:
- **Development**: 15 minutes (detect changes quickly)
- **Staging**: 1 hour
- **Production**: 2-4 hours (balance freshness vs performance)
- Configure via `CandhedScoreTimeByHour` in appsettings
- Use query-hash based invalidation for immediate cache clear

---

### Q: How do I handle notification delivery failures?

**A**:
1. First attempt: Push notification (instant)
2. Fallback (15 min later): Email notification if configured
3. Final fallback: In-app message (always visible)
4. Implement exponential backoff for retries
5. Log all failures for monitoring dashboard

---

### Q: Can I delete notifications after a certain age?

**A**:
Yes, implement cleanup job:
```csharp
[PlatformRecurringJob("0 2 * * *")]  // Daily at 2 AM
public class CleanOldNotificationsJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override async Task ProcessPagedAsync(...)
    {
        var cutoffDate = Clock.UtcNow.AddDays(-90);
        await repository.DeleteManyAsync(
            n => n.CreatedAt < cutoffDate && n.IsRead,
            dismissSendEvent: true);
    }
}
```

---

### Q: What fields are required for resume parsing to work?

**A**:
- **PDF**: Must be text-based PDF (not scanned image). Requires: text extraction library (PyPDF2)
- **HTML**: Needs proper LinkedIn export HTML with expected structure. Requires: CSS selector matching
- **Minimum data**: At least name, one work experience, or education for meaningful results
- **Best practice**: Have users export fresh LinkedIn profile, not cached old exports

---

### Q: How do I prevent duplicate subscriptions for one company?

**A**:
Implement validation in `CreateSubscriptionCommand`:
```csharp
protected override async Task<PlatformValidationResult<CreateSubscriptionCommand>> ValidateRequestAsync(...)
{
    return await v.AndAsync(_ => !repo.AnyAsync(
        s => s.CompanyId == req.CompanyId &&
             s.Status == SubscriptionStatus.Active &&
             !s.IsCancelled, ct),
        "Company already has active subscription");
}
```

---

### Q: What's the recommended approach for bulk candidate imports?

**A**:
1. **Batch size**: 100-500 candidates per batch
2. **Frequency**: During off-peak hours (11 PM - 6 AM)
3. **Monitoring**: Track import progress, failed records
4. **Retry**: Implement exponential backoff for failed batches
5. **Notification**: Alert admin upon completion or errors

---

### Q: How do I troubleshoot ETag caching issues?

**A**:
1. Enable in requests: `curl -i -H "If-None-Match: {previousETag}" URL`
2. Check response: Should show `304 Not Modified` if unchanged
3. If not working:
   - Verify ETag hash calculation includes all data
   - Check row version updates in database
   - Ensure client properly stores and sends ETag
   - Clear browser cache if testing manually

---

### Q: Can I use PermissionProvider across multiple products?

**A**:
Yes, PermissionProvider is designed as platform-wide service:
- Supports multiple subscription packages
- Enforces subscription per module/product code
- Manages cross-product user policies
- Billing aggregated across all products for company

---

### Q: What happens when subscription renewal fails?

**A**:
1. **First attempt**: Retry with 24-hour delay
2. **Second attempt**: Retry with 48-hour delay (notify admin)
3. **Grace period**: Continue access for 7 days
4. **Suspension**: Auto-suspend after grace period
5. **Reinstate**: Admin can reinstate and retry payment once payment resolves

---

**Last Updated**: 2025-12-31
**Documentation Version**: 1.0
**Applicable Services**: All Supporting Services
**Maintenance**: Update when new features released or issues discovered

