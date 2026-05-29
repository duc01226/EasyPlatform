#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PROJECT_RESIDUE_TERMS = [
  "Br" + "avoSUITE",
  "Br" + "avoSuite",
  "br" + "avoTALENTS",
  "br" + "avoGROWTH",
  "br" + "avoSURVEYS",
  "br" + "avoINSIGHTS",
];

const STALE_PERFORMANCE_SKIP_TERMS = [
  "PERFORMANCE EXCEPTION routes",
  "where those steps are intentionally skipped",
  "PERFORMANCE EXCEPTION — NO INTEGRATION TESTS",
  "PERFORMANCE EXCEPTION: If this refactor is performance-driven",
  "skip tdd-spec",
  "Do NOT run `/tdd-spec`",
  "Do NOT run tdd-spec",
  "Performance exception skips",
  "except documented performance-exception routes",
];

const STALE_TC_PLACEHOLDER_TERMS = [
  "TC-{FEAT}-{NNN}",
  "TC-{FEAT}-",
  "TC-{FEAT}",
];

const STALE_TC_EVIDENCE_FORMAT_TERMS = [
  "**Evidence:** `{FilePath}:{LineRange}`",
];

const STALE_QA_DASHBOARD_PATH_TERMS = [
  "docs/specs/{Module}",
];

const UNCONFIGURED_ARTIFACT_ROOT_TERMS = [
  "{configured-idea-artifact-root}",
  "{configured-pbi-artifact-root}",
  "{configured-spec-docs-root}",
  "{configured-backlog-artifact-root}",
  "{configured-report-root}",
];

const STALE_TEXT_SCAN_TARGETS = [
  ".claude/docs",
  ".claude/hooks",
  ".claude/skills",
  ".claude/templates",
  ".agents/skills",
  ".claude/workflows.json",
  ".codex/CODEX_CONTEXT.md",
  "CLAUDE.md",
  "AGENTS.md",
  "docs/project-reference",
];

const STALE_TEXT_SCAN_TERMS = [
  ...STALE_TC_PLACEHOLDER_TERMS,
  ...STALE_TC_EVIDENCE_FORMAT_TERMS,
  ...STALE_QA_DASHBOARD_PATH_TERMS,
  ...UNCONFIGURED_ARTIFACT_ROOT_TERMS,
];

const TEXT_FILE_EXTENSIONS = new Set([".cjs", ".js", ".json", ".md", ".mjs", ".ts", ".tsx", ".txt"]);
const SDD022_SCAN_ROOTS = ["docs/business-features/", "docs/specs/"];
const SDD022_EXEMPT_FILES = new Set([
  "docs/business-features/DOCUMENTATION-GUIDE.md",
  "docs/specs/06-reimplementation-guide.md",
]);
const BANNED_PROSE_TECH_TERMS = [
  "Easy.Platform",
  ".NET",
  "C#",
  "Angular",
  "MediatR",
  "CQRS",
  "MongoDB",
  "SQL Server",
  "PostgreSQL",
  "EF Core",
  "Redis",
  "Elasticsearch",
  "RabbitMQ",
  "Kafka",
  "Hangfire",
  "IdentityServer",
  "JWT",
  "OAuth",
];
const PLATFORM_PREFIXED_IDENTIFIER_PATTERN =
  /(^|[^A-Za-z0-9_])(Platform[A-Z][A-Za-z0-9]+)(?=$|[^A-Za-z0-9_])/g;

const ACTIVE_SDD_CONTRACT_REFERENCE = "shared/sdd-artifact-contract.md";
const LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE = ".claude/skills/shared/sdd-artifact-contract.md";
const AI_SDD_SYNC_MARKER = "SYNC:ai-sdd-artifact-contract";
const AI_SDD_REFERENCE_ONLY_TEXT = "reference-only until accepted";
const AI_SDD_SUPPORTED_TOOL_TEXT = "Any supported AI tool";
const GENERIC_SDD_REFERENCE_TERMS = [
  "Spec-first",
  "Spec-anchored",
  "Spec-as-source",
  "Implementation-Complete Checklist",
  "AI-Implementability Checklist",
  "Spec Anti-Patterns That Cause AI Hallucination",
  "Thoughtworks:",
  "arxiv:",
  "Addy Osmani:",
];
const PROJECT_LAYOUT_TERMS = [
  "src/Services/**",
  "src/Services/{Module}",
  "src/Services/{service}",
  "src/Services/{Service}",
  "src/Services/Growth",
  "modules=Growth",
  "changed_files=src/Services",
];

const CHECKS = [
  {
    code: "SDD001",
    file: ".claude/skills/workflow-feature/SKILL.md",
    requireAny: [ACTIVE_SDD_CONTRACT_REFERENCE, "SDD Artifact Contract"],
    message: "Feature workflow must reference the shared SDD artifact contract.",
  },
  {
    code: "SDD002",
    file: ".claude/skills/workflow-bugfix/SKILL.md",
    requireAll: ["Code Bug vs Spec Bug", "Spec Bug", "Code Bug"],
    message: "Bugfix workflow must expose the Code Bug vs Spec Bug gate.",
  },
  {
    code: "SDD003",
    file: ".claude/skills/workflow-idea-to-pbi/SKILL.md",
    requireAll: [
      "Feature doc Section 15",
      "TC IDs",
      "docs-update",
      "team-artifacts/ideas",
      "team-artifacts/pbis",
      "plans/reports/docs-update",
    ],
    forbidAny: UNCONFIGURED_ARTIFACT_ROOT_TERMS,
    message: "Idea-to-PBI workflow must route PBI artifacts to canonical TC/spec sync.",
  },
  {
    code: "SDD004",
    file: ".claude/skills/docs-update/SKILL.md",
    requireAll: ["configured PBI/idea artifact roots", "detection/delegation", "docs/project-config.json"],
    forbidAny: ["Generate TCs from PBI", "team-artifacts/pbis", "team-artifacts/ideas", ...PROJECT_LAYOUT_TERMS],
    message: "docs-update must route PBI/idea artifacts without owning TC generation.",
  },
  {
    code: "SDD005",
    file: ".claude/skills/integration-test/SKILL.md",
    requireAny: ["adjudication required", "canonical product/spec intent"],
    forbidAny: ["Update spec to match test"],
    message: "integration-test mismatch rules must not prefer current passing tests over canonical spec intent.",
  },
  {
    code: "SDD006",
    file: ".claude/skills/tdd-spec/SKILL.md",
    requireAll: ["emergency recovery", "recovery report", "target-source-path"],
    requireAny: ["AskUserQuestion", "direct user question"],
    forbidAny: PROJECT_LAYOUT_TERMS,
    message: "Reverse sync must be explicit emergency recovery with user confirmation.",
  },
  {
    code: "SDD007",
    file: ".claude/skills/feature-docs/SKILL.md",
    requireAll: ["Section 15 owned exclusively by", "/tdd-spec"],
    forbidAny: ["feature-docs owns Section 15"],
    message: "feature-docs update mode must delegate existing TC edits to tdd-spec.",
  },
  {
    code: "SDD008",
    file: ".claude/skills/workflow-feature/SKILL.md",
    requireAll: ["workflow-performance", "SLA", "functional no-regression"],
    forbidPattern: /skip\s+`?\/?tdd-spec`?/i,
    message: "Feature performance route must preserve performance SDD and functional regression checks.",
  },
  {
    code: "SDD008",
    file: ".claude/skills/workflow-bugfix/SKILL.md",
    requireAll: ["workflow-performance", "SLA", "functional no-regression"],
    forbidPattern: /skip\s+`?\/?tdd-spec`?/i,
    message: "Bugfix performance route must preserve performance SDD and functional regression checks.",
  },
  {
    code: "SDD009",
    file: ".claude/skills/shared/sdd-artifact-contract.md",
    requireAny: ["docs/project-config.json", "docs/project-reference"],
    forbidAny: PROJECT_RESIDUE_TERMS,
    message: "Generic SDD contract must route customization through project config/reference docs.",
  },
  {
    code: "SDD010",
    file: ".claude/hooks/session-init-docs.cjs",
    requireAll: ["docs/project-config.json", "docs/project-reference"],
    forbidAny: PROJECT_RESIDUE_TERMS,
    message: "Session init hook must initialize project config/docs rather than embedding local project rules.",
  },
  {
    code: "SDD010",
    file: ".claude/hooks/prompt-context-assembler-project-config.cjs",
    requireAll: ["docs/project-config.json", "docs/project-reference"],
    forbidAny: PROJECT_RESIDUE_TERMS,
    message: "Project-config prompt hook must summarize config/docs rather than embedding local project rules.",
  },
  {
    code: "SDD011",
    file: ".claude/workflows.json",
    requireAll: ["PERFORMANCE-SDD ROUTE", "workflow-performance", "SLA", "functional no-regression"],
    forbidAny: STALE_PERFORMANCE_SKIP_TERMS,
    message: "Workflow injected contexts must not preserve stale performance exception skip language.",
  },
  {
    code: "SDD012",
    file: ".claude/skills/workflow-performance/SKILL.md",
    requireAll: ["PERFORMANCE-SDD ROUTE", "baseline", "acceptable regression budget", "behavior", "docs/spec"],
    forbidAny: STALE_PERFORMANCE_SKIP_TERMS,
    message: "Performance workflow must keep measurement evidence while preserving spec/doc sync gates.",
  },
  {
    code: "SDD013",
    file: ".claude/skills/workflow-refactor/SKILL.md",
    requireAll: ["PERFORMANCE-SDD ROUTE", "workflow-performance", "observable behavior", "docs/spec"],
    forbidAny: STALE_PERFORMANCE_SKIP_TERMS,
    message: "Refactor workflow must route performance work without bypassing spec/doc sync gates.",
  },
  {
    code: "SDD014",
    file: ".codex/CODEX_CONTEXT.md",
    requireAll: [
      "PERFORMANCE-SDD ROUTE",
      "workflow-performance",
      ACTIVE_SDD_CONTRACT_REFERENCE,
      AI_SDD_SYNC_MARKER,
      AI_SDD_REFERENCE_ONLY_TEXT,
      AI_SDD_SUPPORTED_TOOL_TEXT,
    ],
    forbidAny: [...STALE_PERFORMANCE_SKIP_TERMS, LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE],
    message: "Codex context mirror must receive updated performance SDD route language.",
  },
  {
    code: "SDD014",
    file: "AGENTS.md",
    requireAll: [
      "PERFORMANCE-SDD ROUTE",
      "workflow-performance",
      ACTIVE_SDD_CONTRACT_REFERENCE,
      AI_SDD_SYNC_MARKER,
      AI_SDD_REFERENCE_ONLY_TEXT,
      AI_SDD_SUPPORTED_TOOL_TEXT,
    ],
    forbidAny: [...STALE_PERFORMANCE_SKIP_TERMS, LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE],
    message: "AGENTS.md mirror must receive updated performance SDD route language.",
  },
  {
    code: "SDD015",
    file: ".agents/skills/workflow-feature/SKILL.md",
    requireAny: [ACTIVE_SDD_CONTRACT_REFERENCE, "SDD Artifact Contract"],
    forbidAny: [LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE],
    message: "Codex feature workflow must reference the local shared SDD artifact contract, not the Claude source path.",
  },
  {
    code: "SDD015",
    file: ".agents/skills/workflow-bugfix/SKILL.md",
    requireAll: ["Code Bug vs Spec Bug", "Spec Bug", "Code Bug"],
    forbidAny: [LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE],
    message: "Codex bugfix workflow must preserve SDD gates without pointing at the Claude source path.",
  },
  {
    code: "SDD015",
    file: ".agents/skills/workflow-idea-to-pbi/SKILL.md",
    requireAll: [
      "Feature doc Section 15",
      "TC IDs",
      "docs-update",
      "team-artifacts/ideas",
      "team-artifacts/pbis",
      "plans/reports/docs-update",
    ],
    forbidAny: [LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE, ...UNCONFIGURED_ARTIFACT_ROOT_TERMS],
    message: "Codex idea-to-PBI workflow must preserve SDD gates without pointing at the Claude source path.",
  },
  {
    code: "SDD016",
    file: ".agents/skills/docs-update/SKILL.md",
    requireAll: ["configured PBI/idea artifact roots", "detection/delegation", "docs/project-config.json"],
    forbidAny: ["Generate TCs from PBI", "team-artifacts/pbis", "team-artifacts/ideas", ...PROJECT_LAYOUT_TERMS],
    message: "Codex docs-update mirror must remain project-portable and route PBI/idea artifacts correctly.",
  },
  {
    code: "SDD016",
    file: ".agents/skills/tdd-spec/SKILL.md",
    requireAll: ["emergency recovery", "recovery report", "target-source-path"],
    requireAny: ["AskUserQuestion", "direct user question"],
    forbidAny: PROJECT_LAYOUT_TERMS,
    message: "Codex tdd-spec mirror must remain project-portable and require explicit reverse-sync recovery.",
  },
  {
    code: "SDD017",
    file: ".claude/skills/tdd-spec/references/tdd-spec-template.md",
    requireAll: ["configured-source-path", "configured-test-path"],
    forbidAny: PROJECT_LAYOUT_TERMS,
    message: "TDD spec reference template must use project-configurable source and test paths.",
  },
  {
    code: "SDD017",
    file: ".agents/skills/tdd-spec/references/tdd-spec-template.md",
    requireAll: ["configured-source-path", "configured-test-path"],
    forbidAny: PROJECT_LAYOUT_TERMS,
    message: "Codex TDD spec reference template must use project-configurable source and test paths.",
  },
  {
    code: "SDD017",
    file: ".claude/skills/shared/tc-format.md",
    requireAll: ["configured-source-path", "configured-test-path"],
    forbidAny: PROJECT_LAYOUT_TERMS,
    message: "Shared TC format must use project-configurable source and test paths.",
  },
  {
    code: "SDD017",
    file: ".agents/skills/shared/tc-format.md",
    requireAll: ["configured-source-path", "configured-test-path"],
    forbidAny: PROJECT_LAYOUT_TERMS,
    message: "Codex shared TC format must use project-configurable source and test paths.",
  },
  {
    code: "SDD018",
    file: ".claude/skills/shared/sdd-artifact-contract.md",
    requireAll: [
      "Shared-Vs-Project Boundary",
      "Implementation-Complete Gate",
      "AI-Implementability Gate",
      "Tech-Agnostic Spec Writing",
      "Code-To-Spec And Spec-To-Code",
      "Tool-Neutral Execution",
      AI_SDD_REFERENCE_ONLY_TEXT,
      AI_SDD_SUPPORTED_TOOL_TEXT,
    ],
    forbidAny: PROJECT_RESIDUE_TERMS,
    message: "Shared SDD contract must own generic AI-SDD principles and stay project-neutral.",
  },
  {
    code: "SDD018",
    file: ".claude/skills/shared/sync-inline-versions.md",
    requireAll: [
      AI_SDD_SYNC_MARKER,
      AI_SDD_REFERENCE_ONLY_TEXT,
      AI_SDD_SUPPORTED_TOOL_TEXT,
      ACTIVE_SDD_CONTRACT_REFERENCE,
    ],
    forbidAny: PROJECT_RESIDUE_TERMS,
    message: "Shared sync inline versions must carry the portable AI-SDD marker for generated mirrors.",
  },
  {
    code: "SDD020",
    file: ".agents/skills/shared/sdd-artifact-contract.md",
    requireAll: [
      "Shared-Vs-Project Boundary",
      "Implementation-Complete Gate",
      "AI-Implementability Gate",
      "Tech-Agnostic Spec Writing",
      "Code-To-Spec And Spec-To-Code",
      "Tool-Neutral Execution",
      AI_SDD_REFERENCE_ONLY_TEXT,
      AI_SDD_SUPPORTED_TOOL_TEXT,
    ],
    forbidAny: [...PROJECT_RESIDUE_TERMS, LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE],
    message: "Codex generated shared SDD contract must exist in the active skills root and preserve generic AI-SDD gates.",
  },
  {
    code: "SDD020",
    file: ".agents/skills/shared/sync-inline-versions.md",
    requireAll: [
      AI_SDD_SYNC_MARKER,
      AI_SDD_REFERENCE_ONLY_TEXT,
      AI_SDD_SUPPORTED_TOOL_TEXT,
      ACTIVE_SDD_CONTRACT_REFERENCE,
    ],
    forbidAny: [...PROJECT_RESIDUE_TERMS, LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE],
    message: "Codex generated shared sync inline versions must preserve the portable AI-SDD marker.",
  },
  {
    code: "SDD019",
    file: "docs/project-reference/spec-principles.md",
    requireAll: [
      "Project-specific extension",
      "Do not add reusable AI-SDD principles here",
      ACTIVE_SDD_CONTRACT_REFERENCE,
      "docs/project-config.json",
    ],
    forbidAny: GENERIC_SDD_REFERENCE_TERMS,
    message: "Project spec principles must stay a local extension and not duplicate generic SDD principles.",
  },
  {
    code: "SDD019",
    file: "docs/project-reference/workflow-spec-test-code-cycle-reference.md",
    requireAll: [
      "Project-Specific Workflow Extension",
      "local workflow sequence",
      ACTIVE_SDD_CONTRACT_REFERENCE,
      "AGENTS.md",
    ],
    forbidAny: GENERIC_SDD_REFERENCE_TERMS,
    message: "Project workflow cycle reference must stay a local workflow extension and not duplicate generic SDD principles.",
  },
];

function containsAll(content, terms = []) {
  return terms.every((term) => content.includes(term));
}

function containsAny(content, terms = []) {
  return terms.some((term) => content.includes(term));
}

function evaluateCheck(check, content) {
  const failures = [];

  if (check.requireAll && !containsAll(content, check.requireAll)) {
    const missing = check.requireAll.filter((term) => !content.includes(term));
    failures.push(`missing required text: ${missing.join(", ")}`);
  }

  if (check.requireAny && !containsAny(content, check.requireAny)) {
    failures.push(`missing one of required text: ${check.requireAny.join(" | ")}`);
  }

  if (check.forbidAny && containsAny(content, check.forbidAny)) {
    const found = check.forbidAny.filter((term) => content.includes(term));
    failures.push(`forbidden text found: ${found.join(", ")}`);
  }

  if (check.forbidPattern && check.forbidPattern.test(content)) {
    failures.push(`forbidden pattern found: ${check.forbidPattern}`);
  }

  return failures;
}

async function readGitIndexFileOrNull(rootDir, relativePath) {
  try {
    const { stdout } = await execFileAsync("git", ["show", `:${normalizeRelativeFile(relativePath)}`], {
      cwd: rootDir,
      maxBuffer: 20 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return null;
  }
}

async function readFileOrNull(rootDir, relativePath, options = {}) {
  if (options.staged) {
    return await readGitIndexFileOrNull(rootDir, relativePath);
  }

  try {
    return await fs.readFile(path.join(rootDir, relativePath), "utf8");
  } catch {
    return null;
  }
}

async function* walkTextFiles(rootDir, relativeTarget) {
  const fullPath = path.join(rootDir, relativeTarget);

  let stats;
  try {
    stats = await fs.stat(fullPath);
  } catch {
    return;
  }

  if (stats.isFile()) {
    if (TEXT_FILE_EXTENSIONS.has(path.extname(fullPath))) {
      yield relativeTarget;
    }
    return;
  }

  if (!stats.isDirectory()) {
    return;
  }

  const entries = await fs.readdir(fullPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }

    const childRelative = path.join(relativeTarget, entry.name);
    if (entry.isDirectory()) {
      yield* walkTextFiles(rootDir, childRelative);
    } else if (entry.isFile() && TEXT_FILE_EXTENSIONS.has(path.extname(entry.name))) {
      yield childRelative;
    }
  }
}

function normalizeRelativeFile(relativeFile) {
  return relativeFile.replaceAll("\\", "/").replace(/^\.\//, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Precompile the banned-term boundary regexes once at module load instead of per line.
// These patterns are stateless (`.test()`, no /g flag), so reuse across calls is safe and
// avoids recompiling 18 RegExp objects for every line of every scanned file.
const BANNED_PROSE_TERM_PATTERNS = BANNED_PROSE_TECH_TERMS.map((term) => ({
  term,
  pattern: new RegExp(`(^|[^A-Za-z0-9_])(${escapeRegExp(term)})(?=$|[^A-Za-z0-9_])`, "i"),
}));

function findBannedProseTechTerms(line) {
  const found = [];
  for (const { term, pattern } of BANNED_PROSE_TERM_PATTERNS) {
    if (pattern.test(line)) {
      found.push(term);
    }
  }

  PLATFORM_PREFIXED_IDENTIFIER_PATTERN.lastIndex = 0;
  for (const match of line.matchAll(PLATFORM_PREFIXED_IDENTIFIER_PATTERN)) {
    found.push(match[2]);
  }

  return [...new Set(found)];
}

function isSdd022TargetFile(relativeFile) {
  const normalized = normalizeRelativeFile(relativeFile);
  return (
    normalized.endsWith(".md") &&
    !SDD022_EXEMPT_FILES.has(normalized) &&
    SDD022_SCAN_ROOTS.some((root) => normalized.startsWith(root))
  );
}

function isEvidenceContextLine(line, state = {}) {
  if (state.inFrontmatter) {
    return true;
  }
  if (state.fenceLang === "mermaid") {
    return true;
  }
  if (state.allowRegion) {
    return true;
  }
  return (
    line.includes("[Source:") ||
    line.includes("**Evidence**") ||
    line.includes("**IntegrationTest**") ||
    line.includes("sdd022-allow")
  );
}

async function getChangedFiles(rootDir, options = {}) {
  const commands = options.staged
    ? [["diff", "--cached", "--name-only"]]
    : [
        ["diff", "--name-only"],
        ["diff", "--cached", "--name-only"],
        ["ls-files", "--others", "--exclude-standard"],
      ];
  const changedFiles = [];

  for (const args of commands) {
    try {
      const { stdout } = await execFileAsync("git", args, { cwd: rootDir });
      changedFiles.push(...stdout.split(/\r?\n/).filter(Boolean));
    } catch {
      return [];
    }
  }

  return [...new Set(changedFiles.map(normalizeRelativeFile))];
}

async function resolveSdd022ScanFiles(rootDir, options = {}) {
  if (Array.isArray(options.sdd022Files)) {
    return [...new Set(options.sdd022Files.map(normalizeRelativeFile))].filter(isSdd022TargetFile);
  }

  const found = [];
  for (const root of SDD022_SCAN_ROOTS) {
    for await (const relativeFile of walkTextFiles(rootDir, root)) {
      const normalized = normalizeRelativeFile(relativeFile);
      if (isSdd022TargetFile(normalized)) {
        found.push(normalized);
      }
    }
  }

  return [...new Set(found)];
}

async function resolveEnforcedChangedSet(rootDir, options = {}) {
  if (!options.enforceChanged) {
    return new Set();
  }

  const changed = Array.isArray(options.changedFiles)
    ? options.changedFiles.map(normalizeRelativeFile)
    : await getChangedFiles(rootDir, options);

  return new Set(changed);
}

function scanProseForBannedTokens(content) {
  const findings = [];
  const lines = content.split(/\r?\n/);
  const state = {
    inFrontmatter: lines[0]?.trim() === "---",
    fenceLang: null,
    allowRegion: false,
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (index === 0 && state.inFrontmatter) {
      continue;
    }

    if (state.inFrontmatter) {
      if (trimmed === "---") {
        state.inFrontmatter = false;
      }
      continue;
    }

    if (/<!--\s*sdd022-allow:start/i.test(line)) {
      state.allowRegion = true;
      continue;
    }
    if (/<!--\s*sdd022-allow:end/i.test(line)) {
      state.allowRegion = false;
      continue;
    }

    const fenceMatch = /^(```|~~~)(.*)$/.exec(trimmed);
    if (fenceMatch) {
      state.fenceLang = state.fenceLang === null ? fenceMatch[2].trim().toLowerCase() : null;
      continue;
    }

    if (isEvidenceContextLine(line, state)) {
      continue;
    }

    for (const term of findBannedProseTechTerms(line)) {
      findings.push({
        line: index + 1,
        term,
      });
    }
  }

  return findings;
}

async function scanSdd022File(rootDir, relativeFile, options = {}) {
  const normalizedFile = normalizeRelativeFile(relativeFile);
  const content = await readFileOrNull(rootDir, normalizedFile, options);
  if (content === null) {
    return [];
  }

  return scanProseForBannedTokens(content);
}

async function runChecks(rootDir = process.cwd(), checks = CHECKS, options = {}) {
  const failures = [];
  const metrics = {
    checkedFiles: 0,
    hardFailures: 0,
    warnings: 0,
    contractReferencesMissing: 0,
    unsafeDriftRulesFound: 0,
    pbiIdeaRoutesFound: 0,
    performanceSddRoutesFound: 0,
    projectResidueFindings: 0,
    projectConfigGuidanceFound: 0,
    stalePerformanceSkipFindings: 0,
    staleTcPlaceholderFindings: 0,
    staleTcEvidenceFormatFindings: 0,
    staleQaDashboardPathFindings: 0,
    unconfiguredArtifactRootFindings: 0,
    bannedProseTechTermFindings: 0,
  };
  const checkedFiles = new Set();

  for (const check of checks) {
    const content = await readFileOrNull(rootDir, check.file, options);
    checkedFiles.add(check.file);

    if (content === null) {
      failures.push({
        severity: "error",
        code: check.code,
        file: check.file,
        message: "file is missing",
      });
      continue;
    }

    if (content.includes(ACTIVE_SDD_CONTRACT_REFERENCE) || content.includes("SDD Artifact Contract")) {
      metrics.contractReferencesMissing += 0;
    } else if (check.code === "SDD001") {
      metrics.contractReferencesMissing += 1;
    }

    if (content.includes("configured PBI/idea artifact roots")) {
      metrics.pbiIdeaRoutesFound += 1;
    }

    if (content.includes("workflow-performance") && content.includes("SLA")) {
      metrics.performanceSddRoutesFound += 1;
    }

    if (content.includes("docs/project-config.json") || content.includes("docs/project-reference")) {
      metrics.projectConfigGuidanceFound += 1;
    }

    const checkFailures = evaluateCheck(check, content);
    for (const detail of checkFailures) {
      if (detail.includes("Update spec to match test")) metrics.unsafeDriftRulesFound += 1;
      if (detail.includes("forbidden text found")) metrics.projectResidueFindings += 1;
      if (STALE_PERFORMANCE_SKIP_TERMS.some((term) => detail.includes(term))) {
        metrics.stalePerformanceSkipFindings += 1;
      }
      if (STALE_TC_PLACEHOLDER_TERMS.some((term) => detail.includes(term))) {
        metrics.staleTcPlaceholderFindings += 1;
      }
      if (UNCONFIGURED_ARTIFACT_ROOT_TERMS.some((term) => detail.includes(term))) {
        metrics.unconfiguredArtifactRootFindings += 1;
      }
      failures.push({
        severity: "error",
        code: check.code,
        file: check.file,
        message: `${check.message} (${detail})`,
      });
    }
  }

  const scannedFiles = new Set();
  for (const target of STALE_TEXT_SCAN_TARGETS) {
    for await (const relativeFile of walkTextFiles(rootDir, target)) {
      if (scannedFiles.has(relativeFile)) {
        continue;
      }

      scannedFiles.add(relativeFile);
      checkedFiles.add(relativeFile);

      const content = await readFileOrNull(rootDir, relativeFile);
      if (content === null) {
        continue;
      }

      const found = STALE_TEXT_SCAN_TERMS.filter((term) => content.includes(term));
      if (found.length === 0) {
        continue;
      }

      metrics.staleTcPlaceholderFindings += found.filter((term) =>
        STALE_TC_PLACEHOLDER_TERMS.includes(term)
      ).length;
      metrics.staleTcEvidenceFormatFindings += found.filter((term) =>
        STALE_TC_EVIDENCE_FORMAT_TERMS.includes(term)
      ).length;
      metrics.staleQaDashboardPathFindings += found.filter((term) =>
        STALE_QA_DASHBOARD_PATH_TERMS.includes(term)
      ).length;
      metrics.unconfiguredArtifactRootFindings += found.filter((term) =>
        UNCONFIGURED_ARTIFACT_ROOT_TERMS.includes(term)
      ).length;
      failures.push({
        severity: "error",
        code: "SDD021",
        file: relativeFile,
        message: `Prompt/spec surfaces must not preserve stale TC placeholders or unconfigured artifact-root tokens. (forbidden text found: ${found.join(", ")})`,
      });
    }
  }

  const sdd022Files = await resolveSdd022ScanFiles(rootDir, options);
  const enforcedChangedSet = await resolveEnforcedChangedSet(rootDir, options);
  for (const relativeFile of sdd022Files) {
    checkedFiles.add(relativeFile);
    const findings = await scanSdd022File(rootDir, relativeFile, options);

    for (const finding of findings) {
      metrics.bannedProseTechTermFindings += 1;
      const severity = enforcedChangedSet.has(relativeFile) ? "error" : "warn";
      if (severity === "warn") {
        metrics.warnings += 1;
      }
      failures.push({
        severity,
        code: "SDD022",
        file: relativeFile,
        message: `Feature/spec prose must remain tech-agnostic outside evidence, source, integration-test, frontmatter, and mermaid carriers. (line ${finding.line}: forbidden prose token "${finding.term}")`,
      });
    }
  }

  metrics.checkedFiles = checkedFiles.size;
  metrics.hardFailures = failures.filter((failure) => failure.severity !== "warn").length;

  return { failures, sddMetrics: metrics };
}

// Build the runChecks options from CLI flags + the resolved changed-file set.
// Diff-gated mode: SDD022 only ERRORs on changed files, so walking the entire spec corpus
// on every commit is wasted work that also floods output with non-blocking legacy WARNs.
// Scope the SDD022 scan to the changed set — the ERROR set is identical (only changed files
// can fail the gate). Reusing the same set for `changedFiles` avoids a second `git`
// invocation in resolveEnforcedChangedSet. Default mode (no --enforce-changed) leaves
// sdd022Files unset so runChecks walks the full corpus for the WARN census / codex:sync.
// NOTE: the SDD021 STALE_TEXT_SCAN is a separate always-error structural gate and is
// intentionally NOT scoped here.
function buildRunOptions({ enforceChanged, staged, changedFiles = [] }) {
  const options = { enforceChanged, staged };
  if (enforceChanged) {
    options.changedFiles = changedFiles;
    options.sdd022Files = changedFiles;
  }
  return options;
}

async function main() {
  const enforceChanged = process.argv.includes("--enforce-changed");
  const staged = process.argv.includes("--staged");
  const changedFiles = enforceChanged
    ? await getChangedFiles(process.cwd(), { enforceChanged, staged })
    : [];
  const options = buildRunOptions({ enforceChanged, staged, changedFiles });

  const result = await runChecks(process.cwd(), CHECKS, options);

  const hardFailures = result.failures.filter((failure) => failure.severity !== "warn");
  const warnFindings = result.failures.filter((failure) => failure.severity === "warn");

  for (const warning of warnFindings) {
    console.warn(`warn ${warning.code} ${warning.file}: ${warning.message}`);
  }

  if (hardFailures.length > 0) {
    console.error("[codex-verify-sdd] FAIL");
    for (const failure of hardFailures) {
      console.error(`${failure.severity} ${failure.code} ${failure.file}: ${failure.message}`);
    }
    console.error(JSON.stringify({ sddMetrics: result.sddMetrics }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log("[codex-verify-sdd] PASS");
  if (warnFindings.length > 0) {
    console.log(
      `[codex-verify-sdd] ${warnFindings.length} non-blocking SDD022 warning(s) — run with --enforce-changed to gate changed files`
    );
  }
  console.log(JSON.stringify({ sddMetrics: result.sddMetrics }, null, 2));
}

const isEntrypoint =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  await main();
}

export {
  CHECKS,
  PROJECT_RESIDUE_TERMS,
  STALE_PERFORMANCE_SKIP_TERMS,
  STALE_TC_PLACEHOLDER_TERMS,
  STALE_TC_EVIDENCE_FORMAT_TERMS,
  STALE_QA_DASHBOARD_PATH_TERMS,
  UNCONFIGURED_ARTIFACT_ROOT_TERMS,
  ACTIVE_SDD_CONTRACT_REFERENCE,
  LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE,
  AI_SDD_SYNC_MARKER,
  AI_SDD_REFERENCE_ONLY_TEXT,
  AI_SDD_SUPPORTED_TOOL_TEXT,
  GENERIC_SDD_REFERENCE_TERMS,
  PROJECT_LAYOUT_TERMS,
  BANNED_PROSE_TECH_TERMS,
  SDD022_SCAN_ROOTS,
  SDD022_EXEMPT_FILES,
  buildRunOptions,
  containsAll,
  containsAny,
  evaluateCheck,
  findBannedProseTechTerms,
  isEvidenceContextLine,
  isSdd022TargetFile,
  readGitIndexFileOrNull,
  scanProseForBannedTokens,
  scanSdd022File,
  runChecks,
};
