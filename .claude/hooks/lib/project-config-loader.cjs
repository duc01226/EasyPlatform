#!/usr/bin/env node
/**
 * Project Config Loader
 *
 * Loads docs/project-config.json and provides helper functions
 * for hooks that need project-specific path patterns.
 *
 * Usage:
 *   const { loadProjectConfig, buildRegexMap, buildPatternList } = require('./lib/project-config-loader.cjs');
 *   const config = loadProjectConfig();
 *   const serviceMap = buildRegexMap(config.backendServices.serviceMap);
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const CONFIG_PATH = path.join(PROJECT_DIR, 'docs', 'project-config.json');

let _cache = null;

/**
 * Load project-config.json. Returns empty object on failure.
 * Result is cached for the process lifetime.
 */
function loadProjectConfig() {
  if (_cache) return _cache;
  try {
    _cache = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    _cache = {};
  }
  return _cache;
}

/**
 * Convert a string→string map (name → regexString) into a string→RegExp map.
 * @param {Record<string,string>} map - e.g. { "ServiceA": "Services[\\/]ServiceA" }
 * @returns {Record<string,RegExp>}
 */
function buildRegexMap(map) {
  if (!map) return {};
  const result = {};
  for (const [key, pattern] of Object.entries(map)) {
    try {
      result[key] = new RegExp(pattern, 'i');
    } catch { /* skip invalid regex */ }
  }
  return result;
}

/**
 * Convert a pattern list (array of { name, pathRegex/pathRegexes, description, ... }) into
 * an array of { name, patterns: RegExp[], description, ...rest }.
 * Extra properties (quickTips, scssExamples, docFile, etc.) are forwarded as-is.
 * @param {Array} list
 * @returns {Array<{name:string, patterns:RegExp[], description:string, [key:string]:any}>}
 */
function buildPatternList(list) {
  if (!list || !Array.isArray(list)) return [];
  return list.map(item => {
    let patterns = [];
    if (item.pathRegexes) {
      for (const r of item.pathRegexes) {
        try { patterns.push(new RegExp(r, 'i')); } catch { /* skip invalid regex */ }
      }
    } else if (item.pathRegex) {
      try { patterns.push(new RegExp(item.pathRegex, 'i')); } catch { /* skip invalid regex */ }
    }
    // Forward all extra properties from config (quickTips, scssExamples, docFile, etc.)
    const { pathRegexes, pathRegex, ...rest } = item;
    return {
      ...rest,
      patterns,
      description: item.description || ''
    };
  });
}

module.exports = { loadProjectConfig, buildRegexMap, buildPatternList };
