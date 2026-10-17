'use strict';

// Checks normalized, inspected report evidence; never performs a review or
// grants commit authority. The caller owns provenance and target inspection.
const fs = require('node:fs');
const path = require('node:path');
const ACCEPTED = new Set(['PASS', 'CONVERGED', 'APPROVED', 'ACCEPTED', 'CLEAN']);
const MAX_INPUT_BYTES = 64 * 1024;
const text = value => typeof value === 'string' && value.trim().length > 0;
const status = value => typeof value === 'string' ? value.trim().toUpperCase() : '';
function timestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return NaN;
    return Date.parse(value);
}

function checkReportEvidence(input, root = process.cwd()) {
    const reasons = [];
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return { status: 'BLOCKED', reasons: ['Missing report evidence object'] };
    }
    const report = input.report || {};
    const occurrence = input.occurrence || {};
    if (!text(occurrence.id) || !text(occurrence.skill) || !Array.isArray(input.satisfiedBy) ||
        !input.satisfiedBy.includes(occurrence.skill)) {
        reasons.push('Report occurrence does not satisfy the declared gate');
    }
    try {
        if (!text(report.path)) throw new Error('Missing path');
        const actualRoot = fs.realpathSync(root);
        const actualReport = fs.realpathSync(path.resolve(root, report.path));
        const relative = path.relative(actualRoot, actualReport);
        if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) ||
            !fs.statSync(actualReport).isFile()) throw new Error('Outside project or not a file');
    } catch {
        reasons.push('Report is missing or is not a file inside the project');
    }
    const reviewed = timestamp(report.reviewedAt);
    const changed = timestamp(input.lastChangedAt);
    if (!Number.isFinite(reviewed) || !Number.isFinite(changed)) {
        reasons.push('Review/last-change time is unknown or lacks a timezone');
    } else if (reviewed < changed) {
        reasons.push('Report is stale: predates the last change-producing occurrence');
    }
    if (report.targetFingerprint !== undefined || input.currentTargetFingerprint !== undefined) {
        if (!text(report.targetFingerprint) || !text(input.currentTargetFingerprint) ||
            report.targetFingerprint !== input.currentTargetFingerprint) reasons.push('Reviewed target does not match the current target');
    }
    // Architecture full is a declared read-only diagnostic: completion means
    // validated report coverage, not repairing the inspected system's findings.
    if (occurrence.skill === 'architecture --mode=full') {
        if (status(report.finalStatus) !== 'FINISHED' || report.facesMerged !== 3 ||
            !ACCEPTED.has(status(report.validationStatus))) {
            reasons.push('Diagnostic report is unfinished, incomplete, or its validation was not accepted');
        }
    } else if (!ACCEPTED.has(status(report.finalStatus))) {
        reasons.push('Report final verdict is not accepted/converged');
    }
    return { status: reasons.length ? 'BLOCKED' : 'PASS', reasons };
}

async function main() {
    try {
        const chunks = [];
        let bytes = 0;
        for await (const chunk of process.stdin) {
            bytes += chunk.length;
            if (bytes > MAX_INPUT_BYTES) throw new Error('Evidence input exceeds 64 KiB');
            chunks.push(chunk);
        }
        const result = checkReportEvidence(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        process.stdout.write(`${JSON.stringify(result)}\n`);
        process.exitCode = result.status === 'PASS' ? 0 : 1;
    } catch {
        process.stdout.write(`${JSON.stringify({ status: 'ERROR', reasons: ['Invalid or oversized evidence input'] })}\n`);
        process.exitCode = 2;
    }
}
if (require.main === module) main();
module.exports = { checkReportEvidence };
