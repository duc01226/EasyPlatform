"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const SLUG = /^[a-z][a-z0-9-]*$/;
// Keep in lockstep with workflows.schema.json definitions.Occurrence.role and OutcomeGate.id.
const ROLES = ["gate", "core", "optional"];
const GATE_IDS = ["tests-pass", "review-converged", "spec-synced", "plan-approved", "root-cause-traced", "run-closed"];
// Keep in lockstep with workflows.schema.json definitions.Phase.id. The order is the only allowed order.
const PHASES = ["discover", "specify", "plan", "build", "review", "verify", "close"];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const nonempty = value => typeof value === "string" && value.trim().length > 0;

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function fields(value, allowed, label) {
  check(isObject(value), `Invalid ${label}: expected object`);
  for (const key of Object.keys(value)) check(allowed.includes(key), `Unknown ${label} field: ${key}`);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function listWorkflowModes(entry) {
  check(isObject(entry), "Invalid workflow entry");
  if (!own(entry, "variants")) {
    check(!own(entry, "defaultMode"), "defaultMode requires variants");
    return ["default"];
  }
  check(isObject(entry.variants) && Object.keys(entry.variants).length > 0, "Invalid workflow variants");
  const modes = Object.keys(entry.variants);
  for (const mode of modes) check(SLUG.test(mode), `Invalid workflow mode: ${mode}`);
  check(own(entry, "defaultMode") && typeof entry.defaultMode === "string" && own(entry.variants, entry.defaultMode), "Invalid defaultMode: must name a declared variant");
  return modes;
}

function normalizeApplicability(value, id) {
  if (value === undefined) return { when: "always", skipReason: null };
  fields(value, ["when", "skipReason"], `applicability for ${id}`);
  check(nonempty(value.when) && nonempty(value.skipReason), `Invalid applicability for ${id}: when and skipReason are required`);
  return { when: value.when, skipReason: value.skipReason };
}

// role lives only on the occurrence object (never stepMeta) so it is checked beside applicability.
function normalizeRole(step) {
  if (step.role === undefined) return "core";
  check(ROLES.includes(step.role), `Invalid role for ${step.id}: ${String(step.role)}`);
  check(step.role !== "optional" || own(step, "applicability"), `Optional step ${step.id} requires applicability with when and skipReason`);
  check(step.role !== "gate" || !own(step, "applicability"), `Gate step ${step.id} cannot carry applicability`);
  return step.role;
}

function normalizeIntent(entry, workflowId) {
  if (!own(entry, "intent")) return null;
  check(nonempty(entry.intent) && !/[\r\n]/.test(entry.intent), `Invalid intent for ${workflowId}: expected one non-empty line`);
  return entry.intent;
}

// A satisfier is a skill name, or a skill name plus invocation arguments (`plan --mode=validate`) when
// one skill serves several roles. It matches an occurrence of that skill whose args contain every
// argument token of the satisfier; a bare skill name matches every occurrence of the skill.
const SATISFIER = /^([a-z][a-z0-9-]*)(?:\s+(\S[\s\S]*))?$/;
const argTokens = text => String(text ?? "").trim().split(/\s+/).filter(Boolean);
function satisfierMatches(satisfier, step) {
  const match = SATISFIER.exec(satisfier);
  if (!match || !step || step.skill !== match[1]) return false;
  const have = new Set(argTokens(step.args));
  return argTokens(match[2]).every(token => have.has(token));
}

// satisfiedBy lists alternative satisfiers. Every listed satisfier must match a step somewhere in the
// workflow (any mode), and the selected mode must contain at least one of them, or the gate is unprovable.
// A variant may add its own gates (`variants.<mode>.outcomeGates`) to the entry-level gates shared by
// every mode; the selected mode's gate list is the entry-level gates followed by its own. Gate IDs stay
// unique across both lists, so a variant can never redefine a shared gate.
function normalizeOutcomeGates(entry, workflowId, mode, occurrences, selected) {
  const variantGates = own(entry, "variants") && own(selected, "outcomeGates") ? selected.outcomeGates : undefined;
  if (!own(entry, "outcomeGates") && variantGates === undefined) return [];
  const validList = gates => Array.isArray(gates) && gates.length > 0;
  check(!own(entry, "outcomeGates") || validList(entry.outcomeGates), `Invalid outcomeGates for ${workflowId}: expected a non-empty array`);
  check(variantGates === undefined || validList(variantGates), `Invalid outcomeGates for ${workflowId} variant ${mode}: expected a non-empty array`);
  const gateList = [...(entry.outcomeGates ?? []), ...(variantGates ?? [])];
  const workflowSteps = own(entry, "variants")
    ? Object.values(entry.variants).flatMap(variant => (Array.isArray(variant?.sequence) ? variant.sequence : []))
    : occurrences;
  const seen = new Set();
  return gateList.map(gate => {
    fields(gate, ["id", "satisfiedBy", "when"], `outcome gate in ${workflowId}`);
    check(GATE_IDS.includes(gate.id), `Invalid outcome gate ID in ${workflowId}: ${String(gate.id)}`);
    check(!seen.has(gate.id), `Duplicate outcome gate in ${workflowId}: ${gate.id}`);
    seen.add(gate.id);
    check(Array.isArray(gate.satisfiedBy) && gate.satisfiedBy.length > 0, `Outcome gate ${gate.id} needs satisfiedBy skills`);
    check(gate.satisfiedBy.every(skill => typeof skill === "string" && SATISFIER.test(skill)), `Invalid satisfiedBy skill in outcome gate ${gate.id}`);
    check(new Set(gate.satisfiedBy).size === gate.satisfiedBy.length, `Duplicate satisfiedBy skill in outcome gate ${gate.id}`);
    for (const skill of gate.satisfiedBy) check(workflowSteps.some(step => satisfierMatches(skill, step)), `Outcome gate ${gate.id} names a skill not in the sequence of ${workflowId}: ${skill}`);
    check(gate.satisfiedBy.some(skill => occurrences.some(record => satisfierMatches(skill, record))), `Outcome gate ${gate.id} has no satisfying step in ${workflowId}/${mode}`);
    check(gate.when === undefined || nonempty(gate.when), `Invalid when for outcome gate ${gate.id}`);
    return { id: gate.id, satisfiedBy: [...gate.satisfiedBy], when: gate.when ?? null };
  });
}

function normalizeGroups(groups, records, legacyKeys) {
  check(Array.isArray(groups), "Invalid parallelGroups: expected array");
  const groupIds = new Set();
  const assigned = new Set();
  const resolveMember = key => {
    check(nonempty(key), "Invalid barrier member");
    // Explicit semantic IDs and legacy command references share one namespace;
    // accepting a collision would silently bind a barrier to the wrong task.
    const candidates = records.filter(record => record.id === key || legacyKeys.get(record.id) === key);
    check(candidates.length === 1, `Missing or ambiguous barrier member: ${key}`);
    return candidates[0];
  };
  return groups.map(group => {
    fields(group, ["id", "members", "conditionalMembers", "barrier"], "parallel group");
    check(nonempty(group.id) && !groupIds.has(group.id), `Invalid or duplicate barrier ID: ${group.id}`);
    groupIds.add(group.id);
    check(group.barrier === true, `Barrier ${group.id} must be true`);
    check(Array.isArray(group.members) && group.members.length >= 2, `Barrier ${group.id} needs at least two members`);
    const members = group.members.map(resolveMember);
    check(new Set(members.map(x => x.id)).size === members.length, `Duplicate members in barrier ${group.id}`);
    const positions = members.map(member => records.indexOf(member)).sort((a, b) => a - b);
    check(positions.every((position, index) => position === positions[0] + index), `Noncontiguous barrier ${group.id}`);
    const conditional = group.conditionalMembers === undefined ? [] : group.conditionalMembers;
    check(Array.isArray(conditional), `Invalid conditionalMembers in barrier ${group.id}`);
    const conditionalRecords = conditional.map(resolveMember);
    check(new Set(conditionalRecords.map(x => x.id)).size === conditionalRecords.length, `Duplicate conditionalMembers in barrier ${group.id}`);
    check(conditionalRecords.every(record => members.includes(record)), `Conditional member outside barrier ${group.id}`);
    // A conditional member gets a synthesized applicability below; a gate may never be skippable.
    for (const record of conditionalRecords) check(record.role !== "gate", `Gate step ${record.id} cannot be a conditional barrier member`);
    for (const member of members) {
      check(!assigned.has(member.id), `Overlapping barrier member: ${member.id}`);
      assigned.add(member.id);
      member.barrier = group.id;
    }
    for (const member of conditionalRecords) {
      if (member.applicability.when === "always") {
        member.applicability = { when: "Evaluate the skill's documented conditional trigger", skipReason: "Record why the documented trigger is absent" };
      }
    }
    return { id: group.id, members: members.map(x => x.id), conditionalMembers: conditionalRecords.map(x => x.id), barrier: true };
  });
}

// Phases group a mode's occurrences for task tracking: one todo per phase, each occurrence one line in it.
// When declared they name explicit occurrences only, cover every occurrence once in sequence order (so each
// phase is a contiguous run), follow PHASES order, never split a barrier group, and tie every outcome gate to
// exactly one phase exit whose own steps or an earlier phase's contain a satisfier. Absent phases resolve to [].
function normalizePhases(phases, occurrences, legacyKeys, parallelGroups, outcomeGates, label) {
  if (phases === undefined) return [];
  check(Array.isArray(phases) && phases.length > 0, `Invalid phases for ${label}: expected a non-empty array`);
  check(legacyKeys.size === 0, `Phases need explicit occurrence objects in ${label}`);
  let lastRank = -1;
  const covered = [];
  const result = phases.map(phase => {
    fields(phase, ["id", "steps", "exit"], `phase in ${label}`);
    const rank = PHASES.indexOf(phase.id);
    check(rank > lastRank, `Unknown, repeated or out-of-order phase ${String(phase.id)} in ${label}`);
    lastRank = rank;
    check(Array.isArray(phase.steps) && phase.steps.length > 0 && phase.steps.every(nonempty), `Phase ${phase.id} needs step IDs in ${label}`);
    const exit = phase.exit === undefined ? [] : phase.exit;
    check(Array.isArray(exit) && exit.every(nonempty), `Invalid exit for phase ${phase.id} in ${label}`);
    covered.push(...phase.steps);
    return { id: phase.id, steps: [...phase.steps], exit: [...exit] };
  });
  check(covered.length === occurrences.length && covered.every((id, index) => id === occurrences[index].id),
    `Phases must list every occurrence once, in sequence order, in ${label}`);
  const phaseOf = new Map();
  result.forEach((phase, index) => phase.steps.forEach(id => phaseOf.set(id, index)));
  for (const group of parallelGroups) check(new Set(group.members.map(id => phaseOf.get(id))).size === 1, `Barrier ${group.id} spans two phases in ${label}`);
  const exits = new Set();
  result.forEach((phase, index) => {
    const reached = new Set(result.slice(0, index + 1).flatMap(item => item.steps));
    for (const gateId of phase.exit) {
      const gate = outcomeGates.find(item => item.id === gateId);
      check(gate !== undefined, `Phase ${phase.id} exit names an undeclared outcome gate in ${label}: ${gateId}`);
      check(!exits.has(gateId), `Outcome gate ${gateId} is the exit of two phases in ${label}`);
      exits.add(gateId);
      check(occurrences.some(record => reached.has(record.id) && gate.satisfiedBy.some(skill => satisfierMatches(skill, record))),
        `Phase ${phase.id} exit ${gateId} has no satisfier in or before the phase in ${label}`);
    }
  });
  for (const gate of outcomeGates) check(exits.has(gate.id), `Outcome gate ${gate.id} is no phase's exit in ${label}`);
  return result;
}

/**
 * Resolve one complete workflow mode without executing commands or filtering tasks.
 * args is opaque skill-invocation text, never shell text. Explicit occurrence IDs
 * survive insertion; synthesized legacy IDs are scoped to source version/content.
 * availableSkills accepts an iterable for fixtures; otherwise canonical SKILL.md
 * files under rootDir are required. Consumers persist fingerprint for resume.
 */
function resolveWorkflowManifest(document, workflowId, options = {}) {
  check(isObject(document) && isObject(document.workflows), "Invalid workflow registry");
  check(typeof workflowId === "string" && own(document.workflows, workflowId), `Unknown workflow ID: ${workflowId}`);
  const entry = document.workflows[workflowId];
  const modes = listWorkflowModes(entry);
  const mode = own(options, "mode") ? options.mode : (entry.defaultMode ?? "default");
  check(typeof mode === "string" && modes.includes(mode), `Unknown workflow mode: ${String(mode)} for ${workflowId}`);
  const selected = own(entry, "variants") ? entry.variants[mode] : entry;
  if (own(entry, "variants")) fields(selected, ["sequence", "parallelGroups", "stepMeta", "outcomeGates", "phases"], `variant ${mode}`);
  check(isObject(selected) && Array.isArray(selected.sequence) && selected.sequence.length > 0, `Invalid sequence for ${workflowId}/${mode}`);
  const sourceVersion = document.version === undefined ? "unversioned" : document.version;
  check(nonempty(sourceVersion), "Invalid workflow source version");
  const sourceHash = digest({ sourceVersion, workflow: workflowId, entry });
  const skills = options.availableSkills === undefined ? null : new Set(options.availableSkills);
  const rootDir = options.rootDir ?? path.resolve(__dirname, "../../..");
  const ids = new Set();
  const legacyKeys = new Map();
  const occurrences = selected.sequence.map((step, index) => {
    let record;
    if (typeof step === "string") {
      check(!own(entry, "variants"), `Variant ${mode} requires explicit occurrence objects`);
      const match = step.trim().match(/^([a-z][a-z0-9-]*)(?:\s+([\s\S]*))?$/);
      check(match, `Invalid legacy command: ${step}`);
      record = { id: `legacy-${sourceVersion}-${sourceHash.slice(0, 16)}-${index + 1}`, skill: match[1], args: match[2] ?? "", applicability: normalizeApplicability(undefined), role: "core", barrier: null };
      legacyKeys.set(record.id, step);
    } else {
      fields(step, ["id", "skill", "args", "applicability", "role"], "occurrence");
      check(typeof step.id === "string" && SLUG.test(step.id), `Invalid occurrence ID: ${step.id}`);
      check(typeof step.skill === "string" && SLUG.test(step.skill), `Invalid skill: ${step.skill}`);
      check(step.args === undefined || typeof step.args === "string", `Invalid args for ${step.id}`);
      record = { id: step.id, skill: step.skill, args: step.args ?? "", applicability: normalizeApplicability(step.applicability, step.id), role: normalizeRole(step), barrier: null };
    }
    check(!ids.has(record.id), `Duplicate occurrence ID: ${record.id}`);
    ids.add(record.id);
    check(skills ? skills.has(record.skill) : fs.existsSync(path.join(rootDir, ".claude", "skills", record.skill, "SKILL.md")), `Missing skill: ${record.skill}`);
    return record;
  });
  const parallelGroups = normalizeGroups(selected.parallelGroups === undefined ? [] : selected.parallelGroups, occurrences, legacyKeys);
  const stepMeta = {};
  const metadata = selected.stepMeta === undefined ? {} : selected.stepMeta;
  check(isObject(metadata), "Invalid stepMeta");
  for (const [key, meta] of Object.entries(metadata)) {
    const targets = occurrences.filter(record => record.id === key || legacyKeys.get(record.id) === key);
    check(targets.length > 0, `Unknown stepMeta target: ${key}`);
    fields(meta, ["executionMode", "contextBudget"], `stepMeta ${key}`);
    check(meta.executionMode === undefined || ["subagent", "inline"].includes(meta.executionMode), `Invalid executionMode for ${key}`);
    check(meta.contextBudget === undefined || ["low", "medium", "high", "critical"].includes(meta.contextBudget), `Invalid contextBudget for ${key}`);
    for (const target of targets) Object.defineProperty(stepMeta, target.id, { value: { ...meta }, enumerable: true });
  }
  const intent = normalizeIntent(entry, workflowId);
  const outcomeGates = normalizeOutcomeGates(entry, workflowId, mode, occurrences, selected);
  const phases = normalizePhases(selected.phases, occurrences, legacyKeys, parallelGroups, outcomeGates, `${workflowId}/${mode}`);
  const fingerprint = digest({ sourceHash, mode, occurrences, parallelGroups, stepMeta, phases });
  return { workflow: workflowId, mode, sourceVersion, fingerprint, intent, outcomeGates, occurrences,
    sequence: occurrences.map(({ skill, args }) => args ? `${skill} ${args}` : skill), parallelGroups, stepMeta, phases };
}

function resolveAllWorkflowManifests(document, workflowId, options = {}) {
  check(isObject(document?.workflows) && own(document.workflows, workflowId), `Unknown workflow ID: ${workflowId}`);
  return listWorkflowModes(document.workflows[workflowId]).map(mode => resolveWorkflowManifest(document, workflowId, { ...options, mode }));
}

module.exports = { resolveWorkflowManifest, resolveAllWorkflowManifests, listWorkflowModes, satisfierMatches, PHASES };
