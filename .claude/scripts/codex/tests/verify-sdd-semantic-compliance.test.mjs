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
  runChecks,
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
} = await import(pathToFileURL(verifierPath).href);

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
        ".claude/skills/workflow-idea-to-pbi/SKILL.md",
        "Feature doc Section 8 TC IDs docs-update docs/project-config.json team-artifacts/ideas team-artifacts/pbis plans/reports/docs-update",
      ],
      [
        ".claude/skills/docs-update/SKILL.md",
        "configured PBI/idea artifact roots detection/delegation docs/project-config.json",
      ],
      [
        ".claude/skills/integration-test/SKILL.md",
        "adjudication required canonical product/spec intent",
      ],
      [
        ".claude/skills/spec/references/sync.md",
        "emergency recovery AskUserQuestion recovery report from-integration-tests",
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
        ".codex/CODEX_CONTEXT.md",
        "PERFORMANCE-SDD ROUTE performance-review shared/sdd-artifact-contract.md SYNC:ai-sdd-artifact-contract reference-only until accepted Any supported AI tool",
      ],
      [
        "AGENTS.md",
        "PERFORMANCE-SDD ROUTE performance-review shared/sdd-artifact-contract.md SYNC:ai-sdd-artifact-contract reference-only until accepted Any supported AI tool",
      ],
      [
        ".claude/hooks/session-init-docs.cjs",
        "docs/project-config.json docs/project-reference",
      ],
      [
        ".claude/hooks/prompt-context-assembler-project-config.cjs",
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
        ".agents/skills/workflow-idea-to-pbi/SKILL.md",
        "Feature doc Section 8 TC IDs docs-update shared/sdd-artifact-contract.md team-artifacts/ideas team-artifacts/pbis plans/reports/docs-update",
      ],
      [
        ".agents/skills/docs-update/SKILL.md",
        "configured PBI/idea artifact roots detection/delegation docs/project-config.json",
      ],
      [
        ".agents/skills/spec/references/sync.md",
        "emergency recovery AskUserQuestion recovery report from-integration-tests",
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
