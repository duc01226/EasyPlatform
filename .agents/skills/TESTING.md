# Skill Testing Scenarios

Test prompts to verify skills activate correctly. Each section contains prompts that should trigger the corresponding skill.

> Prompts are adaptable examples; their domain names and technologies do not define a project's architecture. Read `docs/project-config.json` and the relevant project-reference docs to decide which checks apply. When a convention is absent or marked N/A, expected behavior is to follow relevant code evidence or state N/A rather than invent a pattern.

## Contents

- [Testing Instructions](#testing-instructions)
- [Interactive Skills](#interactive-skills)
- [Frontend Skills](#frontend-skills)
- [Architecture Skills](#architecture-skills)
- [Verification Checklist](#verification-checklist)

## Testing Instructions

1. **Direct Invocation**: Test with `/skill-name` to verify the skill loads
2. **Inference Testing**: Test with natural prompts
3. **Verify Output**: Check that the skill's workflow and patterns are applied

---

## Interactive Skills

### investigate --mode=debug

Direct invocation:

```
$investigate --mode=debug
```

Inference test prompts:

```
"I'm getting a NullReferenceException in SaveOrderCommandHandler"
"This feature stopped working after the last deployment"
"Fix the error: Cannot read property 'name' of undefined"
"Debug why the order list is showing duplicate records"
"The API returns 500 error when saving a new return request"
```

Expected behavior:

- Creates structured analysis notes
- Follows anti-hallucination protocols
- Documents evidence before making claims
- Presents fix proposal before implementing

---

### code-quality-review

Direct invocation:

```
$code-quality-review
```

Inference test prompts:

```
"Review this command handler for anti-patterns"
"Check if this code follows SOLID principles"
"Analyze the code quality of OrderService.cs"
"Look for code smells in this frontend component"
"Refactor this method to improve readability"
```

Expected behavior:

- Creates analysis notes file
- Checks conventions documented for the affected paths and relevant code
- Evaluates applicable quality principles and reports only evidence-backed findings
- Proposes improvements with examples

---

### workflow-feature

Direct invocation:

```
$start-workflow workflow-feature
```

Inference test prompts:

```
"Implement a new order export feature"
"Add a notification system for return approvals"
"Build a dashboard widget for team metrics"
"Create a bulk import feature for order data"
"Develop an integration with external HR system"
```

Expected behavior:

- Creates implementation plan
- Identifies affected modules and files from project config and source; does not assume service or component layers
- Follows the configured and reference-documented architecture; when absent or N/A, uses consistent existing code and states the gap
- Follows the workflow's planning and approval gates before implementing

---

## Frontend Skills

_(Add direct-invocation cases only for frontend skills installed in the current framework copy. Use configured UI, state, and styling references when those surfaces exist; otherwise test that the skill records them as N/A.)_

---

## Architecture Skills

### performance-review

Direct invocation:

```
$performance-review
```

Test prompts:

```
"Analyze performance bottlenecks in the dashboard"
"Optimize the order search feature"
"Review API response times"
"Review this service design for performance at architecture altitude"
"Investigate a slow database query or possible N+1 on an affected data-access path, if this project uses one"
"Decide whether a changed query warrants an index using schema/query-plan evidence, or state N/A when no database path applies"
```

Expected behavior:

- Selects performance dimensions from the changed path, configured technologies, and available evidence; records absent layers as N/A with a reason
- Applies paging/index analysis only to a configured, code-evidenced database path, using the project's documented conventions and query/schema evidence
- Grounds all recommendations in the project's architecture and references; treats caching, query, runtime, and layer examples as applicable only when present

---

### security-audit

Direct invocation:

```
$security-audit
```

Test prompts:

```
"Review authentication flow security"
"Check for injection vulnerabilities"
"Audit authorization patterns in controllers"
```

Expected behavior:

- Reviews security surfaces and controls present in the project's configured architecture
- Uses documented security requirements and source evidence; records absent surfaces as N/A rather than inventing them

---

## Verification Checklist

For each skill test:

- [ ] Direct invocation works (`/skill-name`)
- [ ] Inference activates for relevant prompts
- [ ] Correct workflow phases are followed
- [ ] Only configured or code-evidenced project patterns are applied; absent/N/A conventions are not invented
- [ ] Anti-patterns are avoided
- [ ] Output matches expected format
