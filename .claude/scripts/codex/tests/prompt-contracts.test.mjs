import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFrameworkRootFile } from './framework-repo.helper.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

async function read(relativePath) {
    return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

// A skill's contract is its SKILL.md plus every `references/*.md` (sorted), read as one text, so a
// pinned phrase holds wherever the skill keeps it (a mode section may move to a point-of-use reference).
async function readSkillContract(name) {
    const dir = path.join(repoRoot, '.claude', 'skills', name);
    const texts = [await fs.readFile(path.join(dir, 'SKILL.md'), 'utf8')];
    const refs = await fs.readdir(path.join(dir, 'references')).catch(error => {
        if (error.code === 'ENOENT') return [];
        throw error;
    });
    for (const file of refs.filter(entry => entry.endsWith('.md')).sort()) {
        texts.push(await fs.readFile(path.join(dir, 'references', file), 'utf8'));
    }
    return texts.join('\n');
}

test('market-analysis template declares the knowledge-review citation contract (TC-PROMPT-001)', async () => {
    const template = await read('.claude/templates/market-analysis-template.md');
    const marketSkill = await read('.claude/skills/market-analysis/SKILL.md');
    const knowledgeReview = await read('.claude/skills/knowledge-review/SKILL.md');

    assert.match(template, /Every factual sentence, number, comparison, table item, and inference ends/);
    assert.match(template, /inline `\[N\]` citation mapped to one row in \*\*Sources\*\*/);
    assert.match(template, /\| # \| Title \| URL \| Author \/ Publisher \| Tier \| Date \| Used for \|/);
    assert.match(marketSkill, /Every factual claim, number, table row, and inference must end with an inline `\[N\]` citation/);
    assert.match(marketSkill, /Sources table must provide Title, URL, Author\/Publisher, Date, and Tier/);
    assert.match(knowledgeReview, /Sources table has: Title, URL, Author, Date, Tier/);
});

test('research workflow carries one market artifact identity through both consumers (TC-PROMPT-002)', async () => {
    const workflow = await read('.claude/skills/workflow-research/SKILL.md');
    const market = await read('.claude/skills/market-analysis/SKILL.md');
    const business = await read('.claude/skills/business-evaluation/SKILL.md');
    const strategy = await read('.claude/skills/strategy-builder/SKILL.md');

    assert.match(workflow, /ARTIFACT_SLUG/);
    assert.match(workflow, /MARKET_ANALYSIS_PATH = docs\/knowledge\/strategy\/market-analysis\/\{ARTIFACT_SLUG\}\.md/);
    assert.match(market, /parent-provided[\s\S]*ARTIFACT_SLUG[\s\S]*MARKET_ANALYSIS_PATH/);
    assert.match(business, /exact\s+parent-provided `MARKET_ANALYSIS_PATH`/);
    assert.match(strategy, /exact parent-provided[\s\S]*MARKET_ANALYSIS_PATH/);
    assert.match(strategy, /workflow artifact is missing[\s\S]*do not silently substitute inline context/);
    assert.doesNotMatch(strategy, /market-analysis skill or inline/);
    assert.match(strategy, /Unverified inline market context/);
});

test('business-evaluation summary matches its seven detailed steps and market prerequisite (TC-PROMPT-003)', async () => {
    const business = await read('.claude/skills/business-evaluation/SKILL.md');
    const headings = [...business.matchAll(/^## Step (\d+): (.+)$/gm)].slice(0, 7);

    assert.deepEqual(headings.map(match => match[1]), ['1', '2', '3', '4', '5', '6', '7']);
    assert.equal(headings.at(-1)?.[2], 'Verdict');
    assert.match(business, /Seven evaluation steps, preceded by a market-evidence precondition/);
    assert.match(business, /Precondition — load market analysis/);
    assert.match(business, /load market evidence first, then run ALL 7 evaluation steps in order/);
    assert.doesNotMatch(business, /^2\. \*\*Load market analysis\*\*/m);
    assert.doesNotMatch(business, /All 8 main steps|ALL 8 steps|All 7 main steps/);
});

test('demo template repeats the no-front-end exception at the story decision point (TC-PROMPT-004)', async () => {
    const skill = await read('.claude/skills/demo-guide/SKILL.md');
    const template = await read('.claude/skills/demo-guide/references/demo-guide-template.md');

    assert.match(skill, /under the no-front-end rung/);
    assert.match(template, /only when a front-end is present[\s\S]*under the no-front-end rung/);
    assert.match(template, /primary surface as the main[\s\S]*do not write this note/);
});

test('session recovery documentation and ignore rules match the OS-temp state owner (TC-PROMPT-005)', async () => {
    const todoState = await read('.claude/hooks/lib/todo-state.cjs');
    const workflowState = await read('.claude/hooks/lib/workflow-state.cjs');
    const maintainer = await read('.claude/agents/framework-maintainer.md');
    const workflowEnd = await read('.claude/skills/workflow-end/SKILL.md');

    // The `.claude/**` half travels inside the portable bundle, so it is UNCONDITIONAL.
    assert.match(todoState, /path\.join\(CK_TMP_DIR, 'todo'\)/);
    assert.match(workflowState, /path\.join\(CK_TMP_DIR, 'workflow'\)/);
    assert.match(maintainer, /OS-temp `CK_TMP_DIR` namespaces/);
    assert.match(workflowEnd, /CK_TMP_DIR\/workflow\/\{sessionId\}\.json/);

    // The root `.gitignore` is PROJECT-OWNED — `export-claude` ships none, for the same reason it
    // ships no package.json (PORT-007). Reading it unconditionally threw ENOENT in a bare adopter
    // and failed the whole `tests` stage on a file the bundle never claimed to provide. An adopter
    // that HAS a `.gitignore` has not necessarily adopted the framework's ignore rules either, so
    // existence alone is not the right gate — this is a self-check of this repo's own root, exactly
    // the class `framework-repo.helper.mjs` documents (the `.prettierignore` precedent in
    // `mirror-write-guards.test.mjs`). PORT-011 keeps the guard from silently disabling.
    const gitignore = readFrameworkRootFile(repoRoot, '.gitignore');
    if (gitignore === null) return;
    assert.match(gitignore, /^\.claude\/.todo-state\.json$/m);
    assert.match(gitignore, /^\.claude\/.workflow-state\.json$/m);
    assert.match(gitignore, /^\/tmp\/$/m);
    assert.match(gitignore, /^\/temp\/$/m);
});

// The universal protocols live once in the canonical file; the universal hook delivers their projection
// files. The generated project root carries none of them, so the template must not regrow a copy.
const UNIVERSAL_SECTION_HEADINGS = [
    'Generated Artifact Storage',
    'Task Planning Rules',
    'Workflow Step Advancement & Parallel Phases',
    'Evidence-Based Reasoning & Investigation',
    'Git & Version-Control Discipline',
];

test('disposable generated-artifact policy is one universal protocol, delivered by the hook and absent from the root template (TC-PROMPT-008)', async () => {
    const [shared, projection, template] = await Promise.all([
        read('.claude/skills/shared/sync-inline-versions.md'),
        read('.claude/skills/shared/protocols/artifact-storage.md'),
        read('.claude/skills/ai-context-refresh/references/claude-md-template.md'),
    ]);

    for (const [name, content] of [['canonical', shared], ['projection', projection]]) {
        assert.match(content, /Store disposable generated output in the project workspace/, `${name} carries the universal rule`);
        assert.match(content, /project-root \`tmp\/\` or \`temp\/\`/, `${name} carries the temp-path contract`);
        assert.match(content, /integration\/E2E (test )?results/, `${name} names the artifact kinds`);
    }
    assert.match(shared, /tmp\/reports/);
    assert.match(shared, /tmp\/analysis/);
    for (const heading of UNIVERSAL_SECTION_HEADINGS) {
        assert.doesNotMatch(template, new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'), `the template must not regrow the universal section "${heading}"`);
    }
});

test('main-agent work is preferred while task-graph analysis and parallel limits retain their owners (TC-PROMPT-009)', async () => {
    const [template, planning, parallel, shared, concise] = await Promise.all([
        read('.claude/skills/ai-context-refresh/references/claude-md-template.md'),
        read('.claude/skills/shared/protocols/task-planning-rules.md'),
        read('.claude/skills/shared/protocols/workflow-step-advancement.md'),
        read('.claude/skills/shared/sync-inline-versions.md'),
        read('.claude/skills/shared/protocols/concise-agent-core.md'),
    ]);
    const anchor = /Analyze the task graph BEFORE executing/g;

    assert.equal((planning.match(anchor) || []).length, 1, 'the task-planning protocol carries the task-graph rule exactly once');
    assert.equal((template.match(anchor) || []).length, 0, 'the root template carries no copy of it');
    assert.match(planning, /dependencies[\s\S]*write targets[\s\S]*waves[\s\S]*\`SEQ\`/, 'dependency to wave ordering');
    assert.match(planning, /re-run the analysis/i, 're-analysis when tasks are added');
    for (const text of [planning, concise]) {
        assert.match(text, /Prefer work in the main agent\./, 'both prompt profiles prefer the main agent');
        assert.match(text, /Use a sub-agent only when authorized and there is a strong reason/, 'delegation requires authority and a reason');
        assert.doesNotMatch(text, /Serial execution of independent tasks is a defect/, 'independent tasks do not compel delegation');
    }
    // No second copy of the parallel-dispatch contract: its limits stay owned by the parallel protocol.
    assert.doesNotMatch(planning, /Do NOT parallelize:|Never parallelize shared writers/, 'exclusions are referenced, not restated');
    assert.match(planning, /follow the Workflow Step Advancement & Parallel Phases limits/, 'the rule defers to the parallel protocol');
    assert.match(parallel, /Declare waves before work/, 'the parallel protocol owns the wave-declaration contract');
    assert.match(parallel, /Never parallelize shared writers/, 'the parallel protocol owns the exclusions');
    // The projection files are projections: the canonical file holds the same rule text.
    assert.match(shared, /Analyze the task graph BEFORE executing/);
});

test('active-plan and workflow-end prompts agree with live state ownership (TC-PROMPT-006)', async () => {
    const [presentation, accumulation, activePlan, workflowEnd] = await Promise.all([
        read('.claude/skills/feature-presentation/SKILL.md'),
        read('.claude/skills/feature-presentation/references/artifact-accumulation.md'),
        read('.claude/scripts/set-active-plan.cjs'),
        read('.claude/skills/workflow-end/SKILL.md'),
    ]);

    for (const content of [presentation, accumulation, activePlan]) {
        assert.match(content, /CK_TMP_DIR\/session\/(?:\{id\}|\{sessionId\})\.json/);
        assert.doesNotMatch(content, /\/tmp\/ck-session-\{id\}\.json/);
    }

    assert.match(workflowEnd, /per-session state is retained until explicit `\/clear`/);
    assert.doesNotMatch(workflowEnd, /clear-workflow-state/);
    assert.equal(
        (workflowEnd.match(/^\*\*IMPORTANT MANDATORY Steps:/gm) || []).length,
        1,
        'workflow-end must have one authoritative mandatory sequence',
    );
});

test('why-review council suppression resolves the project-owned workflow state (TC-PROMPT-007)', async () => {
    const whyReview = await readSkillContract('why-review');
    const workflowState = await read('.claude/hooks/lib/workflow-state.cjs');

    assert.match(whyReview, /resolve the current `workflowId` from host-injected workflow context/);
    assert.match(whyReview, /CK_TMP_DIR\/workflow\/\{sessionId\}\.json/);
    assert.match(whyReview, /Never assume the legacy file exists/);
    assert.match(whyReview, /workflowId = unavailable/);
    assert.match(workflowState, /Storage: CK_TMP_DIR\/workflow\/\{sessionId\}\.json/);
});
