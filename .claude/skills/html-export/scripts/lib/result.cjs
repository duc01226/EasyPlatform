'use strict';

// Result helpers shared by the dispatcher and every target: how an error becomes text, whether
// page errors fail the run, and how report.json is written. One copy here so png, pdf, video (and
// any later target) cannot drift apart on these rules.

const fs = require('fs');
const path = require('path');

function errorMessage(error) {
  return error && typeof error.message === 'string' && error.message ? error.message : String(error);
}

function firstLine(error) {
  return errorMessage(error).split('\n')[0];
}

// Page errors fail the run (exit 4) unless the caller accepted them with --allow-errors.
function errorsBlock(pageErrors, allowErrors) {
  return pageErrors.length > 0 && allowErrors !== true;
}

function writeReport(outputDir, report) {
  const reportPath = path.join(outputDir, 'report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return reportPath;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { errorMessage, firstLine, errorsBlock, writeReport, sleep };
