import { promises as fs } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "..", "..", "..", "..", "..");
const rawReader = require(path.join(repoRoot, ".claude", "scripts", "lib", "spec-carrier-reader.cjs"));
const configLoader = require(path.join(repoRoot, ".claude", "hooks", "lib", "project-config-loader.cjs"));
export const rawReadSpecCarriers = rawReader.readSpecCarriers;

// These fixtures model a project that opted into native carriers. They are deliberately
// independent of the adopter's project config and repository contents.
export const carrierTestProfile = {
  specRoots: { business: { path: "specs", authorship: "hand" } },
  specArtifacts: {
    version: 1,
    kind: "engineering-contract",
    sections: { intent: ["Purpose"], contracts: ["Rules"], evidence: ["Checks"] },
    identifiers: {
      requirement: { prefix: "REQ-", grammar: "decimal-lower-suffix" },
      acceptance: { prefix: "AC-", grammar: "decimal-lower-suffix" },
      scenario: { prefix: "SCN-", grammar: "hyphen-tokens" },
    },
    ownership: "spec-path-and-case-id",
    carriers: [
      { dialect: "js-title-v1", roots: ["checks"], extensions: [".test.js", ".test.ts"], suiteCalls: ["describe"], caseCalls: ["it", "test"] },
      { dialect: "js-keyed-cases-v1", roots: ["checks"], extensions: [".test.js", ".test.ts"], binding: "cases", fields: {
        variant: "variant", scenario: "scenario", requirements: "requirements", rationale: "rationale", input: "input",
      } },
      { dialect: "yaml-cases-v1", roots: ["contract-data"], extensions: [".yaml", ".yml"], fields: {
        scenario: "scenario_ref", status: "lifecycle", requirements: "coverage.rules", acceptance: "coverage.criteria",
        lists: ["examples", "reconciliation"], variant: "name", input: "given", expected: "then",
      }, acceptedStatuses: ["reviewed"] },
    ],
  },
};

export function skipMissingCarrierParsers(t, ...packages) {
  const missing = packages.filter(name => {
    try { require.resolve(name); return false; }
    catch { return true; }
  });
  if (missing.length === 0) return false;
  t.skip(`optional project parser package(s) unavailable: ${missing.join(", ")}`);
  return true;
}

const safePath = value => typeof value === "string" && value.length > 0 && !value.includes("\0") && !value.includes("\\")
  && !path.isAbsolute(value) && !path.win32.isAbsolute(value) && path.posix.normalize(value) === value
  && !value.split("/").some(segment => segment === "" || segment === "." || segment === "..");
const isConfigured = profile => profile && typeof profile === "object"
  && (Object.prototype.hasOwnProperty.call(profile, "specArtifacts") || (profile.kind === "engineering-contract" && Array.isArray(profile.carriers)));

async function inventoryFor(rootDir) {
  if (path.resolve(rootDir).toLowerCase() === repoRoot.toLowerCase()) {
    const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], {
      cwd: rootDir, encoding: "buffer", maxBuffer: 4 * 1024 * 1024,
    });
    return output.toString("utf8").split("\0").filter(Boolean);
  }
  const files = [];
  async function visit(directory, prefix = "") {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(path.join(directory, entry.name), relative);
      else if (entry.isFile()) files.push(relative);
    }
  }
  await visit(rootDir);
  return files;
}

export async function candidateSnapshot(rootDir, selectedFiles, sourceReader, profile) {
  const files = Object.freeze([...new Set(await inventoryFor(rootDir))].sort());
  const fileSet = new Set(files);
  const project = profile?.projectConfig ?? profile;
  const businessRoot = project?.specRoots?.business?.path ?? configLoader.resolvePortabilityToken("SPEC_ROOT", project);
  const technicalRoot = project?.specRoots?.technical?.authorship === "derived" ? project.specRoots.technical.path : null;
  const ownerFile = relative => {
    const prefix = `${businessRoot}/`;
    const name = relative.slice(relative.lastIndexOf("/") + 1);
    return relative.startsWith(prefix) && /^\d{3}-.+\.md$/i.test(name) && !/-impl-plan\.md$/i.test(name)
      && !(technicalRoot && (relative === technicalRoot || relative.startsWith(`${technicalRoot}/`)));
  };
  const needed = new Set((Array.isArray(selectedFiles) ? selectedFiles : []).filter(safePath).filter(file => fileSet.has(file)));
  for (const file of files) if (ownerFile(file)) needed.add(file);
  const contents = new Map();
  for (const file of needed) {
    try { contents.set(file, typeof sourceReader === "function" ? await sourceReader(file) : null); }
    catch { contents.set(file, null); }
  }
  return {
    listFiles: async () => files,
    readText: async relativePath => contents.has(relativePath) ? contents.get(relativePath) : null,
    resolvePhysicalPath: sourceReader?.resolvePhysicalPath,
  };
}

export async function readSpecCarriers(options = {}) {
  const resolvePhysicalPath = options.resolvePhysicalPath ?? options.readText?.resolvePhysicalPath;
  if (!isConfigured(options.profile) || typeof options.listFiles === "function") {
    return rawReadSpecCarriers({ ...options, resolvePhysicalPath });
  }
  const snapshot = await candidateSnapshot(options.rootDir, options.selectedFiles, options.readText, options.profile);
  return rawReadSpecCarriers({ ...options, ...snapshot, resolvePhysicalPath: resolvePhysicalPath ?? snapshot.resolvePhysicalPath });
}

export async function withTempProject(t, callback) {
  const scratchParent = path.join(repoRoot, "tmp", "reports", "framework-fit-260919", "carrier-fixtures");
  await fs.mkdir(scratchParent, { recursive: true });
  const rootDir = await fs.mkdtemp(path.join(scratchParent, "reader-"));
  t.after(async () => fs.rm(rootDir, { recursive: true, force: true }));
  return callback(rootDir);
}

export async function writeProjectFile(rootDir, relativePath, contents) {
  const file = path.join(rootDir, relativePath);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, contents, "utf8");
}

export function diskReader(rootDir) {
  const readText = async relativePath => {
    try { return await fs.readFile(path.join(rootDir, relativePath), "utf8"); }
    catch { return null; }
  };
  readText.resolvePhysicalPath = async relativePath => {
    try { return await fs.realpath(relativePath === "." ? rootDir : path.resolve(rootDir, relativePath)); }
    catch { return null; }
  };
  return readText;
}

export function recordIdentity(record) {
  return record.ownerPath + "|" + record.scenarioId + "|" + (record.variantId ?? "<test>");
}
