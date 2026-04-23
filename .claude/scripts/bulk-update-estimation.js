const fs = require('fs');

const OLD = `<!-- SYNC:estimation-framework -->

> **Estimation** — Modified Fibonacci: 1(trivial) → 2(small) → 3(medium) → 5(large) → 8(very large) → 13(epic, SHOULD split) → 21(MUST ATTENTION split). Output \`story_points\` and \`complexity\` in plan frontmatter. Complexity auto-derived: 1-2=Low, 3-5=Medium, 8=High, 13+=Critical.

<!-- /SYNC:estimation-framework -->`;

const NEW = `<!-- SYNC:estimation-framework -->

> **Estimation Framework** — Story Points (Modified Fibonacci) + Man-Days for 3-5yr dev (6 productive hrs/day, .NET + Angular stack). AI estimate assumes Claude Code with good project context (code graph, patterns, hooks active).
>
> | SP | Complexity | Description | Traditional (code + test) | AI-Assisted (code + test) |
> |----|-----------|-------------|--------------------------|--------------------------|
> | 1 | Low | Trivial: single field, config flag, CSS fix | 0.5d (0.3d + 0.2d) | 0.25d (0.15d + 0.1d) |
> | 2 | Low | Small: simple CRUD endpoint OR basic component | 1d (0.6d + 0.4d) | 0.4d (0.25d + 0.15d) |
> | 3 | Medium | Medium: form + API + validation | 2d (1.3d + 0.7d) | 0.8d (0.5d + 0.3d) |
> | 5 | Medium | Large: multi-layer feature (BE + FE) | 4d (2.5d + 1.5d) | 2d (1.3d + 0.7d) |
> | 8 | High | Very large: complex feature + migration | 6d (4d + 2d) | 3d (2d + 1d) |
> | 13 | Critical | Epic: cross-service — SHOULD split | 10d (6.5d + 3.5d) | 6d (4d + 2d) |
> | 21 | Critical | MUST split — not sprint-ready | >15d | >10d |
>
> **AI speedup:** 2-2.5x for SP 1-3 (pattern-heavy CQRS/Angular boilerplate), ~2x for SP 5-8, ~1.7x for SP 13. Source: GitHub Copilot trial (55.8% faster), enterprise adoption data (26% avg), calibrated for domain-heavy .NET/Angular work.
> **Testing ratio:** Traditional ≈ 35% of total time. AI ≈ 25% (AI scaffolds tests, human verifies assertions).
> Output \`story_points\`, \`complexity\`, \`man_days_traditional\`, \`man_days_ai\` in plan/PBI frontmatter.

<!-- /SYNC:estimation-framework -->`;

const files = [
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
