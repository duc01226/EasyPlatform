# Visual-to-Code Matching Algorithm

6-step protocol for matching a screenshot to Angular components in the codebase.

## Step 1: Extract Visual Fingerprint

From the screenshot, extract:

- **Visible text**: headers, labels, button text, table column names
- **Layout pattern**: sidebar+content, data table, form, card grid, modal/dialog, tabs
- **Color hints**: brand colors help identify the app
- **URL path**: if browser address bar is visible (highest-value signal)
- **BEM class patterns**: if DevTools is open in screenshot
- **Port number**: Check project config for port-to-app mapping (e.g., `project-structure-reference.md`)

## Step 2: App Identification

Build the port-to-app mapping from your project's configuration:

```bash
# Search for dev server port assignments
grep -r "port" {frontend-apps-dir}/*/project.json 2>/dev/null || grep -r "port" angular.json 2>/dev/null
```

| Signal | App |
|--------|-----|
| URL port {N} or /{app-route}/ path | {app-name} |
| ... | ... |

Populate this table from your project's actual port configuration.

## Step 3: Signal Checklist

For each candidate component, check these 6 boolean signals:

| # | Signal | How to Check |
|---|--------|-------------|
| S1 | **Route/URL match** | URL path segment matches `routePath` in index `routes` tree. **Note:** Static index may have limited route coverage if the project uses constant references for routes. Use live grep on `routes.ts` files as fallback. |
| S2 | **BEM root class match** | CSS class from screenshot matches `bemBlock` in `bemIndex` |
| S3 | **Unique text match** | Header/label text found in component's `textContent` array |
| S4 | **Selector match** | Component tag found via `selectorIndex` or grep |
| S5 | **Child composition** | Visible sub-widgets match component's `childSelectors` |
| S6 | **App identification** | App correctly identified via URL, port, or sidebar layout |

**Signal categories** (for threshold validation):
- **Route-based**: S1
- **Visual-based**: S2, S5, S6
- **Text-based**: S3, S4

## Step 4: Confidence Mapping

| Signals | Confidence | Action |
|---------|-----------|--------|
| 6/6 | 95%+ (Very High) | Output as high-confidence match |
| 5/6 | 90% (High) | Output as high-confidence match |
| 4/6 | 85% (Confident) | Output as confident match |
| 3/6 | 70% (Needs Confirmation) | Show top 3 candidates |
| 2/6 | 50% (Low) | Show top 5 + ask for clues |
| 0-1 | <50% (Insufficient) | Trigger Live Grep Fallback |

**Category diversity rule**: For >=85% claim, signals must come from at least 2 different categories.

## Step 5: Output Format

For high-confidence match (>=85%):
```
**Match: [selector]** (Confidence: X%)
- File: [filePath]
- Template: [templatePath]
- Store: [storePath] (if exists)
- Route: [routePath] (if exists)
- App: [app] ([version])
- Layer: [layer]

**Evidence:**
- S1 [MATCH/MISS]: [details]
- S2 [MATCH/MISS]: [details]
...
```

For needs-confirmation (70-84%): show top 3 candidates with signal breakdown.
For low (<70%): show top 5 candidates + ask user for URL, app name, or navigation path.

## Step 6: Live Grep Fallback

If no candidate reaches 2+ signals from the index:

1. Grep extracted text strings across all `.html` templates
2. Grep BEM class fragments across all `.scss` files
3. Grep unique component selectors from visible custom elements
4. Cross-reference grep hits with component-index.json
5. Re-evaluate signal checklist for newly found candidates
