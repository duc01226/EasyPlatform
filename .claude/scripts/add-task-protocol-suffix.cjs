#!/usr/bin/env node
/**
 * Add Task Management Protocol suffix to skill and command files
 * Idempotent - checks for existing suffix before appending
 */

const fs = require('fs');
const path = require('path');

const SUFFIX = `

---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**
- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
`;

const MARKER = 'Task Management Protocol:';

/**
 * Find all files matching pattern recursively
 * @param {string} dir - Directory to search
 * @param {string} pattern - Filename pattern to match
 * @returns {string[]} Array of file paths
 */
function findFiles(dir, pattern) {
    const results = [];

    function walk(currentDir) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.name === pattern || (pattern.includes('*') && entry.name.endsWith('.md'))) {
                results.push(fullPath);
            }
        }
    }

    walk(dir);
    return results;
}

/**
 * Add suffix to file if not already present
 * @param {string} filePath - Path to file
 * @returns {{ path: string, status: 'added' | 'skipped' | 'error', error?: string }}
 */
function addSuffixToFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Check if suffix already exists
        if (content.includes(MARKER)) {
            return { path: filePath, status: 'skipped' };
        }

        // Append suffix
        const newContent = content.trimEnd() + SUFFIX;
        fs.writeFileSync(filePath, newContent, 'utf8');

        return { path: filePath, status: 'added' };
    } catch (error) {
        return { path: filePath, status: 'error', error: error.message };
    }
}

/**
 * Process files in a directory
 * @param {string} dir - Directory path
 * @param {string} pattern - File pattern
 * @param {string} category - Category name for logging
 * @returns {{ added: number, skipped: number, errors: number, files: object[] }}
 */
function processDirectory(dir, pattern, category) {
    console.log(`\n📁 Processing ${category}...`);

    const files = findFiles(dir, pattern);
    const results = { added: 0, skipped: 0, errors: 0, files: [] };

    for (const file of files) {
        const result = addSuffixToFile(file);
        results.files.push(result);

        if (result.status === 'added') {
            results.added++;
            console.log(`  ✅ Added: ${path.relative(process.cwd(), file)}`);
        } else if (result.status === 'skipped') {
            results.skipped++;
            console.log(`  ⏭️  Skipped (exists): ${path.relative(process.cwd(), file)}`);
        } else {
            results.errors++;
            console.log(`  ❌ Error: ${path.relative(process.cwd(), file)} - ${result.error}`);
        }
    }

    return results;
}

/**
 * Main execution
 */
function main() {
    console.log('🚀 Adding Task Management Protocol suffix to Claude skills and commands\n');
    console.log('Marker:', MARKER);

    const args = process.argv.slice(2);
    const processSkills = args.includes('--skills') || args.length === 0;
    const processCommands = args.includes('--commands') || args.length === 0;

    let totalAdded = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Process skills
    if (processSkills) {
        const skillsDir = path.join(process.cwd(), '.claude', 'skills');
        if (fs.existsSync(skillsDir)) {
            const skillResults = processDirectory(skillsDir, 'SKILL.md', 'Skills');
            totalAdded += skillResults.added;
            totalSkipped += skillResults.skipped;
            totalErrors += skillResults.errors;
        } else {
            console.log('⚠️  Skills directory not found:', skillsDir);
        }
    }

    // Process commands
    if (processCommands) {
        const commandsDir = path.join(process.cwd(), '.claude', 'commands');
        if (fs.existsSync(commandsDir)) {
            // Find all .md files excluding README, INSTALLATION, TESTING
            const allFiles = findFiles(commandsDir, '*.md');
            const commandFiles = allFiles.filter(f => {
                const name = path.basename(f).toLowerCase();
                return !['readme.md', 'installation.md', 'testing.md'].includes(name);
            });

            const results = { added: 0, skipped: 0, errors: 0, files: [] };
            console.log(`\n📁 Processing Commands...`);

            for (const file of commandFiles) {
                const result = addSuffixToFile(file);
                results.files.push(result);

                if (result.status === 'added') {
                    results.added++;
                    console.log(`  ✅ Added: ${path.relative(process.cwd(), file)}`);
                } else if (result.status === 'skipped') {
                    results.skipped++;
                    console.log(`  ⏭️  Skipped (exists): ${path.relative(process.cwd(), file)}`);
                } else {
                    results.errors++;
                    console.log(`  ❌ Error: ${path.relative(process.cwd(), file)} - ${result.error}`);
                }
            }

            totalAdded += results.added;
            totalSkipped += results.skipped;
            totalErrors += results.errors;
        } else {
            console.log('⚠️  Commands directory not found:', commandsDir);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary');
    console.log('='.repeat(50));
    console.log(`  Added:   ${totalAdded}`);
    console.log(`  Skipped: ${totalSkipped}`);
    console.log(`  Errors:  ${totalErrors}`);
    console.log(`  Total:   ${totalAdded + totalSkipped + totalErrors}`);

    if (totalErrors > 0) {
        process.exit(1);
    }
}

main();
