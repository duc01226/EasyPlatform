> **[BLOCKING] AI-engineering floor (`AE-1.1`–`AE-9.4`, 38 pass/fail clauses) — binds on ANY task that plans, implements or reviews a feature that calls a model (LLM calls, prompts, agents, RAG, tool use, MCP, evals).** Catalog: `.claude/docs/ai-engineering-knowledge.md`; review procedure: `.claude/docs/ai-engineering-review-checklist.md`; severity cases: `.claude/docs/ai-engineering-calibration.md`. Cite findings as `AE-<clause>` + `file:line`.
>
> **Precedence:** accepted product/AI decisions and ADRs → project config and reference docs → applicable clauses. A genuine conflict is SURFACED with both sides, NEVER resolved silently. Provider facts (model IDs, parameters, limits, deprecations) change — verify against current provider docs, never memory. Record N/A when a clause's capability is absent. Companions: `AF-1`–`AF-6` (framing), `AR-1`–`AR-6` (review); report a defect ONCE.
>
> **1.0 Prompt & model contract**
>
> - `AE-1.1` Prompts are versioned, reviewable artifacts (template files or constants, named variables, one owner each), not string concatenation across call sites.
> - `AE-1.2` Instructions and untrusted data are structurally separated (system/developer vs user roles, delimiters or tags). User or retrieved content is never spliced into the instruction channel or obeyed as instructions.
> - `AE-1.3` Output has a contract: schema-constrained output or tool use, validated at the boundary, bounded retry with error feedback, safe fallback. No regex, `eval` or parse-and-hope on prose. Handle `stop_reason`/`finish_reason` (length, refusal, tool_use).
> - `AE-1.4` Model and parameters are explicit, centralized, pinned: model ID from config (dated snapshot where offered), task-fit temperature/`max_tokens`/timeout, one place to swap, deprecation and fallback plan. No scattered hard-coded IDs.
>
> **2.0 Security & safety**
>
> - `AE-2.1` Untrusted content (user input, retrieved documents, web pages, emails, files, tool results) is data that may carry instructions. No privileged action follows from it without a control outside the model.
> - `AE-2.2` Model output is untrusted input to every sink — HTML/markdown render (images and links exfiltrate), SQL, shell, file path, URL fetch, code execution, deserialization, API arguments. Encode, validate or sandbox it like user input.
> - `AE-2.3` The lethal trifecta is broken: no agent path combines private-data access, untrusted content and an outbound channel (network, email, links, markdown images, side-effecting tool) without removing a leg or adding a hard approval gate.
> - `AE-2.4` No credentials, keys, customer data or secrets in prompts, few-shot examples, tool descriptions or logs. The system prompt is not a secret. Data sent to providers is minimized.
> - `AE-2.5` Guardrails and moderation are defense-in-depth, never the only boundary. Code enforces authorization at tool execution with the end user's identity — not an instruction to the model.>
> **3.0 Agent & tool design**
>
> - `AE-3.1` Every loop is bounded: max steps/turns, wall-clock, token and cost budget, repeated-call/stuck detection, explicit termination. No unbounded model loop.
> - `AE-3.2` Tools follow least privilege: explicit allowlist, scoped credentials, read/write split, code-validated arguments. No generic shell/SQL/HTTP/file tool without a sandbox and allowlist.> - `AE-3.3` Tool contracts are model-usable: clear names and descriptions, typed schemas, actionable errors, bounded or paginated results, idempotency keys on side-effecting calls.
> - `AE-3.4` Irreversible or high-impact actions (delete, pay, send, publish, deploy, permission change) need human confirmation or are reversible (dry-run, undo). The approval UI shows the real action, not the model's summary.
> - `AE-3.5` Delegation is explicit: sub-agent handoff contracts, scoped context and authority, results checked independently rather than by the agent's self-report, no unsynchronized shared mutable state.>
> **4.0 Context & retrieval**
>
> - `AE-4.1` Context is budgeted: tokens counted, truncation/compaction policy defined, no dumping whole documents, rows or history. Large tool output is summarized or paginated.
> - `AE-4.2` Layout supports caching: stable prefix (system, tools, reference docs) first, volatile content last. No timestamps, UUIDs or per-user data inside the cached prefix.
> - `AE-4.3` Retrieval enforces authorization and tenancy in the retrieval layer at query time, never by model post-filtering. The index is versioned with its embedding model, with a reindex path and freshness policy.
> - `AE-4.4` Answers from retrieved content are grounded: checkable citations or source IDs, an explicit "insufficient context" path, retrieval quality (recall) measured apart from generation quality.
>
> **5.0 Reliability & cost**
>
> - `AE-5.1` Every model and tool call has a timeout and bounded retries with backoff and jitter on transient errors (429/5xx/overloaded), honours Retry-After, and never blindly retries a non-idempotent side effect.
> - `AE-5.2` Failure paths are designed: outage, rate limit, refusal, empty or invalid output and tool failure lead to a fallback (other model, cache, deterministic path) or an explicit degraded state, never a swallowed error.
> - `AE-5.3` Cost and abuse are capped: per-request `max_tokens`, per-user/tenant quotas, concurrency limits, spend alerts. Unbounded input, uploads or fan-out are rejected (denial of wallet).
> - `AE-5.4` Routing matches the task: small/fast model for simple steps, strong model for hard ones, batch for offline bulk, streaming for interactive latency. A latency budget is stated.
>
> **6.0 Evaluation & testing**
>
> - `AE-6.1` Behavior is protected by an eval set (representative, adversarial and regression cases from real failures) with a metric or rubric and threshold. Any prompt, model or retrieval change reruns it.
> - `AE-6.2` Deterministic code around the model (parsers, validators, routers, tool executors, guards) has ordinary tests with the model mocked at one seam, asserting properties and contracts, not exact prose. Default CI makes no live paid calls.
> - `AE-6.3` An LLM judge is calibrated against human labels, uses a rubric and a different or stronger model, is checked for position and verbosity bias, and is never the sole safety gate.
> - `AE-6.4` Agents are evaluated on trajectories and outcomes: task success, tool-call correctness, step and cost counts, repeated-run reliability, plus injection and refusal cases.
>
> **7.0 Observability & operations**
>
> - `AE-7.1` Every model and tool call is traceable: request ID, model + version, prompt version, token counts, latency, cost, stop reason, retrieved doc IDs, tool calls — correlated to the user request.
> - `AE-7.2` Traces and logs are PII-safe: redacted, hashed or sampled prompts and outputs, defined retention, no secrets.> - `AE-7.3` Prompts, models, retrieval configs and tool sets are versioned and rolled out gradually behind a flag, with a kill switch and rollback. Every behavior change is attributable to a version.
> - `AE-7.4` Production quality is monitored: format-failure, refusal, latency, cost and user-feedback signals with drift alerts. Feedback flows back into the eval set.
>
> **8.0 Data, privacy & governance**
>
> - `AE-8.1` Data flow to model providers is documented and lawful: what personal or confidential data leaves the boundary, provider retention/training terms, region. Minimize; a compliance owner decides legal questions.
> - `AE-8.2` Stored AI artifacts (embeddings, fine-tunes, caches, memory, logs) follow retention and deletion rules. Erasure reaches vector stores and caches; tenants are isolated.
> - `AE-8.3` Users are told they interact with AI or receive AI-generated content where required or expected. Significant automated decisions have human review and an explanation; the risk tier is recorded.
> - `AE-8.4` The model/data/tool supply chain is controlled: pinned versions or hashes, safe formats (no pickle, no `trust_remote_code`), vetted MCP servers and plugins, licences checked.>
> **9.0 Human experience**
>
> - `AE-9.1` The interface sets expectations and shows uncertainty and sources: AI output labelled, citations shown, limits stated. No over-claiming or deceptive anthropomorphism.
> - `AE-9.2` Users can correct, retry, undo or escalate to a human; feedback is one action. AI failure, empty, refusal and slow states are designed, not raw errors or a hung spinner.
> - `AE-9.3` Streaming and partial output is handled: cancel, incomplete-JSON safety, no rendering of unsanitized partial markup, latency feedback.
> - `AE-9.4` Fairness and safety are checked on the affected population (bias, toxicity, refusal tests on representative inputs). AI interfaces stay accessible (screen readers with streaming).
>
> **Skip ONLY** when nothing in the change calls or configures a model, stated explicitly.
