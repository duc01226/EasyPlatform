# Model Selection Guide

Reference for choosing the right Claude model for agents and skills.

## Available Models

| Model | ID | Best For | Context | Relative Cost |
|-------|-------|----------|---------|---------------|
| **Opus** | opus | Deep reasoning, complex tasks | 200K | $$$$ |
| **Sonnet** | sonnet | Balanced coding, default | 200K | $$ |

## Decision Tree

```
What's the task?
│
├─ Complex multi-step reasoning?
│  ├─ YES: Long-horizon autonomous work? → Opus
│  └─ NO: Continue below
│
├─ Code generation/modification?
│  └─ YES → Sonnet (optimized for coding)
│
├─ Fast iteration needed?
│  └─ YES → Sonnet (default, balanced speed and quality)
│
└─ Default → Sonnet
```

## Model Characteristics

### Opus 4.5

**Strengths:**
- Deep, nuanced reasoning
- Long-horizon autonomous tasks
- Handling ambiguity and edge cases
- Multi-step execution without drift

**Use When:**
- Planning complex implementations
- Architecture decisions
- Tasks requiring 30+ minutes of autonomous work
- Situations with high ambiguity

**BravoSUITE Examples:**
- `planner` agent - Complex planning sessions
- Architecture review skills (`arch-*`)
- Cross-service integration design

### Sonnet 4.5

**Strengths:**
- Exceptional coding performance
- Best balance of quality and speed
- Strong frontend/UI capabilities
- 1M token extended context available

**Use When:**
- Most development tasks (default)
- Code implementation
- Code review and analysis
- Documentation generation

**BravoSUITE Examples:**
- Most agents (inherit from parent)
- `fullstack-developer` agent
- `code-reviewer` agent
- Most implementation skills

## Agent Model Assignment

### Recommended Configuration

| Agent Role | Model | Rationale |
|------------|-------|-----------|
| Planning/Architecture | opus | Complex reasoning needed |
| Implementation | inherit (sonnet) | Coding optimized |
| Review/Analysis | inherit (sonnet) | Balance of depth/speed |
| Exploration/Scout | inherit (sonnet) | Balanced speed and quality |
| Documentation | inherit (sonnet) | Quality writing |

### When to Override

**Use `model: opus` when:**
- Agent makes architecture decisions
- Output drives significant downstream work
- Task requires 30+ min autonomous execution

**Use `model: inherit` when:**
- Default behavior acceptable
- Parent model choice appropriate
- Task is standard implementation

## Cost Considerations

| Scenario | Recommendation |
|----------|----------------|
| Budget unlimited | Opus for planning, Sonnet for coding |
| Budget conscious | Sonnet everywhere |
| High volume/scale | Sonnet for all tasks, Opus for complex planning |

## Configuration Examples

### Agent with Model Override

```markdown
---
name: planner
model: opus
description: Complex planning requiring deep reasoning
---
```

### Agent Inheriting Model

```markdown
---
name: code-reviewer
model: inherit
description: Code analysis with parent's model
---
```

### Skill with Model Hint

```markdown
---
name: arch-security-review
description: Security review. Consider using opus model for comprehensive analysis.
---
```

## Anti-Patterns

| Pattern | Issue | Fix |
|---------|-------|-----|
| Opus for simple tasks | Cost waste | Use Sonnet |
| Random model selection | Inconsistent results | Follow decision tree |
| Override without reason | Maintenance burden | Document rationale |

## References

- [Claude Models Overview](https://docs.anthropic.com/en/docs/about-claude/models/overview)
- [Skill Naming Conventions](skill-naming-conventions.md)
