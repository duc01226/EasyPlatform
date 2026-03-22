const fs = require('fs');
const fp = require('path').join(__dirname, 'graph-grep-suggester.cjs');
const lines = fs.readFileSync(fp, 'utf8').split('\n');
const out = [];
const SLASH = String.fromCharCode(47);
const BSL = String.fromCharCode(92);
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("Use graph to discover ALL related files")) {
    out.push("        msg += '**ACTION REQUIRED:** Run graph trace on these entry points before proceeding:" + BSL + "n';");
    continue;
  }
  if (line.includes("Orchestrate grep")) {
    const regexPart = SLASH + BSL + BSL + SLASH + 'g';
    const newLine = '        msg += `  # RECOMMENDED FIRST: Full system trace: python .claude' + SLASH + 'scripts' + SLASH + 'code_graph trace "${suggestions[0]?.file?.replace(' + regexPart + ", '" + SLASH + "')}" + ' --direction both --json' + BSL + 'n`;';
    out.push(newLine);
    out.push(line);
    continue;
  }
  out.push(line);
}
fs.writeFileSync(fp, out.join('\n'), 'utf8');
console.log('Done');
