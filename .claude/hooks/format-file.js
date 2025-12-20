#!/usr/bin/env node
/**
 * Claude Code PostToolUse Hook: Auto-Format Files
 *
 * This hook runs after Write|Edit operations to automatically format files.
 * - C# files: dotnet format
 * - JS/TS/JSON/HTML/CSS/SCSS files: prettier
 *
 * Input: JSON via stdin with tool_input.file_path containing the file path
 * Output: None (formatting is a side effect)
 * Exit code: Always 0 (formatting errors are silently ignored)
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Read stdin
let stdin = '';
try {
    stdin = fs.readFileSync(0, 'utf-8');
} catch (e) {
    process.exit(0);
}

let input;
try {
    input = JSON.parse(stdin);
} catch (e) {
    process.exit(0);
}

const filePath = input.tool_input?.file_path || '';

if (!filePath) {
    process.exit(0);
}

// Check if file exists
if (!fs.existsSync(filePath)) {
    process.exit(0);
}

const ext = path.extname(filePath).toLowerCase();

// Skip C# files - no auto-formatting, use 'dotnet format' manually to respect .editorconfig
// Auto-formatting disabled because dotnet format needs solution context and is slow
if (ext === '.cs' || ext === '.csx' || ext === '.cake') {
    process.exit(0);
}

// Format web files with prettier
const prettierExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.htm', '.css', '.scss', '.less', '.md', '.yaml', '.yml'];
if (prettierExtensions.includes(ext)) {
    try {
        execSync(`npx prettier --config .prettierrc --write "${filePath}"`, {
            stdio: 'ignore',
            timeout: 30000, // 30 second timeout
            cwd: process.cwd()
        });
    } catch (e) {
        // Silently ignore formatting errors
    }
}

// Format Angular templates
if (ext === '.component.html' || filePath.includes('.component.html')) {
    try {
        execSync(`npx prettier --config .prettierrc --write "${filePath}" --parser angular`, {
            stdio: 'ignore',
            timeout: 30000,
            cwd: process.cwd()
        });
    } catch (e) {
        // Silently ignore formatting errors
    }
}

process.exit(0);
