# Scan Target: docs-index

> One entry of the scan target registry — index, selection rules, path roots and the custom-doc contract are in `../targets.md` (read it first). The `/scan --target=docs-index` host (`../../SKILL.md`) loads this file for that run only.

- **doc:** `<ref>/docs-index-reference.md`
- **applies when:** the project has a documentation corpus and its project-init owner routes the docs index for refresh.
- **skip when:** no project-owned documentation corpus exists or the always-on docs-index owner confirms it is current.
- **description:** `[Documentation] Use when mapping an evidenced documentation corpus, its authority, relationships, and navigation.`
- **sub-agents:** 1 — a single fresh-eyes / zero-memory verification sub-agent spawned in **Phase 5**. This target is NOT structured as parallel "Agent 1/2/3": the MAIN agent performs the scanning (Phases 2-4), and only the Phase 5 verifier is a sub-agent.

### Phase 0 detection
- **Mode-detect (inline `init`/`sync` labels, lowercase):** read the doc → init (placeholder only) / sync (real content). In sync: note which sections exist + current file counts to diff.
- Resolve the project-config path and validate the declared config before reading optional `docsRoots`, `specRoots`, `referenceDocs`, or documentation-owner settings. Omitted optional properties do not imply a fixed directory; discover candidate doc roots from repository evidence. A declared malformed property blocks this target.
- Identify documentation sources from the configured roots, existing docs index/template, root instruction files, repository-owned documentation tooling, and verified in-repository links. Include external wiki/catalog sources only when project config or an owner doc declares them.
- Classify the observed organization (for example, topic folders, a flat collection, or source-adjacent READMEs) from files that actually exist. These are discovery examples, not a required layout.
- **Evidence gate:** If authority or organization is ambiguous, document verified locations and links, mark the unresolved owner `UNKNOWN`, and ask only when an unresolved owner decision changes the index and repository evidence cannot settle it.

### Think scopes (NO parallel Agent 1/2/3 — Phases 2-4 carry their own Think prompts, performed by the MAIN agent)

**Phase 2: Scan Documentation Sources** — write findings incrementally after each verified source group, NEVER batch.
- **Think (Coverage):** Which configured or repository-evidenced documentation roots exist, and which contain content, stubs, or generated files?
- **Think (Accuracy):** For each count the current index promises, does a fresh glob of its actual scope match? What is the delta?
- **Think (Completeness):** Are there in-scope documentation files outside the current index's categories or links? Include only source surfaces the project declares or uses as documentation.
- **Think (Discovery):** Which in-scope files are not assigned to an evidenced category or authority, and how should the index surface them without inventing ownership?
- Resolve configured roots (including custom `referenceDocs.filename` and `templatePath` values) from the valid project config. Use repository evidence for other actual doc sources. Exclude dependencies, build output, vendored material, generated artifacts, and unrelated source comments unless the project explicitly treats them as documentation.
- Group documents by the project's existing categories, authority model, or configured section roles. Preserve project-owned headings and generated metadata. Do not impose the framework's default docs, spec, tooling-doc or skill folders, fixed folder names, or a category whitelist on projects that do not use them.
- Verify counts with globs over the exact documented scope; NEVER estimate or copy counts. Compare the discovered in-scope set with the union of category/link sets and report uncategorized files rather than silently omitting them.

**Phase 3: Build Doc Relationship Map**
- **Think:** Which project documents serve as entry points, which are authoritative for a topic, which are referenced from multiple places, and which have no incoming links?
- Trace actual links and declarations among discovered docs and project instruction/config files. Describe only verified relationships; do not assume a `README` → guide chain or a particular host's files.

**Phase 4: Build Lookup Table** (no Think prompt)
- Map verified topics, terms, artifact types, and project roles to their authoritative doc paths. Use configured native identifiers and filenames when present; do not assume buckets, `README.{Feature}.md`, a spec root, or a specific reference-doc filename.
- Phrase each lookup row as a when-to-read trigger — the question, task, or phase that should send an agent to that doc — not a bare keyword; keep the rows most agents need (project config, lessons, structure, code rules) at the top of the table.

**Phase 5: Fresh-Eyes Verification** (one zero-memory verifier) — validate the complete set rather than a fixed sample:
1. Every documented path exists; every listed count matches a fresh glob of the documented scope.
2. Every in-scope file is represented by its configured/current category or clearly reported as uncategorized.
3. Lookup entries resolve to the correct existing authority and do not conflict or duplicate the same path under inconsistent topics.
4. Required sections, labels, paths, or formats from the project config, current template, and repository-owned checks remain satisfied; report the evidence for each local constraint.
5. No claims, authorities, relationships, or generated paths were inferred without evidence.
6. Every AI-read project doc (selected reference docs, `lessons.md`, root instruction files) is reachable from the index through a trigger row — no orphan; a doc declared not applicable is named once as a skip, never routed.

### Target Sections

| Section | Content |
| --- | --- |
The index follows the sections, authority labels, path format, and metadata declared by project config or its owner template. When neither provides a format, use a concise inventory of documented areas, authoritative sources, verified relationships, and topic-to-path lookup. Include counts only when useful to the project index or required by a local check, and derive each from a fresh glob.

Before writing, inspect repository-owned tests, sensors, and validators that consume the index. Preserve their verified local labels, path enumeration, counts, or line formats in this project; do not carry those local constraints into another project without equivalent evidence. Resolve configured roots for every emitted path, and keep cross-host instructions free of host-specific invocation prefixes.

### Content Rules / exceptions
- Any emitted count MUST be verified via a glob over its stated scope; never estimate or copy it from stale content.
- Discover documents dynamically within configured and repository-evidenced sources. Preserve local template, profile, and check contracts, but never hardcode a different project's roots, categories, application names, or spec format into the reusable scan procedure.
- Distinguish project-authored, framework-owned, generated, and external documentation when the evidence supports those owners. Never imply that an external or generated source was scanned when it was not.

### Special slivers
- **Coverage is scope-specific:** discover and diff only project-declared or repository-evidenced documentation sources; report out-of-category files instead of inventing their owner.
- **No fixed root/category whitelist:** candidate directories and labels are evidence, not framework defaults.
- **Fresh-eyes is required when writing or materially updating the index.** Verify paths, counts, coverage, lookup correctness, and each evidenced local tooling contract before finalizing.
- **Repository-owned check compatibility:** when tests, sensors, validators, or project-owned templates require an exact count row, named section, or path list, discover the source of that requirement and preserve it in this project. Do not make a guessed or framework-wide copy of the constraint.
- No technology-framework detection gate is needed. The target's branches depend on configured document ownership and observed repository structure.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "Count looks right from existing doc, skip glob" | EVERY count requires fresh glob verification — no exceptions |
| "Only a few paths need verification" | Validate the complete listed set and count-bearing scopes — a sample can hide a stale link |
| "All files fit into existing categories" | Diff the evidence-backed documentation scope against its categories and report uncategorized files |
| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent's counts carry confirmation bias. |
| "The existing index has enough examples; skip a fresh completeness check" | Re-enumerate the configured/evidenced document scope and validate each project-owned check |
| "This folder/category pattern is standard" | Retain only roots and categories confirmed in this repository's config or files |

### prompt-enhance
`/prompt-enhance <ref>/docs-index-reference.md`
