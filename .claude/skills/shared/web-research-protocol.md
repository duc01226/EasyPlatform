# Web Research Protocol

> **MANDATORY** for all skills that perform web research, cite external sources, or make claims based on web data.
> Every factual claim must be backed by cited sources. Fabrication is FORBIDDEN.

---

## Source Hierarchy

| Tier | Label | Examples | Usage |
|------|-------|----------|-------|
| **1** | Authoritative | .gov, .edu, official docs, peer-reviewed journals, W3C specs | Primary evidence — cite freely |
| **2** | Reputable | Industry reports (Gartner, McKinsey, Statista), major publications (HBR, Reuters, Bloomberg) | Strong evidence — cite with date |
| **3** | Credible | Established tech blogs, verified expert authors, Wikipedia, Stack Overflow (high-vote) | Supporting evidence — cross-validate |
| **4** | Unverified | Forums, personal blogs, social media, anonymous sources | Leads only — NEVER cite as fact |

## Cross-Validation Rules

1. Every factual claim requires **2+ independent sources** (different organizations/authors)
2. If only 1 source found → mark as `"Unverified — single source"`
3. If 0 sources found → state `"No evidence found for: {claim}"` — **NEVER fabricate**
4. Conflicting sources → present **BOTH views** with source attribution, note the discrepancy

## Recency Rules

| Topic Type | Flag Threshold | Examples |
|-----------|---------------|----------|
| Fast-moving (tech, markets, startups) | >6 months | AI models, crypto, SaaS pricing |
| Moderate (business, industry) | >2 years | Market reports, company strategies |
| Stable (history, science, law) | >5 years | Established frameworks, regulations |

Always note publication date in citation. Undated sources are Tier 4 by default.

## Citation Format

Inline: `[N]` referencing the Sources table

Sources table row:
```
| N | Title | URL | Author/Org | Date | Tier | Used In |
```

## Confidence Scoring

| Level | Criteria | Action |
|-------|----------|--------|
| **95-100%** | 3+ Tier 1-2 sources, consistent findings | Present as established fact |
| **80-94%** | 2+ sources with minor discrepancies | Present with minor caveats |
| **60-79%** | 1 credible source or conflicting sources | Present cautiously, flag uncertainty |
| **<60%** | Unverified or no sources | **Flag prominently** — do NOT present as fact |

**Format:** `Confidence: 85% — Based on [source1], [source2]; not verified against [gap]`

## Anti-Hallucination Rules

1. WebSearch returns empty → output: `"No results found for: {query}"`
2. WebFetch fails/times out → output: `"Source unavailable: {URL}"`
3. Conflicting sources → present BOTH, never pick one silently
4. Never infer beyond what sources explicitly state
5. Mark AI reasoning as `"Analysis:"` vs source facts as `"Source:"`
6. If uncertain about a claim → state uncertainty, do NOT fill gaps with plausible-sounding fabrications

## Search Strategy

1. **Vary query angles** — rephrase topic from 3+ perspectives (definition, comparison, criticism, trends, data)
2. **Start broad, narrow down** — general query first, then specific follow-ups
3. **Check recency** — add current year to queries for fast-moving topics
4. **Verify outlier claims** — if one source says something dramatically different, investigate further

## Working Files Convention

Intermediate artifacts (source maps, evidence bases) → write to `.claude/tmp/` directory:
- `_sources-{slug}.md` — Source map from web-research step
- `_evidence-{slug}.md` — Evidence base from deep-research step

These are cleaned after workflow completion. Final reports go to `docs/knowledge/`.
