const fs = require('fs');
const fp = require('path').join(__dirname, 'graph-grep-suggester.cjs');
let content = fs.readFileSync(fp, 'utf8');
const DQUOTE = String.fromCharCode(34);
const oldPart = "')}" + " --direction";
const newPart = "')}" + DQUOTE + " --direction";
content = content.replace(oldPart, newPart);
fs.writeFileSync(fp, content, 'utf8');
console.log('Fixed closing quote');
