const fs = require('fs');

// Format 1: plan/* and fix/* files (2-space indent)
const OLD_STANDARD = `  <!-- SYNC:estimation-framework:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** include \`story_points\` and \`complexity\` in plan frontmatter. SP > 8 = split.
  <!-- /SYNC:estimation-framework:reminder -->`;

const NEW_STANDARD = `  <!-- SYNC:estimation-framework:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** include \`story_points\`, \`complexity\`, \`man_days_traditional\`, \`man_days_ai\` in plan/PBI frontmatter. Use SP table: SP 1=0.5d/0.25d, SP 2=1d/0.4d, SP 3=2d/0.8d, SP 5=4d/2d, SP 8=6d/3d. SP > 8 = split.
  <!-- /SYNC:estimation-framework:reminder -->`;

// Format 2: story/SKILL.md (blank line, less indent on closing tag)
const OLD_STORY = `<!-- SYNC:estimation-framework:reminder -->

- **IMPORTANT MUST ATTENTION** estimate story points using Modified Fibonacci (1-21). SP >8 MUST ATTENTION split, >5 SHOULD split.
  <!-- /SYNC:estimation-framework:reminder -->`;

const NEW_STORY = `<!-- SYNC:estimation-framework:reminder -->

- **IMPORTANT MUST ATTENTION** estimate story points using Modified Fibonacci (1-21). Output \`story_points\`, \`complexity\`, \`man_days_traditional\`, \`man_days_ai\`. SP >8 MUST ATTENTION split, >5 SHOULD split.
  <!-- /SYNC:estimation-framework:reminder -->`;

// Format 3: refine/SKILL.md (2-space indent, no blank line)
const OLD_REFINE = `  <!-- SYNC:estimation-framework:reminder -->
- **IMPORTANT MUST ATTENTION** estimate story points using Modified Fibonacci (1-21). SP >8 MUST ATTENTION split, >5 SHOULD split.
  <!-- /SYNC:estimation-framework:reminder -->`;

const NEW_REFINE = `  <!-- SYNC:estimation-framework:reminder -->
- **IMPORTANT MUST ATTENTION** estimate story points using Modified Fibonacci (1-21). Output \`story_points\`, \`complexity\`, \`man_days_traditional\`, \`man_days_ai\`. SP >8 MUST ATTENTION split, >5 SHOULD split.
  <!-- /SYNC:estimation-framework:reminder -->`;

const standardFiles = [
    'D:/GitSources/BravoSuite/.claude/skills/plan/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/plan-fast/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/plan-hard/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/planning/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/plan-ci/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/plan-cro/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/plan-parallel/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/plan-two/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-fast/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-hard/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-parallel/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-test/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-ui/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-ci/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-issue/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/fix-logs/SKILL.md',
    'D:/GitSources/BravoSuite/.claude/skills/debug-investigate/SKILL.md'
];

function update(file, oldStr, newStr) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(oldStr)) {
        content = content.replace(oldStr, newStr);
        fs.writeFileSync(file, content, 'utf8');
        console.log('UPDATED: ' + file.split('/').slice(-2).join('/'));
    } else {
        console.log('NOT FOUND (skipped): ' + file.split('/').slice(-2).join('/'));
    }
}

standardFiles.forEach(f => update(f, OLD_STANDARD, NEW_STANDARD));
update('D:/GitSources/BravoSuite/.claude/skills/story/SKILL.md', OLD_STORY, NEW_STORY);
update('D:/GitSources/BravoSuite/.claude/skills/refine/SKILL.md', OLD_REFINE, NEW_REFINE);
