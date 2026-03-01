# Lessons Learned

- [2026-03-01] **Re-read files after context compaction.** Claude's Edit tool requires a prior Read in the same context window. After compaction, all read state is lost. Always re-read files with the Read tool before using Edit post-compaction.
- [2026-03-01] **Never insert inline comments before generic type parameters.** Patterns like `ClassName // comment<T>` break C# generic syntax. Place comments AFTER the complete type expression: `ClassName<T>  // comment`.
- [2026-03-01] **Always grep for deleted/renamed terms after bulk replacements.** Large-scale find/replace misses references in docs, configs, and catalog tables. Run `grep -r "old-term"` across the full repo after every bulk edit session.
- [2026-03-01] **Dedup markers must be globally unique across all hooks.** Multiple hooks sharing transcript dedup logic must use the identical marker string imported from `lib/dedup-constants.cjs`. Never define marker strings inline — always import from the shared module.
- [2026-03-01] **Deleting agents/skills/hooks causes doc staleness cascades.** Removing a component requires updates across 5-10+ doc files (READMEs, catalogs, setup guides, comparison docs). Use the doc cascade mapping in `.claude/workflows/development-rules.md` to find all affected docs.
- [2026-03-01] **After context compaction, ALWAYS call TaskList before TaskCreate.** Compaction wipes AI's memory of existing tasks, causing duplicate creation and permanent orphan tasks. Fix: check what already exists, resume those tasks — never blindly create new ones.
