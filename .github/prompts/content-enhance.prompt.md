---
description: "Analyze and enhance copy/content quality in UI"
---

# Enhance Content

Analyze and improve copy/content in the UI for better user experience.

## When to Use

- Improving button labels, headings, tooltips
- Clarifying error messages
- Enhancing form labels and placeholders
- Polishing notification text
- Making help text more helpful

## Workflow

### Step 1: Identify Content Issues

Common problems:
- Vague or generic text
- Technical jargon
- Inconsistent terminology
- Missing context
- Unclear calls-to-action

### Step 2: Analyze Context

Consider:
- Who is the user?
- What action are they taking?
- What do they need to know?
- What tone fits the brand?

### Step 3: Enhance Copy

#### Principles

| Principle | Before | After |
|-----------|--------|-------|
| Be specific | "Error occurred" | "Unable to save: name is required" |
| Use active voice | "Form was submitted" | "We received your form" |
| Be concise | "Please click the button below" | "Click to continue" |
| Guide action | "Submit" | "Create Account" |

#### Button Labels

```
// Vague
"Submit" → "Create Account"
"OK" → "Confirm Delete"
"Cancel" → "Keep Editing"

// Action-oriented
"Next" → "Continue to Payment"
"Save" → "Save Changes"
```

#### Error Messages

```
// Unhelpful
"Invalid input" → "Email must include @ symbol"
"Error 500" → "Unable to connect. Please try again."
"Required" → "Please enter your name"
```

#### Empty States

```
// Before
"No data"

// After
"No projects yet. Create your first project to get started."
```

### Step 4: Apply Changes

Update content in:
- Component templates (`.html`)
- Translation files (`.json`)
- Constants/enums

### Step 5: Verify

- Check all affected screens
- Ensure consistent terminology
- Test with different data states

## Content Checklist

- [ ] Clear and specific
- [ ] Consistent terminology
- [ ] Appropriate tone
- [ ] Actionable (for CTAs)
- [ ] No jargon
- [ ] Proper grammar

## Important

- Maintain brand voice consistency
- Consider localization impact
- Test with real user scenarios
