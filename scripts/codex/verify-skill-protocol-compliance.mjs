#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const claudeSkillsRoot = path.join(rootDir, ".claude", "skills");
const skillsRoot = path.join(rootDir, ".agents", "skills");
const claudeAgentsRoot = path.join(rootDir, ".claude", "agents");
const agentsRoot = path.join(rootDir, ".codex", "agents");
const contextPath = path.join(rootDir, ".codex", "CODEX_CONTEXT.md");
const projectAgentsPath = path.join(rootDir, "AGENTS.md");
const SKILL_PROTOCOL_MARKER = "CODEX:SYNC-PROMPT-PROTOCOLS:START";
const CONTEXT_PROTOCOL_TOP_MARKER = "PROMPT-PROTOCOLS:START";
const CONTEXT_PROTOCOL_BOTTOM_MARKER = "PROMPT-PROTOCOLS-BOTTOM:START";
const WORKFLOWS_START_MARKER = "WORKFLOWS:START";
const WORKFLOWS_END_MARKER = "WORKFLOWS:END";
const AGENTS_CONTEXT_MIRROR_START = "CODEX-CONTEXT-MIRROR:START";
const AGENTS_CONTEXT_MIRROR_END = "CODEX-CONTEXT-MIRROR:END";

const REQUIRED_CONTRACT_SNIPPETS = [
  "Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.",
  "Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.",
  "Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.",
  "For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.",
  "If a required step/tool cannot run in this environment, stop and ask the user before adapting.",
];

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectFilesByName(dirPath, fileName, { caseInsensitive = false } = {}) {
  const collected = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collected.push(...(await collectFilesByName(fullPath, fileName, { caseInsensitive })));
      continue;
    }
    const namesMatch = caseInsensitive
      ? entry.name.toLowerCase() === fileName.toLowerCase()
      : entry.name === fileName;
    if (entry.isFile() && namesMatch) {
      collected.push(fullPath);
    }
  }
  return collected;
}

function toRelativeNormalized(targetPath, baseDir) {
  return path.relative(baseDir, targetPath).replaceAll("\\", "/");
}

function toRelativeSkillManifest(targetPath, baseDir) {
  const rel = toRelativeNormalized(targetPath, baseDir);
  const segments = rel.split("/");
  const leaf = segments.at(-1);
  if (leaf && leaf.toUpperCase() === "SKILL.MD") {
    segments[segments.length - 1] = "SKILL.md";
    return segments.join("/");
  }
  return rel;
}

function parseSkillFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;
  const keys = [];
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):/);
    if (!keyMatch) continue;
    const key = keyMatch[1];
    keys.push(key);
    const valueMatch = line.match(/^[A-Za-z0-9_-]+:\s*(.*)$/);
    if (!valueMatch) continue;
    const rawValue = valueMatch[1].trim();
    values[key] = rawValue.replace(/^['"]|['"]$/g, "").trim();
  }
  return { keys, values };
}

function parseBooleanFrontmatterValue(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return null;
}

function missingSnippets(content) {
  return REQUIRED_CONTRACT_SNIPPETS.filter((snippet) => !content.includes(snippet));
}

function normalizeForCompare(content) {
  return content.replace(/\r\n/g, "\n").trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasStandaloneMarker(content, marker) {
  return new RegExp(`^\\s*<!-- ${escapeRegExp(marker)} -->\\s*$`, "m").test(content);
}

function extractManagedBlock(content, startMarker, endMarker) {
  const pattern = new RegExp(
    `^\\s*<!-- ${escapeRegExp(startMarker)} -->\\s*$[\\s\\S]*?^\\s*<!-- ${escapeRegExp(
      endMarker
    )} -->\\s*$`,
    "m"
  );
  const match = content.match(pattern);
  return match?.[0] ?? null;
}

async function main() {
  const failures = [];

  if (!(await exists(claudeSkillsRoot))) {
    failures.push(`Missing source skills directory: ${path.relative(rootDir, claudeSkillsRoot)}`);
  }

  if (!(await exists(skillsRoot))) {
    failures.push(`Missing generated skills directory: ${path.relative(rootDir, skillsRoot)}`);
  } else {
    const skillFiles = await collectFilesByName(skillsRoot, "SKILL.md", { caseInsensitive: true });
    const sourceSkillFiles = (await exists(claudeSkillsRoot))
      ? await collectFilesByName(claudeSkillsRoot, "SKILL.md", { caseInsensitive: true })
      : [];
    const sourceFrontmatterByRel = new Map();
    for (const sourcePath of sourceSkillFiles) {
      const sourceContent = await fs.readFile(sourcePath, "utf8");
      sourceFrontmatterByRel.set(
        toRelativeSkillManifest(sourcePath, claudeSkillsRoot),
        parseSkillFrontmatter(sourceContent)
      );
    }

    const generatedSet = new Set(
      skillFiles.map((filePath) => toRelativeSkillManifest(filePath, skillsRoot))
    );
    const sourceSet = new Set(
      sourceSkillFiles.map((filePath) => toRelativeSkillManifest(filePath, claudeSkillsRoot))
    );

    for (const sourceRel of sourceSet) {
      if (!generatedSet.has(sourceRel)) {
        failures.push(`Missing mirrored skill: .agents/skills/${sourceRel}`);
      }
    }
    for (const generatedRel of generatedSet) {
      if (!sourceSet.has(generatedRel)) {
        failures.push(`Unexpected mirrored skill not present in source: .agents/skills/${generatedRel}`);
      }
    }

    const generatedSkillMetadata = new Map();

    for (const skillPath of skillFiles) {
      const content = await fs.readFile(skillPath, "utf8");
      const generatedRel = toRelativeSkillManifest(skillPath, skillsRoot);
      const relativePath = path.relative(rootDir, skillPath);
      if (path.basename(skillPath) !== "SKILL.md") {
        failures.push(
          `${relativePath} must use canonical manifest filename SKILL.md`
        );
      }

      const frontmatter = parseSkillFrontmatter(content);
      generatedSkillMetadata.set(skillPath, {
        frontmatter,
        generatedRel,
        relativePath,
      });

      if (!frontmatter) {
        failures.push(`${relativePath} missing frontmatter block`);
      } else {
        const uniqueKeys = new Set(frontmatter.keys);
        if (!(uniqueKeys.has("name") && uniqueKeys.has("description"))) {
          failures.push(
            `${relativePath} frontmatter missing required keys (name, description)`
          );
        }

        const sourceFrontmatter = sourceFrontmatterByRel.get(generatedRel);
        const sourceDisableModelInvocation = parseBooleanFrontmatterValue(
          sourceFrontmatter?.values?.["disable-model-invocation"]
        );
        const generatedDisableModelInvocation = parseBooleanFrontmatterValue(
          frontmatter.values?.["disable-model-invocation"]
        );
        if (sourceDisableModelInvocation !== generatedDisableModelInvocation) {
          failures.push(
            `${relativePath} disable-model-invocation mismatch with source (.claude/skills/${generatedRel})`
          );
        }
      }

      const missing = missingSnippets(content);
      if (missing.length > 0) {
        failures.push(
          `${relativePath} missing contract snippet(s): ${missing.join(" | ")}`
        );
      }

      if (!content.includes(SKILL_PROTOCOL_MARKER)) {
        failures.push(
          `${relativePath} missing synced prompt-protocol marker (${SKILL_PROTOCOL_MARKER})`
        );
      }

      if (/\bAgent\(/.test(content) || /\bsubagent_type[=:]/.test(content)) {
        failures.push(
          `${relativePath} contains Claude Agent invocation syntax; Codex mirrors must use spawn_agent/agent_type examples`
        );
      }
    }

    const nameToPaths = new Map();
    for (const { frontmatter, relativePath } of generatedSkillMetadata.values()) {
      const name = frontmatter?.values?.name || "";
      if (!name) continue;
      if (!nameToPaths.has(name)) nameToPaths.set(name, []);
      nameToPaths.get(name).push(relativePath);
    }
    for (const [name, paths] of nameToPaths.entries()) {
      if (paths.length > 1) {
        failures.push(`Duplicate skill frontmatter name "${name}" in: ${paths.join(", ")}`);
      }
    }
  }

  if (!(await exists(claudeAgentsRoot))) {
    failures.push(`Missing source agents directory: ${path.relative(rootDir, claudeAgentsRoot)}`);
  }

  if (!(await exists(agentsRoot))) {
    failures.push(`Missing generated agents directory: ${path.relative(rootDir, agentsRoot)}`);
  } else {
    const sourceAgentEntries = (await exists(claudeAgentsRoot))
      ? (await fs.readdir(claudeAgentsRoot, { withFileTypes: true }))
          .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
          .map((entry) => path.basename(entry.name, ".md"))
      : [];

    const agentEntries = await fs.readdir(agentsRoot, { withFileTypes: true });
    const generatedAgentNames = agentEntries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".toml"))
      .map((entry) => path.basename(entry.name, ".toml"));

    const generatedSet = new Set(generatedAgentNames);
    const sourceSet = new Set(sourceAgentEntries);

    for (const sourceName of sourceSet) {
      if (!generatedSet.has(sourceName)) {
        failures.push(`Missing mirrored agent: .codex/agents/${sourceName}.toml`);
      }
    }
    for (const generatedName of generatedSet) {
      if (!sourceSet.has(generatedName)) {
        failures.push(`Unexpected mirrored agent not present in source: .codex/agents/${generatedName}.toml`);
      }
    }

    for (const entry of agentEntries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".toml")) continue;
      const agentPath = path.join(agentsRoot, entry.name);
      const content = await fs.readFile(agentPath, "utf8");
      const missing = missingSnippets(content);
      if (missing.length > 0) {
        failures.push(
          `${path.relative(rootDir, agentPath)} missing contract snippet(s): ${missing.join(" | ")}`
        );
      }
    }
  }

  if (!(await exists(contextPath))) {
    failures.push(`Missing Codex context file: ${path.relative(rootDir, contextPath)}`);
  } else {
    const contextText = await fs.readFile(contextPath, "utf8");
    const missing = missingSnippets(contextText);
    if (missing.length > 0) {
      failures.push(
        `${path.relative(rootDir, contextPath)} missing contract snippet(s): ${missing.join(" | ")}`
      );
    }
    if (!contextText.includes(CONTEXT_PROTOCOL_TOP_MARKER)) {
      failures.push(
        `${path.relative(rootDir, contextPath)} missing top prompt protocol mirror marker (${CONTEXT_PROTOCOL_TOP_MARKER})`
      );
    }
    const topIndex = contextText.indexOf(CONTEXT_PROTOCOL_TOP_MARKER);
    const bottomIndex = contextText.indexOf(CONTEXT_PROTOCOL_BOTTOM_MARKER);
    const workflowsStartIndex = contextText.indexOf(WORKFLOWS_START_MARKER);
    const workflowsEndIndex = contextText.indexOf(WORKFLOWS_END_MARKER);

    if (workflowsStartIndex >= 0 && topIndex > workflowsStartIndex) {
      failures.push(
        `${path.relative(rootDir, contextPath)} top prompt protocol marker must appear before workflows (${WORKFLOWS_START_MARKER})`
      );
    }
    // Bottom protocol mirror is optional; when present it must remain after workflows.
    if (workflowsEndIndex >= 0 && bottomIndex >= 0 && bottomIndex < workflowsEndIndex) {
      failures.push(
        `${path.relative(rootDir, contextPath)} bottom prompt protocol marker must appear after workflows (${WORKFLOWS_END_MARKER})`
      );
    }

    if (!(await exists(projectAgentsPath))) {
      failures.push(`Missing AGENTS.md file: ${path.relative(rootDir, projectAgentsPath)}`);
    } else {
      const agentsText = await fs.readFile(projectAgentsPath, "utf8");
      if (!hasStandaloneMarker(agentsText, AGENTS_CONTEXT_MIRROR_START)) {
        failures.push(
          `${path.relative(rootDir, projectAgentsPath)} missing managed context mirror start marker (${AGENTS_CONTEXT_MIRROR_START})`
        );
      }
      if (!hasStandaloneMarker(agentsText, AGENTS_CONTEXT_MIRROR_END)) {
        failures.push(
          `${path.relative(rootDir, projectAgentsPath)} missing managed context mirror end marker (${AGENTS_CONTEXT_MIRROR_END})`
        );
      }
      const mirroredBlock = extractManagedBlock(
        agentsText,
        AGENTS_CONTEXT_MIRROR_START,
        AGENTS_CONTEXT_MIRROR_END
      );
      if (mirroredBlock) {
        // Compare the mirrored payload, stripping wrapper text from AGENTS managed block.
        const normalizedMirrorBlock = mirroredBlock.replace(/\r\n/g, "\n");
        const mirroredPayload = normalizedMirrorBlock
          .replace(`<!-- ${AGENTS_CONTEXT_MIRROR_START} -->`, "")
          .replace(`<!-- ${AGENTS_CONTEXT_MIRROR_END} -->`, "")
          .replace(/^## Codex Context Mirror \(Auto-Synced\)\n\nThis block is auto-generated[\s\S]*?\n\n/m, "")
          .trim();
        if (normalizeForCompare(mirroredPayload) !== normalizeForCompare(contextText)) {
          failures.push(
            `${path.relative(rootDir, projectAgentsPath)} context mirror content drifted from ${path.relative(rootDir, contextPath)}`
          );
        }
      }
    }
  }

  if (failures.length > 0) {
    console.error("[codex-skill-compliance] FAIL");
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log("[codex-skill-compliance] PASS - strict execution contract present across generated Codex artifacts");
}

await main();
