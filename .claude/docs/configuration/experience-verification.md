# Experience verification configuration

`experienceVerification` is an optional project-config contract for reviewing
what users or downstream consumers actually experience. It is deliberately
not a web-test setting and does not replace a project’s existing test, lint,
accessibility, device, API, CLI, or generator tooling.

## Relationship to E2E execution

`experienceVerification` owns observable surfaces, local lifecycle ownership,
runtime evidence, and human/owner acceptance. When a project needs generated or
executed E2E journeys, the optional `e2eTesting.execution` profile owns the
execution handoff: linked `surfaceIds`, auth mode and non-secret references,
data/seed policy, browser runner/visibility, evidence capture/redaction, and
bounded convergence. The profile links to this document's
`experienceVerification.surfaces[]`; it does not duplicate `startCommand`,
`dependencyCommand`, or readiness ownership.

Agents must read both sections before a feature, bugfix, prompt-driven, or
whole-project E2E run. If `e2eTesting.execution` is absent, perform bounded
repository discovery from the configured surface and cite the evidence. Do not
invent a port, account, seed, selector, command, or credential. A missing
capability is `N/A` only when no applicable surface exists; an applicable but
unrunnable or uninspectable surface is `ENVIRONMENT-BLOCKED`.

## Minimal shape

```json
{
  "experienceVerification": {
    "enabled": true,
    "evidenceRoot": "tmp/experience",
    "baselineRoot": "tests/experience-baselines",
    "acceptancePolicy": "manual-acceptance-required",
    "reviewOn": ["new-surface", "changed-surface", "bugfix", "baseline-mismatch"],
    "surfaces": [
      {
        "id": "primary-output",
        "kind": "api|library|terminal|web|mobile|desktop|background|generated",
        "runner": "project-configured-runner-or-manual-tool",
        "entryPoints": ["project-specific entry point"],
        "changeTriggers": ["paths or impact labels"],
        "fullCommand": "optional project command",
        "focusedCommand": "optional project command",
        "states": ["default", "error", "recovery"],
        "localRun": {
          "dependencyCommand": "optional command that starts backing services",
          "startCommand": "optional command that starts this surface",
          "workingDir": "optional directory the commands run from",
          "readyCheck": "optional health command/URL to poll or ready log line",
          "readyTimeoutSeconds": 120,
          "teardownCommand": "optional command that stops what was started",
          "logSources": ["optional log file paths or service log commands"],
          "credentialsRef": "optional pointer to the local fixture identity — never the secret"
        }
      }
    ]
  }
}
```

The `kind`, runner, entry points, commands, and states are project facts, not
framework defaults. Use the project’s existing commands and tools. A surface
is `APPLICABLE` only after the agent verifies that the configured entry point,
runner, fixture/data, and inspection capability work in the current
environment. Configuration alone cannot prove applicability.

Candidate captures, runtime logs, reports, and other repeatable evidence are
disposable outputs: keep them below the project-root `tmp/` or `temp/` directory
(the default is `tmp/experience`) and ensure both directories are ignored by the
root `.gitignore`. The `baselineRoot` is the explicit exception for accepted,
intentionally versioned expectations; it is not a place to store run output.

## Local bring-up (`localRun`)

`experience-review` reads what the system DOES, so it brings the surface up as a
whole running system before observing anything. `localRun` is where a project
records HOW, so every review starts from the same recipe instead of re-deriving
it from scripts and manifests each time.

Every field is optional and every value is a project fact:

| Field | Purpose |
| --- | --- |
| `dependencyCommand` | Starts the backing services the surface needs first — database, broker, cache, object store, emulator, external stubs. |
| `startCommand` | Starts the surface itself. Long-running: the reviewer runs it in the background. |
| `workingDir` | Directory the commands run from, when it is not the project root. |
| `readyCheck` | The observable readiness signal — a health command/URL to poll, or the log line that means ready. |
| `readyTimeoutSeconds` | How long readiness may take before the surface is recorded `ENVIRONMENT-BLOCKED`. |
| `teardownCommand` | Stops what the start/dependency commands started, so a review leaves nothing running. |
| `logSources` | Runtime log channels to capture besides the surface itself — log file paths or container/service log commands. A web surface's browser console and page errors are captured inherently and need no entry. |
| `credentialsRef` | Pointer to the local fixture identity used to sign in — an env var name, secret-manager key, or setup doc. **Never the secret value.** |

Readiness is **polled**, never assumed: a started process, an open port, and a
fixed sleep are not readiness signals. A surface whose bring-up fails is
`ENVIRONMENT-BLOCKED` with the failing command, exit status, and logs preserved
— never a pass, and never repaired by stubbing the failing dependency, disabling
auth, or skipping a service, because that makes every later observation evidence
about a system nobody ships.

When `localRun` is absent, the review derives the recipe from repository
evidence (package/task scripts, compose manifests, Makefile targets, CI run
configurations, the README's run section), cites the file and line each command
came from, and proposes the resulting `localRun` block in its report. It never
invents a port, script name, or default command.

## Runtime-log and visual evidence

Two evidence channels are captured on every exercise and re-captured every
remediation round:

- **Runtime logs**, attached BEFORE the first interaction so the startup window
  is included, and kept until teardown. For a web surface that means browser
  console messages, uncaught exceptions, unhandled promise rejections, and
  failed network requests, plus the server-side log of whatever it called; for
  every other surface it means process stdout/stderr and each `logSources`
  channel. A runtime **ERROR** is a defect even when the output looked correct;
  a **WARNING** is advisory, gets a bounded best-effort fix, and never blocks
  acceptance on its own. A log is never silenced, filtered, level-raised, or
  swallowed to clear it — that edits the evidence, not the defect.
- **Screen captures** for a visual surface: each configured state at each
  configured viewport, including loading, empty, error, permission, and
  post-submit states. Captures are stored under `evidenceRoot` and then READ —
  an unread capture is a file, not an observation, and an empty log capture
  proves nothing unless the listener can be shown to have been attached.

Usability and accessibility floor breakage is blocking; visual identity and
polish are advisory. The project's own design-system, SCSS, and frontend-pattern
docs outrank any generic clause, and no measurement is ever invented from an
image.

## Lifecycle

1. Read the intended purpose and configure only observable surfaces that matter
   to actors, operators, downstream callers, or generated-artifact consumers.
2. Store candidate observations and reports below `evidenceRoot`. Record the
   exact command/tool, entry point, fixture/identity, platform/device/viewport/
   locale/network conditions, actions, settle signals, and evidence references,
   plus the local-run recipe actually used, the readiness observation, the
   runtime-log summary, and the screen-capture inventory.
3. Keep accepted expectations below `baselineRoot` only after an explicit
   human/owner decision. `experience-review` records the decision but does not
   silently rewrite tests, snapshots, fixtures, or baselines.
4. On mismatch, retain the prior accepted evidence and classify the result as a
   possible regression, intended change pending acceptance, invalid condition,
   blocked environment, unverified, or ambiguous. Unaffected cases retain
   their existing protection.

## Honest non-applicability

Set `enabled` to `false`, keep `surfaces` empty, and supply a nonempty
`experienceVerification.notApplicableReason` in the JSON when no applicable
surface is present yet. For example, merge this block into the project config,
replacing the reason with verified project facts:

```json
{
  "experienceVerification": {
    "enabled": false,
    "evidenceRoot": "tmp/experience",
    "baselineRoot": "tests/experience-baselines",
    "acceptancePolicy": "manual-acceptance-required",
    "surfaces": [],
    "notApplicableReason": "No observable application surface is configured in this repository."
  }
}
```

The project-init report must also state why this is
`NOT-APPLICABLE` or what capability is pending; it must not claim a live review.
If a relevant surface exists but cannot run or be inspected, record
`ENVIRONMENT-BLOCKED`, not `NOT-APPLICABLE` and not PASS.

## Acceptance record

An accepted record names `acceptedBy`, `acceptedAt`, `intentRef`,
`evidenceRefs`, accepted scope, and residual risk when relevant. Agent
confidence, a passing automated test, a generated screenshot, or a current
implementation is never a substitute for that record. Ordinary regression
tests remain model-free and reproducible without an AI service.
