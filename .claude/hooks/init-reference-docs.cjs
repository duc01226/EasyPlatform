#!/usr/bin/env node
'use strict';

/**
 * Init Reference Docs Hook
 * On session start, ensures the 7 companion reference docs exist in docs/.
 * If any file is missing, creates it with a short description of its purpose.
 * Idempotent — skips files that already exist.
 *
 * Registered on: UserPromptSubmit
 */

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const DOCS_DIR = path.join(PROJECT_DIR, 'docs');

// Each entry: [filename, purpose description, placeholder content]
const REFERENCE_DOCS = [
  [
    'project-structure-reference.md',
    'Project structure, service architecture, directory tree, tech stack, and module registry.',
    `# Project Structure Reference

<!-- This file is referenced by Claude skills and agents for project-specific context. -->
<!-- Fill in your project's structure details below. -->

## Service Architecture

<!-- List your microservices/modules with ports, databases, and source paths -->

| Service | Port | Database | Source Path |
| ------- | ---- | -------- | ----------- |
| example-api | 5000 | MongoDB | src/Services/Example/ |

## Project Directory Tree

<!-- Describe your project's directory layout -->

## Tech Stack

<!-- List key technologies: language, framework, database, messaging, frontend -->

## Module Codes

<!-- Map short codes to module names for test IDs, prefixes, etc. -->
`
  ],
  [
    'backend-patterns-reference.md',
    'Backend patterns: CQRS, repositories, entities, validation, message bus, background jobs.',
    `# Backend Patterns Reference

<!-- This file is referenced by Claude skills and agents for project-specific backend patterns. -->
<!-- Fill in your project's backend conventions below. -->

## Repository Pattern

<!-- Document your repository interfaces, naming conventions, and usage patterns -->

## CQRS Patterns

<!-- Document command/query structure, handler patterns, result types -->

## Validation Patterns

<!-- Document validation approach: fluent API, exception-based, result types -->

## Entity Patterns

<!-- Document entity base classes, event handling, DTO mapping -->

## Message Bus

<!-- Document cross-service communication patterns -->
`
  ],
  [
    'frontend-patterns-reference.md',
    'Frontend patterns: component base classes, state management, API services, styling conventions.',
    `# Frontend Patterns Reference

<!-- This file is referenced by Claude skills and agents for project-specific frontend patterns. -->
<!-- Fill in your project's frontend conventions below. -->

## Component Base Classes

<!-- Document base component classes and their hierarchy -->

## State Management

<!-- Document store patterns, signals, observables -->

## API Services

<!-- Document HTTP service base class and conventions -->

## Styling Conventions

<!-- Document CSS methodology (BEM, etc.), design tokens, theming -->

## Directory Structure

<!-- Document frontend app/lib layout -->
`
  ],
  [
    'integration-test-reference.md',
    'Integration test patterns: test base classes, fixtures, helpers, and service-specific setup.',
    `# Integration Test Reference

<!-- This file is referenced by Claude skills and agents for project-specific test patterns. -->
<!-- Fill in your project's integration test conventions below. -->

## Test Architecture

<!-- Document test layers: unit, integration, e2e -->

## Test Base Classes

<!-- Document test fixture and base class hierarchy -->

## Test Helpers

<!-- Document helper methods for creating test data, assertions, etc. -->

## Service-Specific Setup

<!-- Document per-service test configuration and bootstrap -->
`
  ],
  [
    'feature-docs-reference.md',
    'Feature documentation patterns: app-to-service mapping, doc structure, templates, and conventions.',
    `# Feature Documentation Reference

<!-- This file is referenced by Claude skills and agents for project-specific doc conventions. -->
<!-- Fill in your project's feature documentation patterns below. -->

## App-to-Service Mapping

<!-- Map user-facing apps to backend services -->

## Feature Doc Structure

<!-- Document the expected sections in a feature doc -->

## Templates

<!-- Reference template files used for generating docs -->

## Conventions

<!-- Document naming, ID formats, evidence requirements -->
`
  ],
  [
    'code-review-rules.md',
    'Code review rules, conventions, anti-patterns, decision trees, and checklists.',
    `# Code Review Rules

<!-- This file is referenced by Claude skills and agents for project-specific code review standards. -->
<!-- Fill in your project's code review rules below. -->

## Critical Rules

<!-- Document MUST-FOLLOW rules: YAGNI, KISS, DRY, class responsibility -->

## Backend Rules

<!-- Document C# conventions: parallel execution, validation, repository, DTO mapping, side effects -->

## Frontend Rules

<!-- Document TypeScript/Angular conventions: base classes, subscriptions, BEM, state management -->

## Architecture Rules

<!-- Document microservices boundaries, layer structure, communication patterns -->

## Anti-Patterns

<!-- Document common anti-patterns with correct alternatives -->

## Checklists

<!-- Document review checklists for backend, frontend, architecture, pre-commit -->
`
  ],
  [
    'lessons.md',
    'Learned lessons from past sessions — auto-injected via hook, written via /learn skill.',
    `# Learned Lessons

<!-- Lessons are auto-injected by lessons-injector.cjs hook on every prompt and before file edits. -->
<!-- Use /learn skill to add new lessons. -->
`
  ]
];

function main() {
  try {
    // Read stdin (required by hook contract)
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    // Ensure docs/ directory exists
    if (!fs.existsSync(DOCS_DIR)) {
      fs.mkdirSync(DOCS_DIR, { recursive: true });
    }

    const created = [];

    for (const [filename, purpose, content] of REFERENCE_DOCS) {
      const filePath = path.join(DOCS_DIR, filename);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content.trim() + '\n', 'utf-8');
        created.push(`- \`docs/${filename}\` — ${purpose}`);
      }
    }

    if (created.length > 0) {
      console.log(`## Reference Docs Initialized\n`);
      console.log(`Created ${created.length} missing reference doc(s):\n`);
      console.log(created.join('\n'));
      console.log(`\nFill these files with your project-specific patterns. Skills reference them for context.`);
    }
    // If all files exist, output nothing (silent pass-through)
  } catch (e) { /* silent fail */ }
  process.exit(0);
}

main();
