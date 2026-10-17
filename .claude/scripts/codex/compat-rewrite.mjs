const PREFERRED_SKILL_ALIASES = new Map([
  ["simplify", "code-simplifier"],
]);

const COMPATIBILITY_NOTE_LINES = [
  "> Codex compatibility note:",
  "> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.",
  "> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.",
  "> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.",
  "> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.",
  "> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.",
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
      if (sigil === "/" && prefix && !/[\s([{'"`>:-]/.test(prefix)) {
        return match;
      }
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
      "(Hooks may point to this file; every host must open it directly before proceeding)"
    )
    .replaceAll(
      "(content auto-injected by hook — check for [Injected: ...] header before reading)",
      "(Hooks may point to this file; every host must open it directly before proceeding)"
    )
    .replaceAll(
      "(content auto-injected by hooks).",
      "(Claude may inject this via hooks; Codex must open this file directly)."
    )
    .replaceAll("`TaskCreate`", "todo tracking")
    .replaceAll("`TaskList`", "the current task list")
    .replaceAll("via `AskUserQuestion`", "using ask user question tool")
    .replaceAll("`AskUserQuestion` decision", "user decision using ask user question tool")
    .replaceAll("`AskUserQuestion`", "ask user question tool")
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
    .replace(/\bsubagent_type\b/g, "agent_type")
    .replace(/\bTaskCreate:/g, "Todo tracking:")
    .replace(/\bTaskCreate\b/g, "todo tracking")
    .replace(/\bTaskList\b/g, "the current task list")
    .replace(/\bvia AskUserQuestion\b/g, "using ask user question tool")
    .replace(/\bAskUserQuestion\b/g, "ask user question tool")
    .replace(/\bEnterPlanMode\b/g, "manual plan-mode switching");
}

export function prependCodexCompatibilityNote(text) {
  const trimmedText = text.trimStart();
  if (trimmedText.startsWith("> Codex compatibility note:")) {
    return text;
  }

  return `${COMPATIBILITY_NOTE_LINES.join("\n")}${text.trimStart()}`;
}
