# Excalidraw JSON Schema

## Element Types

| Type | Use For |
|------|---------|
| `rectangle` | Processes, actions, components |
| `ellipse` | Entry/exit points, external systems |
| `diamond` | Decisions, conditionals |
| `arrow` | Connections between shapes |
| `text` | Labels inside shapes |
| `line` | Non-arrow connections |
| `frame` | Grouping containers |

## Common Properties

All elements share these:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `type` | string | Element type |
| `x`, `y` | number | Position in pixels |
| `width`, `height` | number | Size in pixels |
| `strokeColor` | string | Border color (hex) |
| `backgroundColor` | string | Fill color (hex or "transparent") |
| `fillStyle` | string | "solid", "hachure", "cross-hatch" |
| `strokeWidth` | number | 1, 2, or 4 |
| `strokeStyle` | string | "solid", "dashed", "dotted" |
| `roughness` | number | 0 (smooth), 1 (default), 2 (rough) |
| `opacity` | number | 0-100 |
| `seed` | number | Random seed for roughness |

## Text-Specific Properties

| Property | Description |
|----------|-------------|
| `text` | The display text |
| `originalText` | Same as text |
| `fontSize` | Size in pixels (16-20 recommended) |
| `fontFamily` | 3 for monospace (use this) |
| `textAlign` | "left", "center", "right" |
| `verticalAlign` | "top", "middle", "bottom" |
| `containerId` | ID of parent shape |

## Arrow-Specific Properties

| Property | Description |
|----------|-------------|
| `points` | Array of [x, y] coordinates (2 pts = straight, 3 pts = curved, 4 pts = elbowed) |
| `startBinding` | Connection to start shape (use modern `mode` + `fixedPoint` format) |
| `endBinding` | Connection to end shape (use modern `mode` + `fixedPoint` format) |
| `startArrowhead` | null, "arrow", "bar", "dot", "triangle" |
| `endArrowhead` | null, "arrow", "bar", "dot", "triangle" |
| `roundness` | `{"type": 2}` for curved arrows (smooth spline interpolation) |
| `elbowed` | `true` for right-angle routed arrows |
| `fixedSegments` | Array of pinned segments for elbowed arrows |
| `startIsSpecial` | `false` for elbowed arrows (prevents auto-rerouting) |
| `endIsSpecial` | `false` for elbowed arrows (prevents auto-rerouting) |

## Binding Format (Modern)

Use the modern binding format with `mode` and `fixedPoint`:

```json
{
  "elementId": "shapeId",
  "mode": "orbit",
  "fixedPoint": [1, 0.5]
}
```

| Mode       | Use When                                                                    |
|------------|-----------------------------------------------------------------------------|
| `"orbit"`  | Arrow attaches to shape's outer edge, can slide along perimeter (default)   |
| `"inside"` | Arrow starts/ends from inside the shape (vertical drops within a column)    |

`fixedPoint` is `[xRatio, yRatio]` normalized to the shape's bounding box (0-1 range, values outside for above/below).

## Arrow Routing Strategies

| Strategy | When to Use | Key Properties |
|----------|-------------|----------------|
| **Straight** (2 pts) | Direct neighbors, clear path | Default — no extra props |
| **Curved** (3 pts) | Would overlap other elements if straight | `roundness: {"type": 2}` |
| **Elbowed** (4 pts) | Same-row entities with many obstacles between | `elbowed: true`, `fixedSegments` |

## Rectangle Roundness

Add for rounded corners:

```json
"roundness": { "type": 3 }
```
