# Chrome DevTools Patterns Reference

Detailed patterns and examples for the chrome-devtools skill.

---

## ARIA Snapshot (Element Discovery)

When page structure is unknown, use `aria-snapshot.js` for a YAML accessibility tree with roles, names, states, and refs.

### Get ARIA Snapshot

```bash
# Generate ARIA snapshot to stdout
node aria-snapshot.js --url https://example.com

# Save to file
node aria-snapshot.js --url https://example.com --output ./.claude/chrome-devtools/snapshots/page.yaml
```

### Example YAML Output

```yaml
- banner:
  - link "Hacker News" [ref=e1]
    /url: https://news.ycombinator.com
  - navigation:
    - link "new" [ref=e2]
    - link "past" [ref=e3]
- main:
  - list:
    - listitem:
      - link "Show HN: My new project" [ref=e8]
- contentinfo:
  - textbox [ref=e10]
    /placeholder: "Search"
```

### ARIA Notation Reference

| Notation | Meaning |
|----------|---------|
| `[ref=eN]` | Stable identifier for interactive elements |
| `[checked]` | Checkbox/radio is selected |
| `[disabled]` | Element is inactive |
| `[expanded]` | Accordion/dropdown is open |
| `[level=N]` | Heading hierarchy (1-6) |
| `/url:` | Link destination |
| `/placeholder:` | Input placeholder text |
| `/value:` | Current input value |

### Interact by Ref

```bash
node select-ref.js --ref e5 --action click
node select-ref.js --ref e10 --action fill --value "search query"
node select-ref.js --ref e8 --action text
node select-ref.js --ref e1 --action screenshot --output ./logo.png
node select-ref.js --ref e10 --action focus
node select-ref.js --ref e5 --action hover
```

### Store Snapshots

```bash
mkdir -p .claude/chrome-devtools/snapshots
SESSION="$(date +%Y%m%d-%H%M%S)"
node aria-snapshot.js --url https://example.com --output .claude/chrome-devtools/snapshots/$SESSION.yaml
```

### Workflow: Unknown Page Structure

1. Get snapshot: `node aria-snapshot.js --url https://example.com`
2. Identify target from YAML output (e.g., `[ref=e5]`)
3. Interact: `node select-ref.js --ref e5 --action click`
4. Verify: `node screenshot.js --output ./result.png`

---

## Screenshots

Store in `<project>/.claude/chrome-devtools/screenshots/`:

```bash
# Basic screenshot
node screenshot.js --url https://example.com --output ./.claude/chrome-devtools/screenshots/page.png

# Full page
node screenshot.js --url https://example.com --output ./.claude/chrome-devtools/screenshots/page.png --full-page true

# Specific element
node screenshot.js --url https://example.com --selector ".main-content" --output ./.claude/chrome-devtools/screenshots/element.png
```

### Auto-Compression (Sharp)

Screenshots >5MB auto-compress using Sharp (4-5x faster than ImageMagick):

```bash
# Default: compress if >5MB
node screenshot.js --url https://example.com --output ./page.png

# Custom threshold (3MB)
node screenshot.js --url https://example.com --output ./page.png --max-size 3

# Disable compression
node screenshot.js --url https://example.com --output ./page.png --no-compress
```

---

## Console Log Collection & Analysis

### Capture Logs

```bash
# All logs for 10 seconds
node console.js --url https://example.com --duration 10000

# Filter by type
node console.js --url https://example.com --types error,warn --duration 5000
```

### Session Storage Pattern

```bash
SESSION="$(date +%Y%m%d-%H%M%S)"
mkdir -p .claude/chrome-devtools/logs/$SESSION

node console.js --url https://example.com --duration 10000 > .claude/chrome-devtools/logs/$SESSION/console.json
node network.js --url https://example.com > .claude/chrome-devtools/logs/$SESSION/network.json

# View errors
jq '.messages[] | select(.type=="error")' .claude/chrome-devtools/logs/$SESSION/console.json
```

### Root Cause Analysis

```bash
# 1. Check for JavaScript errors
node console.js --url https://example.com --types error,pageerror --duration 5000 | jq '.messages'

# 2. Correlate with network failures
node network.js --url https://example.com | jq '.requests[] | select(.response.status >= 400)'

# 3. Check stack traces
node console.js --url https://example.com --types error --duration 5000 | jq '.messages[].stack'
```

---

## Finding Elements

```bash
# All interactive elements
node snapshot.js --url https://example.com | jq '.elements[] | {tagName, text, selector}'

# Find buttons
node snapshot.js --url https://example.com | jq '.elements[] | select(.tagName=="button")'

# Find by text content
node snapshot.js --url https://example.com | jq '.elements[] | select(.text | contains("Submit"))'
```

---

## Error Recovery

```bash
# 1. Capture current state
node screenshot.js --output ./.claude/skills/chrome-devtools/screenshots/debug.png

# 2. Get console errors
node console.js --url about:blank --types error --duration 1000

# 3. Discover correct selector
node snapshot.js | jq '.elements[] | select(.text | contains("Submit"))'

# 4. Try XPath if CSS fails
node click.js --selector "//button[contains(text(),'Submit')]"
```

---

## Writing Custom Test Scripts

Write scripts to `<project>/.claude/chrome-devtools/tmp/`:

```bash
mkdir -p $SKILL_DIR/.claude/chrome-devtools/tmp

cat > $SKILL_DIR/.claude/chrome-devtools/tmp/login-test.js << 'EOF'
import { getBrowser, getPage, disconnectBrowser, outputJSON } from '../scripts/lib/browser.js';

async function loginTest() {
  const browser = await getBrowser();
  const page = await getPage(browser);

  await page.goto('https://example.com/login');
  await page.type('#email', 'user@example.com');
  await page.type('#password', 'secret');
  await page.click('button[type=submit]');
  await page.waitForNavigation();

  outputJSON({ success: true, url: page.url(), title: await page.title() });
  await disconnectBrowser();
}

loginTest();
EOF

node $SKILL_DIR/.claude/chrome-devtools/tmp/login-test.js
```

**Key principles:**
- Single-purpose: one script, one task
- Always call `disconnectBrowser()` at the end
- Use `closeBrowser()` only when ending session completely
- Output JSON for easy parsing
- Plain JavaScript only in `page.evaluate()` callbacks

---

## Screenshot Analysis: Missing Images

If images don't appear in screenshots:

1. **Scroll-triggered animations**: Scroll element into view first
   ```bash
   node evaluate.js --script "document.querySelector('.lazy-image').scrollIntoView()"
   node evaluate.js --script "await new Promise(r => setTimeout(r, 1000))"
   node screenshot.js --output ./result.png
   ```

2. **Sequential animation queue**: Wait longer and retry
   ```bash
   node screenshot.js --url http://localhost:3000 --output ./attempt1.png
   node evaluate.js --script "await new Promise(r => setTimeout(r, 2000))"
   node screenshot.js --output ./attempt2.png
   ```

3. **Intersection Observer animations**: Trigger by scrolling
   ```bash
   node evaluate.js --script "window.scrollTo(0, document.body.scrollHeight)"
   node evaluate.js --script "await new Promise(r => setTimeout(r, 1500))"
   node evaluate.js --script "window.scrollTo(0, 0)"
   node screenshot.js --output ./full-loaded.png --full-page true
   ```
