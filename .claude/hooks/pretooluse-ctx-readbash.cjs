#!/usr/bin/env node
'use strict';
/**
 * PreToolUse context dispatcher — read/bash investigation tools (reg1 + reg9).
 * Matcher: Read|Grep|Glob|Bash
 * Builders (legacy order): python-call-guide (reg1, Bash-only), mindset-compact (reg9)
 *
 * On Bash: python-call-guide fires first (only when the command invokes python),
 * then mindset-compact — reproducing reg1 < reg9. On Read|Grep|Glob: python-guide
 * self-gates to '' (Bash-only) and only mindset-compact fires.
 *
 * python-call-guide relocation (was reg1, before the Bash gates) is safe: the Bash
 * gates emit either JSON control contracts (windows-command-detector) or nothing
 * (git-commit-block) or commit-only stdout (doc-sync-gate) — none co-occur with a
 * `python` additionalContext block, so the additionalContext concat is unchanged.
 */
const { runDispatcher } = require('./lib/pretooluse-dispatch.cjs');
const { buildPythonGuide, buildMindsetCompact } = require('./lib/pretooluse-context-builders.cjs');

runDispatcher([buildPythonGuide, buildMindsetCompact], { name: 'pretooluse-ctx-readbash' });
