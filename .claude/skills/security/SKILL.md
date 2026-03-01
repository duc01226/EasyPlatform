---
name: security
version: 1.0.0
description: '[Code Quality] Perform security review on specified scope'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

## Quick Summary

**Goal:** Perform security review against OWASP Top 10 and project authorization patterns.

**Workflow:**
1. **Scope** — Identify security-sensitive code areas
2. **Audit** — Review against OWASP categories and platform security patterns
3. **Report** — Document findings with severity and remediation

**Key Rules:**
- Analysis Mindset: systematic review, not guesswork
- Check both backend (C#) and frontend (Angular) attack surfaces
- Use project authorization attributes and entity-level access expressions (see docs/backend-patterns-reference.md)

<scope>$ARGUMENTS</scope>

## Analysis Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking. Every claim needs traced proof.**

- Do NOT assume code is secure at face value — verify by reading actual implementations
- Every vulnerability finding must include `file:line` evidence
- If you cannot prove a vulnerability with a code trace, state "potential risk, not confirmed"
- Question assumptions: "Is this actually exploitable?" → trace the input path to confirm
- Challenge completeness: "Are there other attack vectors?" → check all input boundaries
- No "looks secure" without proof — state what you verified and how

Activate `arch-security-review` skill and follow its workflow.

**CRITICAL**: Present your security findings. Wait for explicit user approval before implementing fixes.

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
