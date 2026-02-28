/**
 * Chrome/Chromium executable finder
 * Detects system-installed Chrome to avoid downloading bundled Chromium
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Known Chrome installation paths by platform
 * @type {Record<string, string[]>}
 */
const CHROME_PATHS = {
  win32: [
    path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    // Edge (Chromium-based)
    path.join(process.env.PROGRAMFILES || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    path.join(process.env.HOME || '', 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/snap/bin/google-chrome',
  ]
};

/**
 * Find Chrome executable on the system
 * @returns {string|null} Path to Chrome executable or null if not found
 */
function findChrome() {
  const platform = process.platform;
  const paths = CHROME_PATHS[platform] || [];

  for (const chromePath of paths) {
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  // Fallback: try 'which' command on Unix-like systems
  if (platform !== 'win32') {
    try {
      const result = execSync('which google-chrome || which chromium || which chromium-browser 2>/dev/null', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      }).trim();
      if (result && fs.existsSync(result)) {
        return result;
      }
    } catch {
      // Command failed, no Chrome found
    }
  }

  return null;
}

/**
 * Get Puppeteer launch arguments for the current platform
 * @returns {string[]} Array of Chrome launch arguments
 */
function getPuppeteerArgs() {
  const args = [
    '--disable-gpu',
    '--disable-dev-shm-usage', // Helps in Docker/CI environments
  ];

  // Windows and some Linux environments need --no-sandbox
  if (process.platform === 'win32') {
    args.push('--no-sandbox', '--disable-setuid-sandbox');
  }

  // Check if running in a sandbox-restricted environment
  if (process.env.CI || process.env.DOCKER) {
    args.push('--no-sandbox', '--disable-setuid-sandbox');
  }

  return args;
}

/**
 * Get Chrome configuration for md-to-pdf
 * @returns {{executablePath: string|undefined, args: string[], systemChrome: boolean}}
 */
function getChromeConfig() {
  const executablePath = findChrome();
  const args = getPuppeteerArgs();

  return {
    executablePath: executablePath || undefined,
    args,
    systemChrome: !!executablePath
  };
}

module.exports = {
  findChrome,
  getPuppeteerArgs,
  getChromeConfig,
  CHROME_PATHS
};
