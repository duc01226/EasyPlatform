# Scan quality regression cases

Read when changing scan, enhancement or shared agent-guide quality rules. `quality-cases.v1.json` uses the existing skill-evals schema: its assertions protect intended minority practice, numbers, exceptions, rationale/examples, discovery, registry ownership, exact selections, freshness and live edits.

Validate the corpus with the platform-neutral command:

```text
node .claude/skills/shared/skill-evals/validate.mjs .claude/skills/scan/tests/quality-cases.v1.json
```

Read `.claude/skills/shared/skill-evals/README.md` when executing paired model evaluations; it owns isolation, fixture materialization, provenance and grading. Schema validation is not a semantic PASS. Save actual outputs, traces, retention dispositions and reviewer evidence in project-root `tmp/reports/`. Review the final enhanced output against both excessive detail and lost conditions, never word or warning counts. The existing doc-stamp-guard suite mechanically covers concurrent baseline changes; selection/registry/claims suites cover their respective structural contracts.
