# Component Relationship Graph Template

Generate a Mermaid diagram showing the component hierarchy for the matched component.

## Layer Colors

| Layer | Color | Node prefix |
|-------|-------|-------------|
| Page component | Blue (#4A90D9) | PAGE |
| Domain component | Green (#2ECC71) | DOMAIN |
| Domain shared (_shared/) | Teal (#1ABC9C) | SHARED |
| Common component (shared library) | Yellow (#F1C40F) | COMMON |
| Platform component | Gray (#95A5A6) | PLATFORM |

## Template

```mermaid
graph TD
    PAGE["Page: {selector}<br/>{routePath}<br/>{app}"]
    DOMAIN1["Domain: {selector}<br/>{lib}"]
    COMMON1["Common: {selector}<br/>{common-lib}"]

    PAGE --> DOMAIN1
    DOMAIN1 --> COMMON1

    classDef page fill:#4A90D9,color:white
    classDef domain fill:#2ECC71,color:white
    classDef shared fill:#1ABC9C,color:white
    classDef common fill:#F1C40F,color:black
    classDef platform fill:#95A5A6,color:white

    class PAGE page
    class DOMAIN1 domain
    class COMMON1 common
```

## How to Build the Graph

1. Start with the matched component as the root node
2. Read its `childSelectors` from the index
3. For each child selector, look up the component in `selectorIndex`
4. Classify each child by layer (page/domain/common/platform)
5. Add edges from parent to child
6. Recurse one level deep for domain components (show their common children)
7. Do NOT recurse into common components (they're leaf nodes in the graph)

## Graph Rules

- **Max depth**: 2 levels (page -> domain -> common)
- **Max nodes**: 15 (truncate with "... and N more" if exceeded)
- **Deduplicate**: If the same common component appears under multiple domains, show it once with multiple edges
- **Root highlighting**: The matched component gets a thicker border or bold label
- **Version label**: Add (V1) or (V2) suffix if mixing Angular versions

## When Matched Component is a Reusable Component

If the match is a `libs/` component (not a page), reverse the graph:

```mermaid
graph BT
    MATCHED["Matched: {selector}<br/>{lib}"]
    CONSUMER1["Consumer: {parent1}<br/>{app1}"]
    CONSUMER2["Consumer: {parent2}<br/>{app2}"]

    CONSUMER1 --> MATCHED
    CONSUMER2 --> MATCHED

    classDef matched fill:#E74C3C,color:white
    classDef consumer fill:#4A90D9,color:white

    class MATCHED matched
    class CONSUMER1,CONSUMER2 consumer
```

Use `parentSelectors` from the index to find consumers. Limit to 10 consumers max.
