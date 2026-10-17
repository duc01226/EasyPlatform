# Report fallback acceptance

Load only when the review gate rests on a report rather than a matching receipt.

Inspect the actual report and the run's occurrence/change evidence first. Record
the final status, reviewed target, explicit review time and last target-changing
occurrence time. File modification time alone is not proof of the reviewed
target. Unknown provenance, verdict or freshness blocks acceptance.

Write a temporary JSON evidence record, using values observed in those sources:

```json
{
  "occurrence": { "id": "review-occurrence", "skill": "knowledge-review" },
  "satisfiedBy": ["knowledge-review"],
  "report": {
    "path": "tmp/reports/review.md",
    "finalStatus": "APPROVED",
    "reviewedAt": "2026-01-01T12:00:00Z"
  },
  "lastChangedAt": "2026-01-01T11:59:00Z"
}
```

These are illustrative values, never evidence to copy into a real run. Take
`satisfiedBy` from the manifest and the skill identity (skill and mode, without pass-through flags such as `--defer=validate`) from its satisfying
occurrence, not from the report's own claim. Where a target fingerprint exists,
include both `report.targetFingerprint` and `currentTargetFingerprint`; a missing
counterpart or a mismatch blocks. Do not reconstruct a review time from the
time the evidence record is written.

Run from the project root:

```bash
node .claude/scripts/lib/review-report-evidence.cjs < <evidence-file>
```

`PASS` means these supplied acceptance predicates pass, not that this checker
performed a review or proved the evidence authentic. The inspecting caller
remains responsible for source provenance and coverage. `BLOCKED`/`ERROR` keeps
the gate open and names the missing/failed proof. Implementation reports accept
the occurrence's actual final `PASS`, `CONVERGED`, `APPROVED`, `ACCEPTED` or `CLEAN`
verdict; map equivalent wording only with its owning contract and cited evidence,
never translate a rejection into an accepted status.

The read-only diagnostic occurrence `architecture --mode=full` instead requires
`report.finalStatus: "FINISHED"`, `report.facesMerged: 3`, and an accepted
`report.validationStatus` for the report itself. Cite the face coverage and
validation evidence; its negative target-system verdict remains negative.
Incomplete coverage or failed validation blocks this completion too. Other
occurrences cannot opt into this diagnostic exception.

If the active host cannot execute the checker, inspect and enforce the same
predicates manually and state the limitation. A report-based close never grants
commit authority or replaces a required review receipt.
