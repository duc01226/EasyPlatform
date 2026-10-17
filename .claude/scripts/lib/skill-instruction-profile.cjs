'use strict';

// Opt-in presentation metadata only. Invocation policy and review gates are independent.
// Read the metadata map from frontmatter, never a similarly named example in the body.
function hasConciseInstructions(markdown) {
  const header = String(markdown).match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!header) return false;
  const metadata = header.match(/^metadata:[ \t]*(.*)((?:\r?\n[ \t]+[^\r\n]*)*)/m);
  if (!metadata) return false;
  if (metadata[1].trim()) {
    try {
      return JSON.parse(metadata[1])?.['instruction-profile'] === 'concise';
    } catch {
      return false;
    }
  }
  return /^  instruction-profile:[ \t]*(?:concise|'concise'|"concise")[ \t]*\r?$/m.test(metadata[2]);
}

module.exports = { hasConciseInstructions };
