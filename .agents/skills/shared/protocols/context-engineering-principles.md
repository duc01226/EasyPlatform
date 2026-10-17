> **Context Engineering Principles** — Read when writing or enhancing prompts, skills or agents. Make the purpose and critical rules visible; preserve semantic conditions and readable discovery.
>
> - **Attention:** Lead with the goal, read-when trigger and critical rules; close long instructions with brief reminders. Adapt placement to the host's truncation budget and owner format.
> - **Signal:** Remove low-value repetition and report bulk. For agent guides, word savings and warning labels are not proof of useful guidance.
> - **Structure:** Use headings, bullets or tables when they clarify decisions. Keep connected prose for rationale and conditions; avoid dense shorthand.
> - **Context:** Supply the relevant role, evidence, constraints and output contract. Preserve checkboxes or other syntax when an owner/consumer requires them.
> - **Examples:** Retain a short example only when it communicates a necessary distinction more efficiently than prose and a source pointer. No fixed example quota.
> - **Retention:** Map unique rules, preconditions, exceptions and navigation before/after enhancement. Check both excessive detail and over-compression; do not impose line limits, reduction percentages or warning-keyword quotas.
> - **Affirmative instructions:** State the correct action and pair hard prohibitions with the permitted path. Keep short rationale when it prevents likely misuse.
> - **Bounded context:** Load relevant owners/depth on demand; use verified triggered discovery instead of duplicating their entire protocols.
>
> **Instruction-file audit** — Before finalizing `CLAUDE.md`, `AGENTS.md` or equivalent persistent instructions, check the applicable dimensions below. This is an authoring audit, not runtime enforcement.
>
> - **Signal:** Keep essential project context, non-obvious constraints and useful navigation. Cut generic advice and duplicated linter rules; retain the command that runs the check.
> - **Budget:** Treat roughly 200 lines for `CLAUDE.md` as a review signal, never a truncation target. Preserve required constraints and respect host byte limits; assess total loaded context, including imports, layered files and hook injections.
> - **Loading and scope:** Claude Code `@` imports organize content but load it into context. Route occasional detail through verified read-when pointers, scoped rules or skills. Keep project-wide, folder and personal rules at their proper scope with one owner; remove conflicts rather than assuming child files override parents.
> - **Clarity:** Verify commands and paths; state each rule's trigger, action and observable check. Use emphasis sparingly; it does not enforce compliance.
> - **Maintenance:** Review/version shared instructions and prune stale entries. Diagnose recurring mistakes before adding rules; consolidate existing guidance and check whether behavior improves.
> - **Mechanism:** Put reusable procedures in skills and mechanical guarantees in tested deterministic checks/hooks. Verify activation, coverage and failure handling; model-based checks remain judgment calls. Edit canonical owners and regenerate mirrors.
>
> Record material findings and justified exceptions in the task report; repair applicable gaps at their owner before claiming the audit complete. Length alone never proves quality. Loading guidance: [Claude Code memory](https://code.claude.com/docs/en/memory); maintenance guidance: [best practices](https://code.claude.com/docs/en/best-practices).
