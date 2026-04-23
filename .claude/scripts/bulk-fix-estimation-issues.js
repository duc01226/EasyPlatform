const fs = require('fs');
const path = require('path');

// Fix 1 (Critical): Testing ratio text — computed ratios from breakdown are 33-40%, not 25%
const OLD_TESTING_RATIO = '> **Testing ratio:** Traditional ≈ 35% of total time. AI ≈ 25% (AI scaffolds tests, human verifies assertions).';
const NEW_TESTING_RATIO = '> **Testing ratio:** Traditional ≈ 35-40% of total time. AI ≈ 33-40% (AI scaffolds test boilerplate; human verification unchanged).';

// Fix 2 (High): Reminder "SP > 8 = split" — table says SP13=SHOULD split, SP21=MUST split
const OLD_SPLIT = 'SP > 8 = split.';
const NEW_SPLIT = 'SP 13 SHOULD split, SP 21 MUST split.';

const skillsDir = 'D:/GitSources/BravoSuite/.claude/skills';

// Files with SYNC:estimation-framework block (all updated in previous session)
const blockFiles = [
    'shared/sync-inline-versions.md',
    'plan/SKILL.md',
    'plan-fast/SKILL.md',
    'plan-hard/SKILL.md',
    'planning/SKILL.md',
    'plan-ci/SKILL.md',
    'plan-cro/SKILL.md',
    'plan-parallel/SKILL.md',
    'plan-two/SKILL.md',
    'fix/SKILL.md',
    'fix-fast/SKILL.md',
    'fix-hard/SKILL.md',
    'fix-parallel/SKILL.md',
    'fix-test/SKILL.md',
    'fix-ui/SKILL.md',
    'fix-ci/SKILL.md',
    'fix-issue/SKILL.md',
    'fix-logs/SKILL.md',
    'debug-investigate/SKILL.md',
    'debug/SKILL.md',
    'refine/SKILL.md',
    'story/SKILL.md'
];

let fix1Count = 0;
let fix2Count = 0;

blockFiles.forEach(rel => {
    const f = path.join(skillsDir, rel);
    if (!fs.existsSync(f)) {
        console.log('NOT FOUND: ' + rel);
        return;
    }

    let content = fs.readFileSync(f, 'utf8');
    let changed = false;

    if (content.includes(OLD_TESTING_RATIO)) {
        content = content.replace(OLD_TESTING_RATIO, NEW_TESTING_RATIO);
        fix1Count++;
        changed = true;
        console.log('Fix1 (testing ratio): ' + rel);
    }

    if (content.includes(OLD_SPLIT)) {
        content = content.replace(OLD_SPLIT, NEW_SPLIT);
        fix2Count++;
        changed = true;
        console.log('Fix2 (SP split): ' + rel);
    }

    if (changed) fs.writeFileSync(f, content, 'utf8');
});

console.log(`\nFix1 applied to ${fix1Count} files`);
console.log(`Fix2 applied to ${fix2Count} files`);
