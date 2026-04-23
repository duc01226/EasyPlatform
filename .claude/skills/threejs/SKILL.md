---
name: threejs
description: 'Build 3D web apps with Three.js (WebGL/WebGPU). 556 searchable examples, 60 API classes, 20 use cases. Actions: create 3D scene, load model, add animation, implement physics, build VR/XR. Topics: GLTF loader, PBR materials, particle effects, shadows, post-processing, compute shaders, TSL. Integrations: WebGPU, physics engines, spatial audio.'
license: MIT
version: 3.0.0
argument-hint: '[3D scene or feature]'
---

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

# Three.js Development

Build high-performance 3D web applications using Three.js. Contains 556 searchable examples across 13 categories, 60 API classes, and 20 use-case templates.

## When to Use

- Building 3D scenes, games, or visualizations
- Loading 3D models (GLTF, FBX, OBJ)
- Implementing animations, physics, or VR/XR
- Creating particle effects or custom shaders
- Optimizing rendering performance

## Search Examples & API

Use the search CLI to find relevant examples and API references:

```bash
python3 .claude/skills/threejs/scripts/search.py "<query>" [--domain <domain>] [-n <max_results>]
```

### Search Domains

| Domain       | Use For                 | Example Query            |
| ------------ | ----------------------- | ------------------------ |
| `examples`   | Find code examples      | `"particle effects gpu"` |
| `api`        | Class/method reference  | `"PerspectiveCamera"`    |
| `use-cases`  | Project recommendations | `"product configurator"` |
| `categories` | Browse categories       | `"webgpu"`               |

### Quick Examples

```bash
# Find particle/compute examples
python3 .claude/skills/threejs/scripts/search.py "particle compute webgpu"

# Search API for camera classes
python3 .claude/skills/threejs/scripts/search.py "camera" --domain api

# Get examples for a use case
python3 .claude/skills/threejs/scripts/search.py "product configurator" --use-case

# Filter by category
python3 .claude/skills/threejs/scripts/search.py --category webgpu -n 10

# Filter by complexity
python3 .claude/skills/threejs/scripts/search.py --complexity high -n 5
```

## Example Categories

| Category                 | Count | Description                     |
| ------------------------ | ----- | ------------------------------- |
| `webgl`                  | 216   | Standard WebGL rendering        |
| `webgpu (wip)`           | 190   | Modern WebGPU + compute shaders |
| `webgl / advanced`       | 48    | Low-level GPU, custom shaders   |
| `webgl / postprocessing` | 27    | Bloom, SSAO, SSR, DOF           |
| `webxr`                  | 26    | VR/AR experiences               |
| `physics`                | 13    | Physics simulation              |

## Common Use Cases

| Use Case             | Recommended                  | Complexity |
| -------------------- | ---------------------------- | ---------- |
| Product Configurator | GLTF, PBR, EnvMaps           | Medium     |
| Game Development     | Animation, Physics, Controls | High       |
| Data Visualization   | BufferGeometry, Points       | Medium     |
| 360 Panorama         | Equirectangular, WebXR       | Low        |
| Architectural Viz    | GLTF, HDR, CSM Shadows       | High       |

## Quick Start

```javascript
// 1. Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// 2. Lighting
scene.add(new THREE.AmbientLight(0x404040));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// 3. Load GLTF Model
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const loader = new GLTFLoader();
loader.load('model.glb', gltf => scene.add(gltf.scene));

// 4. Animation Loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
```

## Progressive Reference Files

### Level 1: Fundamentals

- `references/00-fundamentals.md` - Core concepts, scene graph
- `references/01-getting-started.md` - Setup, basic rendering

### Level 2: Common Tasks

- `references/02-loaders.md` - GLTF, FBX, OBJ loaders
- `references/03-textures.md` - Texture types, mapping
- `references/04-cameras.md` - Camera types, controls
- `references/05-lights.md` - Light types, shadows
- `references/06-animations.md` - AnimationMixer, clips
- `references/11-materials.md` - PBR, standard materials
- `references/18-geometry.md` - BufferGeometry, primitives

### Level 3: Interactive

- `references/08-interaction.md` - Raycasting, picking
- `references/09-postprocessing.md` - Bloom, SSAO, SSR
- `references/10-controls.md` - OrbitControls, etc.

### Level 4: Advanced

- `references/12-performance.md` - Instancing, LOD, batching
- `references/13-node-materials.md` - TSL shader graphs
- `references/17-shader.md` - Custom GLSL shaders

### Level 5: Specialized

- `references/14-physics-vr.md` - Physics, WebXR
- `references/16-webgpu.md` - WebGPU, compute shaders

## External Resources

- Docs: https://threejs.org/docs/
- Examples: https://threejs.org/examples/
- Editor: https://threejs.org/editor/
- Discord: https://discord.gg/56GBJwAnUS

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
    <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
