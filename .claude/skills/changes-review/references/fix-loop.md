# changes-review fix-loop

Read when `changes-review` runs `--fix-loop` or issues a full-candidate review receipt. The carried `review-policy` protocol owns modes, tasks, the three-round budget, LOW deferral and explicit bounded extensions; read its full published text when absent from context.

1. Resolve exact scope and saved goal; triage all targets and plan review, validation, fixes and fresh re-review tasks. Workflow review defaults to this mode; standalone review requires the flag.
2. Capture the supported full commit candidate before each full review with `node .claude/hooks/lib/review-receipt.cjs snapshot --target=<worktree|staged|commit-descriptor>`; preserve exact descriptor arguments for commit targets. Subset, artifact-only and historical targets are not eligible for a live fix-loop receipt.
3. Review and validate findings, apply authorized fixes, then freshly review the updated target. Keep one fixing coordinator, retain spent rounds and update coverage and reports. Children passed `--loop-owner=caller` return read-only results to this coordinator.
4. Complete applicable tests, parity and spec/doc updates. Any edit after a review invalidates its verdict; review the settled target again within the remaining budget. At exhaustion, ask before a bounded extension and retain the unresolved report while waiting.
5. Once current evidence clears the bar and no content changed after the final full pass, issue the receipt from that pass's original pre-review snapshot: `node .claude/hooks/lib/review-receipt.cjs issue --kind=changes-review --scope=full-changeset --snapshot-json='<exact saved JSON>'`. Never reconstruct or capture a new snapshot at issuance; drift refuses acceptance. Only supported full-candidate fix-loop reviews qualify.
6. Report rounds, fixes, checks, deferred LOWs and any unresolved items; no stage, commit or push authority follows from a review.

Preserve scope and evidence. Fixes require fresh review; remaining MEDIUM+ or failed checks need a real extension answer at the cap.
