# Planning Engine — Research & Analysis

### 1. Research & Analysis (**Skip if:** Provided with researcher reports)

#### Core Activities

##### Parallel Researcher Agents

- Spawn multiple `researcher` agents in parallel to investigate different approaches
- Wait for all researcher agents to report back before proceeding
- Each researcher investigates a specific aspect or approach

##### Sequential Thinking

- Use `sequential-thinking` skill for dynamic and reflective problem-solving
- Structured thinking process for complex analysis
- Enables multi-step reasoning with revision capability

##### Documentation Research

- Use `docs-seeker` skill to read and understand documentation
- Research plugins, packages, and frameworks
- Find latest technical documentation using llms.txt standard

##### GitHub Analysis

- Use `gh` command to read and analyze:
    - GitHub Actions logs
    - Pull requests
    - Issues and discussions
- Extract relevant technical context from GitHub resources

##### Remote Repository Analysis

When given GitHub repository URL, generate fresh codebase summary:

```bash
# usage:
repomix --remote <github-repo-url>
# example:
repomix --remote https://github.com/mrgoonie/human-mcp
```

##### Debugger Delegation

- Delegate to `debugger` agent for root cause analysis
- Use when investigating complex issues or bugs
- Debugger agent specializes in diagnostic tasks

#### Search Strategy

##### Primary: Gemini CLI

Check if `gemini` bash command is available:

```bash
gemini -m gemini-2.5-flash -p "...your search prompt..."
# Timeout: 10 minutes
```

Save output using `Report:` path from `## Naming` section (include all citations).

##### Fallback: WebSearch Tool

If gemini unavailable, use `WebSearch` tool. Run multiple searches in parallel.

##### Query Crafting

- Craft precise search queries with relevant keywords
- Include terms like "best practices", "2024", "latest", "security", "performance"
- Search for official documentation, GitHub repositories, and authoritative blogs
- Prioritize results from recognized authorities (official docs, major tech companies, respected developers)

##### IMPORTANT: 5-Research Limit

You are allowed to perform at most **5 researches (max 5 tool calls)**. User might request less. Think carefully based on the task before performing each research.

#### Deep Content Analysis

- When you find a potential GitHub repository URL, use `docs-seeker` skill to read it
- Focus on official documentation, API references, and technical specifications
- Analyze README files from popular GitHub repositories
- Review changelog and release notes for version-specific information

##### Video Content Research

- Prioritize content from official channels, recognized experts, and major conferences
- Focus on practical demonstrations and real-world implementations

##### Cross-Reference Validation

- Verify information across multiple independent sources
- Check publication dates to ensure currency
- Identify consensus vs. controversial approaches
- Note any conflicting information or debates in the community

#### Research Report Template

```markdown
# Research Report: [Topic]

## Executive Summary

[2-3 paragraph overview of key findings and recommendations]

## Research Methodology

- Sources consulted: [number]
- Date range of materials: [earliest to most recent]
- Key search terms used: [list]

## Key Findings

### 1. Technology Overview

[Comprehensive description of the technology/topic]

### 2. Current State & Trends

[Latest developments, version information, adoption trends]

### 3. Best Practices

[Detailed list of recommended practices with explanations]

### 4. Security Considerations

[Security implications, vulnerabilities, and mitigation strategies]

### 5. Performance Insights

[Performance characteristics, optimization techniques, benchmarks]

## Comparative Analysis

[If applicable, comparison of different solutions/approaches]

## Implementation Recommendations

### Quick Start Guide

[Step-by-step getting started instructions]

### Code Examples

[Relevant code snippets with explanations]

### Common Pitfalls

[Mistakes to avoid and their solutions]

## Resources & References

### Official Documentation

- [Linked list of official docs]

### Recommended Tutorials

- [Curated list with descriptions]

### Community Resources

- [Forums, Discord servers, Stack Overflow tags]

## Appendices

### A. Glossary

### B. Version Compatibility Matrix

### C. Raw Research Notes (optional)
```

#### Research Quality Standards

Ensure all research meets these criteria:

- **Accuracy**: Information is verified across multiple sources
- **Currency**: Prioritize information from the last 12 months unless historical context is needed
- **Completeness**: Cover all aspects requested by the user
- **Actionability**: Provide practical, implementable recommendations
- **Clarity**: Use clear language, define technical terms, provide examples
- **Attribution**: Always cite sources and provide links for verification

#### Special Considerations

- When researching security topics, always check for recent CVEs and security advisories
- For performance-related research, look for benchmarks and real-world case studies
- When investigating new technologies, assess community adoption and support levels
- For API documentation, verify endpoint availability and authentication requirements
- Always note deprecation warnings and migration paths for older technologies

#### Research Best Practices

- Research breadth before depth
- Document findings for synthesis phase
- Identify multiple approaches for comparison
- Consider edge cases during research
- Note security implications early
- Sacrifice grammar for concision in reports
- List unresolved questions at the end
