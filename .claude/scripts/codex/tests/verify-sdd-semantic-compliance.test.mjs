import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const verifierPath = path.join(repoRoot, ".claude", "scripts", "codex", "verify-sdd-semantic-compliance.mjs");
const fixturesDir = path.join(thisDir, "fixtures");
const execFileAsync = promisify(execFile);
const {
  CHECKS,
  buildRunOptions,
  evaluateCheck,
  resolveChecks,
  runChecks,
  PORTABILITY_TOKEN_DEFAULTS,
  STALE_TEXT_SCAN_TARGETS,
  buildRoadmapPatterns,
  findDeclaredRootCoverageFailures,
  isFormBOverrideSentence,
  isRootDeclared,
  resolveSdd022Scope,
  STALE_PERFORMANCE_SKIP_TERMS,
  STALE_TC_PLACEHOLDER_TERMS,
  UNCONFIGURED_ARTIFACT_ROOT_TERMS,
  LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE,
  AI_SDD_SYNC_MARKER,
  AI_SDD_REFERENCE_ONLY_TEXT,
  AI_SDD_SUPPORTED_TOOL_TEXT,
  GENERIC_SDD_REFERENCE_TERMS,
  findBannedProseTechTerms,
  isSdd022TargetFile,
  scanProseForBannedTokens,
  classifyEvidenceBody,
  findProseSourceIdentifiers,
  ROADMAP_BOUNDARY_POLICY,
  evaluateRoadmapBoundary,
  loadRoadmapBoundarySurface,
} = await import(pathToFileURL(verifierPath).href);

const roadmapSignals = (overrides = {}) => ({
  multipleIndependentOutcomes: false,
  ambiguousOrResearchHeavy: false,
  releaseScopeDecomposition: false,
  oversizedTaskThatMustSplit: false,
  ...overrides,
});

const completeRoadmapDecomposition = () => ({
  outcome_slices: [{ id: "SLICE-001", outcome: "Actor completes the outcome", releasable_when: "Visible result", owning_artifact: "TASK-001" }],
  dependencies_order: [{ before: "SLICE-001", after: "N/A", reason: "No predecessor" }],
  non_goals: [{ statement: "Later capability is deferred", owner: "TASK-001" }],
  risks_evidence: [{ risk: "Outcome may be unclear", evidence_needed: "Owner observes result", status: "open", owner: "PO" }],
  deferred_work_owner: [{ item: "Later capability", owner: "PO", follow_up_artifact: "TASK-002", target_slice: "N/A" }],
});

const cleanRoadmapRoutes = () =>
  ROADMAP_BOUNDARY_POLICY.defaultRouteIds.map((routeId) => ({
    routeId,
    sequence: ["isLargeIdea", "large_idea_decomposition"],
    text: "isLargeIdea large_idea_decomposition; standalone product-roadmap route is explicit-only; ordinary scope does not create docs/product-roadmap.md",
  }));

test("roadmap boundary has six clean default routes and retains the explicit standalone writer", () => {
  const clean = evaluateRoadmapBoundary({
    routes: cleanRoadmapRoutes(),
    standalone: {
      explicitRequest: true,
      text: "explicit-only product-roadmap request may create docs/product-roadmap.md",
    },
  });
  assert.deepEqual(clean, []);

  const dirty = evaluateRoadmapBoundary({
    routes: cleanRoadmapRoutes().map((route, index) =>
      index === 2 ? { ...route, sequence: ["product-roadmap"] } : route
    ),
  });
  assert.ok(dirty.some((finding) => finding.code === "ROADMAP-DEFAULT-WRITER"));
});

test("each authoritative large-idea signal requires all five decomposition fields", () => {
  for (const signal of ROADMAP_BOUNDARY_POLICY.largeIdeaSignals) {
    const clean = evaluateRoadmapBoundary({
      signals: roadmapSignals({ [signal]: true }),
      decomposition: completeRoadmapDecomposition(),
    });
    assert.deepEqual(clean, [], `${signal} complete block should pass`);

    const incomplete = completeRoadmapDecomposition();
    delete incomplete.deferred_work_owner;
    const failures = evaluateRoadmapBoundary({
      signals: roadmapSignals({ [signal]: true }),
      decomposition: incomplete,
    });
    assert.ok(
      failures.some((finding) => finding.code === "ROADMAP-DECOMPOSITION-SCHEMA"),
      `${signal} missing field should fail`
    );
  }
});

test("the optional not_yet_specified list is accepted beside the five required fields and never replaces one", () => {
  const signals = roadmapSignals({ ambiguousOrResearchHeavy: true });
  const withFog = {
    ...completeRoadmapDecomposition(),
    not_yet_specified: [{ area: "How archived outcomes are restored", waits_on: "SLICE-001", owner: "PO" }],
  };
  // A complete block that also lists not-yet-specified work passes
  assert.deepEqual(evaluateRoadmapBoundary({ signals, decomposition: withFog }), []);

  // The optional list cannot stand in for a required field
  const missingRequired = { ...withFog };
  delete missingRequired.non_goals;
  assert.ok(
    evaluateRoadmapBoundary({ signals, decomposition: missingRequired }).some(
      (finding) => finding.code === "ROADMAP-DECOMPOSITION-SCHEMA"
    ),
    "not_yet_specified does not satisfy a missing required field"
  );
});

test("ordinary all-false scope omits decomposition, including independentlySliceable counterexample", () => {
  assert.deepEqual(
    evaluateRoadmapBoundary({
      signals: roadmapSignals(),
      independentlySliceable: true,
    }),
    []
  );
  const failures = evaluateRoadmapBoundary({
    signals: roadmapSignals(),
    decomposition: completeRoadmapDecomposition(),
  });
  assert.ok(failures.some((finding) => finding.code === "ROADMAP-DECOMPOSITION-SCHEMA"));
});

test("standalone roadmap writer remains explicit-only", () => {
  const guarded = evaluateRoadmapBoundary({
    standalone: {
      explicitRequest: true,
      text: "explicit-only product-roadmap request may create docs/product-roadmap.md",
    },
  });
  assert.deepEqual(guarded, []);

  const unguarded = evaluateRoadmapBoundary({
    standalone: {
      explicitRequest: false,
      text: "product-roadmap create docs/product-roadmap.md",
    },
  });
  assert.ok(unguarded.some((finding) => finding.code === "ROADMAP-EXPLICIT-ROUTE"));
});

test("roadmap writer detection is statement-aware", () => {
  const disclaimerOnly = evaluateRoadmapBoundary({
    routes: ROADMAP_BOUNDARY_POLICY.defaultRouteIds.map((routeId) => ({
      routeId,
      text: "isLargeIdea large_idea_decomposition. Do not create docs/product-roadmap.md by default.",
    })),
  });
  assert.deepEqual(disclaimerOnly, []);

  const disclaimerAndWriter = evaluateRoadmapBoundary({
    routes: ROADMAP_BOUNDARY_POLICY.defaultRouteIds.map((routeId, index) => ({
      routeId,
      text: index === 0
        ? "isLargeIdea large_idea_decomposition. Do not create docs/product-roadmap.md by default.\nRun product-roadmap here."
        : "isLargeIdea large_idea_decomposition; ordinary route; no roadmap writer",
    })),
  });
  assert.ok(disclaimerAndWriter.some((finding) => finding.code === "ROADMAP-DEFAULT-WRITER"));
});

test("decomposition validator rejects malformed field types and item shapes", () => {
  const malformedType = completeRoadmapDecomposition();
  malformedType.outcome_slices = {};
  malformedType.dependencies_order = "SLICE-001";
  malformedType.risks_evidence = { risk: "unclear" };
  const typeFailures = evaluateRoadmapBoundary({
    signals: roadmapSignals({ multipleIndependentOutcomes: true }),
    decomposition: malformedType,
  });
  assert.ok(typeFailures.some((finding) => finding.code === "ROADMAP-DECOMPOSITION-SCHEMA"));

  const malformedItem = completeRoadmapDecomposition();
  malformedItem.outcome_slices = [{ id: "SLICE-001" }];
  const itemFailures = evaluateRoadmapBoundary({
    signals: roadmapSignals({ multipleIndependentOutcomes: true }),
    decomposition: malformedItem,
  });
  assert.ok(itemFailures.some((finding) => finding.code === "ROADMAP-DECOMPOSITION-SCHEMA"));
});

test("roadmap surface coverage failure is hard and does not silently disable the gate", async () => {
  const coverage = evaluateRoadmapBoundary({
    coverageFailures: ["roadmap boundary surface is missing workflow-feature"],
  });
  assert.ok(coverage.some((finding) => finding.code === "ROADMAP-SURFACE-COVERAGE"));

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "roadmap-boundary-surface-"));
  try {
    for (const routeId of ["workflow-feature", "workflow-planned-work"]) {
      const routeFile = path.join(tempRoot, ".claude", "skills", routeId, "SKILL.md");
      await fs.mkdir(path.dirname(routeFile), { recursive: true });
      await fs.writeFile(routeFile, "isLargeIdea large_idea_decomposition", "utf8");
    }
    const roadmapSkill = path.join(tempRoot, ".claude", "skills", "product-roadmap", "SKILL.md");
    await fs.mkdir(path.dirname(roadmapSkill), { recursive: true });
    await fs.writeFile(roadmapSkill, "explicit-only docs/product-roadmap.md", "utf8");
    const surface = await loadRoadmapBoundarySurface(tempRoot);
    assert.ok(surface.coverageFailures.length >= 1);
    assert.ok(
      evaluateRoadmapBoundary(surface).some((finding) => finding.code === "ROADMAP-SURFACE-COVERAGE")
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("roadmap boundary reads every mode file and every variant sequence of a merged default route", async () => {
  // Given a default route whose router keeps its mode bodies in references and its modes in variants
  const CLEAN = "isLargeIdea large_idea_decomposition; standalone product-roadmap route is explicit-only; ordinary scope does not create docs/product-roadmap.md";
  const PLANNED = [
    ".claude/skills/workflow-planned-work/SKILL.md",
    ".claude/skills/workflow-planned-work/references/planned-work-core.md",
    ".claude/skills/workflow-planned-work/references/mode-idea-to-tasks.md",
    ".claude/skills/workflow-planned-work/references/mode-idea-to-spec.md",
    ".claude/skills/workflow-planned-work/references/mode-spec-to-tasks.md",
  ];
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "roadmap-boundary-variants-"));
  const write = async (relativeFile, text) => {
    await fs.mkdir(path.dirname(path.join(tempRoot, relativeFile)), { recursive: true });
    await fs.writeFile(path.join(tempRoot, relativeFile), text, "utf8");
  };
  const registry = (variantSteps) => ({
    workflows: Object.fromEntries(ROADMAP_BOUNDARY_POLICY.defaultRouteIds.map((routeId) => [routeId, {
      sequence: [{ skill: "plan" }],
      ...(routeId === "workflow-planned-work" ? { variants: { "idea-to-tasks": { sequence: [{ skill: "plan" }] }, "spec-to-tasks": { sequence: variantSteps } } } : {}),
    }])),
  });
  const writers = async () => (evaluateRoadmapBoundary(await loadRoadmapBoundarySurface(tempRoot)))
    .filter((finding) => finding.code === "ROADMAP-DEFAULT-WRITER").map((finding) => finding.routeId);
  try {
    for (const routeId of ["workflow-big-feature", "workflow-feature", "workflow-greenfield-init"]) await write(`.claude/skills/${routeId}/SKILL.md`, CLEAN);
    for (const file of PLANNED) await write(file, CLEAN);
    await write(".claude/skills/product-roadmap/SKILL.md", "explicit-only docs/product-roadmap.md");
    await write(".claude/workflows.json", JSON.stringify(registry([{ skill: "plan" }])));
    // When every file and sequence is clean, Then no route writes the roadmap
    assert.deepEqual(await writers(), []);
    // When a non-default variant gains a roadmap step, Then that route is caught
    await write(".claude/workflows.json", JSON.stringify(registry([{ skill: "plan" }, { skill: "product-roadmap" }])));
    assert.deepEqual(await writers(), ["workflow-planned-work"]);
    // When only a mode reference names the writer, Then that route is caught
    await write(".claude/workflows.json", JSON.stringify(registry([{ skill: "plan" }])));
    await write(PLANNED[4], `${CLEAN}\nRun product-roadmap after the task review.`);
    assert.deepEqual(await writers(), ["workflow-planned-work"]);
    // When a mode reference is missing, Then coverage fails and names it
    await fs.rm(path.join(tempRoot, PLANNED[3]));
    const surface = await loadRoadmapBoundarySurface(tempRoot);
    assert.ok(surface.coverageFailures.some((message) => message.includes(PLANNED[3])), surface.coverageFailures.join("; "));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("evaluateCheck fails unsafe drift wording", () => {
  const failures = evaluateCheck(
    {
      requireAny: ["adjudication required", "canonical product/spec intent"],
      forbidAny: ["Update spec to match test"],
      message: "integration-test mismatch rules must not prefer current passing tests.",
    },
    "Test passes, spec describes different behavior | Test | Update spec to match test"
  );

  assert.ok(failures.some((failure) => failure.includes("Update spec to match test")));
});

test("evaluateCheck fails stale performance exception wording", () => {
  const failures = evaluateCheck(
    {
      requireAll: ["PERFORMANCE-SDD ROUTE"],
      forbidAny: STALE_PERFORMANCE_SKIP_TERMS,
      message: "workflow prompt surfaces must not preserve stale performance skip rules.",
    },
    "PERFORMANCE-SDD ROUTE with PERFORMANCE EXCEPTION routes where those steps are intentionally skipped"
  );

  assert.ok(failures.some((failure) => failure.includes("PERFORMANCE EXCEPTION routes")));
});

test("evaluateCheck fails renamed spec tests skip wording", () => {
  const failures = evaluateCheck(
    {
      requireAll: ["PERFORMANCE-SDD ROUTE"],
      forbidAny: STALE_PERFORMANCE_SKIP_TERMS,
      message: "workflow prompt surfaces must not preserve stale performance skip rules.",
    },
    "PERFORMANCE-SDD ROUTE says skip /spec [mode=tests] for this route"
  );

  assert.ok(failures.some((failure) => failure.includes("skip /spec [mode=tests]")));

  const featureCheck = CHECKS.find(
    (check) => check.code === "SDD008" && check.file === ".claude/skills/workflow-feature/SKILL.md"
  );
  assert.ok(featureCheck);
  const patternFailures = evaluateCheck(
    featureCheck,
    "performance-review SLA functional no-regression but skip /spec [mode=tests]"
  );
  assert.ok(patternFailures.some((failure) => failure.includes("forbidden pattern found")));
});

test("evaluateCheck fails stale TC placeholder wording", () => {
  const failures = evaluateCheck(
    {
      requireAll: ["TC IDs"],
      forbidAny: STALE_TC_PLACEHOLDER_TERMS,
      message: "prompt surfaces must use the canonical TC placeholder.",
    },
    "TC IDs are written as TC-{FEAT}-{NNN}"
  );

  assert.ok(failures.some((failure) => failure.includes("TC-{FEAT}-{NNN}")));
});

test("evaluateCheck fails Codex artifact pointing at Claude SDD contract path", () => {
  const failures = evaluateCheck(
    {
      requireAny: ["shared/sdd-artifact-contract.md", "SDD Artifact Contract"],
      forbidAny: [LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE],
      message: "Codex artifacts must resolve the local shared SDD contract.",
    },
    `Apply the shared SDD Artifact Contract at ${LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE}`
  );

  assert.ok(failures.some((failure) => failure.includes(LEGACY_CLAUDE_SDD_CONTRACT_REFERENCE)));
});

test("evaluateCheck fails missing shared AI-SDD marker", () => {
  const failures = evaluateCheck(
    {
      requireAll: [AI_SDD_SYNC_MARKER, AI_SDD_REFERENCE_ONLY_TEXT, AI_SDD_SUPPORTED_TOOL_TEXT],
      message: "generated mirrors must include shared AI-SDD sync markers.",
    },
    "shared/sdd-artifact-contract.md Any supported AI tool"
  );

  assert.ok(failures.some((failure) => failure.includes(AI_SDD_SYNC_MARKER)));
  assert.ok(failures.some((failure) => failure.includes(AI_SDD_REFERENCE_ONLY_TEXT)));
});

test("evaluateCheck fails project-reference docs duplicating generic SDD principles", () => {
  const failures = evaluateCheck(
    {
      requireAll: ["Project-specific extension", "shared/sdd-artifact-contract.md"],
      forbidAny: GENERIC_SDD_REFERENCE_TERMS,
      message: "project-reference docs must stay local extensions.",
    },
    "Project-specific extension shared/sdd-artifact-contract.md Implementation-Complete Checklist Thoughtworks:"
  );

  assert.ok(failures.some((failure) => failure.includes("Implementation-Complete Checklist")));
});

test("runChecks loads project residue terms from project config instead of framework source", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-sdd-project-profile-"));
  try {
    const configPath = path.join(tempRoot, "docs", "project-config.json");
    const genericFile = path.join(tempRoot, ".claude", "skills", "shared", "example.md");
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.mkdir(path.dirname(genericFile), { recursive: true });
    await fs.writeFile(
      configPath,
      JSON.stringify({ framework: { projectResidueTerms: ["ExampleSuite"] } }),
      "utf8"
    );
    await fs.writeFile(genericFile, "Generic framework contract ExampleSuite\n", "utf8");

    const check = {
      file: ".claude/skills/shared/example.md",
      requireAny: ["Generic framework contract"],
      forbidProjectResidue: true,
      message: "generic framework surfaces must not contain consumer names",
    };
    const configured = await runChecks(tempRoot, [check]);
    assert.equal(configured.failures.length, 1);
    assert.match(configured.failures[0].message, /ExampleSuite/);

    await fs.writeFile(configPath, JSON.stringify({ framework: {} }), "utf8");
    const portable = await runChecks(tempRoot, [check]);
    assert.deepEqual(portable.failures, []);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("runChecks scans prompt surfaces for stale placeholders and unconfigured artifact roots", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-sdd-stale-scan-"));
  try {
    const staleSkill = path.join(tempRoot, ".claude", "skills", "example", "SKILL.md");
    const staleHook = path.join(tempRoot, ".claude", "hooks", "example.cjs");
    const staleClaudeMd = path.join(tempRoot, "CLAUDE.md");
    const staleTemplate = path.join(tempRoot, ".claude", "templates", "reference-docs", "spec-principles.md");
    await fs.mkdir(path.dirname(staleSkill), { recursive: true });
    await fs.mkdir(path.dirname(staleHook), { recursive: true });
    await fs.mkdir(path.dirname(staleTemplate), { recursive: true });
    await fs.writeFile(
      staleSkill,
      `Use TC-{FEAT}-{NNN}, docs/specs/{Module}/README.md, and ${UNCONFIGURED_ARTIFACT_ROOT_TERMS[0]}\n`,
      "utf8"
    );
    await fs.writeFile(staleHook, "Hook prompt uses TC-{FEAT}-{NNN}\n", "utf8");
    await fs.writeFile(staleClaudeMd, "Root context uses TC-{FEAT}-{NNN}\n", "utf8");
    await fs.writeFile(
      staleTemplate,
      "**Evidence:** `{FilePath}:{LineRange}` or **Evidence:** `{FilePath}:{LineNumber}` or Evidence: {file}:{line} or Evidence field with file:line format\n",
      "utf8"
    );

    const result = await runChecks(tempRoot, []);
    const failureFiles = result.failures.map((failure) => failure.file.replaceAll("\\", "/")).sort();
    assert.deepEqual(failureFiles, [
      ".claude/hooks/example.cjs",
      ".claude/skills/example/SKILL.md",
      ".claude/templates/reference-docs/spec-principles.md",
      "CLAUDE.md",
    ]);
    assert.ok(result.failures.every((failure) => failure.code === "SDD021"));
    assert.ok(result.failures.some((failure) => /TC-\{FEAT\}-\{NNN\}/.test(failure.message)));
    assert.ok(result.failures.some((failure) => /configured-idea-artifact-root/.test(failure.message)));
    assert.ok(result.failures.some((failure) => /docs\/specs\/\{Module\}/.test(failure.message)));
    assert.ok(result.failures.some((failure) => /\*\*Evidence:\*\* `\{FilePath\}:\{LineRange\}`/.test(failure.message)));
    assert.ok(result.failures.some((failure) => /\*\*Evidence:\*\* `\{FilePath\}:\{LineNumber\}`/.test(failure.message)));
    assert.ok(result.failures.some((failure) => /Evidence: \{file\}:\{line\}/.test(failure.message)));
    assert.ok(result.failures.some((failure) => /Evidence field with file:line format/.test(failure.message)));
    assert.equal(result.sddMetrics.staleTcPlaceholderFindings, 9);
    assert.equal(result.sddMetrics.staleTcEvidenceFormatFindings, 4);
    assert.equal(result.sddMetrics.staleQaDashboardPathFindings, 1);
    assert.equal(result.sddMetrics.unconfiguredArtifactRootFindings, 1);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("canonical Feature Spec template requires business intent on every test case", async () => {
  const template = await fs.readFile(
    path.join(repoRoot, ".claude", "templates", "detailed-feature-spec-template.md"),
    "utf8"
  );

  assert.match(template, /\*\*Business Intent \/ Invariant Guarded:\*\*/);
});

test("runChecks fails SDD022 banned tech terms in changed feature/spec prose only", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-sdd022-fail-"));
  try {
    const relativeFile = "docs/specs/example/A-domain-model.md";
    const target = path.join(tempRoot, relativeFile);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(
      target,
      [
        "---",
        "service: Angular",
        "---",
        "# Example",
        "The business flow must not describe CQRS or PlatformValidationResult in prose.",
        "[Source: src/Foo.cs CQRS PlatformValidationResult]",
        "**Evidence**: `PlatformValidationResult`",
        "```mermaid",
        "graph TD",
        "  A[CQRS]",
        "```",
      ].join("\n"),
      "utf8"
    );

    const result = await runChecks(tempRoot, [], { sdd022Files: [relativeFile] });
    const sdd022 = result.failures.filter((failure) => failure.code === "SDD022");
    assert.equal(sdd022.length, 2);
    assert.deepEqual(
      sdd022.map((failure) => failure.message.match(/"([^"]+)"/)?.[1]).sort(),
      ["CQRS", "PlatformValidationResult"]
    );
    assert.equal(result.sddMetrics.bannedProseTechTermFindings, 2);
    // The physical `[Source: src/Foo.cs ...]` carrier is now an SDD023 (legacy-physical) warn.
    assert.ok(result.failures.some((failure) => failure.code === "SDD023" && failure.severity === "warn"));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("runChecks skips SDD022 carrier lines and documented exempt guide files", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-sdd022-pass-"));
  try {
    const files = new Map([
      [
        "docs/specs/DOCUMENTATION-GUIDE.md",
        "This guide may mention Angular and CQRS while explaining documentation rules.",
      ],
      [
        "docs/specs/CandidateApp/CandidateApp.reimplementation-guide.md",
        "The derived rebuild guide may mention .NET and RabbitMQ by design.",
      ],
      [
        "docs/specs/CandidateApp/README.CandidateProfileFeature.md",
        [
          "---",
          "service: Angular",
          "---",
          "# Candidate Profile",
          "[Source: src/Foo.cs CQRS PlatformValidationResult]",
          "**IntegrationTest**: `JwtTokenTests`",
          "```mermaid",
          "A[RabbitMQ and MongoDB inside diagram carrier]",
          "```",
        ].join("\n"),
      ],
    ]);

    for (const [relativePath, content] of files) {
      const target = path.join(tempRoot, relativePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, `${content}\n`, "utf8");
    }

    const result = await runChecks(tempRoot, [], { sdd022Files: [...files.keys()] });
    // SDD022 (banned prose) and SDD024 (prose identifiers) must stay clean — every banned
    // token and identifier here lives inside a carrier, mermaid block, or exempt guide file.
    // The legacy `[Source: src/Foo.cs ...]` physical carrier legitimately raises an SDD023 warn.
    assert.deepEqual(result.failures.filter((failure) => failure.code !== "SDD023"), []);
    assert.equal(result.sddMetrics.bannedProseTechTermFindings, 0);
    assert.equal(result.sddMetrics.proseSourceIdentifierFindings, 0);
    // Exempt guide (exact path), derived reimplementation guide (suffix), and post-move scan root.
    assert.equal(isSdd022TargetFile("docs/specs/DOCUMENTATION-GUIDE.md"), false);
    assert.equal(
      isSdd022TargetFile("docs/specs/CandidateApp/CandidateApp.reimplementation-guide.md"),
      false
    );
    assert.equal(isSdd022TargetFile("docs/business-features/anything.md"), false);
    assert.equal(
      isSdd022TargetFile("docs/specs/CandidateApp/README.CandidateProfileFeature.md"),
      true
    );
    assert.deepEqual(findBannedProseTechTerms("Manual OAuth text"), ["OAuth"]);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("classifyEvidenceBody accepts abstract anchors and flags physical/malformed bodies", () => {
  // Valid, fully-migrated abstract anchors (single + comma-grouped) are exempt.
  assert.equal(classifyEvidenceBody("operation/accounts/CreateUser"), null);
  assert.equal(
    classifyEvidenceBody("event/accounts/AccountUserSaved, schema/accounts/UserStore"),
    null
  );
  // Doc cross-references and literal placeholders are not code anchors.
  assert.equal(classifyEvidenceBody("docs/specs/example/A-domain-model.md"), null);
  assert.equal(classifyEvidenceBody("file:line"), null);
  // Canonical abstract-anchor placeholder (the literal teaching token in doc headers / MIGRATION.md)
  // is an instructional placeholder, never a real anchor — exempt, not an unknown-namespace flag.
  assert.equal(classifyEvidenceBody("namespace/service/id"), null);
  // Legacy physical evidence (file path / extension / line range).
  assert.deepEqual(classifyEvidenceBody("src/Services/Accounts/Foo.cs:12-20"), {
    kind: "legacy-physical",
  });
  assert.deepEqual(classifyEvidenceBody("Bar.cs:5"), { kind: "legacy-physical" });
  // Anchor-shaped but unknown namespace.
  assert.deepEqual(classifyEvidenceBody("widget/accounts/Thing"), { kind: "unknown-namespace" });
});

test("findProseSourceIdentifiers detects code identifiers, filenames, and src paths", () => {
  assert.deepEqual(
    findProseSourceIdentifiers("The CreateUserCommandHandler validates input.").sort(),
    ["CreateUserCommandHandler"]
  );
  assert.deepEqual(
    findProseSourceIdentifiers("publishes AccountUserSavedEventBusMessage to consumers"),
    ["AccountUserSavedEventBusMessage"]
  );
  assert.ok(
    findProseSourceIdentifiers("See src/Services/Accounts/Foo.cs for details.").some((term) =>
      term.startsWith("src/")
    )
  );
  // Pure business prose has no source identifiers.
  assert.deepEqual(findProseSourceIdentifiers("After saving, the system notifies subscribers."), []);
});

test("runChecks flags legacy physical evidence and unknown-namespace anchors (SDD023)", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-sdd023-"));
  try {
    const relativeFile = "docs/specs/example/B-business-rules.md";
    const target = path.join(tempRoot, relativeFile);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(
      target,
      [
        "# Rules",
        "Valid abstract anchors stay clean.",
        "[Source: operation/accounts/CreateUser]",
        "[Source: event/accounts/AccountUserSaved, schema/accounts/UserStore]",
        "Legacy physical reference must be flagged.",
        "[Source: src/Services/Accounts/Foo.cs:12-20]",
        "Bold-label physical carrier must be flagged.",
        "**Source:** `Bar.cs:5`",
        "Unknown namespace must be flagged.",
        "[Source: widget/accounts/Thing]",
      ].join("\n"),
      "utf8"
    );

    const result = await runChecks(tempRoot, [], { sdd022Files: [relativeFile] });
    const sdd023 = result.failures.filter((failure) => failure.code === "SDD023");
    // Two legacy-physical (bracket file:line + bold-label .cs) + one unknown-namespace.
    assert.equal(result.sddMetrics.legacyPhysicalEvidenceFindings, 2);
    assert.equal(result.sddMetrics.malformedAbstractAnchorFindings, 1);
    assert.ok(sdd023.every((failure) => failure.severity === "warn"));
    assert.ok(sdd023.some((failure) => failure.message.includes("widget/accounts/Thing")));
    // The two well-formed abstract carriers produce no SDD023 findings.
    assert.equal(sdd023.length, 3);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("runChecks flags source identifiers leaking into prose (SDD024 / M2)", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-sdd024-"));
  try {
    const relativeFile = "docs/specs/example/A-domain-model.md";
    const target = path.join(tempRoot, relativeFile);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(
      target,
      [
        "# Domain",
        "After save, the service publishes AccountUserSavedEventBusMessage to consumers.",
        "The CreateUserCommandHandler validates input.",
        "See src/Services/Accounts/Foo.cs for details.",
        "Business prose about creating a user has no leak.",
        "[Source: operation/accounts/CreateUser]",
        "**Handler:** `AccountUserSavedEventBusConsumer`",
      ].join("\n"),
      "utf8"
    );

    const result = await runChecks(tempRoot, [], { sdd022Files: [relativeFile] });
    const sdd024 = result.failures.filter((failure) => failure.code === "SDD024");
    const terms = sdd024.map((failure) => failure.message.match(/"([^"]+)"/)?.[1]);
    assert.ok(terms.includes("AccountUserSavedEventBusMessage"));
    assert.ok(terms.includes("CreateUserCommandHandler"));
    assert.ok(terms.some((term) => term.startsWith("src/")));
    // The `[Source:]` anchor and `**Handler:**` carrier lines are exempt from prose scanning.
    assert.ok(!terms.includes("AccountUserSavedEventBusConsumer"));
    assert.ok(sdd024.every((failure) => failure.severity === "warn"));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("runChecks fails when generated shared SDD contract mirror is missing", async () => {
  const generatedContractCheck = CHECKS.find(
    (check) => check.code === "SDD020" && check.file === ".agents/skills/shared/sdd-artifact-contract.md"
  );
  assert.ok(generatedContractCheck);

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-sdd-missing-contract-"));
  try {
    const result = await runChecks(tempRoot, [generatedContractCheck]);
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].code, "SDD020");
    assert.equal(result.failures[0].file, ".agents/skills/shared/sdd-artifact-contract.md");
    assert.match(result.failures[0].message, /file is missing/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("runChecks skips project-profile extension checks for a bare framework but enforces them when configured", async () => {
  const projectProfileChecks = CHECKS.filter((check) => check.requiresProjectProfile);
  assert.equal(projectProfileChecks.length, 2);

  const bareRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-sdd-bare-framework-"));
  try {
    const bareResult = await runChecks(bareRoot, projectProfileChecks);
    assert.deepEqual(bareResult.failures, []);
    assert.equal(bareResult.sddMetrics.checkedFiles, 0);
  } finally {
    await fs.rm(bareRoot, { recursive: true, force: true });
  }

  const configuredRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-sdd-configured-profile-"));
  try {
    await fs.mkdir(path.join(configuredRoot, "docs"), { recursive: true });
    await fs.writeFile(path.join(configuredRoot, "docs", "project-config.json"), "{}\n");
    const configuredResult = await runChecks(configuredRoot, projectProfileChecks);
    // The check `file` fields carry `{REF_DOCS_ROOT}`; failures report the RESOLVED path, so
    // the expectation comes from the resolved check set rather than the token-bearing source.
    const resolvedProfileChecks = await resolveChecks(configuredRoot, projectProfileChecks);
    assert.deepEqual(
      configuredResult.failures.map((failure) => failure.file),
      resolvedProfileChecks.map((check) => check.file)
    );
    assert.deepEqual(resolvedProfileChecks.map((check) => check.file), [
      "docs/project-reference/spec-principles.md",
      "docs/project-reference/workflow-spec-test-code-cycle-reference.md",
    ]);
  } finally {
    await fs.rm(configuredRoot, { recursive: true, force: true });
  }
});

test("runChecks passes positive SDD fixture", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-sdd-"));
  try {
    const files = new Map([
      [
        ".claude/skills/workflow-feature/SKILL.md",
        "shared/sdd-artifact-contract.md performance-review SLA functional no-regression docs/project-config.json",
      ],
      [
        ".claude/skills/workflow-bugfix/SKILL.md",
        "Code Bug vs Spec Bug Spec Bug Code Bug performance-review SLA functional no-regression docs/project-config.json",
      ],
      [
        ".claude/skills/workflow-planned-work/references/mode-idea-to-tasks.md",
        "Feature doc Section 8 TC IDs docs-manager --mode=update docs/project-config.json team-artifacts/initiatives team-artifacts/tasks tmp/reports/docs-update",
      ],
      [
        ".claude/skills/docs-manager/references/mode-update.md",
        "configured task/initiative artifact roots detection/delegation docs/project-config.json",
      ],
      [
        ".claude/skills/integration-test/SKILL.md",
        "adjudication required canonical product/spec intent",
      ],
      [
        ".claude/skills/spec/references/sync.md",
        "emergency recovery ask user question tool recovery report from-integration-tests",
      ],
      [
        ".claude/skills/spec/SKILL.md",
        "Section 8 is the canonical TC registry tests mode owns generation MUST NOT be overwritten during update",
      ],
      [
        ".claude/skills/shared/sdd-artifact-contract.md",
        "Shared-Vs-Project Boundary Implementation-Complete Gate AI-Implementability Gate Tech-Agnostic Spec Writing Code-To-Spec And Spec-To-Code Tool-Neutral Execution reference-only until accepted Any supported AI tool docs/project-config.json docs/project-reference",
      ],
      [
        ".claude/skills/shared/sync-inline-versions.md",
        "SYNC:ai-sdd-artifact-contract reference-only until accepted Any supported AI tool shared/sdd-artifact-contract.md",
      ],
      [
        ".claude/skills/workflow-refactor/SKILL.md",
        "PERFORMANCE-SDD ROUTE performance-review observable behavior docs/spec",
      ],
      [
        ".claude/workflows.json",
        "PERFORMANCE-SDD ROUTE performance-review SLA functional no-regression",
      ],
      [
        "AGENTS.md",
        "# Codex Project Instructions Project information only.",
      ],
      [
        ".claude/hooks/session-init-docs.cjs",
        "docs/project-config.json docs/project-reference",
      ],
      [
        ".agents/skills/workflow-feature/SKILL.md",
        "shared/sdd-artifact-contract.md SDD Artifact Contract",
      ],
      [
        ".agents/skills/workflow-bugfix/SKILL.md",
        "Code Bug vs Spec Bug Spec Bug Code Bug shared/sdd-artifact-contract.md",
      ],
      [
        ".agents/skills/workflow-planned-work/references/mode-idea-to-tasks.md",
        "Feature doc Section 8 TC IDs docs-manager --mode=update shared/sdd-artifact-contract.md team-artifacts/initiatives team-artifacts/tasks tmp/reports/docs-update",
      ],
      [
        ".agents/skills/docs-manager/references/mode-update.md",
        "configured task/initiative artifact roots detection/delegation docs/project-config.json",
      ],
      [
        ".agents/skills/spec/references/sync.md",
        "emergency recovery ask user question tool recovery report from-integration-tests",
      ],
      [
        ".claude/skills/spec/references/spec-tests-template.md",
        "configured-source-path configured-test-path",
      ],
      [
        ".agents/skills/spec/references/spec-tests-template.md",
        "configured-source-path configured-test-path",
      ],
      [
        ".claude/skills/shared/tc-format.md",
        "configured-source-path configured-test-path",
      ],
      [
        ".agents/skills/shared/tc-format.md",
        "configured-source-path configured-test-path",
      ],
      [
        ".agents/skills/shared/sdd-artifact-contract.md",
        "Shared-Vs-Project Boundary Implementation-Complete Gate AI-Implementability Gate Tech-Agnostic Spec Writing Code-To-Spec And Spec-To-Code Tool-Neutral Execution reference-only until accepted Any supported AI tool docs/project-config.json docs/project-reference",
      ],
      [
        ".agents/skills/shared/sync-inline-versions.md",
        "SYNC:ai-sdd-artifact-contract reference-only until accepted Any supported AI tool shared/sdd-artifact-contract.md",
      ],
      [
        "docs/project-reference/spec-principles.md",
        "Project-specific extension Do not add reusable AI-SDD principles here shared/sdd-artifact-contract.md docs/project-config.json",
      ],
      [
        "docs/project-reference/workflow-spec-test-code-cycle-reference.md",
        "Project-Specific Workflow Extension local workflow sequence shared/sdd-artifact-contract.md AGENTS.md",
      ],
    ]);

    for (const [relativePath, content] of files) {
      const target = path.join(tempRoot, relativePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, `${content}\n`, "utf8");
    }

    const result = await runChecks(tempRoot);
    assert.deepEqual(result.failures, []);
    assert.equal(result.sddMetrics.hardFailures, 0);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("scanProseForBannedTokens flags prose, non-mermaid fence, and Platform-prefixed leaks (TC-SDD-022-001)", async () => {
  const content = await fs.readFile(path.join(fixturesDir, "sdd022-prose-leak.md"), "utf8");
  const lines = content.split(/\r?\n/);
  const lineOf = (marker) => lines.findIndex((line) => line.includes(marker)) + 1;

  const findings = scanProseForBannedTokens(content);

  assert.equal(findings.length, 6);
  assert.deepEqual(
    [...new Set(findings.map((finding) => finding.term))].sort(),
    ["Angular", "MongoDB", "PlatformOrderRepository", "RabbitMQ"]
  );

  const proseMultiLine = lineOf("persists each submission");
  assert.deepEqual(
    findings.filter((finding) => finding.line === proseMultiLine).map((finding) => finding.term).sort(),
    ["MongoDB", "RabbitMQ"]
  );
  assert.ok(
    findings.some((finding) => finding.line === lineOf("Validation runs through") && finding.term === "Angular")
  );

  // Non-mermaid fences are scanned: a gherkin fence is not a whitelisted carrier.
  assert.ok(findings.some((finding) => finding.term === "RabbitMQ" && finding.line === lineOf("Given a RabbitMQ")));
  assert.ok(findings.some((finding) => finding.term === "MongoDB" && finding.line === lineOf("reads from MongoDB")));

  assert.ok(
    findings.some((finding) => finding.term === "PlatformOrderRepository" && finding.line === lineOf("LEAK_IDENTIFIER"))
  );
});

test("scanProseForBannedTokens whitelists source/evidence/IT/frontmatter/mermaid carriers (TC-SDD-022-002)", async () => {
  const content = await fs.readFile(path.join(fixturesDir, "sdd022-evidence-ok.md"), "utf8");
  assert.deepEqual(scanProseForBannedTokens(content), []);
});

// Guards the canonical `CoveredBy:` coverage carrier against silent removal from
// EVIDENCE_CARRIER_LABELS. The payload must be BANNED TECH TOKENS, not a source
// filename: scanProseForBannedTokens flags tech/project tokens, and a bare
// `Foo.cs::Method` payload is clean under ANY label — a filename-based fixture
// would pass with or without the exemption and prove nothing.
// The control assertion below pins that non-vacuity in the test itself.
test("scanProseForBannedTokens whitelists the canonical CoveredBy coverage carrier (TC-SDD-022-006)", async () => {
  const content = await fs.readFile(path.join(fixturesDir, "sdd022-evidence-coveredby-ok.md"), "utf8");

  // Control: the SAME payload under an unrecognised label MUST be flagged. If this
  // ever returns clean, the fixture has stopped exercising the exemption and the
  // assertion below would pass vacuously.
  const control = scanProseForBannedTokens("**NotACarrier:** `Angular RabbitMQ MongoDB`");
  assert.ok(
    control.length > 0,
    "fixture would be vacuous: the payload must be flaggable under a non-carrier label"
  );

  assert.deepEqual(scanProseForBannedTokens(content), []);
});

test("scanProseForBannedTokens honors allow-region + single-line markers and clean code spans (TC-SDD-022-003)", async () => {
  const content = await fs.readFile(path.join(fixturesDir, "sdd022-exclusions-ok.md"), "utf8");
  assert.deepEqual(scanProseForBannedTokens(content), []);
});

test("runChecks partitions SDD022 severity by changed-file set under enforce-changed (TC-SDD-022-004)", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-sdd022-gate-"));
  try {
    const changedFile = "docs/specs/example/A-changed.md";
    const unchangedFile = "docs/specs/example/B-unchanged.md";
    await fs.mkdir(path.join(tempRoot, "docs", "specs", "example"), { recursive: true });
    await fs.writeFile(path.join(tempRoot, changedFile), "# Changed\nThe flow uses CQRS in prose.\n", "utf8");
    await fs.writeFile(
      path.join(tempRoot, unchangedFile),
      "# Unchanged\nThe flow persists to MongoDB in prose.\n",
      "utf8"
    );

    const result = await runChecks(tempRoot, [], {
      sdd022Files: [changedFile, unchangedFile],
      enforceChanged: true,
      changedFiles: [changedFile],
    });

    assert.equal(result.sddMetrics.bannedProseTechTermFindings, 2);
    assert.equal(result.sddMetrics.hardFailures, 1);
    assert.equal(result.sddMetrics.warnings, 1);

    const errors = result.failures.filter((failure) => failure.severity === "error");
    const warns = result.failures.filter((failure) => failure.severity === "warn");
    assert.equal(errors.length, 1);
    assert.equal(warns.length, 1);
    assert.ok(errors.every((failure) => failure.code === "SDD022"));
    assert.equal(errors[0].file.replaceAll("\\", "/"), changedFile);
    assert.equal(warns[0].file.replaceAll("\\", "/"), unchangedFile);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("buildRunOptions scopes the SDD022 scan to the changed set in enforce-changed mode (TC-SDD-022-006)", () => {
  const changedFiles = ["docs/specs/example/A-changed.md", "src/Foo.cs"];

  // Default mode: no scan scoping -> runChecks walks the full corpus for the WARN census.
  const defaultOptions = buildRunOptions({ enforceChanged: false, staged: false, changedFiles });
  assert.equal(defaultOptions.enforceChanged, false);
  assert.equal("sdd022Files" in defaultOptions, false);
  assert.equal("changedFiles" in defaultOptions, false);

  // Enforce-changed mode: scan is scoped to the changed set (the ERROR set is identical
  // since only changed files can fail the gate); changedFiles reused to avoid a 2nd git call.
  const enforcedOptions = buildRunOptions({ enforceChanged: true, staged: true, changedFiles });
  assert.equal(enforcedOptions.enforceChanged, true);
  assert.equal(enforcedOptions.staged, true);
  assert.deepEqual(enforcedOptions.sdd022Files, changedFiles);
  assert.deepEqual(enforcedOptions.changedFiles, changedFiles);
  assert.strictEqual(enforcedOptions.sdd022Files, enforcedOptions.changedFiles);

  // Empty changed set (e.g. nothing staged) -> scoped to nothing -> no full-corpus walk, no errors.
  const emptyEnforced = buildRunOptions({ enforceChanged: true, staged: true });
  assert.deepEqual(emptyEnforced.sdd022Files, []);
});

test("runChecks promotes the same SDD022 finding warn->error purely via enforce-changed (TC-SDD-022-005)", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-sdd022-promote-"));
  try {
    const relativeFile = "docs/specs/example/A-domain-model.md";
    await fs.mkdir(path.join(tempRoot, "docs", "specs", "example"), { recursive: true });
    await fs.writeFile(path.join(tempRoot, relativeFile), "# Domain\nThe flow uses CQRS in prose.\n", "utf8");

    const warnRun = await runChecks(tempRoot, [], { sdd022Files: [relativeFile] });
    assert.equal(warnRun.sddMetrics.hardFailures, 0);
    assert.equal(warnRun.sddMetrics.warnings, 1);
    assert.equal(warnRun.failures.length, 1);
    assert.equal(warnRun.failures[0].severity, "warn");

    const gatedRun = await runChecks(tempRoot, [], {
      sdd022Files: [relativeFile],
      enforceChanged: true,
      changedFiles: [relativeFile],
    });
    assert.equal(gatedRun.sddMetrics.hardFailures, 1);
    assert.equal(gatedRun.sddMetrics.warnings, 0);
    assert.equal(gatedRun.failures.length, 1);
    assert.equal(gatedRun.failures[0].severity, "error");
    assert.equal(gatedRun.failures[0].file.replaceAll("\\", "/"), relativeFile);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

// ─── Config-driven relocatable roots (SC-9) ──────────────────────────────────
// The literals below (`docs/specs`, `team-artifacts/...`, `docs/product-roadmap.md`) are
// DEFAULT-path fixtures: they exist to prove the unconfigured default still resolves, so
// they stay allowlisted for the root-literal residue scan rather than converted.

const sdd004Check = () =>
  CHECKS.find((check) => check.code === "SDD004" && check.file === ".claude/skills/docs-manager/references/mode-update.md");

const DOCS_UPDATE_REQUIRED_LINE =
  "Routes configured task/initiative artifact roots by detection/delegation from `docs/project-config.json`.";

async function withTempRoot(prefix, body) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await body(tempRoot);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function writeRepoFile(rootDir, relativePath, content) {
  const target = path.join(rootDir, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

async function writeProjectConfig(rootDir, config) {
  await writeRepoFile(rootDir, "docs/project-config.json", `${JSON.stringify(config, null, 2)}\n`);
}

function engineeringArtifactProfile() {
  return {
    version: 1,
    kind: "engineering-contract",
    sections: {
      intent: ["Purpose"],
      contracts: ["Interfaces and Data Contracts"],
      evidence: ["Evidence"],
    },
    identifiers: {
      requirement: { prefix: "REQ-", grammar: "decimal-lower-suffix" },
      acceptance: { prefix: "AC-", grammar: "decimal-lower-suffix" },
      scenario: { prefix: "SCN-", grammar: "hyphen-tokens" },
    },
    ownership: "spec-path-and-case-id",
    carriers: [
      {
        dialect: "js-title-v1",
        roots: ["tests"],
        extensions: [".ts"],
        suiteCalls: ["describe"],
        caseCalls: ["it"],
      },
    ],
  };
}

function engineeringProjectConfig(overrides = {}) {
  return {
    specRoots: {
      business: { path: "specs", authorship: "hand", m1Policy: "strict" },
      technical: { path: "specs/tech-spec", authorship: "derived", m1Policy: "exempt" },
    },
    ...overrides,
    specArtifacts: engineeringArtifactProfile(),
  };
}

const sdd007Check = () =>
  CHECKS.find((check) => check.code === "SDD007" && check.file === ".claude/skills/spec/SKILL.md");

test("TC-DOCROOT-090: SDD probes the configured teamArtifacts root, not the default literal", async () => {
  await withTempRoot("codex-verify-sdd-teamartifacts-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, { docsRoots: { teamArtifacts: { path: "artifacts" } } });

    const initiativeToTask = CHECKS.find(
      (check) => check.code === "SDD003" && check.file === ".claude/skills/workflow-planned-work/references/mode-idea-to-tasks.md"
    );
    assert.ok(initiativeToTask);
    assert.ok(initiativeToTask.requireAll.includes("{TEAM_ARTIFACTS_ROOT}/initiatives"));

    const [resolved] = await resolveChecks(tempRoot, [initiativeToTask]);
    assert.ok(resolved.requireAll.includes("artifacts/initiatives"));
    assert.ok(resolved.requireAll.includes("artifacts/tasks"));
    assert.ok(!resolved.requireAll.some((term) => term.startsWith("team-artifacts/")));
    // The default is retained as the form-(b) fallback, never as the probe.
    assert.equal(resolved.rootTerms.get("artifacts/initiatives"), "team-artifacts/initiatives");

    const forbidCheck = sdd004Check();
    const [resolvedForbid] = await resolveChecks(tempRoot, [forbidCheck]);
    assert.ok(resolvedForbid.forbidAny.includes("artifacts/tasks"));
    assert.ok(!resolvedForbid.forbidAny.some((term) => term.startsWith("team-artifacts/")));
  });
});

test("TC-DOCROOT-091: the roadmap patterns follow the configured productRoadmap path", async () => {
  const relocated = buildRoadmapPatterns("docs/roadmap/plan.md");
  assert.ok(relocated.pathPattern.test("writes docs/roadmap/plan.md"));
  assert.ok(!relocated.pathPattern.test("writes docs/product-roadmap.md"));

  relocated.writerPattern.lastIndex = 0;
  assert.ok(relocated.writerPattern.test("create docs/roadmap/plan.md"));
  relocated.writerPattern.lastIndex = 0;
  assert.ok(!relocated.writerPattern.test("create docs/product-roadmap.md"));

  // The skill id stays literal — it is a route name, not a relocatable path.
  relocated.writerPattern.lastIndex = 0;
  assert.ok(relocated.writerPattern.test("run product-roadmap"));

  const fallback = buildRoadmapPatterns(PORTABILITY_TOKEN_DEFAULTS.PRODUCT_ROADMAP_DOC);
  assert.ok(fallback.pathPattern.test("writes docs/product-roadmap.md"));
});

test("TC-DOCROOT-092: a DECLARED root matching zero files fails loud instead of passing vacuously", async () => {
  // MISSING root: declared, directory does not exist at all.
  await withTempRoot("codex-verify-sdd-missing-root-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, { specRoots: { business: { path: "specs-moved" } } });
    const result = await runChecks(tempRoot, []);
    const coverage = result.failures.filter((failure) => failure.code === "SDD025");
    assert.equal(coverage.length, 1);
    assert.equal(coverage[0].severity, "error");
    assert.equal(coverage[0].file, "specs-moved/");
    assert.match(coverage[0].message, /matched zero files — verifier would report a false green/);
    assert.equal(result.sddMetrics.emptyDeclaredRootFindings, 1);
    assert.equal(result.sddMetrics.hardFailures, 1);
  });

  // EMPTY root: declared, directory exists but holds no candidate file. Same verdict —
  // "green because there was nothing to look at" is the exact failure this guard exists for.
  await withTempRoot("codex-verify-sdd-empty-root-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, { specRoots: { business: { path: "specs-moved" } } });
    await fs.mkdir(path.join(tempRoot, "specs-moved"), { recursive: true });
    const result = await runChecks(tempRoot, []);
    const coverage = result.failures.filter((failure) => failure.code === "SDD025");
    assert.equal(coverage.length, 1);
    assert.match(coverage[0].message, /false green/);
  });

  // POPULATED root: declared and non-empty — the guard stays silent.
  await withTempRoot("codex-verify-sdd-populated-root-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, { specRoots: { business: { path: "specs-moved" } } });
    await writeRepoFile(tempRoot, "specs-moved/A-domain-model.md", "# Domain\nBusiness prose.\n");
    const result = await runChecks(tempRoot, []);
    assert.deepEqual(result.failures.filter((failure) => failure.code === "SDD025"), []);
    assert.equal(result.sddMetrics.declaredRootsProbed, 1);
  });

  // UNDECLARED and absent — a zero-config project is untouched (SC-11).
  await withTempRoot("codex-verify-sdd-undeclared-root-", async (tempRoot) => {
    const result = await runChecks(tempRoot, []);
    assert.deepEqual(result.failures, []);
    assert.equal(result.sddMetrics.declaredRootsProbed, 0);
    assert.equal(result.sddMetrics.emptyDeclaredRootFindings, 0);
  });
});

test("TC-DOCROOT-092b: the zero-match guard stays out of the changed-file scan scope", async () => {
  // Under --enforce-changed the scan is narrowed to the changed set, where an empty scope
  // is legitimate and says nothing about where the root lives.
  await withTempRoot("codex-verify-sdd-changed-scope-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, { specRoots: { business: { path: "specs-moved" } } });
    const result = await runChecks(tempRoot, [], {
      enforceChanged: true,
      changedFiles: [],
      sdd022Files: [],
    });
    assert.deepEqual(result.failures.filter((failure) => failure.code === "SDD025"), []);
    assert.deepEqual(result.sddMetrics.specArtifactScope, {
      status: "not-applicable",
      selected: 0,
      found: 0,
      checked: 0,
      unknown: 0,
      targetDigest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    });
  });
});

test("TC-DOCROOT-093: an empty config yields the pre-change check set and verdict", async () => {
  await withTempRoot("codex-verify-sdd-empty-config-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, {});
    const resolved = await resolveChecks(tempRoot, CHECKS);

    for (const [index, check] of CHECKS.entries()) {
      assert.equal(resolved[index].file, check.file.replaceAll("{REF_DOCS_ROOT}", "docs/project-reference"));
      const expand = (terms) =>
        terms?.map((term) =>
          term
            .replaceAll("{TEAM_ARTIFACTS_ROOT}", "team-artifacts")
            .replaceAll("{REF_DOCS_ROOT}", "docs/project-reference")
            .replaceAll("{SPEC_ROOT}", "docs/specs")
        );
      assert.deepEqual(resolved[index].requireAll, expand(check.requireAll));
      assert.deepEqual(resolved[index].requireAny, expand(check.requireAny));
      assert.deepEqual(resolved[index].forbidAny, expand(check.forbidAny));
    }

    const scope = resolveSdd022Scope({});
    assert.deepEqual(scope.scanRoots, ["docs/specs/"]);
    assert.ok(scope.exemptFiles.has("docs/specs/DOCUMENTATION-GUIDE.md"));
    assert.deepEqual(
      STALE_TEXT_SCAN_TARGETS.map((target) => target.replaceAll("{REF_DOCS_ROOT}", "docs/project-reference")).at(-1),
      "docs/project-reference"
    );
  });

  // The hook runtime plane remains fail-soft; the semantic verifier must fail closed so a
  // malformed project root/profile cannot turn off its configured checks.
  await withTempRoot("codex-verify-sdd-malformed-config-", async (tempRoot) => {
    await writeRepoFile(tempRoot, "docs/project-config.json", "{ not json");
    await assert.rejects(
      resolveChecks(tempRoot, [sdd004Check()]),
      (error) =>
        error.code === "ERR_SDD_PROJECT_CONFIG" &&
        error.message.includes(path.join(tempRoot, "docs", "project-config.json")) &&
        error.message.includes("Invalid JSON")
    );
  });
});

test("TC-FIT-SEM-001: case-insensitive section roles allow technical contracts while intent stays strict", async () => {
  await withTempRoot("codex-verify-sdd-profile-roles-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, engineeringProjectConfig());
    const relativeFile = "specs/payments/transfer-contract.md";
    await writeRepoFile(
      tempRoot,
      relativeFile,
      [
        "---",
        "id: transfer-contract",
        "status: draft",
        "type: specification",
        "---",
        "# Transfer contract",
        "## pUrPoSe",
        "A user completes a transfer. Invalid requests are rejected and the balance invariant remains true.",
        "## interfaces and DATA contracts",
        "The API uses CQRS and exposes the AccountRepository contract.",
        "## eViDeNcE",
        "Transfer behavior: [Source: operation/payments/transfer]",
        "",
      ].join("\n")
    );

    const result = await runChecks(tempRoot, [], {
      enforceChanged: true,
      changedFiles: [relativeFile],
      sdd022Files: [relativeFile],
    });

    assert.deepEqual(result.failures.filter((failure) => ["SDD022", "SDD023", "SDD024", "SDD026"].includes(failure.code)), []);
    assert.deepEqual(
      {
        status: result.sddMetrics.specArtifactScope.status,
        selected: result.sddMetrics.specArtifactScope.selected,
        found: result.sddMetrics.specArtifactScope.found,
        checked: result.sddMetrics.specArtifactScope.checked,
        unknown: result.sddMetrics.specArtifactScope.unknown,
      },
      { status: "checked", selected: 1, found: 1, checked: 1, unknown: 0 }
    );
    assert.match(result.sddMetrics.specArtifactScope.targetDigest, /^[a-f0-9]{64}$/);
  });
});

test("TC-FIT-SEM-002: engineering intent rejects technical terms and source identifiers", async () => {
  await withTempRoot("codex-verify-sdd-profile-intent-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, engineeringProjectConfig());
    const relativeFile = "specs/payments/transfer-intent.md";
    await writeRepoFile(
      tempRoot,
      relativeFile,
      [
        "# Transfer intent",
        "## Purpose",
        "A user completes a transfer through CQRS and AccountRepository. Invalid requests are rejected.",
        "## Interfaces and Data Contracts",
        "The service contract remains explicit.",
        "## Evidence",
        "Transfer behavior: [Source: operation/payments/transfer]",
        "",
      ].join("\n")
    );

    const result = await runChecks(tempRoot, [], {
      enforceChanged: true,
      changedFiles: [relativeFile],
      sdd022Files: [relativeFile],
    });
    assert.ok(result.failures.some((failure) => failure.code === "SDD022" && failure.severity === "error"));
    assert.ok(result.failures.some((failure) => failure.code === "SDD024" && failure.severity === "error"));
  });
});

test("TC-FIT-SEM-003: unknown profile headings and missing selected artifacts fail with counted coverage", async () => {
  await withTempRoot("codex-verify-sdd-profile-unknown-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, engineeringProjectConfig());
    const relativeFile = "specs/payments/unknown-heading.md";
    await writeRepoFile(
      tempRoot,
      relativeFile,
      [
        "# Transfer contract",
        "## Purpose",
        "A user completes a transfer and invalid requests are rejected.",
        "## Interfaces and Data Contracts",
        "The request contract is explicit.",
        "## Unmapped Implementation Notes",
        "This heading has no declared artifact role.",
        "## Evidence",
        "Transfer behavior: [Source: operation/payments/transfer]",
        "",
      ].join("\n")
    );
    const unknownHeading = await runChecks(tempRoot, [], {
      enforceChanged: true,
      changedFiles: [relativeFile],
      sdd022Files: [relativeFile],
    });
    assert.ok(unknownHeading.failures.some((failure) => failure.code === "SDD026" && /Unmapped Implementation Notes/.test(failure.message)));
    assert.equal(unknownHeading.sddMetrics.unknownSectionRoleFindings, 1);

    const missingFile = "specs/payments/missing-selected.md";
    const missingSelection = await runChecks(tempRoot, [], {
      enforceChanged: true,
      changedFiles: [missingFile],
      sdd022Files: [missingFile],
    });
    assert.ok(missingSelection.failures.some((failure) => failure.code === "SDD026" && /could not be read/.test(failure.message)));
    assert.deepEqual(
      {
        selected: missingSelection.sddMetrics.specArtifactScope.selected,
        found: missingSelection.sddMetrics.specArtifactScope.found,
        checked: missingSelection.sddMetrics.specArtifactScope.checked,
        unknown: missingSelection.sddMetrics.specArtifactScope.unknown,
      },
      { selected: 1, found: 0, checked: 0, unknown: 1 }
    );
  });
});

test("TC-FIT-SEM-004: technical artifacts skip M1 but remain covered by M2", async () => {
  await withTempRoot("codex-verify-sdd-profile-roots-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, engineeringProjectConfig());
    const businessFile = "specs/payments/transfer.md";
    const technicalFile = "specs/tech-spec/generated.md";
    await writeRepoFile(
      tempRoot,
      businessFile,
      [
        "# Transfer",
        "## Purpose",
        "A user completes a transfer and invalid requests are rejected.",
        "## Interfaces and Data Contracts",
        "The request contract is explicit.",
        "## Evidence",
        "Transfer behavior: [Source: operation/payments/transfer]",
        "",
      ].join("\n")
    );
    await writeRepoFile(tempRoot, technicalFile, "# Derived view\nThe generated artifact uses CQRS and AccountRepository.\n");

    const result = await runChecks(tempRoot, [], {
      enforceChanged: true,
      changedFiles: [businessFile, technicalFile],
      sdd022Files: [businessFile, technicalFile],
    });
    assert.deepEqual(result.failures.filter((failure) => failure.code === "SDD022"), []);
    assert.deepEqual(
      result.failures.filter((failure) => failure.code === "SDD024").map(({ file, severity, message }) => ({ file, severity, message })),
      [
        {
          file: technicalFile,
          severity: "error",
          message: 'Prose must not name source identifiers; use business operation names (identifiers live only in evidence carriers). (line 2: source identifier "AccountRepository")',
        },
      ]
    );
    assert.deepEqual(result.sddMetrics.specArtifactScope, {
      status: "checked",
      selected: 2,
      found: 2,
      checked: 2,
      unknown: 0,
      targetDigest: result.sddMetrics.specArtifactScope.targetDigest,
    });
    assert.equal(result.sddMetrics.proseSourceIdentifierFindings, 1);
    assert.match(result.sddMetrics.specArtifactScope.targetDigest, /^[a-f0-9]{64}$/);
  });

  await withTempRoot("codex-verify-sdd-unrelated-root-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, engineeringProjectConfig());
    const unrelated = "docs/specs/foreign.md";
    await writeRepoFile(tempRoot, unrelated, "# Foreign\n## Purpose\nCQRS in unrelated root.\n");
    const result = await runChecks(tempRoot, [], {
      enforceChanged: true,
      changedFiles: [unrelated],
      sdd022Files: [unrelated],
    });
    assert.deepEqual(result.failures.filter((failure) => ["SDD022", "SDD024", "SDD026"].includes(failure.code)), []);
    assert.equal(result.sddMetrics.specArtifactScope.status, "not-applicable");
    assert.deepEqual(
      {
        selected: result.sddMetrics.specArtifactScope.selected,
        found: result.sddMetrics.specArtifactScope.found,
        checked: result.sddMetrics.specArtifactScope.checked,
        unknown: result.sddMetrics.specArtifactScope.unknown,
      },
      { selected: 0, found: 0, checked: 0, unknown: 0 }
    );
  });
});

test("TC-FIT-SEM-008: verifier rejects section aliases with case-insensitive collisions before scanning", async () => {
  await withTempRoot("codex-verify-sdd-profile-alias-collision-", async (tempRoot) => {
    const config = engineeringProjectConfig();
    config.specArtifacts.sections.contracts.push("purpose");
    await writeProjectConfig(tempRoot, config);

    const relativeFile = "specs/payments/ambiguous-intent.md";
    await writeRepoFile(
      tempRoot,
      relativeFile,
      ["# Transfer", "## Purpose", "A user completes a transfer through CQRS.", ""].join("\n")
    );

    await assert.rejects(
      runChecks(tempRoot, [], {
        enforceChanged: true,
        changedFiles: [relativeFile],
        sdd022Files: [relativeFile],
      }),
      (error) =>
        error.code === "ERR_SDD_PROJECT_CONFIG" &&
        /specArtifacts\.sections\.contracts/.test(error.message)
    );
  });
});

test("TC-FIT-SEM-005: SDD007 follows a configured engineering profile instead of requiring Section 8 TCs", async () => {
  await withTempRoot("codex-verify-sdd-profile-sdd007-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, engineeringProjectConfig());
    const [resolved] = await resolveChecks(tempRoot, [sdd007Check()]);
    assert.deepEqual(resolved.requireAll, ["specArtifacts", "intent", "contracts", "evidence"]);
    assert.ok(resolved.forbidAny.includes("Section 8 is the canonical TC registry"));
    assert.ok(resolved.fallbackTerms.includes("Section 8 is the canonical TC registry"));
    assert.match(resolved.message, /configured engineering artifact section roles/);

    // The SAME literal is REQUIRED by the strict-default branch and FORBIDDEN by this one, and a
    // single skill text serves every adopter — so only an UNQUALIFIED claim may fail. A profile-
    // qualified fallback sentence naming both sides is the legal shared-prose idiom and must clear.
    const required = "specArtifacts intent contracts evidence";
    const qualified = `${required}\nUnder the strict default, Section 8 is the canonical TC registry; under a native profile, update only the declared owner/carriers.\n`;
    assert.deepEqual(evaluateCheck(resolved, qualified), []);

    const bare = `${required}\nSection 8 is the canonical TC registry.\n`;
    assert.ok(
      evaluateCheck(resolved, bare).some((failure) => /forbidden text found/.test(failure))
    );
  });
});

test("TC-FIT-SEM-005b: the shipped spec skill satisfies SDD007 under BOTH the strict default and a configured profile", async () => {
  // One spec/SKILL.md serves every adopter, but this repository has no specArtifacts profile, so
  // its own sync only ever runs the strict-default branch. Evaluate the real file under both
  // branches here, or a profile-only regression ships and first fails in an adopting project.
  const skillText = await fs.readFile(path.join(repoRoot, sdd007Check().file), "utf8");
  await withTempRoot("codex-verify-sdd-sdd007-real-default-", async (tempRoot) => {
    const [strict] = await resolveChecks(tempRoot, [sdd007Check()]);
    assert.deepEqual(evaluateCheck(strict, skillText), []);
  });
  await withTempRoot("codex-verify-sdd-sdd007-real-profile-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, engineeringProjectConfig());
    const [profiled] = await resolveChecks(tempRoot, [sdd007Check()]);
    assert.deepEqual(evaluateCheck(profiled, skillText), []);
  });
});

test("TC-FIT-SEM-006: strict verifier config acquisition distinguishes absence from invalid or unreadable config", async () => {
  await withTempRoot("codex-verify-sdd-config-missing-", async (tempRoot) => {
    const result = await runChecks(tempRoot, []);
    assert.deepEqual(result.failures, []);
    assert.equal(resolveSdd022Scope({}).scanRoots[0], "docs/specs/");
  });

  for (const [label, content, reason] of [
    ["array", "[]", /expected a JSON object/],
    ["null", "null", /expected a JSON object/],
  ]) {
    await withTempRoot(`codex-verify-sdd-config-${label}-`, async (tempRoot) => {
      await writeRepoFile(tempRoot, "docs/project-config.json", content);
      await assert.rejects(runChecks(tempRoot, []), (error) => error.code === "ERR_SDD_PROJECT_CONFIG" && reason.test(error.message));
    });
  }

  await withTempRoot("codex-verify-sdd-config-unreadable-", async (tempRoot) => {
    await fs.mkdir(path.join(tempRoot, "docs", "project-config.json"), { recursive: true });
    await assert.rejects(
      runChecks(tempRoot, []),
      (error) =>
        error.code === "ERR_SDD_PROJECT_CONFIG" &&
        error.message.includes(path.join(tempRoot, "docs", "project-config.json")) &&
        /Cannot read/.test(error.message)
    );
  });
});

test("TC-FIT-SEM-007: verifier config uses the requested root and staged index version", async () => {
  await withTempRoot("codex-verify-sdd-config-root-invalid-", async (invalidRoot) => {
    await writeRepoFile(invalidRoot, "docs/project-config.json", "{ invalid");
    await withTempRoot("codex-verify-sdd-config-root-selected-", async (selectedRoot) => {
      await writeProjectConfig(selectedRoot, {
        docsRoots: { teamArtifacts: { path: "selected-artifacts" } },
      });
      const [resolved] = await resolveChecks(selectedRoot, [sdd004Check()]);
      assert.ok(resolved.forbidAny.includes("selected-artifacts/tasks"));
      assert.ok(!resolved.forbidAny.includes("team-artifacts/tasks"));
    });
  });

  await withTempRoot("codex-verify-sdd-config-staged-", async (tempRoot) => {
    await fs.mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await execFileAsync("git", ["init"], { cwd: tempRoot });
    await writeProjectConfig(tempRoot, { docsRoots: { teamArtifacts: { path: "staged-artifacts" } } });
    await execFileAsync("git", ["add", "docs/project-config.json"], { cwd: tempRoot });
    await writeProjectConfig(tempRoot, { docsRoots: { teamArtifacts: { path: "worktree-artifacts" } } });

    const [resolved] = await resolveChecks(tempRoot, [sdd004Check()], { staged: true });
    assert.ok(resolved.forbidAny.includes("staged-artifacts/tasks"));
    assert.ok(!resolved.forbidAny.includes("worktree-artifacts/tasks"));
  });
});

test("TC-DOCROOT-094: a configured root carrying regex metacharacters is matched literally", async () => {
  const patterns = buildRoadmapPatterns("docs/road+map.md");
  assert.ok(patterns.pathPattern.test("writes docs/road+map.md"));
  // Unescaped, `road+map` would match `roadmap` / `roaddmap`; escaped, it cannot.
  assert.ok(!patterns.pathPattern.test("writes docs/roadmap.md"));
  assert.ok(!patterns.pathPattern.test("writes docs/roaddmap.md"));

  patterns.writerPattern.lastIndex = 0;
  assert.ok(patterns.writerPattern.test("create docs/road+map.md"));
  patterns.writerPattern.lastIndex = 0;
  assert.ok(!patterns.writerPattern.test("create docs/roadmap.md"));
});

test("TC-DOCROOT-095: verify-feature-registry resolves its roots from config and fails closed", async () => {
  const registryVerifier = path.join(repoRoot, ".claude", "scripts", "codex", "verify-feature-registry.mjs");
  const source = await fs.readFile(registryVerifier, "utf8");
  // AUDIT OUTCOME (requirement 3): the verifier already reads its roots from the project
  // config and hardcodes no spec-root literal, so this phase changes nothing there.
  assert.ok(source.includes("specSystem?.featureRegistryRoots"));
  assert.ok(!source.includes("docs/specs"));

  // Fail-closed: a configured root that resolves to nothing exits non-zero.
  await withTempRoot("codex-verify-registry-missing-root-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, {
      specSystem: { featureRegistryRoots: ["docs/specs/Missing/Missing.md"] },
    });
    const failure = await execFileAsync("node", [registryVerifier, "--configured-roots", "--optional", `--root=${tempRoot}`])
      .then(() => null)
      .catch((error) => error);
    assert.ok(failure, "a configured-but-absent registry root must not exit 0");
    assert.notEqual(failure.code, 0);
    assert.match(`${failure.stderr}${failure.message}`, /root\(s\) not found as canonical parent specs/);
  });

  // SKIP-when-unconfigured is intact — a zero-config project is unaffected (SC-11).
  await withTempRoot("codex-verify-registry-unconfigured-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, {});
    const { stdout } = await execFileAsync("node", [
      registryVerifier,
      "--configured-roots",
      "--optional",
      `--root=${tempRoot}`,
    ]);
    assert.match(stdout, /SKIP \(project config has no specSystem\.featureRegistryRoots contract\)/);
  });
});

test("TC-DOCROOT-096: SDD004 accepts a relocatable root inside a form-(b) override sentence", async () => {
  await withTempRoot("codex-verify-sdd-formb-accept-", async (tempRoot) => {
    await writeRepoFile(
      tempRoot,
      ".claude/skills/docs-manager/references/mode-update.md",
      [
        DOCS_UPDATE_REQUIRED_LINE,
        "Task artifacts: default `team-artifacts/tasks`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path.",
        "Initiative artifacts: default `team-artifacts/initiatives`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path.",
        "",
      ].join("\n")
    );
    const result = await runChecks(tempRoot, [sdd004Check()]);
    assert.deepEqual(result.failures, []);
  });
});

test("TC-DOCROOT-097: SDD004 still rejects a bare standalone relocatable-root literal", async () => {
  await withTempRoot("codex-verify-sdd-formb-reject-", async (tempRoot) => {
    await writeRepoFile(
      tempRoot,
      ".claude/skills/docs-manager/references/mode-update.md",
      [DOCS_UPDATE_REQUIRED_LINE, "Write the task under team-artifacts/tasks.", ""].join("\n")
    );
    const result = await runChecks(tempRoot, [sdd004Check()]);
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0].code, "SDD004");
    assert.match(result.failures[0].message, /forbidden text found: team-artifacts\/tasks/);
  });

  // A file mixing both shapes still fails — the exemption is per LINE, never per file.
  await withTempRoot("codex-verify-sdd-formb-mixed-", async (tempRoot) => {
    await writeRepoFile(
      tempRoot,
      ".claude/skills/docs-manager/references/mode-update.md",
      [
        DOCS_UPDATE_REQUIRED_LINE,
        "Task artifacts: default `team-artifacts/tasks`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path.",
        "Then copy it to team-artifacts/tasks/archive.",
        "",
      ].join("\n")
    );
    const result = await runChecks(tempRoot, [sdd004Check()]);
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].message, /forbidden text found: team-artifacts\/tasks/);
  });

  // In a RELOCATED project the default literal is still bare hardcoding.
  await withTempRoot("codex-verify-sdd-formb-relocated-", async (tempRoot) => {
    await writeProjectConfig(tempRoot, { docsRoots: { teamArtifacts: { path: "artifacts" } } });
    await writeRepoFile(
      tempRoot,
      ".claude/skills/docs-manager/references/mode-update.md",
      [DOCS_UPDATE_REQUIRED_LINE, "Write the task under team-artifacts/tasks.", ""].join("\n")
    );
    const result = await runChecks(tempRoot, [sdd004Check()]);
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].message, /forbidden text found/);
  });
});

test("TC-DOCROOT-098: PROJECT_LAYOUT_TERMS get no sentence exemption", async () => {
  await withTempRoot("codex-verify-sdd-layout-terms-", async (tempRoot) => {
    await writeRepoFile(
      tempRoot,
      ".claude/skills/docs-manager/references/mode-update.md",
      [
        DOCS_UPDATE_REQUIRED_LINE,
        "Modules live under `src/Services/**`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path.",
        "",
      ].join("\n")
    );
    const result = await runChecks(tempRoot, [sdd004Check()]);
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0].message, /forbidden text found: src\/Services\/\*\*/);
  });
});

// PORTABILITY: `runChecks` returns the declared checks' findings AND the corpus-wide sweeps
// (SDD022 tech-agnostic prose, SDD024 prose source identifiers, …) that run regardless of the
// `checks` argument. Those sweeps are non-blocking by design — the verifier's own exit path counts
// only `severity: 'error'`, and it reports PASS with them present. Asserting `failures === []`
// therefore asserted something this test never claimed: that the repository contains NO SPEC PROSE
// AT ALL. It held only in the upstream framework repo, whose spec corpus is empty; any adopter with
// real specs failed here while the gate it names was green. Scope the assertion to the three codes
// in the test's own name, and to the severity that actually blocks.
test("TC-DOCROOT-099: SDD003 / SDD009 / SDD010 still pass against the live repository", async () => {
  const codes = ["SDD003", "SDD009", "SDD010"];
  const liveChecks = CHECKS.filter((check) => codes.includes(check.code));
  assert.equal(liveChecks.length, 3);
  const result = await runChecks(repoRoot, liveChecks);
  assert.deepEqual(
    result.failures.filter((failure) => codes.includes(failure.code)),
    []
  );
  // The declared checks are hard gates: none of them may report a non-blocking severity either.
  assert.deepEqual(
    result.failures.filter((failure) => codes.includes(failure.code) && failure.severity !== "error"),
    []
  );
});

test("TC-DOCROOT-099b: both build gates agree on what a form-(b) sentence looks like", async () => {
  const literalVerifier = path.join(repoRoot, ".claude", "scripts", "codex", "verify-configurable-root-literals.mjs");
  const { findLiteralOccurrences } = await import(pathToFileURL(literalVerifier).href);

  const legal =
    "Task artifacts: default `team-artifacts/tasks`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path.";
  const bare = "Write the task under team-artifacts/tasks.";

  assert.equal(isFormBOverrideSentence(legal), true);
  assert.equal(isFormBOverrideSentence(bare), false);
  assert.deepEqual(findLiteralOccurrences(legal), []);
  assert.equal(findLiteralOccurrences(bare).length, 1);
});

test("TC-DOCROOT-099c: the fallback token defaults match the loader table", async () => {
  const { PORTABILITY_TOKENS } = await import(
    pathToFileURL(path.join(repoRoot, ".claude", "hooks", "lib", "project-config-loader.cjs")).href
  ).then((module) => module.default ?? module);

  const loaderDefaults = Object.fromEntries(
    Object.entries(PORTABILITY_TOKENS).map(([token, spec]) => [token, spec.default])
  );
  assert.deepEqual(PORTABILITY_TOKEN_DEFAULTS, loaderDefaults);

  assert.equal(isRootDeclared({ specRoots: { business: { path: "x" } } }, "specRoots.business.path"), true);
  assert.equal(isRootDeclared({ specRoots: { business: { path: "  " } } }, "specRoots.business.path"), false);
  assert.equal(isRootDeclared({}, "specRoots.business.path"), false);

  assert.deepEqual(
    findDeclaredRootCoverageFailures([{ declared: false, candidateCount: 0, resolvedRoot: "x", configKey: "k" }]),
    []
  );
  assert.equal(
    findDeclaredRootCoverageFailures([{ declared: true, candidateCount: 0, resolvedRoot: "x", configKey: "k" }]).length,
    1
  );
});

test("runChecks reads staged SDD022 content when staged mode is active", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-sdd022-staged-"));
  try {
    const relativeFile = "docs/specs/example/A-domain-model.md";
    const target = path.join(tempRoot, relativeFile);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await execFileAsync("git", ["init"], { cwd: tempRoot });

    await fs.writeFile(target, "# Domain\nThe business flow remains implementation neutral.\n", "utf8");
    await execFileAsync("git", ["add", relativeFile], { cwd: tempRoot });
    await fs.writeFile(target, "# Domain\nThe business flow mentions CQRS in dirty working tree prose.\n", "utf8");

    const cleanStagedRun = await runChecks(tempRoot, [], {
      staged: true,
      sdd022Files: [relativeFile],
      enforceChanged: true,
      changedFiles: [relativeFile],
    });

    assert.equal(cleanStagedRun.failures.length, 0);

    await fs.writeFile(target, "# Domain\nThe business flow mentions CQRS in staged prose.\n", "utf8");
    await execFileAsync("git", ["add", relativeFile], { cwd: tempRoot });
    await fs.writeFile(target, "# Domain\nThe business flow remains implementation neutral.\n", "utf8");

    const dirtyStagedRun = await runChecks(tempRoot, [], {
      staged: true,
      sdd022Files: [relativeFile],
      enforceChanged: true,
      changedFiles: [relativeFile],
    });

    assert.equal(dirtyStagedRun.sddMetrics.hardFailures, 1);
    assert.equal(dirtyStagedRun.failures[0].file.replaceAll("\\", "/"), relativeFile);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
