const fs = require('fs');

// Target just the inner text — indentation varies per file so we avoid matching it
const OLD = 'include `story_points` and `complexity` in plan frontmatter. SP > 8 = split.';
const NEW =
    'include `story_points`, `complexity`, `man_days_traditional`, `man_days_ai` in plan/PBI frontmatter. Use SP table: SP 1=0.5d/0.25d, SP 2=1d/0.4d, SP 3=2d/0.8d, SP 5=4d/2d, SP 8=6d/3d. SP > 8 = split.';

// Only update files where this text is inside a SYNC:estimation-framework:reminder block
const files = [
    'D:/GitSources/BravoSuite/.claude/skills/plan-hard/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/planning/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/plan-parallel/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/plan-two/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-fast/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-hard/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-parallel/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-test/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-ui/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-ci/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/debug-investigate/SKILL.md'
];

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (content.includes(OLD)) {
        content = content.replace(OLD, NEW);
        fs.writeFileSync(f, content, 'utf8');
        console.log('UPDATED: ' + f.split('/').slice(-2).join('/'));
    } else {
        console.log('NOT FOUND (skipped): ' + f.split('/').slice(-2).join('/'));
    }
});
