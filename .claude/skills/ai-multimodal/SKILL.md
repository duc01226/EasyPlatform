---
name: ai-multimodal
version: 2.0.0
description: '[AI & Tools] Process and generate multimedia content using Google Gemini API -- vision analysis, audio transcription, video processing, document extraction, image/video generation. Triggers on multimodal, vision API, image recognition, audio transcription, video analysis, gemini, imagen, document extraction.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

## Quick Summary

**Goal:** Process and generate multimedia content (images, audio, video, documents) using Google Gemini API via Python scripts.

**Workflow:**

1. **Identify Modality** — Match input type to task (analyze, transcribe, extract, generate)
2. **Check Limits** — Inline max 20MB, File API max 2GB; split large audio at 15min chunks
3. **Execute** — Run `gemini_batch_process.py` with appropriate task and files
4. **Post-Process** — Format output as markdown with timestamps, save generated content

**Key Rules:**

- Requires `GEMINI_API_KEY` environment variable
- Always request specific nodes/files, avoid full-file downloads
- Use `media_optimizer.py` to compress/split files exceeding limits

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# AI Multimodal

## Purpose

Process audio, images, videos, and documents or generate images/videos using Google Gemini's multimodal API via bundled Python scripts.

## When to Use

- Analyzing images or screenshots (Gemini vision is preferred over Claude's built-in vision for complex tasks)
- Transcribing audio files (meetings, podcasts, interviews)
- Extracting data from PDFs, scanned documents, or charts
- Processing video content (scene detection, temporal Q&A)
- Generating images with Imagen 4 or videos with Veo 3
- Converting documents to markdown with visual understanding

## When NOT to Use

- Simple text-only LLM calls -- use Claude directly
- Reading a file Claude can already read (code, markdown, JSON) -- use `Read` tool
- Building AI-powered application features -- use `api-design` or `frontend-design`
- Music composition workflows -- load `references/music-generation.md` only when specifically requested
- General prompt engineering -- use `ai-artist` skill

## Prerequisites

```bash
export GEMINI_API_KEY="your-key"  # From https://aistudio.google.com/apikey
pip install google-genai python-dotenv pillow
python scripts/check_setup.py  # Verify setup
```

Optional: API key rotation for rate limits (set `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`).

## Workflow

### Step 1: Identify Modality

| Input Type           | Task                  | Command                 |
| -------------------- | --------------------- | ----------------------- |
| Image (PNG/JPG/WEBP) | Analyze, caption, OCR | `--task analyze`        |
| Audio (WAV/MP3/AAC)  | Transcribe, summarize | `--task transcribe`     |
| Video (MP4/MOV)      | Scene detection, Q&A  | `--task analyze`        |
| PDF/Document         | Extract tables, forms | `--task extract`        |
| Text prompt          | Generate image        | `--task generate`       |
| Text prompt          | Generate video        | `--task generate-video` |

### Step 2: Check Limits

- **Inline upload**: max 20MB
- **File API**: max 2GB (auto-used for large files)
- **Audio transcription**: split at 15-minute chunks for full transcript
- **Video transcription**: extract audio first, then split and transcribe
- **Formats**: Audio (WAV/MP3/AAC, up to 9.5h), Images (PNG/JPEG/WEBP, up to 3.6k), Video (MP4/MOV, up to 6h), PDF (up to 1k pages)

IF file exceeds limits, use `scripts/media_optimizer.py` to compress/split first.

### Step 3: Execute

**Quick check**: If `gemini` CLI is available, use: `"<prompt>" | gemini -y -m gemini-2.5-flash`

**Standard**: Use the batch processing script:

```bash
# Analyze media
python scripts/gemini_batch_process.py --files <file> --task <analyze|transcribe|extract>

# Generate content
python scripts/gemini_batch_process.py --task generate --prompt "description"
python scripts/gemini_batch_process.py --task generate-video --prompt "description"
```

**Stdin support**: `cat image.png | python scripts/gemini_batch_process.py --task analyze --prompt "Describe this"`

### Step 4: Post-Processing

- For transcripts: output in markdown with `[HH:MM:SS -> HH:MM:SS]` timestamps
- For document extraction: save as structured markdown under `docs/assets/`
- For generated images/videos: save to working directory with descriptive filename

### Step 5: Verification

- Confirm output matches expected format and completeness
- For long transcripts: verify no truncation occurred (check chunk boundaries)
- For generated content: verify quality meets prompt requirements

## Models

| Purpose                    | Model                           | Notes                   |
| -------------------------- | ------------------------------- | ----------------------- |
| Analysis (fast)            | `gemini-2.5-flash`              | Recommended default     |
| Analysis (advanced)        | `gemini-2.5-pro`                | Complex reasoning tasks |
| Image generation           | `imagen-4.0-generate-001`       | Standard quality        |
| Image generation (quality) | `imagen-4.0-ultra-generate-001` | Best quality            |
| Image generation (speed)   | `imagen-4.0-fast-generate-001`  | Fastest                 |
| Video generation           | `veo-3.1-generate-preview`      | 8s clips with audio     |

## Scripts Reference

- **`gemini_batch_process.py`** -- CLI orchestrator for all tasks, auto-resolves API keys and models
- **`media_optimizer.py`** -- Compress/resize/split media to fit Gemini limits
- **`document_converter.py`** -- Convert PDFs/images/Office docs to markdown
- **`check_setup.py`** -- Verify environment, dependencies, and API key

Use `--help` on any script for full options.

## Examples

### Example 1: Transcribe a Meeting Recording

**Input**: 45-minute meeting audio file `meeting-2025-01-15.mp3`

**Steps**:

1. File is >15min, so split first:
    ```bash
    python scripts/media_optimizer.py --input meeting-2025-01-15.mp3 --split-duration 900
    ```
2. Transcribe each chunk:
    ```bash
    python scripts/gemini_batch_process.py --files meeting-part-*.mp3 --task transcribe
    ```
3. Output: Markdown file with timestamps, speaker detection, and metadata (duration, topics covered)

### Example 2: Extract Data from a PDF Report

**Input**: Quarterly HR report PDF with tables, charts, and forms

**Steps**:

1. Convert and extract:
    ```bash
    python scripts/document_converter.py --input quarterly-report.pdf --output docs/assets/
    ```
2. Output: Structured markdown with tables preserved, chart descriptions, and form field values extracted

## Detailed References

Load for in-depth guidance:

| Topic                 | File                                 |
| --------------------- | ------------------------------------ |
| Audio processing      | `references/audio-processing.md`     |
| Vision/image analysis | `references/vision-understanding.md` |
| Image generation      | `references/image-generation.md`     |
| Video analysis        | `references/video-analysis.md`       |
| Video generation      | `references/video-generation.md`     |
| Music generation      | `references/music-generation.md`     |

## Related Skills

- `ai-artist` -- for prompt engineering and optimization (not media processing)
- `media-processing` -- for FFmpeg-based audio/video encoding without AI
- `pdf-to-markdown` -- for simple PDF text extraction without vision AI

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
