# AI-Engineering Review Checklist — executable review protocol for AI features

> **How to read cheaply — by section.** List sections by searching this file for headings that start with `## ` (Grep tool, or `rg -n "^## "`). The dedicated reviewer reads it whole; anyone else reads §0 (§0.1 context, §0.2 evidence, §0.3 severity) plus ONLY the sweep for the surface at hand.
> - Sweeps with check ids: §A `A1`–`A13` prompt and model contract · §B `B1`–`B13` security · §C `C1`–`C14` agent and tool design · §D `D1`–`D11` context and retrieval · §E `E1`–`E14` reliability and cost · §F `F1`–`F13` evaluation · §G `G1`–`G12` observability · §H `H1`–`H13` data and governance · §I `I1`–`I13` human experience
> - Conditional, only when the surface exists: §J `J1`–`J9` RAG · §K `K1`–`K10` agents, multi-agent and MCP · §L `L1`–`L11` fine-tuning, ML, supply chain, multimodal
> - By mode: plan review → §M · test review → §N · report shape → §O · short on time → §P (10 checks). Deep rationale: `.claude/docs/ai-engineering-knowledge.md`, by section; severity calibration: `.claude/docs/ai-engineering-calibration.md`, by case (`CAL-<n>`). **Id spaces:** this file owns check ids `A1`–`N10` and the severity of every finding; knowledge rows are `K-<letter><n>` (rationale pointers only, no severity); calibration cases are `CAL-<n>`; a finding cites clause + check id + `file:line`.

> **Role:** the **executable review procedure** for any plan, diff or artifact that carries an AI feature — LLM calls, prompts, agents, tool use, RAG, MCP, evals, guardrails, fine-tuned or classical ML. Every check has a stable ID, a detection signal you can grep or read, a default severity, the clause it enforces, and the case where it is a false positive. Owns the REVIEW PROCEDURE (§0), the CHECK CATALOG (§A–§L), the PLAN questions (§M), the TEST questions (§N), the REPORT FORMAT (§O) and the QUICK TRIAGE (§P). Owns NO design reasoning — the deep catalog (principles, best and bad practice, sources) is `.claude/docs/ai-engineering-knowledge.md`, addressed here by section letter only.
>
> **Consumed by:** any skill or agent that carries an inline `SYNC:ai-review-checklist` block — grep that tag for the current set. A carrier belongs on the list ONLY if it carries the block; NEVER add an aspirational consumer.
>
> **Drift-guard:** this file is AUTHORITATIVE for check IDs `A1`…`L11`, the P0–P4 map and the report format. The clause texts live in their own single sources — NEVER duplicate them here: `AF-1`–`AF-6` in `SYNC:ai-feature-framing-gate`, `AE-1.1`–`AE-9.4` in `SYNC:ai-engineering-gate`, `AR-1`–`AR-6` in `SYNC:ai-review-checklist` (all in `.claude/skills/shared/sync-inline-versions.md`). On any change here, grep `ai-engineering-review-checklist` and update every consuming carrier.
>
> **Three questions, no overlap.** `AF-*` ask _"should this AI feature exist, and how will we know it works?"_ (plan time). `AE-*` ask _"does the implementation meet the engineering floor?"_ (pass/fail clauses). This checklist asks _"did the review actually LOOK at every AI surface, with evidence, and rank it?"_ — procedure and evidence contract, not a third set of rules. Where a check restates a clause or a UI/security-audit finding, report the defect ONCE.
>
> **MUST ATTENTION** apply this checklist ONLY when the change, plan or artifact carries an AI surface. A change with no model call, prompt, agent, retrieval, eval or ML code is `N/A` — say `No AI-feature surface detected` once and stop. NEVER run an AI review to manufacture coverage.
>
> **MUST ATTENTION** the project's OWN policy — `docs/project-config.json`, accepted ADRs, declared provider contracts, compliance decisions — **OUTRANKS this checklist**. A deliberate, documented decision is NEVER a defect; surface a genuine conflict to the user with both sides, NEVER resolve it silently.
>
> **MUST ATTENTION** provider facts (model IDs, parameters, limits, retention terms, deprecations) change faster than this file. Confirm each from current provider documentation and cite the URL before flagging it; unconfirmed → `NOT VERIFIABLE`. A remembered fact is not evidence.
>
> **Portability.** Detection signals are generic patterns, not a stack mandate. Resolve the languages, SDKs, hosting and governing standards from project config and evidence; run matching checks only, record unsupported ones `N/A`. Numeric examples and default severities are starting points; the project's release policy sets thresholds, and any provider-specific number, ID or limit is verified against current provider docs before use (as of 2026-09-30 at best). Items marked `[LEGAL-OWNER]` are compliance decisions — flag and route to the owner, NEVER decide legality.

---

## Quick Summary

**Goal:** turn an AI-feature review into a repeatable, evidence-backed report — every finding carrying a location, a clause, a check ID, a consequence-based severity and a fix.

- **Context first (§0.1).** AI-surface map, autonomy level, data sensitivity, users, environment, project policy. Fewer than four known → say so and mark affected findings low confidence.
- **Evidence or nothing (§0.2).** Cite `file:line`; NEVER invent a cost, latency or accuracy number; runtime-only claims are `NOT VERIFIABLE` without eval or trace output.
- **Severity is consequence (§0.3).** P0 blocks ship · P1 fix before release · P2 next iteration · P3 later · P4 note; escalation and de-escalation rules are explicit and evidence-gated.
- **Sweeps in order:** §A prompt & model contract → §B security & safety → §C agent & tool design → §D context & retrieval → §E reliability & cost → §F evaluation & testing → §G observability & operations → §H data, privacy & governance → §I human experience → **§J RAG · §K agent/multi-agent & MCP · §L fine-tune, ML, supply chain, multimodal (conditional)** → §M plan questions → §N test questions → §O report → §P triage.
- **Calibrate before judging:** worked true-positive and false-positive cases live in `.claude/docs/ai-engineering-calibration.md` (cases `CAL-1`–`CAL-14`) — read it when a finding's severity or existence is unclear.
- **No time?** Run §P (10 checks) — it catches the majority of serious defects.

---

## 0. Review Procedure

### 0.1 Before reviewing — establish context (`AR-1`)

Detect AI surfaces objectively: run `node .claude/scripts/ai-signal-scan.cjs --json` when the script exists — add `--base <the review base>` for a branch or PR review (committed-since-merge-base plus the working tree); without a base it covers the working tree against HEAD plus untracked files. Read the JSON `status`: `surface` → review the listed `aiSurface` files · `clean` → a complete scan found no AI surface, skip · `unknown` (git error, rejected or empty base, truncated at the file cap) → `NOT VERIFIABLE`: fall back ONCE to the signal grep below, and if that is also inconclusive treat the AI review as required. The signal grep — search the change (Grep tool or `rg`) for provider SDK imports and hosts, model-ID literals, `messages`/`completions`/`responses`/`embeddings` calls, `tool_use`/`tool_calls`, vector-store and MCP names, and directories named `prompts`, `llm`, `rag`, `agents`, `evals`, `mcp`, `guardrails`. Then fill the table; unknown → `UNKNOWN`.

| Field | Why it matters |
| --- | --- |
| AI surfaces (call site, prompt, agent, tool, retrieval, eval, infra) | One row each in the §O map; every check is judged per surface |
| Autonomy level: suggest · confirm · act-with-undo · autonomous | Sets the blast radius of every wrong output (`AF-4`) |
| Data sensitivity and flow (who/what reaches the model, provider, logs) | Decides §B, §D, §H severity (`AF-5`) |
| Users and tenancy: single user · multi-user · multi-tenant · public | Escalates isolation, quota and disclosure findings |
| Environment: production · staging · prototype flagged experimental · dev tool · script | De-escalates polish findings, never security exposure |
| Model, provider, version, provider-side terms | Provider facts must be verified, not recalled (§0.2) |
| Project policy: config, ADRs, compliance decisions, design docs | Outranks this checklist |

Fewer than four known → state the gap at the top and mark affected findings **low confidence**. Read the project's policy BEFORE the first finding.

### 0.2 Evidence rules (`AR-2`)

1. **`file:line` or nothing.** Every finding cites a location; a plan finding cites the plan section. NEVER infer a defect from code you did not open.
2. **Never invent a measurement.** Cost, latency, accuracy, hit rate, token counts come from eval or trace output, or the check is `NOT VERIFIABLE`. Runtime-only and eval-only claims need that output as evidence.
3. **Provider facts need a source.** A model being retired, a parameter rejected, a limit or retention term — confirm from current provider docs, cite the URL and the fetch date in the report. Memory is not evidence; a finding built on a stale fact is withdrawn (see calibration CAL-13).
4. **Tag each finding** `MEASURED` (tool or eval output) · `OBSERVED` (read in code or plan) · `HEURISTIC` (pattern judgment).
5. **Check the rule before applying it.** A deviation with a documented reason (ADR, comment, config) is not a defect; ask when intent is unclear. An accurate `file:line` proves the transcription, never the defect.
6. **Reachability.** A finding needs a trigger path — the caller, input or content that reaches it — and a consequence. Unreachable → P4 observation.
7. **Report ONCE.** Where a check overlaps a UI (`UX-*`/`UI-*`/`DD-*`/`CL-*`), `security-audit` or `changes-review` finding, use the ID the consuming skill already uses and cite the overlap; NEVER emit two findings for one defect.
8. **No padding.** A clean sweep reports "no issues found". Cap the report at the top 10 by severity unless a full audit was requested; cluster a systemic defect into ONE finding naming every location or the shared owner.
9. **Propose, don't just diagnose.** Every P0 and P1 carries a concrete fix that names the owner of the violated contract.

### 0.3 Severity map (`AR-3`) — the single translation table

Assign the consequence FIRST with the P-level definition, then translate to the framework rubric (`SYNC:severity-rubric`) — never translate a label into a different consequence.

| Level | Definition | Framework severity | Action |
| --- | --- | --- | --- |
| **P0** | Exploitable or irreversible harm: security/authorization bypass, secret or PII exposure, destructive or external action without a control, cross-tenant data exposure, silent failure on a critical path | Critical | Ship blocker |
| **P1** | Supported-path harm, violated invariant, meaningful privacy or authority gap, unbounded cost, breaking contract, behavior change shipped without proof | High | Fix before release |
| **P2** | Bounded but consequential gap: resilience, observability, testability, cost-control or maintainability with real impact | Medium | Clear this round or record a follow-up with residual risk |
| **P3** | Polish, minor convention or cache-efficiency drift, optional hardening with no present correctness, security or data impact | Low | Later |
| **P4** | Observation or opportunity, no defect | note (no finding) | Optional |

**Escalate one level** when, with evidence: the path is unattended or background · multi-tenant or public/unauthenticated · private or regulated data is in context · the action is irreversible or external · the decision affects a person (hiring, credit, benefits, access, education, health) · the surface is production.
**De-escalate one level** only when a compensating control is cited with `file:line` and works for the finding's actual trigger path: a code-enforced approval on the dangerous leg · a sandbox with no ambient secrets · single trusted user on a local dev tool · content from a trusted owner with no untrusted origin · a centralized handler that already covers the call site · an experimental prototype with no user data and no production route.
**Never de-escalate** on a prompt-only control, on a classifier or guardrail alone, on "the model is well-behaved", or on a `[LEGAL-OWNER]` item (route it). A secret exposed to the model, a logs sink or a client bundle stays P0.
**Severity is set by consequence, not fix effort or diff size.** A one-line fix can be P0.

### 0.4 Status values and modes

`PASS` · `FAIL` · `PARTIAL` · `N/A` · `NOT VERIFIABLE`.

| Mode | Evidence | What the review produces |
| --- | --- | --- |
| **Code** (default) | `file:line` in diff and the surrounding call graph; tests; config | Findings per check ID; §A–§L sweeps; AI Gate Report |
| **Plan** | Plan section, ADRs, design notes; no runtime | Plan gaps per `AF-*` clause via §M; the sweeps become "does the plan state a control for this?"; runtime claims are `NOT VERIFIABLE`; a missing element for an irreversible or high-impact action is P1 |
| **Plan vs code** | Both | A code path the plan never mentions (new tool, new data source, new sink) is a finding; a plan promise the code does not implement is a finding |

Before the sweeps expand each changed file to the AI surface it belongs to (call site → prompt → tools → sinks → data sources) and review the surface WHOLE. A prompt file, tool schema, model constant or retriever config changes behavior of every call site that reads it; state the sample when many consume it.

---

## A. Prompt & Model Contract _(AE-1)_

**Think:** if the model returns the worst plausible output for this call — wrong, truncated, refusing, malformed or attacker-shaped — what consumes it, and which contract stops the damage?

| ID | Check | Detection signal | Sev | Clause | Not a finding when |
| --- | --- | --- | --- | --- | --- |
| A1 | Prompts are versioned template artifacts with named variables and one owner | Multi-line string literals passed to `system=`/`messages=`/`instructions=` inside handlers; no prompts directory; prompt diff with no test or eval diff | P2 | AE-1.1 | One call site with a named constant in a small script |
| A2 | No untrusted text reaches the instruction channel | f-string, format or concatenation of user, document, retrieved or tool text into `system` or above the task instruction; system prompt built from a user-editable DB field | P1 (P0 with tools or side effects) | AE-1.2, AE-2.1 | Interpolated value is owner-authored config with no untrusted origin |
| A3 | Untrusted content in the user turn is labelled and delimited | Documents, emails or tool text concatenated raw; no tags or roles separating data from the task | P2 | AE-1.2 | Single-user local tool over the user's own data |
| A4 | Machine-consumed output has a contract: structured output or tool use, validated at the boundary | `json.loads`/`JSON.parse` on response text with no structured-output setting, schema or validation; prompt says "reply only with JSON" | P1 | AE-1.3 | Output is read only by a human |
| A5 | `stop_reason` / `finish_reason` is handled before the output is used | No branch for length/max_tokens, refusal, tool_use, pause or content-filter; code reads the first content block blindly | P1 | AE-1.3 | One central wrapper already raises on every non-complete reason (cite it) |
| A6 | Retry on invalid output is bounded, feeds the error back and ends in a safe fallback; failures are counted | `while` loop around the call with no counter; identical prompt retried; `except` that passes or returns `{}` | P1 | AE-1.3, AE-5.2 | Cap and fallback are in a shared helper this call site uses |
| A7 | Control flow never depends on regex or splitting of prose | `re.search`, `split(":")`, `startswith` on completion text that drives a decision, id or flag | P2 | AE-1.3 | Display-only formatting of text |
| A8 | Schema-valid output is validated semantically: ranges, referential integrity, ownership, permissions | Schema declares min/max/pattern with no server-side check; model-supplied ids used in lookups or actions without an existence and ownership check | P1 | AE-1.3, AE-2.5 | Downstream service re-authorizes every id at execution |
| A9 | Model ID and parameters are explicit, centralized and pinned | Model-name literals outside one config module; floating alias or `latest` in production; two IDs for one role | P2 (P3 in a script) | AE-1.4 | Throwaway script, test fixture, or an eval that compares models by design |
| A10 | Model IDs and parameters are valid for the provider today | A retired or near-retirement ID; sampling, thinking, prefill or forced-tool settings the model rejects; params sprinkled at call sites | P1 (verify per §0.2) | AE-1.4 | Provider docs confirm the value is accepted; unverified → `NOT VERIFIABLE` |
| A11 | Sampling, `max_tokens` and timeout suit the task; temperature 0 is never treated as deterministic | `temperature=0` justifying exact-match tests or cache-key equality; missing `max_tokens`; `max_tokens` copied from a short-answer path onto long-form | P3 (P2 when logic depends on determinism) | AE-1.4, AE-5.1 | Exact output not relied on anywhere |
| A12 | Prompt text is clear and coherent: task, audience, format, rationale; no contradictory rules; examples balanced | Assembled prompt has conflicting imperatives; one giant monolith; NEVER-dominated bullets; few-shot examples share one label or contain PII | P3 (P2 when contradictory) | AE-1.1 | Prompt is deliberately minimal and evals pass |
| A13 | A model swap re-tunes prompts and reruns evals | Model ID bumped with prompt files unchanged and no eval delta in the change | P1 | AE-1.4, AE-6.1 | Swap within a verified compatible tier with the eval run attached |

---

## B. Security & Safety _(AE-2)_

**Think:** if an attacker fully controls every piece of text the model reads, what is the worst action or data leak reachable, and which code — not prompt text — stops it?

| ID | Check | Detection signal | Sev | Clause | Not a finding when |
| --- | --- | --- | --- | --- | --- |
| B1 | The lethal trifecta is broken: no path combines private-data access, untrusted content and an outbound channel | One agent or session has a private reader (mailbox, DB, repo) AND ingests web/email/issues/files AND has send, HTTP write, PR create, URL fetch or markdown image render | P0 | AE-2.3 | A leg is removed, or a code-enforced approval covers the outbound leg (P2 residual: approval fatigue) |
| B2 | Every external text source is inventoried as an instruction carrier | Fetch, scrape, RAG chunk, tool result, filename, PDF or image text enters context with no trust label; no list of ingestion sources | P1 | AE-2.1 | The only source is the operator's own reviewed content |
| B3 | A prompt instruction is never the only control on a privileged action | "The prompt tells the model never to…" with no code check; guard logic only in prompt files; phrase blocklists as the fix | P1 (P0 with a destructive or exfil leg) | AE-2.1, AE-2.5 | Code enforces the same rule and the prompt is redundancy |
| B4 | Model output never reaches exec, eval, shell, dynamic import or deserialization | `exec`, `eval`, `new Function`, `os.system`, `shell=True`, `child_process.exec`, `pickle.loads` receiving completion or tool-arg text | P0 | AE-2.2 | Code execution is the product and it runs in a sandbox (see K7) |
| B5 | Model output never becomes SQL on a shared or writer role | f-string SQL with completion text; text-to-SQL tool bound to owner credentials; no read-only role, row limit or statement timeout | P0 | AE-2.2 | Fixed templates with bound parameters; read-only, allow-listed role |
| B6 | Model output is encoded for its render sink; remote images and links are not auto-loaded | `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, the template `safe` filter, `Markup(` on completion; markdown renderer with raw HTML on; no image-source policy; unvalidated `href` from the model | P0 (private data or untrusted content in context), else P1 | AE-2.2 | Sanitizing renderer with raw HTML off and an image/link allowlist (see calibration CAL-1) |
| B7 | Model-supplied URLs pass an allowlist and an SSRF guard | `fetch(args.url)`, `requests.get(tool_input)`; no private, link-local or metadata-range block; redirects followed; non-http schemes | P1 | AE-2.2 | Egress proxy with a domain allowlist is the only route out (cite it) |
| B8 | Model-supplied paths are canonicalized and confined | `open(join(base, llm_path))`; write tool accepts any path incl. config, hooks, shell rc | P1 | AE-2.2 | Tool runs in a disposable sandbox with a scoped writable directory |
| B9 | No secrets, credentials or customer data in prompts, few-shot examples, tool descriptions or logs | Key, token or connection-string literals in prompt files; `system_prompt = f"…{KEY}…"`; whole customer records in examples | P0 (secrets), P1 (customer data) | AE-2.4 | Placeholder or synthetic values only |
| B10 | The system prompt is treated as extractable; rules and limits live in code | Discount limits, role tiers or filter rules expressed only in prompt text with "do not reveal" | P2 | AE-2.4, AE-2.5 | The prompt's disclosure is harmless and rules are also enforced in code |
| B11 | Provider keys stay server-side | Provider key or public-prefixed env in a frontend bundle; browser calls the provider directly | P0 | AE-2.4, AE-5.3 | Short-lived scoped token minted by a backend proxy |
| B12 | Guardrails fail closed and guard actions, not just chat text | `except: return True` around moderation; guard skipped on latency; moderation on the final message only, tool calls unchecked; guard flag off in prod config | P1 | AE-2.5 | Guard is defense in depth over code-enforced limits |
| B13 | Persistent memory is not writable from untrusted content | `memory.add`/`store` fed from web, email or tool output; no provenance, scope or TTL; memory injected into the system prompt | P1 | AE-2.1, AE-4.3 | Writes require user approval showing the exact entry |

---

## C. Agent & Tool Design _(AE-3)_

**Think:** what is the most damaging sequence of tool calls this agent can make, with whose authority — and what ends the loop?

| ID | Check | Detection signal | Sev | Clause | Not a finding when |
| --- | --- | --- | --- | --- | --- |
| C1 | Every loop has a step cap, a wall-clock limit and a token or cost budget | `while True` or `while not done` around model calls; no `max_iterations`/`max_turns`/`recursion_limit`; no deadline; no per-run usage sum | P1 (P0 unattended with spend or side effects) | AE-3.1 | Interactive dev tool the user watches and can interrupt (P3) |
| C2 | Termination is explicit and stuck loops are detected | Loop ends on `"DONE" in text`; no repeated-call hash or failure counter; `stop_reason` ignored inside the loop | P2 | AE-3.1 | Fixed workflow with a bounded step list |
| C3 | No generic shell, SQL, HTTP or file tool without sandbox and allowlist | `tools=[*]`, `execute_command`, `run_query`, `http_request` exposed to the model; registry auto-loaded from a directory | P1 (P0 when untrusted content is in context) | AE-3.2 | Tool runs in a sandbox with an allowlist and no ambient credentials |
| C4 | Tools run with the requesting user's authority, least privilege | One admin token or service account for all users; DB role with DDL or delete; OAuth scope `*` | P0 (multi-user), P1 (single user) | AE-3.2, AE-2.5 | Single-user local tool using that user's own credentials |
| C5 | Tools never trust model-supplied identity or tenant arguments | Tool signature `user_id`/`tenant_id`/`account` filled by the model and used without an authz check | P0 | AE-2.5, AE-3.2 | Value is overwritten from the authenticated session before use |
| C6 | Irreversible or high-impact actions need approval or are reversible | delete, drop, pay, send, publish, deploy, permission change reachable with no confirm, dry-run, soft-delete or undo; agent pointed at production | P0 | AE-3.4 | Action is reversible and logged, or approval is enforced in the executor |
| C7 | Approval shows the real action and is not bypassed | `auto_approve=True`, `--yolo`, `bypassPermissions`, `requires_approval=False`; approval text authored by the model; approval asked after the side effect | P1 | AE-3.4 | Bypass exists only inside a disposable sandbox |
| C8 | Tool contracts are model-usable: verb-noun names, descriptions with when-not-to-use, typed schemas, enums | One-line descriptions; `{"type":"string"}` for ids and enums; one `args` blob; near-duplicate tool names; more than ~15 tools in one agent | P2 | AE-3.3 | Tool set is small and covered by an agent eval |
| C9 | Tool results are bounded and paginated | No `limit`/`cursor`/`max_chars`; whole file or unfiltered `SELECT` returned; silent truncation with no marker | P2 | AE-3.3, AE-4.1 | Results are inherently small and fixed |
| C10 | Tool errors are actionable and leak nothing | Bare `raise` kills the loop; `return "error"`; `str(e)` with paths, SQL or tokens sent to the model; error returned as success | P2 | AE-3.3, AE-5.2 | Errors are mapped centrally to typed error results |
| C11 | Side-effecting tools are idempotent or take an idempotency key | `send_*`/`create_*`/`charge_*` with no key, natural-key upsert or check-then-act; retry wrapper or resume-from-checkpoint around a POSTing tool | P1 | AE-3.3, AE-5.1 | Provider or downstream dedupes on a business key (cite it) |
| C12 | Every tool call has a timeout, output cap and audit record | `requests.get`/`subprocess.run`/DB call without `timeout=`; no per-tool log of who, args hash, status, latency | P2 | AE-3.2, AE-7.1 | Timeout and audit added by a shared executor |
| C13 | The loop executes every tool call in a turn and returns all results together | Code reads only the first tool call; one message per result; provider 400 about missing results in logs | P2 | AE-3.3 | Provider or SDK runner handles this |
| C14 | Success is verified by something independent of the agent's self-report | Success set from parsing agent text; no post-condition check on real state; verifier shares the writer's context | P2 | AE-3.5 | A deterministic test or state assertion follows every action |

---

## D. Context & Retrieval _(AE-4)_

**Think:** what enters the context, was the caller allowed to see it, and what happens when it is too big, stale, poisoned or wrong?

| ID | Check | Detection signal | Sev | Clause | Not a finding when |
| --- | --- | --- | --- | --- | --- |
| D1 | Context is budgeted per source; tokens are counted on the target model | No `usage`/count logging; hard-coded char limits; whole documents, tables or histories sent "to be safe"; counts reused across models | P2 | AE-4.1 | Inputs are small and bounded by design |
| D2 | Prompts carry projected fields, not whole rows or objects | `json.dumps(row)`, `.to_dict()`, ORM object or `SELECT *` interpolated into a prompt; PII or internal-id columns in context | P1 | AE-4.1, AE-8.1 | A field allowlist and redaction step sit before assembly |
| D3 | Overflow and truncation are handled deliberately | Blind `text[:N]`/`messages[-10:]`; head-truncation losing instructions; context-exceeded error caught and retried unchanged | P2 (P1 when instructions or tool schemas can be cut) | AE-4.1, AE-5.2 | Priority-based drop with the system prompt pinned |
| D4 | Long runs compact history and clear old tool results | `messages.append` forever; tool results never cleared; summarizer prompt has no preserve-list | P2 | AE-4.1 | Runs are short and bounded by C1 |
| D5 | The prompt prefix is cache-stable | `now()`, UUID, user name or unordered tool list before large static text; history rewritten between turns | P3 | AE-4.2 | Provider caching not used or inputs below the cacheable minimum |
| D6 | Cache behavior is measured | No logging of cache read and write tokens; breakpoint on a per-request block; prefix below the provider minimum | P3 | AE-4.2, AE-7.4 | Caching deliberately off with a stated reason |
| D7 | Retrieval authorization is enforced in the retrieval query, never by the model | Search with no `filter`/`namespace` derived from the authenticated identity; ACL applied after generation or top-k; tenant id from request body or model | P0 | AE-4.3 | Corpus is single-tenant public content (see calibration CAL-6) |
| D8 | Caches and semantic caches are keyed by tenant, user and permission scope | Cache key is a prompt hash or embedding similarity only; global cache across tenants; personalized data cached | P0 (multi-tenant), P2 (single tenant) | AE-4.3, AE-8.2 | Cache holds only public, non-personalized results |
| D9 | Persistent memory has provenance, scope, TTL and validation | Memory keyed by session not user; no `expires_at`; verbatim tool output stored; stale entries trusted | P1 | AE-4.3, AE-8.2 | Memory is user-visible, editable and written only on approval |
| D10 | Factual and policy answers are grounded with an explicit "insufficient context" path | Policy, legal, medical or pricing questions answered from model memory; no empty-retrieval branch, threshold or abstention; disclaimer as the only control | P1 | AE-4.4 | Answers are non-binding chit-chat with no reliance |
| D11 | Citations are checkable and verified against the retrieved set | Citation fields parsed from model text and never matched to retrieved ids; fabricated links or ids reach users | P1 | AE-4.4 | Citations come from retrieval metadata, not model text |

---

## E. Reliability & Cost _(AE-5)_

**Think:** what happens when the provider is slow, down or rate-limited — or when a loop or a user multiplies the bill?

| ID | Check | Detection signal | Sev | Clause | Not a finding when |
| --- | --- | --- | --- | --- | --- |
| E1 | Every model and tool call has a timeout | Client built without `timeout=`; HTTP call to a model API with no deadline; no cancel on client disconnect | P1 | AE-5.1 | Batch worker with an outer job deadline |
| E2 | Retries are transient-only, backed off with jitter, single-layer and honour `Retry-After` | Fixed `sleep(1)`; retry on every exception; wrapper retries stacked on SDK retries; no cap or total-time budget | P2 (P1 when stacked or unbounded) | AE-5.1 | SDK default retry is the only layer |
| E3 | A non-idempotent side effect is never blindly retried | Retry decorator around a tool that sends, charges or creates | P1 | AE-5.1, AE-3.3 | Idempotency key or dedupe present (see C11) |
| E4 | Non-retryable classes are not retried | Retry on 400/401/403/404/413 or spend-cap responses; re-ask on invalid output with no cap | P2 | AE-5.1 | Classification is handled by a shared client |
| E5 | Errors are never swallowed into "success" | `except Exception: return ""` or a canned reply presented as AI output; string-matching error text; no error counter | P1 (P0 on a critical path) | AE-5.2 | Degradation is explicit, logged and shown to the user |
| E6 | Provider outage, refusal and empty output lead to a designed fallback or degraded state | LLM call in a critical synchronous path with no non-AI route; fallback model never tested; silent fallback to a weaker model on a high-stakes step | P2 (P1 on a critical path) | AE-5.2 | Feature is optional and hides itself when unavailable |
| E7 | Repeated failures trip a circuit breaker | Every request waits out full timeouts during an outage; no fail-fast | P2 | AE-5.2 | Low traffic and a short timeout |
| E8 | Every call caps output tokens and input size | Missing `max_tokens`; user field or upload with no length check; `max_tokens` set to the model maximum "to be safe" | P1 | AE-5.3 | Inputs are fixed-size internal data |
| E9 | Cost and abuse are capped per user and tenant; endpoints are authenticated | Public route reaches a model with no auth, rate limit or quota; one shared key; no per-tenant metering or budget alarm | P0 (public unauthenticated), else P1 | AE-5.3 | Internal endpoint behind authenticated gateway quotas |
| E10 | Fan-out and recursion are bounded | `Promise.all(items.map(callModel))` over an unbounded list; sub-agent spawn with no depth cap; user-controlled `top_k` | P1 | AE-5.3, AE-3.1 | Semaphore and item cap present |
| E11 | Model routing matches the task and is justified by eval | Flagship model on every trivial call; cheapest model on a hard step with no eval; no latency budget | P3 | AE-5.4 | Single-call low-volume feature |
| E12 | Offline bulk work uses batch or queue paths | Loop of synchronous calls in a cron or backfill; long job inside a request handler | P3 | AE-5.4 | Volume is small |
| E13 | Streaming handles mid-stream errors and never acts on partial output | Tool executed on a partial stream chunk; no handling of error events after HTTP 200; non-streaming very long generations | P2 | AE-5.1, AE-9.3 | Output is buffered until a complete stop reason |
| E14 | Unit cost is known and a provider-side spend limit exists | No cost field in traces; one key across environments; no spend alert or provider limit | P2 | AE-5.3 | Cost is negligible and capped elsewhere |

---

## F. Evaluation & Testing _(AE-6)_

**Think:** which test goes red when the model's behavior regresses — and would anyone notice a silent prompt, model or retrieval change?

| ID | Check | Detection signal | Sev | Clause | Not a finding when |
| --- | --- | --- | --- | --- | --- |
| F1 | A change to a prompt, model, tool description or retriever ships with an eval delta | Diff touches prompts, model ID or tool schema with no eval, golden set or CI eval job change and no baseline in the description | P1 (P3 for a prototype flagged experimental) | AE-6.1, AF-2 | Prototype flagged experimental, no user data, no production route |
| F2 | The eval set is representative and adversarial, built from real failures | Only synthetic happy-path rows; no empty, oversized, hostile, multilingual or unanswerable rows; no `source`/incident field; one-sided labels | P2 | AE-6.1 | Dated plan to build the set exists for a pre-release feature |
| F3 | Eval rows never leak into prompts, few-shots, judge prompts or the RAG corpus | Few-shot loader reads the eval dataset path; shared strings between prompt files and eval data; no dev/test split | P2 | AE-6.1, AE-6.3 | Held-out split and overlap check present |
| F4 | CI gates on a threshold and reports the delta against a baseline, per slice | No threshold constant; eval job never fails; single aggregate score; retry-until-green on the eval job | P2 | AE-6.1 | Eval too costly per commit and run on a documented cadence |
| F5 | Default CI needs no live paid calls; the provider sits behind one seam | Unit tests import the SDK and need an API key; SDK patched in many files | P2 | AE-6.2 | Separate opt-in live suite |
| F6 | Deterministic glue has ordinary tests | No tests for parsers, validators, routers, tool-arg checkers, redaction, ACL filters, prompt builders | P2 | AE-6.2 | Glue is a trivial pass-through |
| F7 | Tests assert properties and contracts, not exact prose | Snapshot or `assertEqual` on model text; `temperature=0` treated as determinism; single-run live tests | P3 | AE-6.2 | Exact strings are produced by deterministic code |
| F8 | An LLM judge is calibrated, rubric-based, pinned, a different model, and never the sole safety gate | No human-label agreement number; judge model equals generator; single-order pairwise; judge score as the only release gate for safety | P2 (P1 as sole safety gate) | AE-6.3 | Judge is one metric beside deterministic checks (see calibration CAL-11) |
| F9 | Agents are evaluated on outcomes and trajectories | Only final text graded; no state assertion; one trial per task; no step and cost columns | P2 | AE-6.4 | Agent is a bounded fixed workflow tested step by step |
| F10 | Injection, refusal, permission-denial, ACL and abstention cases exist | No injected-document, poisoned-chunk, cross-tenant or unanswerable cases in tests or datasets | P1 (tools or RAG), P3 otherwise | AE-6.4, AE-2.1 | Feature has no tools, no retrieval and no untrusted input |
| F11 | Cassettes match on the request body and hold no secrets or PII | Match on URL only; `authorization` or emails in cassette files; record mode on in CI | P2 (P0 for a live key) | AE-6.2, AE-8.2 | Scrubbing hook plus replay-only CI |
| F12 | Fixtures are synthetic or redacted | Real customer conversations in datasets or fixtures | P1 | AE-8.2 | Synthetic generation documented |
| F13 | The agent cannot edit the tests, graders or eval data it is judged by | Write scope includes `tests/`, CI config, scorers; diffs add skip, xfail or weakened assertions | P2 | AE-6.4, AE-3.5 | Graders are held out and hashed |

---

## G. Observability & Operations _(AE-7)_

**Think:** when a user says "the AI did something wrong yesterday", can we find the exact call, prompt version and inputs — and switch the feature off in minutes?

| ID | Check | Detection signal | Sev | Clause | Not a finding when |
| --- | --- | --- | --- | --- | --- |
| G1 | Every model and tool call is traceable | Wrapper emits no request id, model+version, prompt version, tokens, latency, cost, stop reason or tenant; provider request id not logged | P2 | AE-7.1 | Tracing is added by a gateway all calls pass through |
| G2 | Prompts, completions and tool payloads are not logged raw with PII or secrets | `logger.*(prompt/messages/response)`; tracing SDK content capture on by default; headers with keys logged | P1 (P0 for secrets) | AE-7.2, AE-2.4 | Redaction middleware with tests covers the sink (see calibration CAL-9) |
| G3 | Trace retention, sampling and access are defined | No TTL on the trace store; 100% raw content kept forever; whole org can read all conversations | P2 | AE-7.2 | Metadata-only traces |
| G4 | Redaction is tested and fails closed | No test with sample PII; redaction exceptions swallowed | P2 | AE-7.2 | Redaction is a vetted platform component with its own tests |
| G5 | Prompts, models, retrieval configs and tool sets are versioned and attributable | Prompt constants edited in place; prompt fetched "latest"; trace lacks prompt version | P2 | AE-7.3 | Version is the git commit and is recorded on traces |
| G6 | A kill switch and one-step rollback exist without a deploy | No flag around the AI entry point; flag read only at startup; rollback means revert and redeploy | P1 (autonomous or high-impact), else P2 | AE-7.3, AF-6 | Feature is suggest-only, low volume, and removal is trivial |
| G7 | Behavior changes roll out gradually behind a flag with an eval gate | Model or prompt swapped for all traffic; no cohort config; no halt criteria | P2 | AE-7.3 | Internal-only feature |
| G8 | Production quality is monitored with alerts | No monitors on parse-failure, refusal, truncation, fallback, latency, cost or tool-error rates; parse failures swallowed into defaults | P2 | AE-7.4 | Pre-release; monitoring is a dated plan item |
| G9 | User feedback is captured with the trace id and feeds the eval set | Thumbs with no backend; feedback table lacks a trace id; no triage path | P3 | AE-7.4 | Feature has no user-facing output |
| G10 | Tool calls leave an append-only audit record | No record of who, arguments, result and approver for side-effecting tools; log writable by the app role | P2 | AE-7.1, AE-3.4 | Downstream systems already audit every action |
| G11 | Retrieval is reproducible: ids, scores, filters, index version | Retriever returns documents with no logging of ids or scores | P3 | AE-7.1 | No retrieval in scope |
| G12 | An owner and an incident runbook exist | No owner on the flag or feature; no runbook for outage, cost spike, quality regression or data leak | P3 | AF-6 | Owner and runbook live in a linked doc |

---

## H. Data, Privacy & Governance _(AE-8)_ — items marked `[LEGAL-OWNER]` are escalate-not-decide

**Think:** which personal or confidential data leaves our boundary, who keeps it, for how long — and can every copy be found and erased?

| ID | Check | Detection signal | Sev | Clause | Not a finding when |
| --- | --- | --- | --- | --- | --- |
| H1 | The data flow to the model provider is documented and lawful `[LEGAL-OWNER]` | Personal or confidential data in prompts with no data-flow note; new SDK or endpoint receiving personal data with no processor entry | P1 | AE-8.1, AF-5 | Only public or synthetic data is sent |
| H2 | Provider terms fit the data class `[LEGAL-OWNER]` | Consumer-tier keys or endpoints for business data; retention or training terms unchecked; regulated data sent to a feature not eligible for the required retention setting | P1 | AE-8.1 | Enterprise or API terms confirmed in the plan with a source |
| H3 | Data is minimized and redacted before prompt assembly | No redaction or tokenization step; whole records, threads or mailboxes in prompts | P1 | AE-8.1, AE-4.1 | Only non-personal fields are sent |
| H4 | Region and transfer mechanism are recorded `[LEGAL-OWNER]` | Default global endpoint for a feature with residency needs; no region pin | P2 | AE-8.1 | No residency requirement |
| H5 | Erasure reaches vectors, caches, logs, datasets and fine-tunes | Vector upserts without `user_id`/`tenant_id`/`source_id`; delete-user routine that skips the vector store, caches or logs; soft-delete only | P1 | AE-8.2 | No personal data stored |
| H6 | Stored conversations, memory and traces carry retention and deletion rules | No TTL or `expires_at`; memory shared across users; no delete endpoint | P2 | AE-8.2 | Retention set at the platform layer |
| H7 | Production data reused for evals, analytics or fine-tuning is consented and scrubbed `[LEGAL-OWNER]` | Pipeline from prod logs to datasets with no purpose flag or PII scrub | P1 | AE-8.1, AE-8.2 | Synthetic data only |
| H8 | Users are told they interact with AI or receive AI content where required or expected `[LEGAL-OWNER]` | UI copy lacks an AI label; system prompt says the bot must never reveal it is an AI; human name and avatar (see calibration CAL-12) | P1 | AE-8.3, AE-9.1 | AI nature is obvious to the user and the owner recorded the decision |
| H9 | Automated decisions with significant effect on a person have human review, explanation and a contest path; the risk tier is recorded `[LEGAL-OWNER]` | Model output drives `approve`/`reject`/`deny`/`suspend` on hiring, credit, benefits, insurance, education or access with no review queue, appeal or decision record; "review" defaults to accept | P0 | AE-8.3 | Output is advisory to a person with real authority, time and evidence |
| H10 | Provider-hosted state is deleted on schedule | Hosted threads, files, vector stores or stored responses with no delete calls or lifecycle job | P2 | AE-8.2 | Provider retention is zero and confirmed |
| H11 | Models, datasets, packages and tools are pinned and vetted | Unpinned model revisions, downloads at container start, dependencies suggested by a model never verified, no AI bill of materials | P2 | AE-8.4 | Depth is in §K and §L |
| H12 | The AI feature is registered with an owner and a recorded risk tier `[LEGAL-OWNER]` | New provider SDK or key with no registry, README or ADR entry; person-affecting domain with no tier note | P2 | AE-8.3, AF-6 | Registry entry present in the plan |
| H13 | Training, RAG and eval data have a recorded source and licence `[LEGAL-OWNER]` | Loaders from unnamed URLs; scrapers ignoring terms; no licence column in dataset manifests; long verbatim spans of third-party content | P2 | AE-8.4 | Data is first-party or licence recorded |

---

## I. Human Experience _(AE-9)_ — overlaps with UI gates: report once under the ID the consuming skill uses

**Think:** does the user know what this is, how far to trust it, and how to correct it, undo it or reach a human?

| ID | Check | Detection signal | Sev | Clause | Not a finding when |
| --- | --- | --- | --- | --- | --- |
| I1 | AI output is labelled and distinguishable from verified content, including in exports | Render component with no badge or label; provenance dropped on copy, export or send | P2 | AE-9.1 | AI origin is obvious in context |
| I2 | Copy and persona do not over-claim | "100% accurate", "guaranteed", "human-level"; bot claims feelings or being human; human name and photo for a bot | P1 | AE-9.1 | Copy is substantiated by eval evidence |
| I3 | Capabilities, limits and data use are stated where the user decides | Open "ask me anything" for a bounded domain; limits only in terms of service; no data-use note | P3 | AE-9.1 | Scoped welcome and in-context limits present |
| I4 | Uncertainty is shown only when it informs a decision, and honestly | Raw logprob or softmax shown as "97% confident" with no calibration | P3 | AE-9.1 | Categorical cut-offs backed by a calibration test |
| I5 | Users can correct, retry, undo, dismiss and give one-action feedback | AI edits applied in place to user data with no undo; no regenerate or dismiss | P2 (P1 when data is overwritten irreversibly) | AE-9.2 | Output is a read-only suggestion |
| I6 | A human path exists where money, safety, account or legal outcomes are at stake | Bot is the only channel; no handoff route; escalation disabled by config | P1 | AE-9.2 | Low-stakes assistant with a documented alternative channel |
| I7 | Failure, empty, refusal, low-confidence, timeout and slow states are designed | Spinner forever; raw provider error text; blank answer; silent fallback with no notice | P2 | AE-9.2 | Handled by a shared UI component (cite it) |
| I8 | Refusals are mapped, explained and never treated as answers | Refusal or empty string stored or shown as a normal result; no next step offered | P3 | AE-9.2, AE-1.3 | Refusal branch exists at the boundary |
| I9 | Streaming is safe: cancel works, partial JSON is never parsed, partial markup is not rendered unsanitized | No stop control; parse on each chunk; token-by-token `innerHTML` | P2 | AE-9.3 | Output buffered to completion |
| I10 | AI interfaces stay accessible, including streaming | `aria-live="assertive"` on a streaming container; no live-region strategy; icon-only feedback buttons | P2 | AE-9.4 | Covered by the UI gate finding (report once) |
| I11 | Systems that rank, score or judge people are tested for fairness | "Rate this candidate/applicant/customer" prompts; person-scoring code with no per-group, counterfactual or impact-ratio tests; proxy features (postcode, name, school) | P1 (P0 when the output auto-filters people) | AE-9.4, AE-8.3 | No person-level decision or ranking |
| I12 | Safety-critical topics have a defined path | Health, self-harm, legal, financial or minors handled by a general bot with no classifier, escalation or red-team suite | P0 (dedicated wellness or health product), else P1 | AE-9.4 | Feature refuses the topic and routes to a human |
| I13 | AI is opt-in or easily opt-out; memory is inspectable and deletable | `ai_enabled` or `share_for_training` default true; opt-out needs a support ticket; hidden long-term memory | P2 | AE-9.2, AE-8.3 | Global controls present |

---

## J. RAG _(apply if retrieval feeds a model)_

Deep catalog: `.claude/docs/ai-engineering-knowledge.md` §J; read it when a check needs the reasoning. Authorization in retrieval is D7; caches are D8; grounding is D10–D11.

**Think:** what can the retriever return for this caller that they must not see — and what does the model do when retrieval finds nothing?

| ID | Check | Detection signal | Sev | Clause | Not a finding when |
| --- | --- | --- | --- | --- | --- |
| J1 | Who can write to the corpus is reviewed; chunks are untrusted data | Open web, uploads, tickets or wiki ingested into an index feeding a tool-using agent; no provenance metadata; retrieved text placed in the instruction position | P1 (P0 when the agent has outbound tools) | AE-2.1, AE-4.3 | Corpus is operator-curated and reviewed |
| J2 | Tenant isolation is enforced at the data layer and tested | Shared index with no tenant key; no cross-tenant negative test; tenant taken from the request | P0 | AE-4.3, AE-6.4 | Single-tenant public corpus |
| J3 | Embedding model and version are recorded per index; a reindex path exists | Embedding model from an env default or `latest`; no version field in vector metadata; model change with no index change | P1 | AE-4.3 | Index is rebuilt from scratch by a documented job |
| J4 | Source updates and deletions reach the index | One-off ingestion script; no content hash or `indexed_at`; deleted source still retrievable; no staleness metric | P2 (P1 for erasure) | AE-4.3, AE-8.2 | Static corpus |
| J5 | Chunking, top-k, reranking and hybrid search are tuned on the project's own corpus | Framework-default chunk size; `top_k=3` or `top_k=50` with no measurement; vector-only search for ids and codes | P2 | AE-4.1 | Measured retrieval quality is attached |
| J6 | Retrieval quality is evaluated separately from generation | Only end-to-end answer scores; no labeled query to expected-chunk set; no recall metric at the production `top_k` | P2 | AE-4.4, AE-6.1 | Retriever is a thin call to a managed service with its own eval |
| J7 | The no-answer path exists and is tested | No empty or low-score branch; prompt lacks "say if unknown"; no unanswerable rows in evals | P1 | AE-4.4 | Answers are advisory and labelled |
| J8 | Filters built from model output are validated against a schema | Filter dict or expression passed from model JSON to the vector store | P1 | AE-4.3, AE-2.2 | Enum-validated fields only |
| J9 | The vector store is access-controlled and holds no unclassified sensitive text | Vector database exposed without auth; embeddings of PII treated as anonymous; no retention field | P2 | AE-8.2 | Data is public |

---

## K. Agent, Multi-Agent & MCP / Tool Servers _(apply if agents or tool servers are present)_

Deep catalog: `.claude/docs/ai-engineering-knowledge.md` §K. Loop bounds are C1; approval is C6–C7.

**Think:** which third-party tool, server or agent gets trusted, with what authority — and what changes if it changes under us?

| ID | Check | Detection signal | Sev | Clause | Not a finding when |
| --- | --- | --- | --- | --- | --- |
| K1 | Tool servers are pinned and re-approved on change | `npx -y pkg` or `uvx pkg` unpinned; `latest`; remote server that can mutate its tool list silently; approval by name only | P1 | AE-8.4, AE-2.1 | Version and manifest hash pinned |
| K2 | Third-party tool names and descriptions are reviewed as untrusted prompt text; servers are isolated | Several third-party servers in one session, one handling private data; duplicate tool names; descriptions copied at runtime into the prompt | P1 | AE-2.1, AE-2.3 | First-party or vendored definitions |
| K3 | Servers accept only tokens minted for them; no passthrough | Inbound `Authorization` header forwarded upstream; token verification without an audience | P1 | AE-2.5 | Not an authorization-bearing server |
| K4 | Servers enforce authorization and validate arguments themselves | "Only the LLM calls this" so arguments unchecked; `subprocess`, `os.system` or string SQL in a tool handler | P0 | AE-3.2, AE-2.2 | Handler validates and authorizes every call |
| K5 | Tool combinations are reviewed for toxic flows and scoped per session | One broad-scope token serving public untrusted content and private data with write tools | P0 | AE-2.3, AE-3.2 | Session scoped to one repository or one data set |
| K6 | Locally spawned servers are consented, sandboxed and authenticated | Config `command` with `sudo`, `curl`, `sh -c`; local HTTP server with no auth; no sandbox wrapper | P1 | AE-3.2 | Stdio transport in a sandbox with reviewed commands |
| K7 | Code-executing agents run in a sandbox isolating filesystem and network with no ambient secrets | `--privileged`, docker socket or home mounts, host network, root user; `env=os.environ` passed on; generated code run on the host | P0 | AE-3.2, AE-2.2 | Disposable micro-VM or container with scoped, short-lived credentials |
| K8 | The agent cannot write files that change its own trust boundary | Writable scope includes agent or MCP config, git hooks, CI workflows, shell rc, tool allowlists; create-versus-edit approval differences | P1 | AE-3.2, AE-3.4 | Those paths are read-only to the agent |
| K9 | Multi-agent design is justified and contracted | More than two agents with no written protocol; one agent's output executed as instructions by another; shared mutable files; no single-agent baseline; no circuit breaker | P2 | AE-3.5 | Bounded fan-out with typed results and independent verification |
| K10 | Permission-bypass flags do not ship in configs, scripts or CI | `--yolo`, `--trust-all-tools`, `--dangerously-skip-permissions`, `bypassPermissions` in non-sandbox settings | P1 | AE-3.4, AE-8.4 | Confined to a disposable sandbox with no credentials |
| K11 | MCP clients validate the authorization server and bind state to the principal | Token exchange with no `iss` comparison; one client credential store shared across authorization servers; a state-handle argument accepted with no owner check; open Dynamic Client Registration with no policy | P1 | AE-2.5 | Stdio server with no OAuth and no cross-call state |
| K12 | Browser and computer-use agents run isolated with code-enforced confirmation | Automation attached to a real signed-in profile or cookie store; unrestricted navigation; submit, pay or delete with no confirmation gate; page or screenshot text obeyed as instructions | P1 | AE-3.2, AE-2.3 | Read-only browsing of public pages in a disposable profile with no credentials |
| K13 | Each agent has its own user-scoped identity and peers are authenticated | One service account or long-lived key shared by every agent; a peer agent's message or agent card trusted unverified; sub-agent spawn with no scope or depth limit | P1 | AE-3.5 | Single agent with no peers and no delegation |

---

## L. Fine-Tuning, Classical ML, Model Supply Chain, AI-Assisted Code, Multimodal & Voice _(apply if the surface is present)_

Deep catalog: `.claude/docs/ai-engineering-knowledge.md` §L.

**Think:** where do weights, datasets, packages and generated code come from — and what could leak between train and test, or between people?

| ID | Check | Detection signal | Sev | Clause | Not a finding when |
| --- | --- | --- | --- | --- | --- |
| L1 | Untrusted model or data artifacts are never loaded with pickle-family loaders | `pickle.load`, `joblib.load`, `torch.load` without `weights_only=True`, `allow_pickle=True` on downloaded, uploaded or shared files; safetensors available but unused | P0 | AE-8.4 | Artifact produced and signed inside the trust boundary |
| L2 | Remote code and downloads are pinned | `trust_remote_code=True`; `from_pretrained` or `load_dataset` with no pinned revision; downloads at container start | P1 | AE-8.4 | Code reviewed, vendored and revision-pinned |
| L3 | No train/test leakage | Scaler, encoder, selector, resampler or embedding fitted before the split; grouped entities split across folds; shuffled split on time-ordered data; suspiciously high CV score | P1 | AE-6.1 | Pipeline object fits inside each fold |
| L4 | Evaluation hygiene holds | Metric reported on training data; test set reused for tuning; no baseline model; accuracy on skewed labels | P1 | AE-6.1 | Documented holdout and baseline |
| L5 | Runs are reproducible and lineage is recorded | No seeds; live table as training source; hand-named model files; no registry or data snapshot hash | P2 | AE-7.3 | Exploratory notebook not on a production path |
| L6 | Drift, skew and staleness are monitored with a retrain or rollback trigger | No drift job; the same feature implemented twice in training and serving; no `last_trained` check | P2 | AE-7.4 | Static model with a documented shelf life |
| L7 | Thresholds are calibrated and chosen against business cost | Literal `0.5` on uncalibrated scores; probabilities shown to users; resampling before the split | P3 (P2 for decisions about people) | AE-6.1 | Calibration curve attached |
| L8 | Fine-tuning data is scrubbed, provenanced and licensed; the tuned model is evaluated after tuning `[LEGAL-OWNER]` | Tickets, emails or chats fed to a tuning job with no PII scan; no memorization or safety evaluation; anonymity assumed | P1 | AE-8.1, AE-8.4 | Synthetic data with a recorded licence |
| L9 | AI-generated code and dependencies get the same review and verification | New dependency absent from the lockfile or with few downloads and a near-popular name; large diff with no tests; new auth, crypto, SQL or shell code with no security review | P1 | AE-8.4, AE-6.2 | Dependency verified and pinned; tests and review present |
| L10 | Multimodal and voice inputs are untrusted; media rights and disclosure are handled `[LEGAL-OWNER]` | Image, PDF or audio text passed to a tool-enabled agent unlabelled; voice agent passes as human; raw audio retained; generated media exported with metadata stripped | P1 | AE-2.1, AE-8.3 | Input from the operator only; retention and disclosure documented |
| L11 | Experiment code is not on a production path | Notebook run by a scheduler or deploy; absolute local paths; commented experiment cells; no tests on feature code | P3 | AE-6.2 | Notebook is an output-only report |
| L12 | Third-party agent skills, plugins and instruction files are pinned, reviewed and scanned as code | A skill, plugin or `SKILL.md`/`AGENTS.md` fetched unpinned or at runtime; prose that adds tools, network egress or shell access; no scan step in the install path | P1 | AE-8.4 | First-party files reviewed in the same change |

---

## M. Plan-Review Questions _(`AF-1`–`AF-6` gate for a PLAN)_

A plan that creates or changes an AI surface must state the items below **per AI phase**. A missing item is a plan gap, not a code finding: severity P1 when the action is irreversible, external or affects people, P2 otherwise, P3 for a suggest-only helper with a dated fill-in milestone. Report "the plan does not state X — add Y".

| Clause | The plan must state | Gap signal |
| --- | --- | --- |
| AF-1 Job & fit | The user job; why a model is needed; the deterministic or simpler alternative considered; the lowest autonomy architecture chosen (single call, fixed workflow, agent) with the reason | Agent chosen for a fixed pipeline; no "why not rules, search or plain code" |
| AF-2 Success & eval first | Measurable success criteria; a baseline; the eval set or rubric (or a dated plan to build it); who reruns it on every prompt, model or retrieval change | "We will add evals later" with no date or owner; no baseline |
| AF-3 Failure & blast radius | Failure modes (wrong, unsafe, manipulated, slow, expensive, unavailable); the cost of a wrong output per action; reversible versus irreversible; a fallback per mode | Only "hallucination" and "cost" considered; no fallback |
| AF-4 Autonomy & oversight | Autonomy level (suggest, confirm, act-with-undo, autonomous); approval points for irreversible or high-impact actions; whose authority the tools use | Approval "in the prompt"; shared service credentials; no undo |
| AF-5 Data & trust boundaries | What data reaches the model and the provider; every untrusted content source; every output sink; the trifecta analysis; tenant and permission boundaries; provider terms and region `[LEGAL-OWNER]` | No data-flow diagram; sinks unlisted; no trifecta or rule-of-two analysis |
| AF-6 Operate | Cost, latency and token budget per request and per user; observability fields; prompt and model versioning; kill switch and rollback; provider-outage behavior; a named owner | No budget; no kill switch; rollback means redeploy; no owner |

Per AI phase also require: **model + pinned version + fallback**, **eval + baseline**, **cost/latency budget**, **failure modes + fallback**, **autonomy + approval**, **data flow + sinks**, **rollout + kill switch + owner**. Additionally: `AR` sweeps become questions — is there a threat model naming injection sources and the worst tool call (B1–B3)? which model IDs and are they current and pinned (A9–A10, verified per §0.2)? which tools with which credentials (C3–C6)? which caches, memories and indexes hold whose data, and how does erasure reach them (D7–D9, H5)? which named test protects each invariant (§N)? Ask the plan about a `[LEGAL-OWNER]` item only to confirm a decision is recorded.

---

## N. Test-Review Questions _(what tests of an AI feature must contain to protect intent)_

| # | Question | Failing answer | Clause |
| --- | --- | --- | --- |
| N1 | Does each test name the business rule or failure mode it protects, and fail if that behavior breaks — not merely if wording changes? | Tests named `test_response`; assertions mirror current output | AE-6.2 |
| N2 | Is the model behind one seam with a fake returning canned completions, tool calls, 429, timeout, truncation, refusal and malformed JSON? | Live keys needed in unit CI; SDK patched everywhere | AE-6.2 |
| N3 | Do assertions target properties: schema, required facts, cited ids exist in the retrieved set, no PII, length cap, tool name and arguments? | Exact prose or snapshots | AE-6.2 |
| N4 | Do tool-using tests check tool arguments AND final system state — the row exists exactly once, no side effect on a denied action — rather than intermediate bookkeeping that another process can write? | Only the reply text is checked; assertions on delivery or attempt counts | AE-6.4 |
| N5 | Are negative cases present: should-not-call-tool, should-refuse, unanswerable, empty, oversized, multilingual, ambiguous input? | Happy-path demo prompts only | AE-6.1 |
| N6 | Are injection cases present — direct, via a retrieved document, via tool output, poisoned chunk — asserting containment and no privileged call, plus a cross-tenant retrieval test? | "Handled by the system prompt" with no test | AE-2.1, AE-6.4 |
| N7 | Are retrieval tests independent of generation (labeled queries to expected chunk ids, recall threshold, filters applied, deleted document not retrievable)? | Only end-to-end answer scoring | AE-4.4, AE-6.1 |
| N8 | Do live-model evals run N times with a tolerance against a baseline, report worst case, and use pass-all-trials reliability for agent tasks? | Single-run pass; retry-until-green | AE-6.1, AE-6.4 |
| N9 | Are datasets versioned, split, sourced from real failures, overlap-checked against prompts and few-shots, and PII-scrubbed? | Eval rows copy-pasted into few-shots; real customer text | AE-6.1, AE-8.2 |
| N10 | Is the judge itself tested: human-labeled calibration set, true-positive and true-negative rates, position-swap consistency, pinned prompt and model? | Judge score is the truth | AE-6.3 |
| N11 | Are budget and reliability paths tested: over-budget rejection, max-iterations stop, timeout, retry cap, fallback taken and flagged, kill switch off-path, breaker open? | Only the success path exists | AE-5.1, AE-5.3, AE-7.3 |
| N12 | Is redaction tested with sample PII on prompts, responses, tool results and traces, plus a test that default logs contain no raw content? | No redaction test | AE-7.2 |
| N13 | Does CI fail on regression and does a change to prompts, model IDs, tool schemas, retriever or embedding config trigger the eval job? | Eval job exists but never gates | AE-6.1 |
| N14 | Are tests isolated — fresh state per trial, no shared cache or database — and free of real secrets or PII in cassettes? | Shared temp state; keys in fixtures | AE-6.2, AE-8.2 |

---

## O. Report Output Format

Write ONE report at the path the consuming skill names (default under `tmp/reports/`), appended per surface as each is finished — never held for a final batch write.

```markdown
# AI-Engineering Review — [Feature / Change] — [Date] — [code | plan | plan-vs-code]

## Context
Surfaces · Autonomy level · Data sensitivity · Users and tenancy · Environment · Model and provider (verified per §0.2, URLs) · Project policy read
Known gaps: [what was unavailable, and which findings are therefore low confidence]

## AI-surface map
| Surface | Kind (call site, prompt, agent, tool, retrieval, eval, infra) | File:line | Autonomy | Data reaching the model | Output sinks |
| --- | --- | --- | --- | --- | --- |

## Trust boundaries and trifecta
| Flow / agent | Private data (Y/N, what) | Untrusted content (Y/N, sources) | Outbound channel (Y/N, which) | Legs present | Broken by (removed leg or approval, file:line) |
| --- | --- | --- | --- | --- | --- |

## Verdict
[Ship / Ship with fixes / Do not ship] — one paragraph of reasoning.

## AI Gate Report
| Gate | Status (PASS / FAIL / N/A / NOT VERIFIABLE) | Evidence (file:line or plan section) |
| --- | --- | --- |
| AF-1 … AF-6 (plan mode, or code mode where the plan is available) | | |
| AE-1.1 … AE-9.4 (one row per clause) | | |
| AR-1 … AR-6 (context, evidence, severity, sweeps, report, triage) | | |

## Findings
### P0 — Critical
**[AE-x.y] [check id] Title**
- Location: [file:line — or every location / the shared owner for a systemic finding]
- Evidence: [what was observed] — [MEASURED | OBSERVED | HEURISTIC]
- Impact: [who or what is harmed, and how; trigger path]
- Severity basis: [consequence, plus any escalation or de-escalation with its cited control]
- Fix: [specific, implementable, at the owner of the violated contract]
### P1 — High
[same structure]
### P2 — Medium
[condensed, one line each, same fields]
### P3 — Low
[bulleted list]

## Deferred and NOT VERIFIABLE
- [claim] — [why unverifiable: runtime only, eval output missing, provider fact unconfirmed] — [what would settle it]
- Deferred: [item, owner, residual risk] · Escalated `[LEGAL-OWNER]`: [item, question for the owner]

## Coverage
| Sweep | Checked | Passed | Failed | N/A | Not verifiable |
| --- | --- | --- | --- | --- | --- |
| A Prompt & model contract | 13 | | | | |
| B Security & safety | 13 | | | | |
| C Agent & tool design | 14 | | | | |
| D Context & retrieval | 11 | | | | |
| E Reliability & cost | 14 | | | | |
| F Evaluation & testing | 13 | | | | |
| G Observability & operations | 12 | | | | |
| H Data, privacy & governance | 13 | | | | |
| I Human experience | 13 | | | | |
| J RAG · K Agent & MCP · L ML & supply chain (conditional) | 9 · 10 · 11 | | | | |
```

Rules: a clean sweep says "no issues found"; a status of `PASS` needs its evidence cell filled; the top-10 cap applies to P2 and below; any P0 caps the verdict at **Do not ship**; a `[LEGAL-OWNER]` finding appears as a question to the owner, never as a legal conclusion.

---

## P. Quick Triage Pass (10 checks)

When a full review is not possible, run only these. They catch the majority of serious defects.

1. Is every model call bounded — timeout, `max_tokens`, input cap, retry cap? _(A11, E1, E2, E8)_
2. Is output validated at the boundary — schema, semantic checks, `stop_reason` handled? _(A4, A5, A8)_
3. Is untrusted content kept out of the instruction channel and labelled where it enters context? _(A2, A3, B2)_
4. Is every sink safe for model output — HTML and markdown, SQL, shell, URL, path? _(B4, B5, B6, B7, B8)_
5. Is authorization enforced in code with the end user's identity, never by the prompt or a guardrail? _(B3, C4, C5, D7)_
6. Is every agent loop capped and every irreversible action gated? _(C1, C6, C7)_
7. Are cost and abuse capped — quotas, authenticated endpoints, bounded fan-out? _(E9, E10, E14)_
8. Is there an eval or test that fails when the behavior regresses, including injection and negative cases? _(F1, F6, F10)_
9. Is every call traceable without raw PII, and is there a kill switch? _(G1, G2, G6)_
10. Can the user correct, undo, see limits and reach a human — and is the AI labelled? _(I1, I5, I6, H8)_

---

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** a repeatable, evidence-backed AI-feature review whose findings are ranked by real consequence — every one carrying location, clause, check ID, severity basis and fix.

**IMPORTANT MUST ATTENTION** establish §0.1 context FIRST (surfaces, autonomy, data sensitivity, users, environment, project policy). Fewer than four known → state the gap and mark affected findings low confidence — why: a check judged against an unknown blast radius is a guess wearing an ID.

**IMPORTANT MUST ATTENTION** walk the sweeps in order — §A prompt & contract → §B security → §C agents & tools → §D context → §E reliability & cost → §F evaluation → §G operations → §H data & governance → §I human experience → §J/§K/§L when present → §M plan or §N test questions → §O report → §P triage — why: a section skipped in the long middle silently becomes an unreported defect class.

**IMPORTANT MUST ATTENTION** evidence or nothing — `file:line` for every finding, NEVER an invented cost, latency or accuracy number, and provider facts verified from current docs with the URL cited; unverifiable → `NOT VERIFIABLE` — why: a stale remembered fact produces a confident false finding.

**IMPORTANT MUST ATTENTION** severity by consequence with the §0.3 map; de-escalate only with a cited working control, never for a prompt-only defense, and route every `[LEGAL-OWNER]` item to its owner instead of deciding it — why: relabeling severity to reach a verdict bounds nothing.

**IMPORTANT MUST ATTENTION** apply this checklist ONLY to changes that carry an AI surface, report a defect ONCE across `AF`/`AE`/`AR`/UI/`security-audit` overlaps, cap the report at the top 10, and give every P0 and P1 a concrete fix.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
| "The prompt already tells the model not to do that" | A prompt is not a boundary. Find the code that enforces it, or file B3 / C5. |
| "We added a moderation classifier, so the tool is safe" | A classifier is one probabilistic layer. Ask what still holds when it misses. |
| "I remember that model or parameter is retired" | Memory is not evidence. Verify from current provider docs and cite the URL, or mark it `NOT VERIFIABLE`. |
| "The model is well-behaved on our demo inputs" | Three demo prompts are not an eval. Ask for the dataset, the baseline and the negative cases. |
| "Only the model calls this tool, so the arguments are safe" | Model output is untrusted input to every tool. Validate and re-authorize in the tool. |
| "It is only a prototype, skip the checks" | Prototype de-escalates polish, never exposure — secrets, cross-user data and destructive tools stay P0. |
| "Legal probably needs this, I will say it is non-compliant" | Flag and route `[LEGAL-OWNER]` items as a question. Deciding legality is not a reviewer's call. |
| "I found 30 issues, list them all" | Cap at the top 10 by severity and cluster systemic defects. An unranked list moves no decision. |

**IMPORTANT MUST ATTENTION** evidence or nothing — `file:line`, no invented measurements, provider facts from current docs.
**IMPORTANT MUST ATTENTION** severity by consequence — escalate and de-escalate only with cited controls; route `[LEGAL-OWNER]`, never decide.
**IMPORTANT MUST ATTENTION** project policy outranks this checklist — a documented decision is not a defect; a control outside the model is the only real boundary.
