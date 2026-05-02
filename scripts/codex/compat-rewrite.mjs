const PREFERRED_SKILL_ALIASES = new Map([
  ["plan", "plan-hard"],
  ["debug", "debug-investigate"],
]);

const COMPATIBILITY_NOTE_LINES = [
  "> Codex compatibility note:",
  "> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.",
  "> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.",
  "> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.",
  "> - User-question prompts mean to ask the user directly in Codex.",
  "> - Ignore Claude-specific mode-switch instructions when they appear.",
  "> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.",
  "> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.",
  "> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.",
  "> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.",
  "",
];

function normalizeName(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function buildSkillReferenceMap(skillNames) {
  const normalizedSkillNames = new Set(
    [...skillNames]
      .map((name) => normalizeName(name))
      .filter(Boolean)
  );

  const skillReferenceMap = new Map();
  for (const skillName of normalizedSkillNames) {
    skillReferenceMap.set(skillName, skillName);
  }

  for (const [legacyName, preferredName] of PREFERRED_SKILL_ALIASES) {
    if (normalizedSkillNames.has(preferredName)) {
      skillReferenceMap.set(legacyName, preferredName);
    }
  }

  return skillReferenceMap;
}

export function rewriteSkillMentionsForCodex(text, skillReferenceMap) {
  return text.replace(
    /(^|[^A-Za-z0-9_$-])([/$])([a-z][a-z0-9-]*)(?=$|[^A-Za-z0-9_-])/gm,
    (match, prefix, sigil, commandName) => {
      const normalizedName = normalizeName(commandName);
      const mappedName = skillReferenceMap.get(normalizedName);
      if (!mappedName) return match;
      if (sigil === "$" && mappedName === normalizedName) return match;
      return `${prefix}$${mappedName}`;
    }
  );
}

export function rewriteClaudeToolTermsForCodex(text) {
  return text
    .replace(
      /\(content auto-injected by hooks?[^)]*\)/gi,
      "(Codex has no hook injection — open this file directly before proceeding)"
    )
    .replaceAll(
      "(content auto-injected by hook — check for [Injected: ...] header before reading)",
      "(Codex has no hook injection — open this file directly before proceeding)"
    )
    .replaceAll(
      "(content auto-injected by hooks).",
      "(Claude may inject this via hooks; Codex must open this file directly)."
    )
    .replaceAll("`TaskCreate`", "task tracking")
    .replaceAll("`TaskList`", "the current task list")
    .replaceAll("`AskUserQuestion`", "a direct user question")
    .replaceAll("`EnterPlanMode`", "manual plan-mode switching")
    .replaceAll("`Skill` tool", "skill invocation")
    .replaceAll("`Skill`", "skill invocation")
    .replaceAll("`Agent` tool", "`spawn_agent` tool")
    .replaceAll("`Agent`", "`spawn_agent`")
    .replace(/\bSkill tool\b/g, "skill invocation")
    .replace(/\bAgent tool\b/g, "`spawn_agent` tool")
    .replace(/\bAgent\(/g, "spawn_agent(")
    .replace(/\bsubagent_type:/g, "agent_type:")
    .replace(/\bsubagent_type=/g, "agent_type=")
    .replace(/\bTaskCreate:/g, "Task tracking:")
    .replace(/\bTaskCreate\b/g, "task tracking")
    .replace(/\bTaskList\b/g, "the current task list")
    .replace(/\bAskUserQuestion\b/g, "ask the user directly")
    .replace(/\bEnterPlanMode\b/g, "manual plan-mode switching");
}

export function prependCodexCompatibilityNote(text) {
  const trimmedText = text.trimStart();
  if (trimmedText.startsWith("> Codex compatibility note:")) {
    return text;
  }

  return `${COMPATIBILITY_NOTE_LINES.join("\n")}${text.trimStart()}`;
}
