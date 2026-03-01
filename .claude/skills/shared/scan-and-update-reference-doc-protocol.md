# Scan & Update Reference Doc Protocol

Shared protocol for all `scan-*` skills. Each skill scans a project's codebase and populates/syncs one reference doc in `docs/`.

## Mode Detection

Before scanning, read the target file and determine the mode:

- **Init mode** — File is placeholder (only `#` headings + `<!-- -->` comments, no real content paragraphs or code blocks) → full generation from scratch
- **Sync mode** — File has real content (paragraphs, code blocks, tables) → incremental update: preserve existing good content, add missing sections, update stale data

## 5-Phase Workflow

### Phase 0: Read & Assess Current Doc

1. Read target doc file completely
2. Classify: **init** (placeholder) or **sync** (populated)
3. If sync: extract existing H2 section headings and approximate line counts per section
4. Record assessment in your task notes

### Phase 1: Plan Scan Strategy

1. Check if `docs/project-config.json` exists — use it for project-specific paths, module lists, context groups
2. If no config: fall back to filesystem discovery (Glob for `*.cs`, `*.ts`, `*.csproj`, `package.json`, etc.)
3. Define scan areas (directories, file patterns, grep terms) based on skill-specific instructions
4. Plan parallel sub-agent allocation:
   - Spawn **2-4 Explore agents** for independent scan areas
   - Each agent gets a focused search scope and returns structured findings
   - Keep scopes non-overlapping to avoid duplicate work

### Phase 2: Execute Scan & Write Report

1. Launch parallel Explore sub-agents with specific search instructions
2. Aggregate all findings into an **external report file**:
   - Path: `plans/reports/scan-{skill-name}-{YYMMDD}-{HHMM}-report.md`
   - Structure: one H2 per target doc section, with raw findings (file paths, pattern examples, counts)
3. This report is external memory — it survives context compaction and can be re-read later

**Report structure:**
```markdown
# Scan Report: {Skill Name}
Date: {YYYY-MM-DD}
Target: {target doc path}
Mode: {init|sync}

## Section: {Section Name}
### Files Found
- path/to/file.ext (lines X-Y)
### Patterns Discovered
- Pattern description with `code example`
### Counts
- N implementations found
```

### Phase 3: Analyze & Generate

1. Read the report file back
2. For each target doc section:
   - **Init mode:** Generate section content from scan findings — include real code examples from the codebase, file:line references, tables where appropriate
   - **Sync mode:** Compare findings against existing section content. Only update if: new patterns discovered, counts changed, file paths moved, or sections are missing
3. Draft the updated doc content
4. **Generic content rules:**
   - Use relative paths (not absolute)
   - Include actual code examples found in THIS project (not generic/fabricated ones)
   - Add `<!-- Last scanned: YYYY-MM-DD -->` comment at top of file
   - Organize with tables for structured data (ports, paths, mappings)
   - Keep code blocks short (5-15 lines) — reference full files by path

### Phase 4: Write & Verify

1. Write updated doc to target path
2. Verify:
   - All H2 sections from skill spec are present
   - Code examples reference real files that exist (spot-check 3-5 paths with Glob)
   - No placeholder comments remain (`<!-- Document your ... here -->`)
   - File is well-formatted markdown
3. Report summary: sections updated, sections unchanged, new discoveries

## Generic Discovery Patterns

Use these patterns to discover project structure in ANY codebase:

### Backend Discovery
```bash
# .NET services
find src/ -name "*.csproj" -maxdepth 4
grep -r "class.*Handler.*:" src/ --include="*.cs" -l
grep -r "interface I.*Repository" src/ --include="*.cs" -l

# Node.js services
find src/ -name "package.json" -not -path "*/node_modules/*" -maxdepth 3

# Java/Kotlin services
find src/ -name "pom.xml" -o -name "build.gradle" -maxdepth 3
```

### Frontend Discovery
```bash
# Angular
find src/ -name "angular.json" -o -name "nx.json"
grep -r "extends.*Component" src/ --include="*.ts" -l

# React
grep -r "from 'react'" src/ --include="*.tsx" -l | head -5

# Vue
find src/ -name "*.vue" | head -5
```

### Config-Driven Discovery
```javascript
// If docs/project-config.json exists, prefer its paths:
const config = JSON.parse(fs.readFileSync('docs/project-config.json'));
const modules = config.modules || [];          // v2 module registry
const backendPatterns = config.contextGroups;   // context group patterns
const styling = config.styling;                 // SCSS/CSS config
```

## Sub-Agent Prompt Template

When spawning Explore agents, use this template:

```
Scan {AREA} in this project. Search for:
1. {Pattern 1} — grep/glob for {term}
2. {Pattern 2} — grep/glob for {term}

For each finding, report:
- File path (relative to project root)
- Line number(s) of key patterns
- Brief code snippet (3-5 lines max)

Organize findings by category. Be exhaustive — scan all relevant directories.
Do NOT summarize or interpret — just report raw findings.
```

## Rules

- **NEVER hardcode project-specific paths** — discover everything dynamically
- **NEVER fabricate code examples** — only use actual code found in the project
- **ALWAYS write findings to external report** before generating doc content
- **ALWAYS preserve existing good content** in sync mode
- **ALWAYS include `<!-- Last scanned: YYYY-MM-DD -->` at doc top**
- **Evidence required** — every code example must reference a real file path
