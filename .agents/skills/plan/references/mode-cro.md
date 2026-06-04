# `$plan --mode=cro` — Conversion-Rate-Optimization reference

> Loaded by `plan/SKILL.md`'s Mode Dispatch when invoked as `$plan --mode=cro <content/issues-to-optimize>`. Adds the CRO domain framework + multimodal intake on top of the standard plan engine + `$plan-review` gate + `planner` agent — it does NOT replace them. (Migrated verbatim from the former `plan-cro` skill, consolidation M22.)

## Goal

Create a CRO (Conversion Rate Optimization) plan for the given content or feature. You are an expert in conversion optimization; analyze the content based on the given issues.

## Positional argument

`$ARGUMENTS` = the content / issues to optimize (optionally accompanied by screenshots, videos, or a URL — see Multimodal intake).

## Conversion Optimization Framework (apply all 25)

1. Headline 4-U Formula: **Useful, Unique, Urgent, Ultra-specific** (80% won't read past this)
2. Above-Fold Value Proposition: Customer problem focus, no company story, zero scroll required
3. CTA First-Person Psychology: "Get MY Guide" vs "Get YOUR Guide" (90% more clicks)
4. 5-Field Form Maximum: Every field kills conversions, progressive profiling for the rest
5. Message Match Precision: Ad copy, landing page headline, broken promises = bounce
6. Social Proof Near CTAs: Testimonials with faces/names, results, placed at decision points
7. Cognitive Bias Stack: Loss aversion (fear), social proof (FOMO), anchoring (pricing)
8. PAS Copy Framework: Problem > Agitate > Solve, emotion before logic
9. Genuine Urgency Only: Real deadlines, actual limits, fake timers destroy trust forever
10. Price Anchoring Display: Show expensive option first, make real price feel like relief
11. Trust Signal Clustering: Security badges, guarantees, policies all visible together
12. Visual Hierarchy F-Pattern: Eyes scan F-shape, put conversions in the path
13. Lead Magnet Hierarchy: Templates > Checklists > Guides (instant > delayed gratification)
14. Objection Preemption: Address top 3 concerns before they think them, FAQ near CTA
15. Mobile Thumb Zone: CTAs where thumbs naturally rest, not stretching required
16. One-Variable Testing: Change one thing, measure impact, compound wins over time
17. Post-Conversion Momentum: Thank you page sells next step while excitement peaks
18. Cart Recovery Sequence: Email in 1 hour, retarget in 4 hours, incentive at 24 hours
19. Reading Level Grade 6: Smart people prefer simple, 11-word sentences, short paragraphs
20. TOFU/MOFU/BOFU Logic: Awareness content ≠ decision content, match intent precisely
21. White Space = Focus: Empty space makes CTAs impossible to miss, crowded = confused
22. Benefit-First Language: Features tell, benefits sell, transformations compel
23. Micro-Commitment Ladder: Small yes leads to big yes, start with email only
24. Performance Tracking Stack: Heatmaps show problems, recordings show why, events show what
25. Weekly Optimization Ritual: Review metrics Monday, test Tuesday, iterate or scale

## Multimodal intake

- If the user provides screenshots or videos, use the `visual analysis tooling` skill to describe the issue in as much detail as possible so the CRO analyst can fully understand it from the description.
- If the user provides a URL, use the `web_fetch` tool to fetch the content and analyze current issues.
- You can use screenshot-capture tools with the `visual analysis tooling` skill to capture the exact parent container and analyze issues with the appropriate Gemini analysis skills (`visual analysis tooling`, `gemini-video-understanding`, or `gemini-document-processing`).

## Plan frontmatter overrides (vs the standard `plan` defaults)

```yaml
priority: P2
tags: [cro, conversion]
```

## Key rules

- PLANNING-ONLY: do not implement, only create the CRO plan.
- Focus on user behavior, conversion funnels, and measurable outcomes.
- Always offer `$plan-review` after plan creation (standard `plan` gate — unchanged).
- Be skeptical; every claim needs traced proof, confidence >80% to act.
