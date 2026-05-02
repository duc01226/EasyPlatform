/**
 * Configuration and CSS file loader
 * Handles custom CSS injection and config file parsing
 */

const fs = require('fs');
const path = require('path');

// Path to default CSS
const DEFAULT_CSS_PATH = path.join(__dirname, '..', '..', 'assets', 'default-style.css');

/**
 * Load CSS from file path
 * @param {string|null} cssPath - Path to CSS file (null for default)
 * @returns {string} CSS content
 */
function loadCSS(cssPath) {
  const targetPath = cssPath || DEFAULT_CSS_PATH;

  if (!fs.existsSync(targetPath)) {
    if (cssPath) {
      throw new Error(`CSS file not found: ${cssPath}`);
    }
    // Return minimal fallback if default CSS missing
    return `
      body { font-family: Georgia, serif; font-size: 12pt; line-height: 1.6; }
      pre { background: #f5f5f5; padding: 1em; overflow-x: auto; }
      code { font-family: monospace; }
    `;
  }

  return fs.readFileSync(targetPath, 'utf8');
}

/**
 * Load markdown file and extract frontmatter
 * @param {string} filePath - Path to markdown file
 * @returns {{content: string, frontmatter: object}}
 */
function loadMarkdown(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Markdown file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Lazy load gray-matter only when needed
  let matter;
  try {
    matter = require('gray-matter');
  } catch {
    // gray-matter not installed, return raw content
    return { content, frontmatter: {} };
  }

  const parsed = matter(content);
  return {
    content: parsed.content,
    frontmatter: parsed.data || {}
  };
}

/**
 * Get CSS file path (resolves custom or default)
 * @param {string|null} cssPath - Custom CSS path or null for default
 * @returns {string} Resolved CSS file path
 */
function getCSSPath(cssPath) {
  if (cssPath) {
    const resolved = path.resolve(cssPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`CSS file not found: ${cssPath}`);
    }
    return resolved;
  }
  return DEFAULT_CSS_PATH;
}

/**
 * Build md-to-pdf configuration object
 * @param {object} options - Configuration options
 * @param {string|null} options.cssPath - Path to custom CSS
 * @param {boolean} options.noHighlight - Disable syntax highlighting
 * @param {string} options.title - Document title
 * @returns {object} md-to-pdf config
 */
function buildConfig(options = {}) {
  // md-to-pdf expects stylesheet as file path, not content
  const stylesheetPath = getCSSPath(options.cssPath);

  const config = {
    stylesheet: stylesheetPath,
    pdf_options: {
      format: 'A4',
      margin: {
        top: '2cm',
        bottom: '2cm',
        left: '2cm',
        right: '2cm'
      },
      printBackground: true
    },
    highlight_style: options.noHighlight ? null : 'github',
    marked_options: {
      gfm: true,
      breaks: false
    }
  };

  // Add document title from frontmatter if available
  if (options.title) {
    config.document_title = options.title;
  }

  return config;
}

module.exports = {
  loadCSS,
  loadMarkdown,
  buildConfig,
  getCSSPath,
  DEFAULT_CSS_PATH
};
