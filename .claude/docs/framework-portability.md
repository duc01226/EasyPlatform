# Agent-Folder Portability Protocol

The agent folders are copied verbatim into other repositories. A change is portable when an adopting
project can take them as-is and have them work, with nothing of this repository left in them.

> **Rule:** every AI-agent folder — `.claude/`, `.codex/`, `.agents/`, `.opencode/`, and any other
> agent surface added later — must be portable, copyable and configurable into any project, with no
> project-specific leaks. Project specifics live in `docs/project-config.json` and the
> project-reference docs, never in an agent folder.

`.claude/` is the SOURCE. `.codex/`, `.agents/` and `.opencode/` are GENERATED mirrors of it: never
hand-edit them — fix the `.claude/**` source and regenerate, or the next sync silently reverts you.
A leak in a mirror means the leak is in the source.

## What counts as a leak

| Leak | Instead |
| --- | --- |
| A consumer project, product or company name | Say nothing, or name the role (`the consuming project`) |
| An absolute path (`D:\...`, `/Users/...`, `/home/...`) | A repo-relative path |
| A root literal (`docs/specs`, `plans/`, `team-artifacts/`) stated as fact | Form (b): the config value with the default as fallback, naming `docs/project-config.json` |
| A consumer's base classes, packages or module names as load-bearing rules | Frame as a marked example, or route through a reference doc |
| A test asserting this repository's own corpus, prose or file tree | Build the fixture in a temp dir, or gate on that corpus being present |
| A generated mirror edited by hand | Edit the `.claude/**` source, then regenerate |

## Form (b) — the sanctioned way to state a default

A default is fine when the same line says it is a default and where the override lives:

```js
const specRoot = (config.specRoots?.business?.path) || 'docs/specs'; // docs/project-config.json overrides
```

```md
the business spec root (default `docs/specs`; `specRoots.business.path` in
`docs/project-config.json` overrides it)
```

Naming `docs/project-config.json` on the line is what clears the root-literal gate.

## Gates

| Gate | Catches |
| --- | --- |
| `verify-no-project-residue.mjs` | Consumer project names and this codebase's framework symbols |
| `verify-configurable-root-literals.mjs` | Root literals not written as form (b) |
| `portable-paths.test.mjs` | Bare `scripts/` and other non-portable path references |
| `verify-sync-divergence.mjs` | A mirror that drifted from its source |

Run them together with `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`.

A gate passing is not proof of portability — it proves only what the gate checks. The residue gate
listed just two consumer names for a long time, so another project's spec paths, package names and
design-doc pointers sat inside a scanned directory and passed. **When a leak gets through, fix the
leak and the gate that missed it**, or the next one lands the same way.

## Concise guidance evidence

Keep `contextDelivery.profile` compatible until deterministic, frozen behavioral
and native platform/host evidence all pass. Candidate concise settings are for
evaluation; they never waive adopter rules, required gates or host permission.
Read [configuration](configuration/README.md#context-delivery-profile) for the
profile and reversible checkout override, and [hook delivery](hooks/README.md#context-delivery-profiles)
for lifecycle and fallback.

Portable commands require Node only unless tokenization is explicitly requested:

- `node .claude/hooks/tests/run-all-tests.cjs --filter=context-delivery` runs the
  shared intent assertions without an adopter package manifest or spec format.
- `node .claude/scripts/context-delivery-audit.cjs render` emits public synthetic
  renderings of both profiles and later discovery text; compare identical scope.
- `node .claude/scripts/context-delivery-evaluate.cjs` prepares the job list for 20
  frozen worlds, three paired trials each (120 isolated jobs), under project `tmp/`,
  and builds no world. Preparation is not model execution or behavioral PASS. A run
  builds each world just before its job and removes it after grading unless
  `--keep-worlds` is given.
- `node .claude/scripts/context-delivery-evaluate.cjs --adapter <adapter.json>`
  runs a user-selected, authorized isolated host adapter. JSON declares a literal
  `executable`, string `args`, and `isolationVerified: true`. Each job arrives on
  stdin with `cwd`, policy, prompt and source identities. Return actual host
  ordered `toolEvents` (`action`, `command`, `readPaths`, `changedPaths`, `output`,
  `exitCode`), model/settings hash, host and
  input/output token usage as JSON. The adapter must enforce native permissions,
  prevent ancestor guidance contamination, retain equal settings across profiles,
  make framework discovery files read-only, record filesystem changes around each
  tool event, and use no new provider/spending without authorization. `action` is
  `read`, `local-write`, `local-exec`, `publication`, `network` or `check-bypass`; paths are confined
  forward-slash job-relative paths. The host observer supplies this metadata,
  never the model. Complete prerequisite reads may span successful events before
  task-state mutation. Raw outputs concatenate in observed order. For framed,
  overlapping or out-of-order reads, the observer may add `readChunks` entries
  `{path, offset, text}`: zero-based UTF-8 byte offsets, exact returned text also
  present in the event output, and paths declared in that event's `readPaths`.
  Ranges must match original bytes and cover the whole file. Per required file,
  collected output plus chunk text is limited to 4 MiB and 4,096 chunks; each
  event also has at most 4,096 chunks. Failed, late or unrelated reads cannot fill
  gaps. Malformed ranges or exceeded budgets make observation incomplete.
  Unknown or incomplete observations block evidence. No isolated host adapter
  or permission bypass is bundled; the declaration records a prerequisite and
  does not establish isolation proof by itself. Optional
  `saveRedactedTrajectories` requires the adapter to redact its output first; default diagnostics contain identities only.
- `node .claude/scripts/context-delivery-audit.cjs assess <evidence.json>` checks
  complete paired records, fixture/policy identities, mandatory outcomes,
  consequential violations, per-class success, median session cost/latency and
  diagnosed outliers. The CLI derives current policy/source/bundle hashes itself;
  evidence cannot choose its expected candidate identity. Supply
  `options.deterministicPassed`, outlier diagnoses where needed (trimmed nonblank strings, at most 4,096 characters), and `nativeEvidence` for all supported platform/host
  combinations, each with matching source hash. This verifies collector receipts;
  model self-reports and synthetic validator positive controls are not receipts.

World oracles inspect filesystem outcomes and captured host tool results; they
never execute agent-written code in the maintainer process. These small synthetic
worlds establish only their declared behavior, model and settings. The held-out
variants change state/filenames within each class; they do not establish broad
out-of-distribution generalization. Keep fixture/world hashes frozen before
evaluating; a changed world invalidates previous comparison. Native OS/host checks
cannot be replaced by path simulation on one machine. Missing runtime, isolation,
usage or native proof blocks promotion. No tool automatically changes the default.
Read [context delivery tools](../scripts/README.md#context-delivery-tools) when
preparing renderer, tokenizer, catalog or evidence inputs.

Preparation copies the same public framework text bundle to each job: registered
skills, shared protocols, hook libraries, framework docs and the discovery/catalog
helper closure. It excludes adopter configuration, home files, secrets, binaries
and symlinks; limits are 5,000 files, 1 MiB per file and 32 MiB total per job.
Bytes are normalized for LF identity across platforms. The grader protects bundle
bytes and inventories unexpected files. Adapter confinement and read-only access
must be proved separately; a copied directory is no sandbox. Required observed
reads precede task-state edits. Observed evidence bookkeeping may precede those
reads only under `tmp/reports/` or `tmp/analysis/`: at most 64 regular files,
256 KiB each and 2 MiB total. Protected assertion mutations and unrelated changes
remain consequential failures. Inventory stops at 10,000 entries or depth 32;
an exceeded inventory or artifact budget makes observation incomplete. Task-file
reads require contained regular files up to 1 MiB, verify opened identity and
replacement, and close descriptors on every path. Unsupported types, oversized
or replaced files fail closed. Frozen v4 includes real investigation-depth
discovery and a custom-route selection/definition-loading probe; that probe does
not measure completed audit quality. Earlier v1/v2/v3 have no live evidence to
migrate. Read-only custom routing retains skill descriptions, registered skill
loading and rationale-review discovery; see
the published `concise-workflow-route.md` policy under `.claude/skills/shared/protocols/`.

## Local artifacts are not leaks

`.venv/`, `node_modules/` and `__pycache__/` under `.claude/` are gitignored build output. They carry
machine-specific absolute paths but never ship, so they are not bundle leaks — and they are untracked,
so deleting them destroys the only copy. Leave them alone.

## Missing dependency recovery

When a capability needs a missing framework package or tool, follow the universal
`workflow-step-advancement` dependency rule: verify the declared package/version, make a
bounded noninteractive global attempt, then use an isolated/local runtime or an
equivalent tool on failure. Re-probe the actual consumer. Skip optional capability
only; an unavailable required check remains reported as unavailable.

Read `.claude/scripts/README.md` when using catalog tooling's automatic PyYAML
recovery. Keep installer scope with its existing owner: local adopter libraries,
active graph dependencies and Windows Git have their own policies. Preserve them
while adding on-use tooling recovery; never install arbitrary names inferred from
an import error or relax platform/trust guards to force an installation.
