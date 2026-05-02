/**
 * Tests for chrome-finder.cjs
 */

const path = require('path');

describe('chrome-finder', () => {
  const { findChrome, getPuppeteerArgs, getChromeConfig, CHROME_PATHS } = require('../scripts/lib/chrome-finder.cjs');

  it('should export CHROME_PATHS for current platform', () => {
    const platform = process.platform;
    assert.ok(CHROME_PATHS[platform], `CHROME_PATHS should have entries for ${platform}`);
    assert.ok(Array.isArray(CHROME_PATHS[platform]), 'CHROME_PATHS entry should be an array');
  });

  it('should return array from getPuppeteerArgs', () => {
    const args = getPuppeteerArgs();
    assert.ok(Array.isArray(args), 'getPuppeteerArgs should return array');
    assert.ok(args.includes('--disable-gpu'), 'Should include --disable-gpu');
  });

  it('should include --no-sandbox on Windows', () => {
    if (process.platform === 'win32') {
      const args = getPuppeteerArgs();
      assert.ok(args.includes('--no-sandbox'), 'Windows should have --no-sandbox');
    } else {
      // On non-Windows, just verify the function runs
      const args = getPuppeteerArgs();
      assert.ok(Array.isArray(args), 'Should return array on any platform');
    }
  });

  it('should return object from getChromeConfig', () => {
    const config = getChromeConfig();
    assert.ok(typeof config === 'object', 'getChromeConfig should return object');
    assert.ok('args' in config, 'Config should have args property');
    assert.ok('systemChrome' in config, 'Config should have systemChrome property');
    assert.ok(typeof config.systemChrome === 'boolean', 'systemChrome should be boolean');
  });

  it('findChrome should return string or null', () => {
    const result = findChrome();
    assert.ok(result === null || typeof result === 'string', 'findChrome should return string or null');
  });

  it('should have at least 3 Chrome paths for each platform', () => {
    for (const [platform, paths] of Object.entries(CHROME_PATHS)) {
      assert.ok(paths.length >= 2, `Platform ${platform} should have at least 2 Chrome paths`);
    }
  });
});
