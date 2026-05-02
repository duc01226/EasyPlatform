# Element Templates

Copy-paste JSON templates for each Excalidraw element type. The `strokeColor` and `backgroundColor` values are placeholders — always pull actual colors from `color-palette.md` based on the element's semantic purpose.

## Free-Floating Text (no container)

```json
{
    "type": "text",
    "id": "label1",
    "x": 100,
    "y": 100,
    "width": 200,
    "height": 25,
    "text": "Section Title",
    "originalText": "Section Title",
    "fontSize": 20,
    "fontFamily": 3,
    "textAlign": "left",
    "verticalAlign": "top",
    "strokeColor": "<title color from palette>",
    "backgroundColor": "transparent",
    "fillStyle": "solid",
    "strokeWidth": 1,
    "strokeStyle": "solid",
    "roughness": 0,
    "opacity": 100,
    "angle": 0,
    "seed": 11111,
    "version": 1,
    "versionNonce": 22222,
    "isDeleted": false,
    "groupIds": [],
    "boundElements": null,
    "link": null,
    "locked": false,
    "containerId": null,
    "lineHeight": 1.25
}
```

## Line (structural, not arrow)

```json
{
    "type": "line",
    "id": "line1",
    "x": 100,
    "y": 100,
    "width": 0,
    "height": 200,
    "strokeColor": "<structural line color from palette>",
    "backgroundColor": "transparent",
    "fillStyle": "solid",
    "strokeWidth": 2,
    "strokeStyle": "solid",
    "roughness": 0,
    "opacity": 100,
    "angle": 0,
    "seed": 44444,
    "version": 1,
    "versionNonce": 55555,
    "isDeleted": false,
    "groupIds": [],
    "boundElements": null,
    "link": null,
    "locked": false,
    "points": [
        [0, 0],
        [0, 200]
    ]
}
```

## Small Marker Dot

```json
{
    "type": "ellipse",
    "id": "dot1",
    "x": 94,
    "y": 94,
    "width": 12,
    "height": 12,
    "strokeColor": "<marker dot color from palette>",
    "backgroundColor": "<marker dot color from palette>",
    "fillStyle": "solid",
    "strokeWidth": 1,
    "strokeStyle": "solid",
    "roughness": 0,
    "opacity": 100,
    "angle": 0,
    "seed": 66666,
    "version": 1,
    "versionNonce": 77777,
    "isDeleted": false,
    "groupIds": [],
    "boundElements": null,
    "link": null,
    "locked": false
}
```

## Rectangle

```json
{
    "type": "rectangle",
    "id": "elem1",
    "x": 100,
    "y": 100,
    "width": 180,
    "height": 90,
    "strokeColor": "<stroke from palette based on semantic purpose>",
    "backgroundColor": "<fill from palette based on semantic purpose>",
    "fillStyle": "solid",
    "strokeWidth": 2,
    "strokeStyle": "solid",
    "roughness": 0,
    "opacity": 100,
    "angle": 0,
    "seed": 12345,
    "version": 1,
    "versionNonce": 67890,
    "isDeleted": false,
    "groupIds": [],
    "boundElements": [{ "id": "text1", "type": "text" }],
    "link": null,
    "locked": false,
    "roundness": { "type": 3 }
}
```

## Text (centered in shape)

```json
{
    "type": "text",
    "id": "text1",
    "x": 130,
    "y": 132,
    "width": 120,
    "height": 25,
    "text": "Process",
    "originalText": "Process",
    "fontSize": 16,
    "fontFamily": 3,
    "textAlign": "center",
    "verticalAlign": "middle",
    "strokeColor": "<text color — match parent shape's stroke or use 'on light/dark fills' from palette>",
    "backgroundColor": "transparent",
    "fillStyle": "solid",
    "strokeWidth": 1,
    "strokeStyle": "solid",
    "roughness": 0,
    "opacity": 100,
    "angle": 0,
    "seed": 11111,
    "version": 1,
    "versionNonce": 22222,
    "isDeleted": false,
    "groupIds": [],
    "boundElements": null,
    "link": null,
    "locked": false,
    "containerId": "elem1",
    "lineHeight": 1.25
}
```

## Arrow (Straight)

Use for short, direct connections between adjacent elements with a clear path.

```json
{
    "type": "arrow",
    "id": "arrow1",
    "x": 282,
    "y": 145,
    "width": 118,
    "height": 0,
    "strokeColor": "<arrow color — typically matches source element's stroke from palette>",
    "backgroundColor": "transparent",
    "fillStyle": "solid",
    "strokeWidth": 2,
    "strokeStyle": "solid",
    "roughness": 0,
    "opacity": 100,
    "angle": 0,
    "seed": 33333,
    "version": 1,
    "versionNonce": 44444,
    "isDeleted": false,
    "groupIds": [],
    "boundElements": null,
    "link": null,
    "locked": false,
    "points": [
        [0, 0],
        [118, 0]
    ],
    "startBinding": { "elementId": "elem1", "mode": "orbit", "fixedPoint": [1, 0.5] },
    "endBinding": { "elementId": "elem2", "mode": "orbit", "fixedPoint": [0, 0.5] },
    "startArrowhead": null,
    "endArrowhead": "arrow"
}
```

## Arrow (Curved)

**Use for arrows that would overlap other elements if drawn straight.** Adds a smooth arc that clears obstacles. This is the **primary strategy for preventing arrow overlap** in dense diagrams.

- Add `"roundness": {"type": 2}` to enable smooth curve interpolation
- Use 3 points: start, midpoint (offset vertically to arc above/below obstacles), end
- The midpoint Y offset controls arc height — use 15-30px for short arrows, 30-50px for long ones
- Negative Y offset = arc above, positive Y offset = arc below

```json
{
    "type": "arrow",
    "id": "arrow_curved1",
    "x": 282,
    "y": 145,
    "width": 200,
    "height": 25,
    "strokeColor": "<arrow color>",
    "backgroundColor": "transparent",
    "fillStyle": "solid",
    "strokeWidth": 2,
    "strokeStyle": "solid",
    "roughness": 0,
    "opacity": 100,
    "angle": 0,
    "seed": 33334,
    "version": 1,
    "versionNonce": 44445,
    "isDeleted": false,
    "groupIds": [],
    "boundElements": null,
    "link": null,
    "locked": false,
    "roundness": { "type": 2 },
    "points": [
        [0, 0],
        [100, -25],
        [200, 0]
    ],
    "startBinding": { "elementId": "elem1", "mode": "orbit", "fixedPoint": [1, 0.5] },
    "endBinding": { "elementId": "elem2", "mode": "orbit", "fixedPoint": [0, 0.5] },
    "startArrowhead": null,
    "endArrowhead": "arrow"
}
```

## Arrow (Elbowed / Right-Angle)

**Use when a curved arc isn't enough** — e.g., connecting elements in the same row with many obstacles between them. Creates an L-shaped or U-shaped path with right-angle turns.

- Set `"elbowed": true` (no `roundness` needed)
- Use 4 points for a U-shape: start → go up/down → horizontal segment → back to target
- `fixedSegments` pins the horizontal segment so Excalidraw doesn't auto-reroute it

```json
{
    "type": "arrow",
    "id": "arrow_elbowed1",
    "x": 183,
    "y": 590,
    "width": 140,
    "height": 15,
    "strokeColor": "<arrow color>",
    "backgroundColor": "transparent",
    "fillStyle": "solid",
    "strokeWidth": 2,
    "strokeStyle": "solid",
    "roughness": 0,
    "opacity": 100,
    "angle": 0,
    "seed": 33335,
    "version": 1,
    "versionNonce": 44446,
    "isDeleted": false,
    "groupIds": [],
    "boundElements": null,
    "link": null,
    "locked": false,
    "elbowed": true,
    "points": [
        [0, 0],
        [0, -15],
        [140, -15],
        [140, 0]
    ],
    "startBinding": { "elementId": "elem1", "mode": "orbit", "fixedPoint": [0.67, -0.2] },
    "endBinding": { "elementId": "elem2", "mode": "orbit", "fixedPoint": [0.5, -0.2] },
    "fixedSegments": [{ "index": 2, "start": [0, -15], "end": [140, -15] }],
    "startIsSpecial": false,
    "endIsSpecial": false,
    "startArrowhead": null,
    "endArrowhead": "arrow"
}
```

## Arrow Binding Modes

Bindings control how an arrow attaches to a shape. Use the modern `mode` + `fixedPoint` format:

```json
// "orbit" — arrow attaches to the shape's outer edge, can slide along perimeter
{"elementId": "shapeId", "mode": "orbit", "fixedPoint": [1, 0.5]}

// "inside" — arrow starts/ends from inside the shape (use for vertical drops within a column)
{"elementId": "shapeId", "mode": "inside", "fixedPoint": [0.5, 0.5]}
```

`fixedPoint` is normalized `[xRatio, yRatio]` relative to the shape's bounding box:

- `[0, 0.5]` = left center edge
- `[1, 0.5]` = right center edge
- `[0.5, 0]` = top center edge
- `[0.5, 1]` = bottom center edge
- Values outside 0-1 attach above/below the shape (e.g., `[0.5, -0.2]` = above top edge)
