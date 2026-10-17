# Pull-request test and review policy

Read when preparing a PR or gating a CI repair. Decide checks automatically; record evidence, never a fabricated user answer. Project phase rules and explicit user instructions remain authoritative.

## Classify the whole branch


Inspect the **actual candidate**: its file list, `--stat` and the diff itself — for an amend the whole amended commit, for a pull request the whole branch (`<base-ref>...HEAD` ∪ uncommitted). Judge purpose, behavior, affected areas, reversibility, coverage and downstream impact. File/line counts are supporting evidence, not a safety threshold; discount generated churn only after checking its source. A series of tiny commits cannot reset risk or conceal a large change: judge earlier commits of the same task that passed on a Low-tier skip together with this candidate.

| Risk | Signals |
| --- | --- |
| **Low** | Every changed line is documentation, a comment, formatting or copy; or the change is really small. |
| **Medium** | A focused change in one module or area with a narrow regression scope: an ordinary fix or enhancement, a config value, test-only changes, skill or prompt wording. |
| **High** | Any of: cross-module or public/API contract change; auth, security, permissions or secrets; data or schema change; hooks, gates or other framework enforcement; dependency or runtime upgrade; CI trust or deployment change; UI surface; a disabled or weakened check; an ambiguous conflict resolution; a large diff. |

- Any higher-tier signal outranks every lower one — even a one-line diff. Tie or unclear → the higher tier.
- **Really small** = a few lines in one or two files, fully understood, with no High signal: a typo, comment, log or message text, doc line, or a rename with no consumer impact. A change to branching logic, a contract or data handling is not really small, whatever its size.

## Decide tests

| Situation | Action |
| --- | --- |
| The affected tests already ran and passed in this session, and nothing they cover changed since | Skip. Reuse that evidence and name its command and result. |
| The change is really small, or no executable behavior changed | Skip. Record `Tests: skipped — really small change` or `Tests: not applicable`, with the reason. |
| Anything else | Run the tests scoped to the change and fix-loop every failure until all pass. |

Old evidence never covers new content: a run from before the last edit to the covered code, old green CI and an assertion that tests passed are not current results. Markdown skills and CI/config changes may still own contract or build checks — look for a lane before recording not applicable.

## Decide review

Run `node .claude/scripts/lib/commit-review-policy.cjs --operation=pull-request --risk=<actual-tier>`. PR scope remains risk-based regardless of `commit.reviewMode`: Low → automatic skip; Medium → `/why-review --fix-loop`; High → `/changes-review --fix-loop`. Each review has at most two rounds. Reuse evidence only when the whole-branch scope and final candidate match; a commit-only review does not cover a PR.

Pass the exact commit descriptor to the selected review if a commit is needed. Use staged mode for a plain commit, all mode for `-a`, literal-paths for explicit paths; add `"amend":true` only for an authorized amendment, which reviews against HEAD's parent. The review skill issues its receipt on convergence. Check that receipt with `node .claude/hooks/lib/review-receipt.cjs check --target=commit-descriptor --descriptor-json='<exact descriptor>'` before committing. `ERROR` is a blocker, never `CLEAN`.

For a policy-eligible skip only, use the exact prepared descriptor:

```sh
node .claude/hooks/lib/review-receipt.cjs snapshot --target=commit-descriptor --descriptor-json='<exact descriptor>'
node .claude/hooks/lib/review-receipt.cjs issue --kind=skip --scope=full-changeset --snapshot-json='<returned snapshot JSON>' --reason='auto: low risk — <signal>'
```

A clean candidate needs no receipt. A changed candidate requires a matching review or eligible skip; re-check after issuing it. A skip records skipped work, never a passed review. Automatic skips are Low-risk only; an explicit user skip is recorded as such. Never skip after a failed/non-converged review or to evade a required project check.

## Stop and refresh boundaries

Unavailable required checks, unresolved failures, ambiguous intent or MEDIUM+ findings after two review rounds block publication. Leave the pending candidate uncommitted and report the evidence. Changed content invalidates affected tests and review evidence; reclassify and refresh them before proceeding. Neither review evidence nor a skip waives CI, spec/test reconciliation, project gates or Git authority.
