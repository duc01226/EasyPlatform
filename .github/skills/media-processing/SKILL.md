---
name: media-processing
description: Process multimedia files with FFmpeg (video/audio encoding, conversion, streaming, filtering, hardware acceleration), ImageMagick (image manipulation, format conversion, batch processing, effects, composition), and RMBG (AI-powered background removal). Use when converting media formats, encoding videos with specific codecs (H.264, H.265, VP9), resizing/cropping images, removing backgrounds from images, extracting audio from video, applying filters and effects, optimizing file sizes, creating streaming manifests (HLS/DASH), generating thumbnails, batch processing images, creating composite images, or implementing media processing pipelines. Supports 100+ formats, hardware acceleration (NVENC, QSV), and complex filtergraphs.
license: MIT
---

# Media Processing Skill

Process video, audio, and images using FFmpeg, ImageMagick, and RMBG CLI tools.

## Tool Selection

| Task | Tool | Reason |
|------|------|--------|
| Video encoding/conversion | FFmpeg | Native codec support, streaming |
| Audio extraction/conversion | FFmpeg | Direct stream manipulation |
| Image resize/effects | ImageMagick | Optimized for still images |
| Background removal | RMBG | AI-powered, local processing |
| Batch images | ImageMagick | mogrify for in-place edits |
| Video thumbnails | FFmpeg | Frame extraction built-in |
| GIF creation | FFmpeg/ImageMagick | FFmpeg for video, ImageMagick for images |

## Installation

```bash
# macOS
brew install ffmpeg imagemagick
npm install -g rmbg-cli

# Ubuntu/Debian
sudo apt-get install ffmpeg imagemagick
npm install -g rmbg-cli

# Verify
ffmpeg -version && magick -version && rmbg --version
```

## Essential Commands

```bash
# Video: Convert/re-encode
ffmpeg -i input.mkv -c copy output.mp4
ffmpeg -i input.avi -c:v libx264 -crf 22 -c:a aac output.mp4

# Video: Extract audio
ffmpeg -i video.mp4 -vn -c:a copy audio.m4a

# Image: Convert/resize
magick input.png output.jpg
magick input.jpg -resize 800x600 output.jpg

# Image: Batch resize
mogrify -resize 800x -quality 85 *.jpg

# Background removal
rmbg input.jpg                          # Basic (modnet)
rmbg input.jpg -m briaai -o output.png  # High quality
rmbg input.jpg -m u2netp -o output.png  # Fast
```

## Key Parameters

**FFmpeg:**
- `-c:v libx264` - H.264 codec
- `-crf 22` - Quality (0-51, lower=better)
- `-preset slow` - Speed/compression balance
- `-c:a aac` - Audio codec

**ImageMagick:**
- `800x600` - Fit within (maintains aspect)
- `800x600^` - Fill (may crop)
- `-quality 85` - JPEG quality
- `-strip` - Remove metadata

**RMBG:**
- `-m briaai` - High quality model
- `-m u2netp` - Fast model
- `-r 4096` - Max resolution

## Common Workflows

### Video Optimization for Web

```bash
# Standard web video (H.264, AAC)
ffmpeg -i input.mov -c:v libx264 -crf 23 -preset medium \
  -c:a aac -b:a 128k -movflags +faststart output.mp4

# VP9 for modern browsers
ffmpeg -i input.mov -c:v libvpx-vp9 -crf 30 -b:v 0 \
  -c:a libopus -b:a 96k output.webm
```

### Responsive Image Set

```bash
# Generate multiple sizes for responsive design
magick input.jpg -resize 400x -quality 85 image-sm.jpg
magick input.jpg -resize 800x -quality 85 image-md.jpg
magick input.jpg -resize 1200x -quality 85 image-lg.jpg
```

### Video Thumbnail Generation

```bash
# Extract frame at 5 seconds
ffmpeg -i input.mp4 -ss 5 -vframes 1 thumbnail.jpg

# Generate thumbnail grid
ffmpeg -i input.mp4 -vf "select='not(mod(n,30))',scale=160:-1,tile=5x5" \
  -frames:v 1 thumbs.jpg
```

### Background Removal + Composite

```bash
# Remove background
rmbg subject.jpg -m briaai -o subject-transparent.png

# Composite onto new background
magick background.jpg subject-transparent.png \
  -gravity center -composite final.jpg
```

## Hardware Acceleration

```bash
# NVIDIA GPU encoding (H.264)
ffmpeg -i input.mov -c:v h264_nvenc -preset p4 -cq 23 output.mp4

# Intel QuickSync
ffmpeg -i input.mov -c:v h264_qsv -global_quality 23 output.mp4

# Apple VideoToolbox (macOS)
ffmpeg -i input.mov -c:v h264_videotoolbox -q:v 60 output.mp4
```

## References

Detailed guides in `references/`:
- `ffmpeg-encoding.md` - Codecs, quality, hardware acceleration
- `ffmpeg-streaming.md` - HLS/DASH, live streaming
- `ffmpeg-filters.md` - Filters, complex filtergraphs
- `imagemagick-editing.md` - Effects, transformations
- `imagemagick-batch.md` - Batch processing, parallel ops
- `rmbg-background-removal.md` - AI models, CLI usage
- `common-workflows.md` - Video optimization, responsive images, GIF creation
- `troubleshooting.md` - Error fixes, performance tips
- `format-compatibility.md` - Format support, codec recommendations
