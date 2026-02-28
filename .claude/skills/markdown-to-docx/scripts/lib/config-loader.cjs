/**
 * Configuration and theme loading for DOCX conversion
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', '..', 'assets');
const DEFAULT_THEME_PATH = path.join(ASSETS_DIR, 'default-theme.json');

/**
 * Load markdown file and extract frontmatter
 * @param {string} filePath
 * @returns {{content: string, frontmatter: object}}
 */
function loadMarkdown(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Markdown file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');

  // Lazy load gray-matter
  let matter;
  try {
    matter = require('gray-matter');
  } catch {
    // gray-matter not installed, return raw content
    return { content: raw, frontmatter: {} };
  }

  const { content, data } = matter(raw);
  return { content, frontmatter: data || {} };
}

/**
 * Load theme configuration
 * @param {string|null} customThemePath
 * @returns {object}
 */
function loadTheme(customThemePath) {
  // Load default theme
  let theme = {};
  if (fs.existsSync(DEFAULT_THEME_PATH)) {
    theme = JSON.parse(fs.readFileSync(DEFAULT_THEME_PATH, 'utf8'));
  }

  // Merge custom theme if provided
  if (customThemePath) {
    const customPath = path.resolve(customThemePath);
    if (!fs.existsSync(customPath)) {
      throw new Error(`Theme file not found: ${customThemePath}`);
    }
    const custom = JSON.parse(fs.readFileSync(customPath, 'utf8'));
    theme = { ...theme, ...custom };
  }

  return theme;
}

/**
 * Get theme file path (for validation)
 * @param {string|null} customThemePath
 * @returns {string}
 */
function getThemePath(customThemePath) {
  if (customThemePath) {
    const resolved = path.resolve(customThemePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Theme file not found: ${customThemePath}`);
    }
    return resolved;
  }
  return DEFAULT_THEME_PATH;
}

/**
 * Build markdown-docx configuration
 * Math is enabled by default (per validation decision)
 * @param {object} options
 * @returns {object}
 */
function buildConfig(options) {
  const { theme, title } = options;

  const config = {
    theme: theme || {},
    title: title,
    creator: 'markdown-to-docx',
    // Math enabled by default (validated decision)
    math: {
      engine: 'katex',
      libreOfficeCompat: true
    }
  };

  return config;
}

module.exports = {
  loadMarkdown,
  loadTheme,
  getThemePath,
  buildConfig,
  DEFAULT_THEME_PATH
};
