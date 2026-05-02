---
name: arch-security-review
version: 1.1.0
description: '[Architecture] Use when reviewing code for security vulnerabilities, implementing authorization, or ensuring data protection.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:double-round-trip-review -->

> **Deep Multi-Round Review** — Escalating rounds. Round 1 in main session. Round 2+ and EVERY recursive re-review iteration MUST use a fresh sub-agent.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output baseline findings.
>
> **Round 2:** MANDATORY fresh sub-agent review — see `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. The sub-agent re-reads ALL files from scratch with ZERO Round 1 memory. It must catch:
>
> - Cross-cutting concerns missed in Round 1
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the main session rationalized away
>
> **Round 3+ (recursive after fixes):** After ANY fix cycle, MANDATORY fresh sub-agent re-review. Spawn a **NEW** Agent tool call each iteration — never reuse Round 2's agent. Each new agent re-reads ALL files from scratch with full protocol injection. Continue until PASS or **3 fresh-subagent rounds max**, then escalate to user via `AskUserQuestion`.
>
> **Rules:**
>
> - NEVER declare PASS after Round 1 alone
> - NEVER reuse a sub-agent across rounds — every iteration spawns a NEW Agent call
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - Max 3 fresh-subagent rounds per review — if still FAIL, escalate via `AskUserQuestion` (do NOT silently loop)
> - Track round count in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:fresh-context-review -->

> **Fresh Sub-Agent Review** — Eliminate orchestrator confirmation bias via isolated sub-agents.
>
> **Why:** The main agent knows what it (or `/cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** Round 2 of ANY review AND every recursive re-review iteration after fixes. NOT needed when Round 1 already PASSes with zero issues.
>
> **How:**
>
> 1. Spawn a NEW `Agent` tool call — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - NEVER reuse a sub-agent across rounds — every iteration spawns a NEW `Agent` call
> - NEVER skip fresh-subagent review because "last round was clean" — every fix triggers a fresh round
> - Max 3 fresh-subagent rounds per review — escalate via `AskUserQuestion` if still failing; do NOT silently loop or fall back to any prior protocol
> - Track iteration count in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 10 protocol blocks VERBATIM. The template below has ALL 10 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 10 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
description: "Fresh Round {N} review",
subagent_type: "code-reviewer",
prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: JS: === vs ==, typeof null. C#: async void, missing using, LINQ deferred execution.
Classify: CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO.

### Design Patterns Quality
Priority checks for every code change:
1. DRY via OOP: Same-suffix classes (*Entity, *Dto, *Service) MUST share base class. 3+ similar patterns → extract to shared abstraction.
2. Right Responsibility: Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
3. SOLID: Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. From changed files → find TC-{FEAT}-{NNN} in docs/business-features/{Service}/detailed-features/{Feature}.md Section 15.
2. Every changed code path MUST map to a corresponding TC (or flag as "needs TC").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Verify TC evidence fields point to actual code (file:line, not stale references).
5. Auth changes → TC-{FEAT}-02x exist? Data changes → TC-{FEAT}-01x exist?
6. If no specs exist → log gap and recommend /tdd-spec.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Fix-Layer Accountability
NEVER fix at the crash site. Trace the full flow, fix at the owning layer. The crash site is a SYMPTOM, not the cause.
MANDATORY before ANY fix:
1. Trace full data flow — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where bad state ENTERS, not where it CRASHES.
2. Identify the invariant owner — Which layer's contract guarantees this value is valid? Fix at the LOWEST layer that owns the invariant, not the highest layer that consumes it.
3. One fix, maximum protection — If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
4. Verify no bypass paths — Confirm all data flows through the fix point. Check for direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
BLOCKED until: Full data flow traced (origin → crash); Invariant owner identified with file:line evidence; All access sites audited (grep count); Fix layer justified (lowest layer that protects most consumers).
Anti-patterns (REJECT): "Fix it where it crashes" (crash site ≠ cause site, trace upstream); "Add defensive checks at every consumer" (scattered defense = wrong layer); "Both fix is safer" (pick ONE authoritative layer).

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need TaskCreate. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation/Scout: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to .ai/workspace/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- docs/project-reference/code-review-rules.md
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to plans/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 10 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` subagent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both code AND documentation.

## Quick Summary

**Goal:** Review code for security vulnerabilities against OWASP Top 10 and enforce authorization, data protection, and secure coding patterns.

**Workflow:**

1. **Pre-Flight** — Identify security-sensitive areas, check OWASP relevance, review existing patterns
2. **OWASP Audit** — Evaluate code against all 10 categories (access control, injection, auth, etc.)
3. **Project Checks** — Verify authorization attributes, entity access expressions, input validation
4. **Report** — Document findings with severity, vulnerable vs secure code examples

**Key Rules:**

- Always check both backend and frontend attack surfaces
- Use project authorization attributes and entity-level access expressions, never rely on UI-only guards (see docs/project-reference/backend-patterns-reference.md)
- Validate all external data with project validation API, never trust client input (see docs/project-reference/backend-patterns-reference.md)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Security Review Workflow

## When to Use This Skill

- Security audit of code changes
- Implementing authentication/authorization
- Data protection review
- Vulnerability assessment

## Pre-Flight Checklist

- [ ] Identify security-sensitive areas
- [ ] Review OWASP Top 10 relevance
- [ ] Check for existing security patterns
- [ ] Plan remediation approach

## OWASP Top 10 Checklist

### 1. Broken Access Control

```csharp
// :x: VULNERABLE - No authorization check
[HttpGet("{id}")]
public async Task<Employee> Get(string id)
    => await repo.GetByIdAsync(id);

// :white_check_mark: SECURE - Authorization enforced
[HttpGet("{id}")]
[Authorize(Roles.Manager, Roles.Admin)] // project authorization attribute (see docs/project-reference/backend-patterns-reference.md)
public async Task<Employee> Get(string id)
{
    var employee = await repo.GetByIdAsync(id);

    // Verify access to this specific resource
    if (employee.CompanyId != RequestContext.CurrentCompanyId())
        throw new UnauthorizedAccessException();

    return employee;
}
```

### 2. Cryptographic Failures

```csharp
// :x: VULNERABLE - Storing plain text secrets
var apiKey = config["ApiKey"];
await SaveToDatabase(apiKey);

// :white_check_mark: SECURE - Encrypt sensitive data
var encryptedKey = encryptionService.Encrypt(apiKey);
await SaveToDatabase(encryptedKey);

// Use secure configuration
var apiKey = config.GetValue<string>("ApiKey");  // From Azure Key Vault
```

### 3. Injection

```csharp
// :x: VULNERABLE - SQL Injection
var sql = $"SELECT * FROM Users WHERE Name = '{name}'";
await context.Database.ExecuteSqlRawAsync(sql);

// :white_check_mark: SECURE - Parameterized query
await context.Users.Where(u => u.Name == name).ToListAsync();

// Or if raw SQL needed:
await context.Database.ExecuteSqlRawAsync(
    "SELECT * FROM Users WHERE Name = @p0", name);
```

### 4. Insecure Design

```csharp
// :x: VULNERABLE - No rate limiting
[HttpPost("login")]
public async Task<IActionResult> Login(LoginRequest request)
    => await authService.Login(request);

// :white_check_mark: SECURE - Rate limiting applied
[HttpPost("login")]
[RateLimit(MaxRequests = 5, WindowSeconds = 60)]
public async Task<IActionResult> Login(LoginRequest request)
    => await authService.Login(request);
```

### 5. Security Misconfiguration

```csharp
// :x: VULNERABLE - Detailed errors in production
app.UseDeveloperExceptionPage();  // Exposes stack traces

// :white_check_mark: SECURE - Generic errors in production
if (env.IsDevelopment())
    app.UseDeveloperExceptionPage();
else
    app.UseExceptionHandler("/Error");
```

### 6. Vulnerable Components

```bash
# Check for vulnerable packages
dotnet list package --vulnerable

# Update vulnerable packages
dotnet outdated
```

### 7. Authentication Failures

```csharp
// :x: VULNERABLE - Weak password policy
if (password.Length >= 4) { }

// :white_check_mark: SECURE - Strong password policy
public class PasswordPolicy
{
    public bool Validate(string password)
    {
        return password.Length >= 12
            && password.Any(char.IsUpper)
            && password.Any(char.IsLower)
            && password.Any(char.IsDigit)
            && password.Any(c => !char.IsLetterOrDigit(c));
    }
}
```

### 8. Data Integrity Failures

```csharp
// :x: VULNERABLE - No validation of external data
var userData = await externalApi.GetUserAsync(id);
await SaveToDatabase(userData);

// :white_check_mark: SECURE - Validate external data
var userData = await externalApi.GetUserAsync(id);
var validation = userData.Validate();
if (!validation.IsValid)
    throw new ValidationException(validation.Errors);
await SaveToDatabase(userData);
```

### 9. Logging Failures

```csharp
// :x: VULNERABLE - Logging sensitive data
Logger.LogInformation("User login: {Email} {Password}", email, password);

// :white_check_mark: SECURE - Redact sensitive data
Logger.LogInformation("User login: {Email}", email);
// Never log passwords, tokens, or PII
```

### 10. SSRF (Server-Side Request Forgery)

```csharp
// :x: VULNERABLE - User-controlled URL
var url = request.WebhookUrl;
await httpClient.GetAsync(url);  // Could access internal services

// :white_check_mark: SECURE - Validate and restrict URLs
if (!IsAllowedUrl(request.WebhookUrl))
    throw new SecurityException("Invalid webhook URL");

private bool IsAllowedUrl(string url)
{
    var uri = new Uri(url);
    return AllowedDomains.Contains(uri.Host)
        && uri.Scheme == "https";
}
```

## Authorization Patterns

**⚠️ MUST ATTENTION READ:** CLAUDE.md for authorization controller/handler patterns, `RequestContext` usage, and entity-level access filters (see docs/project-reference/backend-patterns-reference.md).

## Data Protection

### Sensitive Data Handling

```csharp
public class SensitiveDataHandler
{
    // Encrypt at rest
    public string EncryptForStorage(string plainText)
        => encryptionService.Encrypt(plainText);

    // Mask for display
    public string MaskEmail(string email)
    {
        var parts = email.Split('@');
        return $"{parts[0][0]}***@{parts[1]}";
    }

    // Never log sensitive data
    public void LogUserAction(User user)
    {
        Logger.LogInformation("User action: {UserId}", user.Id);
        // NOT: Logger.Log("User: {Email} {Phone}", user.Email, user.Phone);
    }
}
```

### File Upload Security

```csharp
public async Task<IActionResult> Upload(IFormFile file)
{
    // Validate file type
    var allowedTypes = new[] { ".pdf", ".docx", ".xlsx" };
    var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
    if (!allowedTypes.Contains(extension))
        return BadRequest("Invalid file type");

    // Validate file size
    if (file.Length > 10 * 1024 * 1024)  // 10MB
        return BadRequest("File too large");

    // Scan for malware (if available)
    if (!await antivirusService.ScanAsync(file))
        return BadRequest("File rejected by security scan");

    // Generate safe filename
    var safeFileName = $"{Guid.NewGuid()}{extension}";

    // Save to isolated storage
    await fileService.SaveAsync(file, safeFileName);

    return Ok();
}
```

## Security Scanning Commands

```bash
# .NET vulnerability scan
dotnet list package --vulnerable

# Outdated packages
dotnet outdated

# Secret scanning
grep -r "password\|secret\|apikey" --include="*.cs" --include="*.json"

# Hardcoded credentials
grep -r "Password=\"" --include="*.cs"
grep -r "connectionString.*password" --include="*.json"
```

## Security Review Checklist

### Authentication

- [ ] Strong password policy enforced
- [ ] Account lockout after failed attempts
- [ ] Secure session management
- [ ] JWT tokens properly validated
- [ ] Refresh token rotation

### Authorization

- [ ] All endpoints require authentication
- [ ] Role-based access control implemented
- [ ] Resource-level permissions checked
- [ ] No privilege escalation possible

### Input Validation

- [ ] All inputs validated
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (output encoding)
- [ ] File uploads validated
- [ ] URL validation for redirects

### Data Protection

- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced
- [ ] No sensitive data in logs
- [ ] Proper error handling (no stack traces)

### Dependencies

- [ ] No known vulnerable packages
- [ ] Dependencies regularly updated
- [ ] Third-party code reviewed

## Anti-Patterns to AVOID

:x: **Trusting client input**

```csharp
var isAdmin = request.IsAdmin;  // User-supplied!
```

:x: **Exposing internal errors**

```csharp
catch (Exception ex) { return BadRequest(ex.ToString()); }
```

:x: **Hardcoded secrets**

```csharp
var apiKey = "sk_live_xxxxx";
```

:x: **Insufficient logging**

```csharp
// No audit trail for sensitive operations
await DeleteAllUsers();
```

## Verification Checklist

- [ ] OWASP Top 10 reviewed
- [ ] Authentication/authorization verified
- [ ] Input validation complete
- [ ] Sensitive data protected
- [ ] No hardcoded secrets
- [ ] Logging appropriate (no PII)
- [ ] Dependencies scanned

## Related

- `arch-performance-optimization`
- `arch-cross-service-integration`
- `code-review`

---

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
      <!-- /SYNC:evidence-based-reasoning:reminder -->
      <!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** execute multi-round review per `SYNC:double-round-trip-review`: Round 1 in main session, Round 2+ via fresh `code-reviewer` sub-agent spawned per `SYNC:fresh-context-review` + `SYNC:review-protocol-injection`
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
