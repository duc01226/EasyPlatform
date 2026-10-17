#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
let resolveProjectRoot;
let isInvokedAsScript;
try {
  ({ resolveProjectRoot, isInvokedAsScript } = require("../lib/project-root.cjs"));
} catch {
  // The semantic policy is also mutation-tested as a standalone copied file.
  // Keep the evaluator importable without the optional project bundle around it.
  resolveProjectRoot = ({ cwd = process.cwd() } = {}) => ({
    rootDir: path.resolve(cwd),
    source: "cwd-fallback",
  });
  // Minimal stand-in for project-root.cjs isInvokedAsScript (no win32 case folding): argv keeps the
  // typed path, while the module URL is the real path, so a launch through a symlink must still match.
  const canonical = (target) => {
    try {
      return require("node:fs").realpathSync.native(path.resolve(target));
    } catch {
      return path.resolve(target);
    }
  };
  isInvokedAsScript = (invokedPath, selfPath) =>
    typeof invokedPath === "string" && invokedPath !== "" && canonical(invokedPath) === canonical(selfPath);
}

// Consumer-specific names are configuration, never framework source. A project may declare
// them under docs/project-config.json → framework.projectResidueTerms; a copied framework with
// no project profile simply has no consumer-specific residue to police.
const PROJECT_RESIDUE_TERMS = Object.freeze([]);
const PROJECT_CONFIG_PATH = "docs/project-config.json";

// ─── RELOCATABLE ROOTS ───────────────────────────────────────────────────────
// This verifier is one of the `verify:all` build gates. Every root it probes is
// declarable under `specRoots` / `docsRoots` in docs/project-config.json, so the
// probes carry portability TOKENS (`{TEAM_ARTIFACTS_ROOT}/initiatives`) and resolve at
// run time. A gate that scans a path the project moved away from finds nothing,
// and "found nothing" reads as PASS — a false green is worse than no gate, so
// `probeConfiguredRootCoverage` below turns a configured root with ZERO candidate
// files into a hard failure instead of a quiet success.
//
// The loader owns the token table; this file only runs its own resolution when the
// require FAILS (a stripped portable Codex tree ships .claude/scripts/codex/*.mjs
// without .claude/hooks/lib/). That branch resolves to the DEFAULTS — never a
// pass-through, which would search for a literal `{SPEC_ROOT}` and match nothing.
// Same contract and same defaults table as sync-context-workflows.mjs:96-125.
let loaderResolvePortabilityTokens = null;
try {
  ({ resolvePortabilityTokens: loaderResolvePortabilityTokens } = require("../../hooks/lib/project-config-loader.cjs"));
} catch {
  loaderResolvePortabilityTokens = null;
}

// The resolver is part of the hook-side project bundle. Stripped portable copies still run
// with legacy defaults when no profile is declared; declaring a profile without its validator
// is an actionable configuration error, never a reason to silently skip profile semantics.
let resolveSpecArtifactProfile = null;
let sectionHeadingIdentity = null;
try {
  ({ resolveSpecArtifactProfile, sectionHeadingIdentity } = require("../../hooks/lib/spec-artifact-profile.cjs"));
} catch {
  resolveSpecArtifactProfile = null;
  sectionHeadingIdentity = null;
}

const PORTABILITY_TOKEN_DEFAULTS = {
  SPEC_ROOT: "docs/specs",
  SPEC_ROOT_TECHNICAL: "docs/specs-technical",
  REF_DOCS_ROOT: "docs/project-reference",
  ADR_ROOT: "docs/adr",
  TEMPLATES_ROOT: "docs/templates",
  PLANS_ROOT: "plans",
  TEAM_ARTIFACTS_ROOT: "team-artifacts",
  PRODUCT_ROADMAP_DOC: "docs/product-roadmap.md",
};

/** Resolve tokens to the documented DEFAULTS, ignoring any config. */
function resolveTokensToDefaults(text) {
  if (typeof text !== "string" || !text.includes("{")) return text;
  return text.replace(/\{([A-Z][A-Z0-9_]*)\}/g, (match, token) =>
    Object.prototype.hasOwnProperty.call(PORTABILITY_TOKEN_DEFAULTS, token)
      ? PORTABILITY_TOKEN_DEFAULTS[token]
      : match
  );
}

/** Resolve tokens against a parsed project config, falling back to the defaults. */
function resolveTokens(text, config) {
  if (typeof text !== "string" || !text.includes("{")) return text;
  if (!loaderResolvePortabilityTokens) return resolveTokensToDefaults(text);
  return loaderResolvePortabilityTokens(text, config ?? {});
}

function resolveProjectSpecArtifactProfile(config) {
  if (!Object.prototype.hasOwnProperty.call(config ?? {}, "specArtifacts")) return null;
  if (!resolveSpecArtifactProfile) {
    throw verifierConfigError(
      `Cannot validate ${PROJECT_CONFIG_PATH} specArtifacts: the portable spec-artifact-profile resolver is unavailable.`
    );
  }
  try {
    return resolveSpecArtifactProfile(config);
  } catch (error) {
    const location = error?.path ? `${error.path}: ` : "";
    throw verifierConfigError(
      `Invalid ${PROJECT_CONFIG_PATH} specArtifacts profile: ${location}${error?.message ?? String(error)}`,
      error
    );
  }
}

function verifierConfigError(message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = "ERR_SDD_PROJECT_CONFIG";
  return error;
}

function normalizeDirectoryRoot(root) {
  const normalized = String(root).replaceAll("\\", "/").replace(/\/+$/, "");
  return normalized ? `${normalized}/` : "";
}

/**
 * The form-(b) default-plus-override sentence:
 *   default `team-artifacts/tasks`; a `docsRoots.teamArtifacts.path` entry in
 *   `docs/project-config.json` overrides the path
 *
 * A relocatable-root literal inside such a sentence is the documented idiom, not a
 * hardcoded path: it names the DEFAULT and says where the override lives, so a
 * zero-config reader still gets a runnable instruction.
 *
 * The predicate is deliberately IDENTICAL to the one Phase 03 ships at
 * `verify-configurable-root-literals.mjs:166-171` (line names the config file). Two
 * build gates disagreeing about what a legal sentence looks like would be its own
 * defect, so the marker — not a stricter private rule — is the shared contract.
 */
const CONFIG_FILE_MARKER = "project-config.json";

function isFormBOverrideSentence(line) {
  return line.includes(CONFIG_FILE_MARKER);
}

/** True when `literal` appears somewhere in `content` inside a form-(b) sentence. */
function hasFormBOverrideFor(content, literal) {
  return content
    .split(/\r?\n/)
    .some((line) => line.includes(literal) && isFormBOverrideSentence(line));
}

/** True when `literal` appears on at least one line that is NOT a form-(b) sentence. */
function hasBareOccurrence(content, literal) {
  return content
    .split(/\r?\n/)
    .some((line) => line.includes(literal) && !isFormBOverrideSentence(line));
}

/**
 * The profile-qualified fallback sentence:
 *   Under the strict default, Section 8 is the canonical TC registry; … Under a native
 *   profile, update only the declared owner/carriers …
 *
 * A default-profile literal inside such a sentence is shared framework prose naming the
 * DEFAULT and the OVERRIDE that supersedes it — the exact analogue of a relocatable-root
 * literal inside a form-(b) sentence. It must clear, because SDD007's strict-default branch
 * REQUIRES this literal while its native branch FORBIDS it, and one skill text ships to
 * every adopter: without the exemption no single text can satisfy both profiles.
 */
const STRICT_DEFAULT_MARKER = "strict default";
const NATIVE_PROFILE_MARKER = "native profile";

function isProfileFallbackSentence(line) {
  const lower = line.toLowerCase();
  return lower.includes(STRICT_DEFAULT_MARKER) && lower.includes(NATIVE_PROFILE_MARKER);
}

/** True when `literal` appears on at least one line that is NOT a profile-qualified fallback sentence. */
function hasUnqualifiedOccurrence(content, literal) {
  return content
    .split(/\r?\n/)
    .some((line) => line.includes(literal) && !isProfileFallbackSentence(line));
}

const STALE_PERFORMANCE_SKIP_TERMS = [
  "PERFORMANCE EXCEPTION routes",
  "where those steps are intentionally skipped",
  "PERFORMANCE EXCEPTION — NO INTEGRATION TESTS",
  "PERFORMANCE EXCEPTION: If this refactor is performance-driven",
  "skip spec-tests",
  "skip /spec [mode=tests]",
  "skip spec [mode=tests]",
  "Do NOT run `/spec-tests`",
  "Do NOT run spec-tests",
  "Do NOT run `/spec [mode=tests]`",
  "Do NOT run spec [mode=tests]",
  "Performance exception skips",
  "except documented performance-exception routes",
];

const SPEC_TESTS_SKIP_PATTERN = /skip\s+`?\/?(?:spec-tests|spec\s+\[\s*mode\s*=\s*tests\s*\])`?/i;

const STALE_TC_PLACEHOLDER_TERMS = [
  "TC-{FEAT}-{NNN}",
  "TC-{FEAT}-",
  "TC-{FEAT}",
];

const STALE_TC_EVIDENCE_FORMAT_TERMS = [
  "**Evidence:** `{FilePath}:{LineRange}`",
  "**Evidence:** `{FilePath}:{LineNumber}`",
  "Evidence: {file}:{line}",
  "Evidence field with file:line format",
];

// `{SPEC_ROOT}` resolves from config; `{Module}` is an authoring placeholder the token
// resolver deliberately leaves untouched.
const STALE_QA_DASHBOARD_PATH_TERMS = [
  "{SPEC_ROOT}/{Module}",
];

const UNCONFIGURED_ARTIFACT_ROOT_TERMS = [
  "{configured-idea-artifact-root}",
  "{configured-task-artifact-root}",
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
  "CLAUDE.md",
  "AGENTS.md",
  "{REF_DOCS_ROOT}",
];

/**
 * The stale-term list resolved against the live config, each entry tagged with the
 * family it came from so the metric counters stay accurate after resolution (the
 * raw term `{SPEC_ROOT}/{Module}` no longer equals the scanned term `docs/specs/{Module}`).
 */
function buildStaleTextScanTerms(config) {
  const families = [
    ["placeholder", STALE_TC_PLACEHOLDER_TERMS],
    ["evidenceFormat", STALE_TC_EVIDENCE_FORMAT_TERMS],
    ["qaDashboardPath", STALE_QA_DASHBOARD_PATH_TERMS],
    ["unconfiguredArtifactRoot", UNCONFIGURED_ARTIFACT_ROOT_TERMS],
  ];
  return families.flatMap(([kind, terms]) =>
    terms.map((term) => ({ kind, term: resolveTokens(term, config) }))
  );
}

const TEXT_FILE_EXTENSIONS = new Set([".cjs", ".js", ".json", ".md", ".mjs", ".ts", ".tsx", ".txt"]);
// Token form; `resolveSdd022Scope` below turns these into the live paths. The exported
// constants keep their resolved-with-defaults shape so the pure helpers stay callable
// with no config in hand.
const SDD022_SCAN_ROOT_TOKENS = ["{SPEC_ROOT}/"];
const SDD022_EXEMPT_FILE_TOKENS = [
  // The guide documents the tech-free authoring rules and necessarily quotes framework/product
  // names + `src/` paths as teaching examples; it describes the rules, not a product.
  "{SPEC_ROOT}/DOCUMENTATION-GUIDE.md",
];
const SDD022_SCAN_ROOTS = SDD022_SCAN_ROOT_TOKENS.map(resolveTokensToDefaults);
const SDD022_EXEMPT_FILES = new Set(SDD022_EXEMPT_FILE_TOKENS.map(resolveTokensToDefaults));

/** Resolve the SDD022 scan scope against the live config. */
function resolveSdd022Scope(config) {
  const profile = resolveProjectSpecArtifactProfile(config);
  const m1ExemptRoot = config?.specRoots?.technical?.m1Policy === "exempt"
    ? resolveTokens("{SPEC_ROOT_TECHNICAL}", config)
    : null;
  return {
    scanRoots: SDD022_SCAN_ROOT_TOKENS.map((root) => resolveTokens(root, config)),
    exemptFiles: new Set(SDD022_EXEMPT_FILE_TOKENS.map((file) => resolveTokens(file, config))),
    m1ExemptRoots: m1ExemptRoot ? [normalizeDirectoryRoot(m1ExemptRoot)] : [],
    profile,
  };
}
// Per-bucket reimplementation guides (`{Bucket}.reimplementation-guide.md`) are the ONE derived
// artifact allowed to name a stack — regenerated by /spec [mode=index] as rebuild instructions, not
// stakeholder prose. Exempt by suffix since their names vary per bucket.
const SDD022_EXEMPT_SUFFIXES = [".reimplementation-guide.md"];
const BANNED_PROSE_TECH_TERMS = [
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

// --- SDD023: M3 abstract-anchor evidence model ---------------------------------
// Post-migration, `[Source: ...]` carriers MUST use stack-portable abstract anchors
// `namespace/service/id` instead of physical `file:line` references. SDD023 flags
// carriers that still hold physical evidence (legacy, not yet migrated) or that use a
// malformed/unknown-namespace anchor. WARN by default (mixed corpus is the designed
// transition state); ERROR on changed files under --enforce-changed.
const ABSTRACT_ANCHOR_NAMESPACES = new Set([
  "component",
  "operation",
  "requirement",
  "rule",
  "event",
  "schema",
  "constraint",
  "test",
]);
// One well-formed anchor part: `namespace/service/id`. service+id are slug-ish tokens.
const ABSTRACT_ANCHOR_PART_PATTERN = /^[a-z]+\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
// Body still holds a physical source reference (filename with code extension or a src/ path).
const PHYSICAL_EVIDENCE_HINT_PATTERN = /\.(?:cs|ts|tsx|cshtml|razor|scss|html)\b|(?:^|[\s,(])src\//i;
// Carriers exempt from SDD023: doc-to-doc cross references and literal format placeholders.
// `file:line`/`path:line` are the legacy-format placeholder tokens; `namespace/service/id` is
// the canonical abstract-anchor placeholder (the literal teaching token used in MIGRATION.md,
// spec-principles, and every emitting skill) — both are instructional placeholders, never real
// anchors, so neither should be flagged when a doc header shows the citation format.
const EVIDENCE_BODY_IGNORE_PATTERN =
  /^(?:docs|specs)\/|(?:^|\s)(?:docs|specs)\/|\bfile:line\b|\bpath:line\b|\bgraph trace\b|\bnamespace\/service\/id\b/i;

// --- SDD024: M2 no source code in prose ----------------------------------------
// Prose (narrative outside evidence carriers) MUST NOT name source identifiers. SDD024
// detects code-suffixed class names, source filenames, and src/ paths leaking into prose.
// Tight patterns only (distinct code shapes) to avoid false-positives on business words.
const CODE_IDENTIFIER_SUFFIXES = [
  "CommandHandler",
  "QueryHandler",
  "CommandResult",
  "Controller",
  "Consumer",
  "Repository",
  "AppService",
  "BackgroundJobExecutor",
  "BackgroundJob",
  "DbContext",
  "EventBusMessage",
  "BusMessageConsumer",
  "ValueObject",
  "EntityDto",
];
const CODE_IDENTIFIER_PATTERN = new RegExp(
  `(^|[^A-Za-z0-9_])([A-Z][A-Za-z0-9]*(?:${CODE_IDENTIFIER_SUFFIXES.join("|")}))(?=$|[^A-Za-z0-9_])`,
  "g"
);
const SOURCE_FILENAME_PATTERN =
  /(^|[^A-Za-z0-9_./])([A-Z][A-Za-z0-9]*\.(?:cs|ts|tsx|cshtml|razor))(?=$|[^A-Za-z0-9_])/g;
const SOURCE_PATH_PATTERN = /(^|[\s(])(src\/[A-Za-z0-9_./-]+)/g;
const SOURCE_CARRIER_PATTERN = /\[Source:\s*([^\]]+?)\s*\]/g;

// The docs use a broader evidence-carrier vocabulary than the original `[Source:]` bracket
// form: bold-label fields like `**Source:**`, `**Handler:**`, `**Consumer:**`, `**Event:**`
// hold source identifiers structurally. These are carriers, not narrative — lines bearing
// them are exempt from the M1/M2 prose scans (the identifier is quarantined in a field),
// the same way `**Evidence**`/`**IntegrationTest**` already are. — why: policing structured
// evidence fields as prose floods M2 with carrier noise and hides the true narrative leaks.
const EVIDENCE_CARRIER_LABELS = [
  "Evidence",
  // Canonical test-coverage carrier. `IntegrationTest` below is its legacy alias —
  // both must stay exempt: templates emit `CoveredBy`, existing specs may still
  // carry the old label, and exempting only one would flag identical content
  // differently depending on which name it happens to use.
  "CoveredBy",
  "IntegrationTest",
  "Integration Test",
  "Source",
  "Sources",
  "Handler",
  "Consumer",
  "Producer",
  "Publisher",
  "Event",
  "Subscriber",
  "Endpoint",
  "Trigger",
  "Payload",
  "Emits",
  "Publishes",
  "Test",
  "Tests",
];
const EVIDENCE_CARRIER_LABEL_PATTERN = new RegExp(
  `\\*\\*(?:${EVIDENCE_CARRIER_LABELS.map(escapeRegExp).join("|")}):?\\*\\*`
);
// Bold-label carriers that hold a backtick-quoted physical reference, e.g.
// `**Source:** ` + "`Foo.cs:84-94`". SDD023 scans these alongside the bracket form so
// un-migrated physical evidence in EITHER carrier syntax is detected.
const BOLD_LABEL_SOURCE_CARRIER_PATTERN =
  /\*\*(?:Source|Sources|Handler|Consumer|Producer|Publisher|Event|Subscriber|Endpoint):?\*\*[^\n`]*`([^`]+)`/g;

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

// --- ROADMAP-BOUNDARY: embedded large-idea protocol -------------------------
// This is deliberately a pure, data-in/data-out policy so the same contract can
// be exercised against canonical prompt surfaces, generated mirrors, and temporary
// mutation fixtures without creating a product roadmap in the repository.
const ROADMAP_BOUNDARY_POLICY = {
  defaultRouteIds: [
    "workflow-big-feature",
    "workflow-feature",
    "workflow-greenfield-init",
    "workflow-planned-work",
  ],
  largeIdeaSignals: [
    "multipleIndependentOutcomes",
    "ambiguousOrResearchHeavy",
    "releaseScopeDecomposition",
    "oversizedTaskThatMustSplit",
  ],
  decompositionFields: [
    "outcome_slices",
    "dependencies_order",
    "non_goals",
    "risks_evidence",
    "deferred_work_owner",
  ],
  failureCodes: {
    defaultWriter: "ROADMAP-DEFAULT-WRITER",
    decompositionSchema: "ROADMAP-DECOMPOSITION-SCHEMA",
    explicitRoute: "ROADMAP-EXPLICIT-ROUTE",
    replacement: "ROADMAP-REPLACEMENT-MISSING",
    surfaceCoverage: "ROADMAP-SURFACE-COVERAGE",
  },
  checks: {
    noDefaultWriter: true,
    replacementPresence: true,
    explicitRequestOnly: true,
  },
};

const ROADMAP_SEQUENCE_PATTERN = /(?:^|\n)[ \t]*(?:["']product-roadmap["']|product-roadmap)[ \t]*(?:,|\n|$)/i;
const ROADMAP_NEGATION_PATTERN =
  /\b(?:do not|does not|never|must not|cannot|can't|without)\b/i;

/**
 * Build the roadmap-document patterns from a RESOLVED path.
 *
 * `product-roadmap` bare is the SKILL id and stays literal; only the document path is
 * relocatable. The resolved value is regex-escaped, so a configured path carrying
 * metacharacters (`docs/road+map.md`) is matched literally instead of silently becoming
 * a pattern that matches the wrong documents — or none at all.
 */
function buildRoadmapPatterns(roadmapDoc) {
  const escaped = escapeRegExp(roadmapDoc);
  return {
    pathPattern: new RegExp(escaped, "i"),
    writerPattern: new RegExp(
      `(?:\\b(?:run|invoke|execute|call)\\s+[\`$/]?product-roadmap\\b|\\b(?:create|write|update|generate)\\s+(?:['\`]?${escaped}|a product roadmap))`,
      "gi"
    ),
  };
}

const DEFAULT_ROADMAP_PATTERNS = buildRoadmapPatterns(PORTABILITY_TOKEN_DEFAULTS.PRODUCT_ROADMAP_DOC);
const ROADMAP_POSITIVE_WRITER_PATTERN = DEFAULT_ROADMAP_PATTERNS.writerPattern;
const ROADMAP_PATH_PATTERN = DEFAULT_ROADMAP_PATTERNS.pathPattern;

function hasRoadmapWriter(text = "", writerPattern = ROADMAP_POSITIVE_WRITER_PATTERN) {
  if (ROADMAP_SEQUENCE_PATTERN.test(text)) return true;
  return [...text.matchAll(writerPattern)].some((match) => {
    const statementStart = Math.max(
      text.lastIndexOf("\n", match.index),
      text.lastIndexOf(".", match.index),
      text.lastIndexOf("!", match.index),
      text.lastIndexOf("?", match.index),
      text.lastIndexOf(";", match.index)
    );
    return !ROADMAP_NEGATION_PATTERN.test(text.slice(statementStart + 1, match.index));
  });
}

const DECOMPOSITION_FIELD_KEYS = Object.freeze({
  outcome_slices: ["id", "outcome", "releasable_when", "owning_artifact"],
  dependencies_order: ["before", "after", "reason"],
  non_goals: ["statement", "owner"],
  risks_evidence: ["risk", "evidence_needed", "status", "owner"],
  deferred_work_owner: ["item", "owner", "follow_up_artifact", "target_slice"],
});

function isNonEmptyDecompositionField(value, field, decomposition) {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) {
    return Boolean(
      field !== "outcome_slices" &&
        decomposition?.none_identified === true &&
        typeof decomposition?.none_identified_note === "string" &&
        decomposition.none_identified_note.trim().length > 0
    );
  }
  const requiredKeys = DECOMPOSITION_FIELD_KEYS[field] ?? [];
  return value.every((item) =>
    item &&
    typeof item === "object" &&
    !Array.isArray(item) &&
    requiredKeys.every((key) => typeof item[key] === "string" && item[key].trim().length > 0)
  );
}

function evaluateRoadmapBoundary(surface = {}, policy = ROADMAP_BOUNDARY_POLICY) {
  const failures = [];
  // The roadmap document is relocatable (`docsRoots.productRoadmap.path`); the caller
  // supplies the resolved patterns, and an unconfigured caller gets the defaults.
  const roadmapPathPattern = policy.roadmapPathPattern ?? ROADMAP_PATH_PATTERN;
  const roadmapWriterPattern = policy.roadmapWriterPattern ?? ROADMAP_POSITIVE_WRITER_PATTERN;
  const routes = Array.isArray(surface.routes) ? surface.routes : [];
  const routeById = new Map(routes.map((route) => [route.routeId, route]));
  const failure = (code, message, routeId = undefined) => {
    failures.push({ code, message, ...(routeId ? { routeId } : {}) });
  };

  for (const message of surface.coverageFailures ?? []) {
    failure(policy.failureCodes.surfaceCoverage, message);
  }

  if (policy.checks?.noDefaultWriter) {
    for (const routeId of policy.defaultRouteIds ?? []) {
      const route = routeById.get(routeId);
      if (!route) continue;
      const sequenceText = Array.isArray(route.sequence) ? route.sequence.join("\n") : "";
      const routeText = `${sequenceText}\n${route.text ?? ""}`;
      if (hasRoadmapWriter(routeText, roadmapWriterPattern)) {
        failure(
          policy.failureCodes.defaultWriter,
          `default route ${routeId} contains a product-roadmap writer or writer sequence`,
          routeId
        );
      }
    }
  }

  if (policy.checks?.replacementPresence) {
    for (const routeId of policy.defaultRouteIds ?? []) {
      const route = routeById.get(routeId);
      if (!route) continue;
      const routeText = `${route.text ?? ""}\n${
        Array.isArray(route.sequence) ? route.sequence.join("\n") : ""
      }`;
      if (!routeText.includes("isLargeIdea") || !routeText.includes("large_idea_decomposition")) {
        failure(
          policy.failureCodes.replacement,
          `default route ${routeId} is missing the embedded large-idea replacement contract`,
          routeId
        );
      }
    }
  }

  if (surface.signals) {
    const signalNames = policy.largeIdeaSignals ?? [];
    const missingSignals = signalNames.filter((name) => typeof surface.signals[name] !== "boolean");
    if (missingSignals.length > 0) {
      failure(
        policy.failureCodes.decompositionSchema,
        `large-idea signal set is incomplete: ${missingSignals.join(", ")}`
      );
    } else {
      const isLargeIdea = signalNames.some((name) => surface.signals[name] === true);
      const decompositionPresent = surface.decomposition !== undefined && surface.decomposition !== null;
      if (isLargeIdea) {
        if (!decompositionPresent || typeof surface.decomposition !== "object") {
          failure(
            policy.failureCodes.decompositionSchema,
            "large_idea_decomposition is required when any authoritative signal is true"
          );
        } else {
          const requiredFields = [
            ...new Set([
              ...(policy.decompositionFields ?? []),
              ...Object.keys(DECOMPOSITION_FIELD_KEYS),
            ]),
          ];
          const missingFields = requiredFields.filter(
            (field) => !isNonEmptyDecompositionField(surface.decomposition[field], field, surface.decomposition)
          );
          if (missingFields.length > 0) {
            failure(
              policy.failureCodes.decompositionSchema,
              `large_idea_decomposition is missing required fields: ${missingFields.join(", ")}`
            );
          }
        }
      } else if (decompositionPresent || surface.roadmapMetadata) {
        failure(
          policy.failureCodes.decompositionSchema,
          "ordinary all-false scope must omit large_idea_decomposition and roadmap metadata"
        );
      }
    }
  }

  const standalone = surface.standalone;
  if (standalone) {
    const standaloneText = `${standalone.text ?? ""}\n${standalone.sequence ?? ""}`;
    const writerTextPresent =
      hasRoadmapWriter(standaloneText, roadmapWriterPattern) || roadmapPathPattern.test(standaloneText);
    if (policy.checks?.explicitRequestOnly && writerTextPresent && standalone.explicitRequest !== true) {
      failure(
        policy.failureCodes.explicitRoute,
        "standalone product-roadmap writer must be guarded by an explicit request"
      );
    }
    if (standalone.explicitRequest === true &&
        (!standaloneText.includes("explicit") || !roadmapPathPattern.test(standaloneText))) {
      failure(
        policy.failureCodes.explicitRoute,
        "standalone product-roadmap route must retain explicit-only wording and its canonical writer path"
      );
    }
  }

  return failures;
}

/**
 * SDD007's default-profile literal. It is REQUIRED by the strict-default branch, FORBIDDEN
 * by the native-profile branch, and — inside a profile-qualified fallback sentence — the
 * legal way for one shared skill text to name the default and its override. All three
 * sites read this constant so they can never drift apart.
 */
const DEFAULT_TC_REGISTRY_LITERAL = "Section 8 is the canonical TC registry";

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
    file: ".claude/skills/workflow-planned-work/references/mode-idea-to-tasks.md",
    requireAll: [
      "Feature doc Section 8",
      "TC IDs",
      "docs-manager --mode=update",
      "{TEAM_ARTIFACTS_ROOT}/initiatives",
      "{TEAM_ARTIFACTS_ROOT}/tasks",
      "tmp/reports/docs-update",
    ],
    forbidAny: UNCONFIGURED_ARTIFACT_ROOT_TERMS,
    message: "Planned-work idea-to-tasks mode must route task artifacts to canonical TC/spec sync.",
  },
  {
    code: "SDD004",
    file: ".claude/skills/docs-manager/references/mode-update.md",
    requireAll: ["configured task/initiative artifact roots", "detection/delegation", "docs/project-config.json"],
    forbidAny: [
      "Generate TCs from task",
      "{TEAM_ARTIFACTS_ROOT}/tasks",
      "{TEAM_ARTIFACTS_ROOT}/initiatives",
      ...PROJECT_LAYOUT_TERMS,
    ],
    message: "docs-manager --mode=update must route task/initiative artifacts without owning TC generation.",
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
    file: ".claude/skills/spec/references/sync.md",
    requireAll: ["emergency recovery", "recovery report", "from-integration-tests"],
    requireAny: ["AskUserQuestion", "direct user question", "ask the user directly", "ask user tool", "ask user question tool"],
    forbidAny: PROJECT_LAYOUT_TERMS,
    message: "Reverse sync must be explicit emergency recovery with user confirmation.",
  },
  {
    code: "SDD007",
    file: ".claude/skills/spec/SKILL.md",
    requireAll: [DEFAULT_TC_REGISTRY_LITERAL, "mode owns generation", "MUST NOT be overwritten during"],
    forbidAny: ["Section 8 owned exclusively by", "feature-spec owns Section 8"],
    message: "spec skill must declare Section 8 as the canonical TC registry owned by tests mode and never overwritten during update.",
  },
  {
    code: "SDD008",
    file: ".claude/skills/workflow-feature/SKILL.md",
    requireAll: ["performance-review", "SLA", "functional no-regression"],
    forbidPattern: SPEC_TESTS_SKIP_PATTERN,
    message: "Feature performance route must preserve performance SDD and functional regression checks.",
  },
  {
    code: "SDD008",
    file: ".claude/skills/workflow-bugfix/SKILL.md",
    requireAll: ["performance-review", "SLA", "functional no-regression"],
    forbidPattern: SPEC_TESTS_SKIP_PATTERN,
    message: "Bugfix performance route must preserve performance SDD and functional regression checks.",
  },
  {
    code: "SDD009",
    file: ".claude/skills/shared/sdd-artifact-contract.md",
    requireAny: ["docs/project-config.json", "{REF_DOCS_ROOT}"],
    forbidProjectResidue: true,
    message: "Generic SDD contract must route customization through project config/reference docs.",
  },
  {
    code: "SDD010",
    file: ".claude/hooks/session-init-docs.cjs",
    requireAll: ["docs/project-config.json", "{REF_DOCS_ROOT}"],
    forbidProjectResidue: true,
    message: "Session init hook must initialize project config/docs rather than embedding local project rules.",
  },
  {
    code: "SDD011",
    file: ".claude/workflows.json",
    requireAll: ["PERFORMANCE-SDD ROUTE", "performance-review", "SLA", "functional no-regression"],
    forbidAny: STALE_PERFORMANCE_SKIP_TERMS,
    message: "Workflow injected contexts must not preserve stale performance exception skip language.",
  },
  {
    code: "SDD013",
    file: ".claude/skills/workflow-refactor/SKILL.md",
    requireAll: ["PERFORMANCE-SDD ROUTE", "performance-review", "observable behavior", "docs/spec"],
    forbidAny: STALE_PERFORMANCE_SKIP_TERMS,
    message: "Refactor workflow must route performance work without bypassing spec/doc sync gates.",
  },
  {
    // AGENTS.md is the project-information projection of CLAUDE.md. The SDD artifact contract is a shared
    // protocol that skills reference and hooks deliver, so the root carries none of it: it may only not
    // regress into stale performance-skip language or the Claude-only contract path.
    code: "SDD014",
    file: "AGENTS.md",
    forbidAny: [...STALE_PERFORMANCE_SKIP_TERMS, LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE],
    message: "AGENTS.md mirror must not carry stale performance-skip language or the Claude source SDD contract path.",
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
    file: ".agents/skills/workflow-planned-work/references/mode-idea-to-tasks.md",
    requireAll: [
      "Feature doc Section 8",
      "TC IDs",
      "docs-manager --mode=update",
      "{TEAM_ARTIFACTS_ROOT}/initiatives",
      "{TEAM_ARTIFACTS_ROOT}/tasks",
      "tmp/reports/docs-update",
    ],
    forbidAny: [LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE, ...UNCONFIGURED_ARTIFACT_ROOT_TERMS],
    message: "Codex planned-work idea-to-tasks mode must preserve SDD gates without pointing at the Claude source path.",
  },
  {
    code: "SDD016",
    file: ".agents/skills/docs-manager/references/mode-update.md",
    requireAll: ["configured task/initiative artifact roots", "detection/delegation", "docs/project-config.json"],
    forbidAny: [
      "Generate TCs from task",
      "{TEAM_ARTIFACTS_ROOT}/tasks",
      "{TEAM_ARTIFACTS_ROOT}/initiatives",
      ...PROJECT_LAYOUT_TERMS,
    ],
    message: "Codex docs-manager --mode=update mirror must remain project-portable and route task/initiative artifacts correctly.",
  },
  {
    code: "SDD016",
    file: ".agents/skills/spec/references/sync.md",
    requireAll: ["emergency recovery", "recovery report", "from-integration-tests"],
    requireAny: ["AskUserQuestion", "direct user question", "ask the user directly", "ask user tool", "ask user question tool"],
    forbidAny: PROJECT_LAYOUT_TERMS,
    message: "Codex spec sync mirror must remain project-portable and require explicit reverse-sync recovery.",
  },
  {
    code: "SDD017",
    file: ".claude/skills/spec/references/spec-tests-template.md",
    requireAll: ["configured-source-path", "configured-test-path"],
    forbidAny: PROJECT_LAYOUT_TERMS,
    message: "TDD spec reference template must use project-configurable source and test paths.",
  },
  {
    code: "SDD017",
    file: ".agents/skills/spec/references/spec-tests-template.md",
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
    forbidProjectResidue: true,
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
    forbidProjectResidue: true,
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
    forbidProjectResidue: true,
    forbidAny: [LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE],
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
    forbidProjectResidue: true,
    forbidAny: [LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE],
    message: "Codex generated shared sync inline versions must preserve the portable AI-SDD marker.",
  },
  {
    code: "SDD019",
    file: "{REF_DOCS_ROOT}/spec-principles.md",
    requiresProjectProfile: true,
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
    file: "{REF_DOCS_ROOT}/workflow-spec-test-code-cycle-reference.md",
    requiresProjectProfile: true,
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

/**
 * Is a REQUIRED term satisfied by `content`?
 *
 * A plain term is a plain substring test — unchanged. A relocatable-root term (one that
 * carried a portability token, so `check.rootTerms` maps it to its DEFAULT literal) is
 * ALSO satisfied by a form-(b) default-plus-override sentence naming that default: prose
 * is framework source shared by every adopter, so a relocated project's SKILL.md still
 * states the contract correctly by naming the default and where the override lives.
 */
function isRequiredTermPresent(content, term, rootTerms) {
  if (content.includes(term)) return true;
  const defaultLiteral = rootTerms?.get(term);
  return Boolean(defaultLiteral && hasFormBOverrideFor(content, defaultLiteral));
}

/**
 * Is a FORBIDDEN term present as a violation?
 *
 * Plain terms (PROJECT_LAYOUT_TERMS, stale-language terms, residue terms) keep the plain
 * bare-string check with NO sentence exemption — they are project-residue markers, never
 * relocatable roots, and no form-(b) sentence will ever legitimately contain one.
 *
 * A relocatable-root term is a violation only on a BARE line. Both the resolved root and
 * the documented default count as bare hardcoding; an occurrence inside a form-(b)
 * sentence is the legal idiom and clears (plan review F-13).
 *
 * A fallback term (SDD007's default-profile literal) is a violation only when UNQUALIFIED:
 * it clears inside a profile-qualified fallback sentence naming both sides, because the
 * same skill text is REQUIRED in one profile and FORBIDDEN in the other.
 */
function findForbiddenTermViolation(content, term, rootTerms, fallbackTerms = new Set()) {
  if (fallbackTerms.has(term)) return hasUnqualifiedOccurrence(content, term) ? term : null;
  if (!rootTerms?.has(term)) return content.includes(term) ? term : null;
  const defaultLiteral = rootTerms.get(term);
  for (const literal of new Set([term, defaultLiteral])) {
    if (hasBareOccurrence(content, literal)) return literal;
  }
  return null;
}

function evaluateCheck(check, content) {
  const failures = [];
  const rootTerms = check.rootTerms;
  const fallbackTerms = new Set(check.fallbackTerms ?? []);

  if (check.requireAll) {
    const missing = check.requireAll.filter((term) => !isRequiredTermPresent(content, term, rootTerms));
    if (missing.length > 0) {
      failures.push(`missing required text: ${missing.join(", ")}`);
    }
  }

  if (check.requireAny && !check.requireAny.some((term) => isRequiredTermPresent(content, term, rootTerms))) {
    failures.push(`missing one of required text: ${check.requireAny.join(" | ")}`);
  }

  if (check.forbidAny) {
    const found = check.forbidAny
      .map((term) => findForbiddenTermViolation(content, term, rootTerms, fallbackTerms))
      .filter(Boolean);
    if (found.length > 0) {
      failures.push(`forbidden text found: ${[...new Set(found)].join(", ")}`);
    }
  }

  if (check.forbidPattern && check.forbidPattern.test(content)) {
    failures.push(`forbidden pattern found: ${check.forbidPattern}`);
  }

  return failures;
}

/**
 * Parse verifier config from the requested root (or the staged index copy).
 * An absent optional config keeps portable defaults; an unreadable or malformed declaration
 * fails before semantic checks so a broken path/profile cannot shrink the verified scope.
 */
async function loadProjectConfigObject(rootDir, options = {}) {
  let configText;
  if (options.staged) {
    // Preserve the verifier's staged-source contract: do not fall through to worktree bytes.
    configText = await readGitIndexFileOrNull(rootDir, PROJECT_CONFIG_PATH);
  } else {
    try {
      configText = await fs.readFile(path.join(rootDir, PROJECT_CONFIG_PATH), "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return {};
      throw verifierConfigError(
        `Cannot read ${path.resolve(rootDir, PROJECT_CONFIG_PATH)} for SDD verification: ${error?.message ?? String(error)}`,
        error
      );
    }
  }
  if (configText === null) return {};

  let parsed;
  try {
    parsed = JSON.parse(configText);
  } catch (error) {
    throw verifierConfigError(
      `Invalid JSON in ${path.resolve(rootDir, PROJECT_CONFIG_PATH)} for SDD verification: ${error?.message ?? String(error)}`,
      error
    );
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw verifierConfigError(
      `Invalid ${path.resolve(rootDir, PROJECT_CONFIG_PATH)} for SDD verification: expected a JSON object.`
    );
  }
  resolveProjectSpecArtifactProfile(parsed);
  return parsed;
}

async function loadProjectResidueTerms(rootDir, options = {}) {
  const configText = await readFileOrNull(rootDir, PROJECT_CONFIG_PATH, options);
  if (configText === null) {
    return [];
  }

  try {
    const configured = JSON.parse(configText)?.framework?.projectResidueTerms;
    if (!Array.isArray(configured)) {
      return [];
    }

    return [...new Set(configured.filter((term) => typeof term === "string" && term.trim()).map((term) => term.trim()))];
  } catch {
    return [];
  }
}

/**
 * Expand the portability tokens in one check against `config`.
 *
 * Every term that CARRIED a token is recorded in `rootTerms` as
 * `resolvedTerm -> defaultTerm`, which is what tells `evaluateCheck` that the term names a
 * relocatable root and so is subject to the form-(b) sentence rule in both directions.
 * A check with no tokens is returned untouched, so a zero-config project's check set is
 * byte-identical to the pre-change one (SC-11).
 */
function resolveCheckRoots(check, config) {
  const rootTerms = new Map();
  const mapTerms = (terms) =>
    terms?.map((term) => {
      if (typeof term !== "string" || !term.includes("{")) return term;
      const resolved = resolveTokens(term, config);
      if (resolved === term) return term;
      rootTerms.set(resolved, resolveTokensToDefaults(term));
      return resolved;
    });

  const resolved = { ...check, file: resolveTokens(check.file, config) };
  if (check.requireAll) resolved.requireAll = mapTerms(check.requireAll);
  if (check.requireAny) resolved.requireAny = mapTerms(check.requireAny);
  if (check.forbidAny) resolved.forbidAny = mapTerms(check.forbidAny);
  if (rootTerms.size > 0) resolved.rootTerms = rootTerms;
  return rootTerms.size > 0 || resolved.file !== check.file ? resolved : check;
}

async function resolveChecks(rootDir, checks, options = {}) {
  const config = await loadProjectConfigObject(rootDir, options);
  const projectResidueTerms = await loadProjectResidueTerms(rootDir, options);
  const profile = resolveProjectSpecArtifactProfile(config);

  return checks.map((check) => {
    let resolved = resolveCheckRoots(check, config);
    if (check.code === "SDD007" && profile) {
      resolved = {
        ...resolved,
        requireAll: ["specArtifacts", "intent", "contracts", "evidence"],
        forbidAny: [
          ...(check.forbidAny ?? []),
          DEFAULT_TC_REGISTRY_LITERAL,
        ],
        fallbackTerms: [DEFAULT_TC_REGISTRY_LITERAL],
        message:
          "spec skill must follow the configured engineering artifact section roles instead of assuming the default Section 8 TC registry.",
      };
    }
    if (!check.forbidProjectResidue || projectResidueTerms.length === 0) {
      return resolved;
    }

    return {
      ...resolved,
      // Residue terms are appended AFTER resolution and are never registered in
      // `rootTerms`, so they keep the plain bare-string check with no sentence exemption.
      forbidAny: [...new Set([...(resolved.forbidAny ?? []), ...projectResidueTerms])],
    };
  });
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

function isSdd022TargetFile(relativeFile, scope = {}) {
  const scanRoots = scope.scanRoots ?? SDD022_SCAN_ROOTS;
  const exemptFiles = scope.exemptFiles ?? SDD022_EXEMPT_FILES;
  const normalized = normalizeRelativeFile(relativeFile);
  return (
    normalized.endsWith(".md") &&
    !exemptFiles.has(normalized) &&
    !SDD022_EXEMPT_SUFFIXES.some((suffix) => normalized.endsWith(suffix)) &&
    scanRoots.some((root) => normalized.startsWith(root))
  );
}

function isSdd022M1ExemptFile(relativeFile, scope = {}) {
  const normalized = normalizeRelativeFile(relativeFile);
  // m1Policy exempts only the M1 tech-agnostic prose rule. These files stay in the shared
  // candidate set so SDD023 evidence and SDD024 source-identifier coverage still run.
  return (scope.m1ExemptRoots ?? []).some((root) => normalized.startsWith(root));
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
    // Tolerate both carrier label forms: `**Evidence**:` (colon outside the bold,
    // canonical template) and `**Evidence:**` (colon inside the bold, the dominant
    // form across docs). Same for the full evidence-carrier label set. Matching only
    // the template form false-flagged thousands of genuine evidence carriers as prose.
    // — why: carrier labels are structural fields, never narrative, so widening is leak-safe.
    EVIDENCE_CARRIER_LABEL_PATTERN.test(line) ||
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

async function resolveSdd022ScanFiles(rootDir, options = {}, scope = {}) {
  if (Array.isArray(options.sdd022Files)) {
    return [...new Set(options.sdd022Files.map(normalizeRelativeFile))].filter((file) =>
      isSdd022TargetFile(file, scope)
    );
  }

  const found = [];
  for (const root of scope.scanRoots ?? SDD022_SCAN_ROOTS) {
    for await (const relativeFile of walkTextFiles(rootDir, root)) {
      const normalized = normalizeRelativeFile(relativeFile);
      if (isSdd022TargetFile(normalized, scope)) {
        found.push(normalized);
      }
    }
  }

  return [...new Set(found)];
}

/**
 * ANTI-R6 GUARD — the reason this phase exists.
 *
 * A probe that asserts a root's CONTENT is only meaningful if it examined candidate files.
 * When a project RELOCATES a root and a probe still walks the old path, the walk yields
 * nothing, every "this must be absent" predicate holds vacuously, and the stage reports
 * PASS while checking nothing. A build gate that stops gating is worse than no gate, so a
 * root the project DECLARED that matches zero candidates is a hard failure.
 *
 * Scoped to DECLARED roots on purpose: a zero-config project that simply has no
 * `docs/specs/` tree behaves exactly as before (SC-11), and a copied framework with no
 * project profile is not forced to invent one. Declaring a root is the act that promises
 * content lives there.
 *
 * Copied from the proven shape at `generate-tech-specs.mjs:87-90`, which throws rather than
 * defaulting when its configured root is absent.
 */
function findDeclaredRootCoverageFailures(probes) {
  const failures = [];
  for (const probe of probes) {
    if (!probe.declared || probe.candidateCount > 0) continue;
    failures.push({
      severity: "error",
      code: "SDD025",
      file: probe.resolvedRoot,
      message:
        `resolved root \`${probe.resolvedRoot}\` (${probe.configKey}) matched zero files — ` +
        "verifier would report a false green. Point the config key at the real root, or remove the key.",
    });
  }
  return failures;
}

/** Is a dotted config key actually DECLARED (non-blank string) in the parsed config? */
function isRootDeclared(config, dottedKey) {
  let node = config;
  for (const key of dottedKey.split(".")) {
    if (!node || typeof node !== "object") return false;
    node = node[key];
  }
  return typeof node === "string" && node.trim() !== "";
}

/** Count the text files a resolved root directory actually yields. */
async function countCandidateFiles(rootDir, resolvedRoot) {
  let count = 0;
  for await (const _relativeFile of walkTextFiles(rootDir, resolvedRoot)) {
    count += 1;
  }
  return count;
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

function createSectionRoleLookup(profile) {
  if (!profile) return null;
  const lookup = new Map();
  for (const [role, aliases] of Object.entries(profile.sections)) {
    for (const alias of aliases) lookup.set(sectionHeadingIdentity(alias), role);
  }
  return lookup;
}

function updateSectionRoleFromHeading(line, lineNumber, lookup, state, findings) {
  const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line.trim());
  if (!match) return false;

  const level = match[1].length;
  const title = match[2].replace(/\s+#+\s*$/, "").replace(/\s+/g, " ").trim();
  if (level === 1) {
    state.sectionRole = null;
    state.sectionLevel = 1;
    return true;
  }

  const role = lookup.get(sectionHeadingIdentity(title));
  if (role) {
    state.sectionRole = role;
    state.sectionLevel = level;
  } else if (level === 2) {
    state.sectionRole = "unknown";
    state.sectionLevel = level;
    findings.push({ line: lineNumber, term: title, kind: "unknown-section-role" });
  } else if (state.sectionLevel === null || level < state.sectionLevel) {
    state.sectionRole = "unknown";
    state.sectionLevel = level;
  }
  return true;
}

function scanProseForBannedTokens(content, options = {}) {
  const findings = [];
  const lines = content.split(/\r?\n/);
  const sectionRoleLookup = createSectionRoleLookup(options.profile);
  const state = {
    inFrontmatter: lines[0]?.trim() === "---",
    fenceLang: null,
    allowRegion: false,
    sectionRole: null,
    sectionLevel: null,
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

    if (sectionRoleLookup && updateSectionRoleFromHeading(line, index + 1, sectionRoleLookup, state, findings)) {
      continue;
    }

    if (sectionRoleLookup && ["contracts", "evidence"].includes(state.sectionRole)) {
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

  return scanProseForBannedTokens(content, options);
}

// SDD023: validate one `[Source: ...]` carrier body against the abstract-anchor model.
// Returns null if valid/exempt, else { kind } describing the violation.
function classifyEvidenceBody(body) {
  const trimmed = body.trim();
  if (EVIDENCE_BODY_IGNORE_PATTERN.test(trimmed)) {
    return null; // doc cross-reference or literal placeholder — not a code anchor
  }
  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  const allAbstract =
    parts.length > 0 &&
    parts.every(
      (part) =>
        ABSTRACT_ANCHOR_PART_PATTERN.test(part) &&
        ABSTRACT_ANCHOR_NAMESPACES.has(part.split("/")[0])
    );
  if (allAbstract) {
    return null; // fully migrated, well-formed abstract anchor
  }
  if (PHYSICAL_EVIDENCE_HINT_PATTERN.test(trimmed)) {
    return { kind: "legacy-physical" };
  }
  // Looks like an anchor attempt (has a slash) but is malformed or uses an unknown namespace.
  if (parts.some((part) => part.includes("/") && !ABSTRACT_ANCHOR_PART_PATTERN.test(part))) {
    return { kind: "malformed-anchor" };
  }
  if (parts.some((part) => /^[a-z]+\//.test(part) && !ABSTRACT_ANCHOR_NAMESPACES.has(part.split("/")[0]))) {
    return { kind: "unknown-namespace" };
  }
  return null; // free-text body we do not police (e.g. prose note in a carrier)
}

function scanCarriersForEvidenceModel(content) {
  const findings = [];
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const pattern of [SOURCE_CARRIER_PATTERN, BOLD_LABEL_SOURCE_CARRIER_PATTERN]) {
      pattern.lastIndex = 0;
      for (const match of line.matchAll(pattern)) {
        const verdict = classifyEvidenceBody(match[1]);
        if (verdict) {
          findings.push({ line: index + 1, kind: verdict.kind, body: match[1].trim() });
        }
      }
    }
  }
  return findings;
}

// SDD024: detect source-code identifiers leaking into PROSE (M2). Reuses the same
// fence/frontmatter/carrier state machine as the banned-token scan so evidence carriers,
// mermaid blocks, and allow-regions are exempt — only narrative prose is policed.
function findProseSourceIdentifiers(line) {
  const found = [];
  for (const pattern of [CODE_IDENTIFIER_PATTERN, SOURCE_FILENAME_PATTERN, SOURCE_PATH_PATTERN]) {
    pattern.lastIndex = 0;
    for (const match of line.matchAll(pattern)) {
      found.push(match[2]);
    }
  }
  return [...new Set(found)];
}

function scanProseForSourceIdentifiers(content, options = {}) {
  const findings = [];
  const lines = content.split(/\r?\n/);
  const sectionRoleLookup = createSectionRoleLookup(options.profile);
  const state = {
    inFrontmatter: lines[0]?.trim() === "---",
    fenceLang: null,
    allowRegion: false,
    sectionRole: null,
    sectionLevel: null,
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
    if (sectionRoleLookup && updateSectionRoleFromHeading(line, index + 1, sectionRoleLookup, state, [])) {
      continue;
    }
    if (sectionRoleLookup && state.sectionRole === "contracts") {
      continue;
    }

    for (const term of findProseSourceIdentifiers(line)) {
      findings.push({ line: index + 1, term });
    }
  }

  return findings;
}

async function scanEvidenceModelFile(rootDir, relativeFile, options = {}) {
  const content = await readFileOrNull(rootDir, normalizeRelativeFile(relativeFile), options);
  if (content === null) {
    return { evidenceFindings: [], proseIdentifierFindings: [] };
  }
  return {
    evidenceFindings: scanCarriersForEvidenceModel(content),
    proseIdentifierFindings: scanProseForSourceIdentifiers(content, options),
  };
}

// Every file that states a default route's procedure: a router skill keeps its mode bodies in references,
// and each of them can add a roadmap writer.
const ROADMAP_BOUNDARY_ROUTE_FILES = new Map([
  ["workflow-big-feature", [".claude/skills/workflow-big-feature/SKILL.md"]],
  ["workflow-feature", [".claude/skills/workflow-feature/SKILL.md"]],
  ["workflow-greenfield-init", [".claude/skills/workflow-greenfield-init/SKILL.md"]],
  [
    "workflow-planned-work",
    [
      ".claude/skills/workflow-planned-work/SKILL.md",
      ".claude/skills/workflow-planned-work/references/planned-work-core.md",
      ".claude/skills/workflow-planned-work/references/mode-idea-to-tasks.md",
      ".claude/skills/workflow-planned-work/references/mode-idea-to-spec.md",
      ".claude/skills/workflow-planned-work/references/mode-spec-to-tasks.md",
    ],
  ],
]);

// The steps of every mode a route can run: the base sequence and each variant's own sequence.
function roadmapRouteSequence(workflow) {
  const stepText = (step) => (typeof step === "string" ? step : [step?.skill, step?.args].filter(Boolean).join(" "));
  const sequences = [workflow.sequence, ...Object.values(workflow.variants ?? {}).map((variant) => variant?.sequence)];
  return sequences.filter(Array.isArray).flatMap((sequence) => sequence.map(stepText));
}

async function loadRoadmapBoundarySurface(rootDir, options = {}) {
  const workflowJson = await readFileOrNull(rootDir, ".claude/workflows.json", options);
  const roadmapSkill = await readFileOrNull(rootDir, ".claude/skills/product-roadmap/SKILL.md", options);
  const routeContents = new Map(
    await Promise.all(
      [...ROADMAP_BOUNDARY_ROUTE_FILES.entries()].map(async ([routeId, relativeFiles]) => [
        routeId,
        await Promise.all(relativeFiles.map(async (relativeFile) => [relativeFile, await readFileOrNull(rootDir, relativeFile, options)])),
      ])
    )
  );
  const routePresentCount = [...routeContents.values()].filter((files) => files.every(([, content]) => content !== null)).length;
  const hasBoundaryArtifacts =
    roadmapSkill !== null || routePresentCount >= ROADMAP_BOUNDARY_ROUTE_FILES.size - 1;
  if (!hasBoundaryArtifacts) return null;

  const coverageFailures = [];
  if (workflowJson === null) coverageFailures.push("roadmap boundary surface is missing .claude/workflows.json");
  if (roadmapSkill === null) coverageFailures.push("roadmap boundary surface is missing .claude/skills/product-roadmap/SKILL.md");
  if (workflowJson === null || roadmapSkill === null) {
    return { routes: [], standalone: undefined, coverageFailures };
  }

  let workflows;
  try {
    workflows = JSON.parse(workflowJson).workflows ?? {};
  } catch {
    return {
      routes: [],
      standalone: undefined,
      coverageFailures: ["roadmap boundary surface has invalid JSON in .claude/workflows.json"],
    };
  }

  const routes = [];
  for (const [routeId, relativeFiles] of ROADMAP_BOUNDARY_ROUTE_FILES) {
    const files = routeContents.get(routeId);
    const missing = files.filter(([, content]) => content === null).map(([relativeFile]) => relativeFile);
    if (missing.length) {
      for (const relativeFile of missing) coverageFailures.push(`roadmap boundary surface is missing ${relativeFile}`);
      continue;
    }
    const text = files.map(([, content]) => content).join("\n");
    if (!workflows[routeId]) {
      coverageFailures.push(`roadmap boundary surface is missing workflow route ${routeId} in .claude/workflows.json`);
      continue;
    }
    routes.push({
      routeId,
      sequence: roadmapRouteSequence(workflows[routeId]),
      text: `${text}\n${JSON.stringify(workflows[routeId].preActions ?? {})}`,
      file: relativeFiles[0],
      files: relativeFiles,
    });
  }

  return {
    routes,
    standalone: {
      routeId: "product-roadmap",
      explicitRequest: true,
      text: roadmapSkill,
      file: ".claude/skills/product-roadmap/SKILL.md",
    },
    coverageFailures,
  };
}

async function runChecks(rootDir = process.cwd(), checks = CHECKS, options = {}) {
  const resolvedChecks = await resolveChecks(rootDir, checks, options);
  const projectProfilePresent = (await readFileOrNull(rootDir, PROJECT_CONFIG_PATH, options)) !== null;
  const config = await loadProjectConfigObject(rootDir, options);
  const sdd022Scope = resolveSdd022Scope(config);
  const staleTextScanTargets = STALE_TEXT_SCAN_TARGETS.map((target) => resolveTokens(target, config));
  const staleTextScanTerms = buildStaleTextScanTerms(config);
  const failures = [];
  const metrics = {
    checkedFiles: 0,
    hardFailures: 0,
    warnings: 0,
    contractReferencesMissing: 0,
    unsafeDriftRulesFound: 0,
    taskInitiativeRoutesFound: 0,
    performanceSddRoutesFound: 0,
    projectResidueFindings: 0,
    projectConfigGuidanceFound: 0,
    stalePerformanceSkipFindings: 0,
    staleTcPlaceholderFindings: 0,
    staleTcEvidenceFormatFindings: 0,
    staleQaDashboardPathFindings: 0,
    unconfiguredArtifactRootFindings: 0,
    bannedProseTechTermFindings: 0,
    unknownSectionRoleFindings: 0,
    legacyPhysicalEvidenceFindings: 0,
    malformedAbstractAnchorFindings: 0,
    proseSourceIdentifierFindings: 0,
    roadmapBoundaryFindings: 0,
    declaredRootsProbed: 0,
    emptyDeclaredRootFindings: 0,
  };
  const checkedFiles = new Set();

  for (const check of resolvedChecks) {
    if (check.requiresProjectProfile && !projectProfilePresent) {
      continue;
    }
    const content = await readFileOrNull(rootDir, check.file, options);
    checkedFiles.add(check.file);

    if (content === null) {
      // A PROJECT-OWNED reference doc is produced by `/docs-manager --mode=init` / `/scan`, not shipped inside
      // `.claude`. Hard-failing its absence turned the very first `--verify-only` run of a freshly
      // copied, self-contained framework RED on a document the bundle never claimed to provide —
      // and named no route to create it. Absence is therefore a warning that states the route;
      // the CONTENT contract below stays a hard failure the moment the file exists, so this repo
      // (where both files exist) is graded exactly as before.
      const generatedByProject = check.requiresProjectProfile;
      failures.push({
        severity: generatedByProject ? "warn" : "error",
        code: check.code,
        file: check.file,
        message: generatedByProject
          ? "project-owned reference doc not generated yet — run /docs-manager --mode=init (or /scan --target=<key>) to create it"
          : "file is missing",
      });
      continue;
    }

    if (content.includes(ACTIVE_SDD_CONTRACT_REFERENCE) || content.includes("SDD Artifact Contract")) {
      metrics.contractReferencesMissing += 0;
    } else if (check.code === "SDD001") {
      metrics.contractReferencesMissing += 1;
    }

    if (content.includes("configured task/initiative artifact roots")) {
      metrics.taskInitiativeRoutesFound += 1;
    }

    if (content.includes("performance-review") && content.includes("SLA")) {
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
  for (const target of staleTextScanTargets) {
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

      const found = staleTextScanTerms.filter(({ term }) => content.includes(term));
      if (found.length === 0) {
        continue;
      }

      const countOfKind = (kind) => found.filter((entry) => entry.kind === kind).length;
      metrics.staleTcPlaceholderFindings += countOfKind("placeholder");
      metrics.staleTcEvidenceFormatFindings += countOfKind("evidenceFormat");
      metrics.staleQaDashboardPathFindings += countOfKind("qaDashboardPath");
      metrics.unconfiguredArtifactRootFindings += countOfKind("unconfiguredArtifactRoot");
      failures.push({
        severity: "error",
        code: "SDD021",
        file: relativeFile,
        message: `Prompt/spec surfaces must not preserve stale TC placeholders or unconfigured artifact-root tokens. (forbidden text found: ${found.map((entry) => entry.term).join(", ")})`,
      });
    }
  }

  const sdd022Files = (await resolveSdd022ScanFiles(rootDir, options, sdd022Scope)).sort((left, right) =>
    left.localeCompare(right)
  );
  const enforcedChangedSet = await resolveEnforcedChangedSet(rootDir, options);
  const selectedSdd022Files = Array.isArray(options.sdd022Files)
    ? [...new Set(options.sdd022Files.map(normalizeRelativeFile))].filter((file) =>
        isSdd022TargetFile(file, sdd022Scope)
      )
    : sdd022Files;
  const explicitlySelectedSdd022Files = new Set(
    Array.isArray(options.sdd022Files) ? selectedSdd022Files : []
  );
  const isSdd022Enforced = (relativeFile) =>
    enforcedChangedSet.has(relativeFile) ||
    (Boolean(sdd022Scope.profile) && explicitlySelectedSdd022Files.has(relativeFile));
  const artifactScope = {
    status: Array.isArray(options.sdd022Files) && selectedSdd022Files.length === 0 ? "not-applicable" : "checked",
    selected: selectedSdd022Files.length,
    found: 0,
    checked: 0,
    unknown: 0,
    targetDigest: "",
  };
  const targetDigest = createHash("sha256");
  const semanticScanOptionsFor = (relativeFile) => ({
    ...options,
    profile: isSdd022M1ExemptFile(relativeFile, sdd022Scope) ? null : sdd022Scope.profile,
  });

  // Anti-R6: the two roots this verifier WALKS. Skipped when the caller narrowed the scan
  // to a changed-file set (`--enforce-changed`), where an empty scope is legitimate and
  // says nothing about where the root lives.
  if (!Array.isArray(options.sdd022Files)) {
    const rootProbes = [
      {
        configKey: "specRoots.business.path",
        resolvedRoot: sdd022Scope.scanRoots[0],
        declared: isRootDeclared(config, "specRoots.business.path"),
        candidateCount: sdd022Files.length,
      },
      ...(await Promise.all(
        staleTextScanTargets
          .filter((target) => target === resolveTokens("{REF_DOCS_ROOT}", config))
          .map(async (target) => ({
            configKey: "docsRoots.projectReference.path",
            resolvedRoot: target,
            declared: isRootDeclared(config, "docsRoots.projectReference.path"),
            candidateCount: await countCandidateFiles(rootDir, target),
          }))
      )),
    ];
    metrics.declaredRootsProbed = rootProbes.filter((probe) => probe.declared).length;
    const coverageFailures = findDeclaredRootCoverageFailures(rootProbes);
    metrics.emptyDeclaredRootFindings += coverageFailures.length;
    failures.push(...coverageFailures);
  }
  for (const relativeFile of sdd022Files) {
    checkedFiles.add(relativeFile);
    const content = await readFileOrNull(rootDir, relativeFile, options);
    if (content === null) {
      failures.push({
        severity: "error",
        code: "SDD026",
        file: relativeFile,
        message:
          `Selected specification artifact could not be read from ${options.staged ? "the Git index" : "the requested root"}; ` +
          "verification cannot claim coverage for a missing or unreadable target.",
      });
      continue;
    }

    artifactScope.found += 1;
    artifactScope.checked += 1;
    targetDigest.update(relativeFile).update("\0").update(content).update("\0");
    // M1-exempt derived files still contribute to coverage and are checked by SDD023/024 below.
    if (isSdd022M1ExemptFile(relativeFile, sdd022Scope)) continue;

    const findings = scanProseForBannedTokens(content, semanticScanOptionsFor(relativeFile));

    for (const finding of findings) {
      const severity = isSdd022Enforced(relativeFile) ? "error" : "warn";
      if (severity === "warn") {
        metrics.warnings += 1;
      }
      if (finding.kind === "unknown-section-role") {
        metrics.unknownSectionRoleFindings += 1;
        failures.push({
          severity,
          code: "SDD026",
          file: relativeFile,
          message: `Engineering specification section has no configured role (line ${finding.line}: "${finding.term}"). Add an explicit section alias to specArtifacts.sections or rename the heading.`,
        });
        continue;
      }
      metrics.bannedProseTechTermFindings += 1;
      failures.push({
        severity,
        code: "SDD022",
        file: relativeFile,
        message: sdd022Scope.profile
          ? `Specification intent must remain tech-agnostic outside configured contracts/evidence sections and structural carriers. (line ${finding.line}: forbidden prose token "${finding.term}")`
          : `Feature/spec prose must remain tech-agnostic outside evidence, source, integration-test, frontmatter, and mermaid carriers. (line ${finding.line}: forbidden prose token "${finding.term}")`,
      });
    }
  }
  artifactScope.unknown = Math.max(0, artifactScope.selected - artifactScope.found);
  artifactScope.targetDigest = targetDigest.digest("hex");
  metrics.specArtifactScope = artifactScope;

  // SDD023 (abstract-anchor evidence model) + SDD024 (M2 source identifiers in prose).
  // Same target set and warn/error ratchet as SDD022: WARN in census mode, ERROR only on
  // changed files under --enforce-changed. A mixed legacy/abstract corpus is the designed
  // transition state, so unchanged legacy carriers must not block the gate.
  for (const relativeFile of sdd022Files) {
    checkedFiles.add(relativeFile);
    const { evidenceFindings, proseIdentifierFindings } = await scanEvidenceModelFile(
      rootDir,
      relativeFile,
      semanticScanOptionsFor(relativeFile)
    );
    const isChanged = isSdd022Enforced(relativeFile);

    for (const finding of evidenceFindings) {
      if (finding.kind === "legacy-physical") {
        metrics.legacyPhysicalEvidenceFindings += 1;
      } else {
        metrics.malformedAbstractAnchorFindings += 1;
      }
      const severity = isChanged ? "error" : "warn";
      if (severity === "warn") metrics.warnings += 1;
      failures.push({
        severity,
        code: "SDD023",
        file: relativeFile,
        message: `Evidence carriers must use stack-portable abstract anchors (namespace/service/id). (line ${finding.line}: ${finding.kind} "${finding.body}")`,
      });
    }

    for (const finding of proseIdentifierFindings) {
      metrics.proseSourceIdentifierFindings += 1;
      const severity = isChanged ? "error" : "warn";
      if (severity === "warn") metrics.warnings += 1;
      failures.push({
        severity,
        code: "SDD024",
        file: relativeFile,
        message: `Prose must not name source identifiers; use business operation names (identifiers live only in evidence carriers). (line ${finding.line}: source identifier "${finding.term}")`,
      });
    }
  }

  const roadmapBoundarySurface = await loadRoadmapBoundarySurface(rootDir, options);
  if (roadmapBoundarySurface) {
    const roadmapPatterns = buildRoadmapPatterns(resolveTokens("{PRODUCT_ROADMAP_DOC}", config));
    const roadmapFailures = evaluateRoadmapBoundary(roadmapBoundarySurface, {
      ...ROADMAP_BOUNDARY_POLICY,
      roadmapPathPattern: roadmapPatterns.pathPattern,
      roadmapWriterPattern: roadmapPatterns.writerPattern,
    });
    for (const finding of roadmapFailures) {
      metrics.roadmapBoundaryFindings += 1;
      const route = finding.routeId
        ? roadmapBoundarySurface.routes.find((candidate) => candidate.routeId === finding.routeId)
        : roadmapBoundarySurface.standalone;
      failures.push({
        severity: "error",
        code: finding.code,
        file: route?.file ?? ".claude/skills/shared/product-roadmap-contract.md",
        message: finding.message,
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
  const rootDir = resolveProjectRoot({
    cwd: process.cwd(),
    scriptPath: fileURLToPath(import.meta.url),
    env: process.env,
  }).rootDir;
  const enforceChanged = process.argv.includes("--enforce-changed");
  const staged = process.argv.includes("--staged");
  const changedFiles = enforceChanged
    ? await getChangedFiles(rootDir, { enforceChanged, staged })
    : [];
  const options = buildRunOptions({ enforceChanged, staged, changedFiles });

  let result;
  try {
    result = await runChecks(rootDir, CHECKS, options);
  } catch (error) {
    if (error?.code !== "ERR_SDD_PROJECT_CONFIG") throw error;
    console.error("[codex-verify-sdd] CONFIG ERROR");
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const hardFailures = result.failures.filter((failure) => failure.severity !== "warn");
  const warnFindings = result.failures.filter((failure) => failure.severity === "warn");

  // The census (no --enforce-changed) emits one warn per legacy carrier / prose leak across the
  // whole corpus — thousands during the abstract-anchor migration. Printing every line floods the
  // codex:sync stage-9 log, so cap the per-line output and rely on the per-code breakdown +
  // sddMetrics census for the full picture. Under --enforce-changed the warn set is small (changed
  // files only), so the cap is effectively a no-op there.
  const WARN_PRINT_CAP = 25;
  for (const warning of warnFindings.slice(0, WARN_PRINT_CAP)) {
    console.warn(`warn ${warning.code} ${warning.file}: ${warning.message}`);
  }
  if (warnFindings.length > WARN_PRINT_CAP) {
    console.warn(
      `warn ... and ${warnFindings.length - WARN_PRINT_CAP} more (capped; see per-code breakdown + sddMetrics)`
    );
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
    const byCode = warnFindings.reduce((acc, warning) => {
      acc[warning.code] = (acc[warning.code] ?? 0) + 1;
      return acc;
    }, {});
    const breakdown = Object.keys(byCode)
      .sort()
      .map((code) => `${code}: ${byCode[code]}`)
      .join(", ");
    console.log(
      `[codex-verify-sdd] ${warnFindings.length} non-blocking warning(s) [${breakdown}] — run with --enforce-changed to gate changed files`
    );
  }
  console.log(JSON.stringify({ sddMetrics: result.sddMetrics }, null, 2));
}

const isEntrypoint = isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url));

if (isEntrypoint) {
  await main();
}

export {
  CHECKS,
  PROJECT_RESIDUE_TERMS,
  loadProjectResidueTerms,
  resolveChecks,
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
  ROADMAP_BOUNDARY_POLICY,
  evaluateRoadmapBoundary,
  loadRoadmapBoundarySurface,
  BANNED_PROSE_TECH_TERMS,
  SDD022_SCAN_ROOTS,
  SDD022_EXEMPT_FILES,
  SDD022_EXEMPT_SUFFIXES,
  PORTABILITY_TOKEN_DEFAULTS,
  STALE_TEXT_SCAN_TARGETS,
  buildRoadmapPatterns,
  buildStaleTextScanTerms,
  findDeclaredRootCoverageFailures,
  hasFormBOverrideFor,
  hasBareOccurrence,
  isFormBOverrideSentence,
  isRootDeclared,
  resolveSdd022Scope,
  resolveTokens,
  resolveTokensToDefaults,
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
  ABSTRACT_ANCHOR_NAMESPACES,
  ABSTRACT_ANCHOR_PART_PATTERN,
  CODE_IDENTIFIER_SUFFIXES,
  classifyEvidenceBody,
  scanCarriersForEvidenceModel,
  findProseSourceIdentifiers,
  scanProseForSourceIdentifiers,
  scanEvidenceModelFile,
  runChecks,
};
