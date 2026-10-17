# AI-Engineering Review Calibration — worked examples with expected findings

> **Role:** calibration set for `ai-engineering-review-checklist.md` (check IDs, P0–P4 map, escalation rules), `SYNC:ai-engineering-gate` (`AE-*`) and `SYNC:ai-feature-framing-gate` (`AF-*`). Each case states the situation, the evidence a reviewer must gather, the findings a correct review produces (check ID and severity), what is NOT a finding, and what would change the verdict. Use it to calibrate severity before a review, and as the fixture set for evaluating review output.
>
> **Id spaces.** Cases are `CAL-1`–`CAL-14`. A bare `A1`–`N10` (for example `B6`, `C7`) is always a CHECK id from `ai-engineering-review-checklist.md`, which owns severity; `K-<letter><n>` rows belong to the knowledge catalog and are rationale pointers only. Cite a case as `CAL-<n>`, never `C<n>`.
>
> **Both directions matter.** Half of these cases are false positives or de-escalations. A review that flags every model-ID literal and every missing test is as wrong as one that misses an unescaped `innerHTML`. Read the case nearest your finding before you file it; read `.claude/docs/ai-engineering-review-checklist.md` §0.3 when a severity needs escalating or de-escalating.
>
> **Portability.** Every case is generic; no project, product, provider or stack is implied, and model names are placeholders. Numbers inside a case are the case's own facts, never thresholds. Provider facts inside a case are hypothetical fixtures — a real review verifies them from current provider documentation (checklist §0.2). A project's policy, accepted decisions and compliance owner outrank any expectation here.
>
> **Consumed by:** any reviewer of an AI feature — read it when a finding's existence or severity is unclear. Add a case when a real review mis-ranked a defect class; never add a case that encodes one project's convention.

---

## CAL-1 — Model output rendered as HTML (true positive, and its false-positive twin)

**Situation.** An inbox assistant summarizes incoming mail and shows the summary in a side panel.

```js
panel.innerHTML = completion.text;            // summary of an inbound email
```

The model reads emails from external senders; the panel runs in the mail app's origin with the user's session.

**Evidence to gather.** What text the model reads (external email = untrusted, B2) · the render sink and its origin · whether a Content-Security-Policy restricts image and script sources · whether private data (other mail, session) is reachable from that origin.

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `B6` | P0 | Attacker-shaped email steers the model to emit markup; the panel executes or auto-loads it in a session with private data. Consequence is script execution or click-less exfiltration, so P0 by the escalation rule (untrusted content and private data). |

**NOT a finding.** The same summary rendered by a markdown renderer with raw HTML disabled, output sanitized by an allowlist sanitizer, external image and link targets blocked or rewritten, and a CSP restricting `img-src` — cite the renderer configuration and the CSP header as the compensating controls. If the renderer is present but raw HTML is on, `B6` stands.

**What would change the verdict.** Text derived only from the user's own typed input rendered in the user's own client is self-inflicted and drops to P2. A sanitizer that strips inline images but not reference-style markdown images does not compensate; test both forms before de-escalating.

**Fix shape.** Render as text or sanitized markdown at the display boundary (one shared renderer), image and link allowlist, CSP `img-src`. If the panel streams, per-chunk markup insertion (`I9`) is part of the same fix, not a second finding.

---

## CAL-2 — Trifecta present, human approval on the outbound leg (downgrade)

**Situation.** A mail agent reads the user's mailbox (private data), reads inbound mail and fetched web pages (untrusted content), and can call `send_email`. The tool executor blocks `send_email` until the user approves; the approval dialog renders the real recipient, subject and body from the tool arguments, not from a model summary. `fetch_url` exists but is restricted to an allowlisted set of domains and drops query strings.

**Evidence to gather.** The tool list and registry · executor code for the approval gate (`file:line`) · what the dialog renders and where it gets its text · every other outbound route (URL fetch, image render, link output, other side-effecting tools) · approval-rate metrics if any.

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `B1` | P2 | All three legs exist, but the only outbound leg is behind a code-enforced approval that shows real arguments. De-escalated P0 to P2 with the gate cited. |
| P4 observation | — | No batching limit or approval-rate metric, so approval fatigue is unobserved; note it, do not file it. |

**NOT a finding.** The existence of the trifecta by itself when a leg is provably removed or gated. Do not report `B3` — the control is code, not prompt.

**What would change the verdict.** If `fetch_url` accepts any domain or keeps query strings, it is an ungated outbound channel and `B1` returns to P0 (also `B7`). If the approval text comes from the model's own description of the action, the gate does not compensate (`C7`, P1) and `B1` stays P0. If approval is a default-selected "Approve" or batches many actions, treat as `C7` P1.

**Fix shape.** Keep the gate; add per-turn approval limits and an approval-rate metric; keep `fetch_url` allowlisted with query stripping.

---

## CAL-3 — Hard-coded model ID: a script versus a service

**Situation A (script).** `scripts/one-off-summarize.py`, run once by an engineer to summarize an export, contains `model="model-x-2026-01"` inline. No other file reads it. It is not in the deploy pipeline.

**Situation B (service).** A request-handling service calls `model="model-x-2026-01"` in four modules, two of them with a different literal, and no timeout or fallback is configured.

**Evidence to gather.** How many call sites and IDs · whether a config module exists · whether the script is reachable from production · provider lifecycle docs for the ID (verify per §0.2 — do not rely on memory).

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `A9` | P3 (script) | Recorded as Low or omitted; a one-off script gains nothing from a config module. |
| `A9` | P2 (service B) | Four call sites and two IDs for one role mean one swap needs four edits and behavior differs by module. |
| `A10` | P1 (service B, only if confirmed) | If provider docs confirm the ID is retired or near retirement, requests fail at retirement — cite the URL and fetch date. Unconfirmed → `NOT VERIFIABLE`, keep `A9` P2. |

**NOT a finding.** A model literal inside an eval that compares models by design, inside a test fixture, or in a single-module service that already reads it from one constant.

**What would change the verdict.** The script being moved into a scheduled job makes it Situation B. Retrieval of a dated snapshot in a config module with an owner and a deprecation calendar is the target state.

**Fix shape.** One config entry per role, environment-overridable, one adapter that applies per-model parameter rules; a startup or CI check against the provider lifecycle page.

---

## CAL-4 — Missing eval: experimental prototype versus production path

**Situation A.** A branch adds a chat-style helper under a feature flag named `experimental_ai_notes`, off by default, enabled for two internal accounts, no real customer data. The change edits the prompt; there is no eval directory.

**Situation B.** The same prompt edit lands in the customer-facing support answer path, on by default, with policy-question traffic.

**Evidence to gather.** Flag state and audience · data reaching the model · whether a plan or ticket dates an eval milestone (`AF-2`) · the previous eval, if any, and whether CI runs it.

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `F1` | P3 (A) | Flagged experimental, no user data, no production route: recorded for later with the plan's dated milestone cited. |
| `F1` | P1 (B) | A production behavior change with no eval delta and no baseline. Behavior change shipped without proof. |
| `D10` | P1 (B, if answers are policy claims) | Report together with `F1` when the eval gap hides ungrounded answers. |

**NOT a finding.** For A, the absence of a CI eval gate.

**What would change the verdict.** Enabling the flag for real users or removing the "experimental" label promotes A to B. A prototype that sends real customer data to a provider is not de-escalated at all for the data finding (`H1`, `H3`).

**Fix shape.** A golden set from real failures (see the evaluation section of `.claude/docs/ai-engineering-knowledge.md`), a baseline score, CI threshold, and the eval delta in the change description.

---

## CAL-5 — Unbounded agent loop: watched CLI versus background job

**Situation A.** An interactive terminal coding helper runs `while True: step()` until the model stops calling tools. The user sees each step stream and can press Ctrl-C.

**Situation B.** A nightly worker runs the same loop over a queue of support tickets with `send_reply` and `close_ticket` tools; nothing caps steps, time or spend.

**Evidence to gather.** Who watches the run · tools and their side effects · any per-run token or cost accumulation · schedule and concurrency · provider-side spend limits.

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `C1` | P3 (A) | The human is the loop's watchdog; a step cap is still cheap hygiene. |
| `C1` | P0 (B) | Unattended, spends money and sends external replies; escalated one level from the P1 default by the unattended-with-side-effects rule. |
| `C2` | P2 (B) | No repeated-call or failure-count detection, so one failing tool call can repeat until the budget is gone. |
| `E14` | P2 (B) | No provider-side spend limit as a last-resort backstop. |

**NOT a finding.** A bounded fixed workflow, or a loop capped by a shared runner the call site uses (cite the cap).

**What would change the verdict.** If B is limited to 20 steps, a deadline and a per-run budget with an explicit handled cap-hit result, `C1` passes and `C2` alone remains.

**Fix shape.** Step, time and budget caps in the loop runner; an in-band "you repeated X" break plus a hard trip; a handled partial result on cap hit.

---

## CAL-6 — RAG without an ACL filter: public docs versus multi-tenant

**Situation A.** A docs-search assistant answers from the product's public documentation; one index; no login; no user data.

**Situation B.** A knowledge assistant answers from tenants' uploaded files; one shared index; `search(query, k=8)` takes no filter; the answer prompt says "only use documents belonging to the current tenant".

**Evidence to gather.** Corpus origin and sensitivity · who writes to it · tenancy model · the retrieval call signature and where identity could enter · cross-tenant test presence.

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `D7` / `J2` | P0 (B) | Authorization is delegated to the model; any tenant can retrieve another's chunks. One finding carrying both IDs. |
| `F10` | P1 (B) | No cross-tenant negative test. |
| none | — (A) | Public corpus, single audience: an ACL filter has nothing to protect. Record P4 at most. |

**NOT a finding.** Missing per-document ACLs over a corpus that is public by design. Do not raise `J1` (write access) unless users can upload into that index.

**What would change the verdict.** Adding user uploads, private pages or a second audience to A converts it to B. In B, a tenant key taken from the request body or from model output is still P0 — the filter must derive from the authenticated identity.

**Fix shape.** Namespace or filter per tenant applied in the query layer from the authenticated identity, tenant-scoped caches, a CI test that tenant A cannot retrieve tenant B's chunk.

---

## CAL-7 — Temperature 0 assumed deterministic

**Situation.** A test asserts `assert reply == "Refund approved for order 118"` with `temperature=0`; separately, a caching layer treats two calls at `temperature=0` as equal and stores one result keyed by the input hash without model or prompt version.

**Evidence to gather.** Whether provider docs claim determinism (they generally do not) · what depends on equality: only a test, or a business decision · whether the cache key includes model and prompt version.

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `A11` | P3 | The test relies on determinism that sampling settings do not guarantee; flaky, no production harm. |
| `F7` | P3 | Exact-prose assertion; should assert properties (refund status, order id). Report with `A11` once. |
| `A11` | P2 | The cache treats sampled output as a stable function of the input; results become inconsistent across model updates. Escalated because production logic depends on it. |
| `D8` | P2 | Cache key lacks model and prompt version (and tenant, if multi-tenant — P0 then). |

**NOT a finding.** Setting `temperature=0` for extraction to reduce variance, where nothing depends on exact equality.

**What would change the verdict.** A cache for public, non-personalized results with a version-scoped key and a TTL passes `D8`.

**Fix shape.** Assert structured fields; key caches on model, prompt version and normalized input; treat temperature as variance reduction, not determinism.

---

## CAL-8 — Guardrail added as the only authorization

**Situation.** An internal, single-tenant helpdesk agent has `update_ticket(ticket_id, status)`. The system prompt says "only touch tickets assigned to the current agent". A moderation classifier screens the user message. The tool handler updates any ticket id it receives. Status changes are logged and reversible.

**Evidence to gather.** The tool handler (does it check assignment `file:line`?) · who the users are · reversibility and audit trail · whether untrusted content (customer tickets) reaches the model.

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `B3` | P1 | The only control is prompt text plus a classifier; a ticket body containing instructions, or a plain request, can change other agents' tickets. Bounded blast radius (internal, reversible, audited) keeps it P1. Cite `A8` (model-supplied id not ownership-checked) and `B12` (the classifier screens the user message only, tool calls are unguarded) inside the same finding. |

**NOT a finding.** The prompt instruction itself — keep it as redundancy once the code check exists.

**What would change the verdict.** Multi-tenant scope, money movement, or irreversible changes escalate to P0 (`C4`/`C5` also apply). A handler that already compares `ticket.assignee` to the authenticated agent makes the prompt line redundancy and closes the finding.

**Fix shape.** Enforce assignment in the tool handler with the authenticated identity; validate `ticket_id` and `status` against a schema; keep the classifier as one layer.

---

## CAL-9 — Logging raw prompts that contain PII

**Situation A.** `logger.info("llm request", extra={"messages": messages})` at INFO; messages include names, emails and support-ticket text; logs go to a third-party aggregator with 400-day retention.

**Situation B.** The same call site, but all model calls go through a gateway whose middleware redacts named PII categories and truncates content to metadata by default; the middleware has unit tests with sample PII and fails closed; retention is 14 days.

**Evidence to gather.** The logging sink and retention · whether a redaction layer exists and its tests · what data classes reach the prompt · the aggregator's data-processing terms (route, do not decide, per `[LEGAL-OWNER]`).

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `G2` | P1 (A) | Raw personal data in a broad, long-retention third-party sink. |
| `H1` | P1 (A) `[LEGAL-OWNER]` | Sub-processor and retention terms unrecorded: raise as a question to the owner, not as a legal conclusion. |
| `G3` | P2 (A) | No retention or access rule for the trace content. |
| none | — (B) | Redaction is a tested, fail-closed, centralized control; cite it. |

**NOT a finding.** In B, absence of per-call redaction code — the gateway owns it.

**What would change the verdict.** If the logged messages contain credentials or health data, escalate to P0. In B, if the redaction test uses one name and one email only and no test covers tool results, record `G4` P2 as a coverage gap.

**Fix shape.** Metadata-only tracing by default, opt-in content capture through the redaction layer, bounded retention, access control.

---

## CAL-10 — Retry around a non-idempotent tool call

**Situation.**

```python
@retry(stop=stop_after_attempt(5), wait=wait_fixed(1))
def send_receipt(order_id, email):
    return mailer.post("/send", json={"to": email, "order": order_id})
```

`send_receipt` is an agent tool. The mailer times out after the message is accepted.

**Evidence to gather.** Whether the mailer supports an idempotency key or dedupes on a business key · retry layers (SDK, wrapper, queue) · what the timeout implies about delivery state.

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `E3` / `C11` | P1 | A retry after an ambiguous timeout can send the receipt five times; one finding carrying both IDs. |
| `E2` | P2 | Fixed one-second wait, no jitter, retry on every exception including client errors. |

**NOT a finding.** The same code when the request carries `idempotency_key=f"receipt-{order_id}"` and the mailer dedupes on it, or when the retry only wraps a read.

**What would change the verdict.** A retry layer in the SDK plus this wrapper multiplies attempts; that stacks into `E2` P1. A transient `GET` lookup with backoff is fine.

**Fix shape.** Idempotency key on the side-effecting call; retry only transient classes with backoff and jitter at one layer.

---

## CAL-11 — LLM judge as the only safety gate

**Situation.** The release gate is `judge_score >= 0.9` over a 30-prompt toxicity and injection suite. The judge is the same model and prompt-family as the generator, unpinned (`latest`), and there is no human-labeled agreement number. Scores are averaged in one pass with the candidate answer always shown first.

**Evidence to gather.** Judge configuration · any calibration file (true-positive and true-negative rates) · whether deterministic checks run alongside · whether tests cover tool-permission denial and injection through retrieved text.

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `F8` | P1 | A sole, uncalibrated, self-judging, unpinned gate on safety behavior: a regression and a bias can both pass silently. |
| `F10` | P1 | No deterministic injection or permission-denial assertions behind it (tool-using feature). |
| `F4` | P2 | No baseline delta or per-slice reporting; a single average gate. |

**NOT a finding.** An LLM judge as one metric among deterministic checks (schema, tool-permission assertions, leak checks) and a calibrated rubric, used for subjective quality only.

**What would change the verdict.** A calibration set with reported agreement, a different pinned judge, position-swapped pairwise judging and code-based safety assertions resolves `F8`.

**Fix shape.** Deterministic assertions for safety outcomes; calibrate the judge on human labels; pin and version it; use it only for subjective criteria.

---

## CAL-12 — AI output with no label where disclosure may be required `[LEGAL-OWNER]`

**Situation A.** A customer-facing support chat presents a named person with a photo. The system prompt says: "You are Maya from support. Never tell the customer you are an AI." Nothing in the UI says the replies are automated.

**Situation B.** An editor autocomplete suggests the next words as ghost text; the product is plainly a writing assistant.

**Evidence to gather.** Where the product is offered (jurisdiction is a legal input, not a reviewer input) · whether the owner recorded a disclosure decision · UI copy and persona · any human handoff.

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `I2` | P1 (A) | An engineering defect on any reading: a human persona plus an instruction to deny being an AI is deceptive and erodes trust. |
| `H8` | P1 (A) `[LEGAL-OWNER]` | Flag and route the disclosure question to the compliance owner; state the observation and do NOT rule on legality. |
| `I6` | P2 (A) | No human handoff; P2 while the bot takes no billing or account actions, P1 (checklist default) once it does. |
| none | — (B) | AI nature is evident from the interaction; record P4 "disclosure decision recorded?" as a question. |

**NOT a finding.** A missing label on obviously synthetic output whose owner has recorded the decision.

**What would change the verdict.** An owner-recorded decision that disclosure is not required does not remove `I2` (the persona instruction stays a defect). A legal conclusion written by the reviewer is itself a review defect.

**Fix shape.** Honest persona and an AI label at first interaction, remove the deny-being-AI instruction, add a human handoff; leave the legal determination to the owner.

---

## CAL-13 — A finding withdrawn because a provider fact changed

**Situation.** A reviewer flags `temperature=0.2` on a call to `model-y` as "rejected by newer models" (`A10`, P1), citing a memory of an older migration note. The reviewer then fetches the provider's current model-parameters page and its migration guide. Both list `temperature` as accepted for `model-y`'s tier with a documented range; only an older family, `model-x`, rejects it. In the same review the reviewer also believed assistant-message prefill still worked for `model-y`; the page states prefill is unsupported and requests that end with an assistant turn fail.

**Evidence to gather.** Provider docs fetched during the review, with URL and fetch date recorded in the report · the exact model ID in the diff · whether a per-model capability map exists in the code.

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `A10` (temperature) | withdrawn | The current documentation contradicts the recalled fact; the finding is dropped and the report says so. |
| `A10` (prefill) | P1 | Documentation confirms the unsupported pattern (a trailing assistant turn) in the diff; cite the page and the `file:line`. |

**NOT a finding.** Any provider-fact claim that cannot be verified in the session: mark it `NOT VERIFIABLE` and list what would settle it.

**What would change the verdict.** A provider page that is unreachable leaves both claims `NOT VERIFIABLE`; the reviewer does not fall back to memory. A newer documentation revision that reverses either fact reverses the finding again.

**Fix shape.** One adapter with a per-model capability map (parameters set at call sites are how this class of mistake ships); a CI check against the provider lifecycle and parameter pages; the report cites URLs and dates for every provider-fact finding.

---

## CAL-14 — Plan review: "we will add evals later"

**Situation A.** A plan for an autonomous refund agent (reads orders, issues refunds up to a limit, emails customers) has phases for tool implementation and a demo. Its risk section reads: "evals later; the prompt tells the agent to be careful". No autonomy level, approval rule, kill switch, owner or cost budget is stated.

**Situation B.** A plan for a suggest-only summary helper (user reads and edits before saving; no tools; no external data) states the job, the alternative considered (template), a baseline, and "eval set of 40 real notes built in phase 2, milestone dated, owner named"; kill switch is a flag.

**Evidence to gather.** The plan sections that name each `AF-*` item · ADRs or policy on refunds and approval · autonomy and data flow stated or absent · whether phases add tools, data sources or sinks.

**Expected findings.**

| ID | Severity | Why |
| --- | --- | --- |
| `AF-4` (M) | P1 (A) | Autonomous money movement with no autonomy level, approval point or limit enforced in code; "the prompt is careful" is not a control (`B3`, `C6`). |
| `AF-2` (M) | P1 (A) | Eval deferred with no date or owner for an irreversible action. |
| `AF-3` / `AF-6` (M) | P1 (A) | No failure modes, fallback, kill switch, cost cap or owner. |
| `AF-5` (M) | P1 (A) | No data-flow or trifecta analysis for a tool-using agent reading customer orders. |
| `AF-2` (M) | P3 (B) | Eval-after-build with a dated milestone and owner is acceptable for a suggest-only helper; record as a note. |

**NOT a finding.** In B, the absence of an approval design or a cost model beyond the stated flag.

**What would change the verdict.** A refund limit and approval rule enforced in the executor, an eval plan with a date, and an owner bring A down to P2 plan gaps. Adding tools or external data to B raises it to A's treatment for the new phases.

**Fix shape.** Add the missing `AF-*` items per phase — autonomy level, approval and limits in code, eval and baseline with owner and date, failure modes and fallbacks, data-flow and trifecta analysis, kill switch, budget, owner — before implementation starts.

---

## How to use this file in a review

1. Before the sweep, skim the cases whose situation resembles the surface under review.
2. After drafting findings, compare each with the closest case: same check ID? same severity? did you record the "NOT a finding" boundary and the escalation or de-escalation control with `file:line`?
3. A deliberate deviation from a case's expected severity must name the project evidence that justifies it.
4. Provider facts in a case are fixtures. Verify any real provider fact from current documentation and cite the URL (checklist §0.2) — never from this file.
