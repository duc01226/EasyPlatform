#!/usr/bin/env node
/**
 * Transform release notes using Claude API
 * Usage: node transform-llm.cjs <release-notes.md> --transform <type> [--output path]
 *
 * Transform types:
 * - summarize: Create a brief summary of changes
 * - business: Rewrite for business stakeholders
 * - enduser: Rewrite for end users
 * - executive: Create executive summary
 * - technical: Enhance with technical details
 *
 * Requires ANTHROPIC_API_KEY environment variable
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { validateOutputPath, validateInputNotEmpty } = require('./utils.cjs');

const ANTHROPIC_API_URL = 'api.anthropic.com';
const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'sonnet';

/**
 * Transform prompts for different audiences
 */
const TRANSFORM_PROMPTS = {
  summarize: {
    system: 'You are a technical writer creating concise release summaries.',
    prompt: `Summarize the following release notes into 3-5 bullet points highlighting the most important changes. Focus on user impact.

Release Notes:
{content}

Provide a brief summary in markdown format.`,
  },
  business: {
    system: 'You are a business analyst translating technical changes into business value.',
    prompt: `Rewrite the following release notes for business stakeholders. Focus on:
- ROI and productivity gains
- Risk mitigation
- Competitive advantages
- Strategic alignment

Avoid technical jargon. Use business language.

Release Notes:
{content}

Provide the business-focused release notes in markdown format.`,
  },
  enduser: {
    system: 'You are a UX writer creating user-friendly documentation.',
    prompt: `Rewrite the following release notes for end users. Focus on:
- What changed from their perspective
- How to use new features
- Any actions they need to take
- Benefits they will experience

Use simple, clear language. Avoid technical terms.

Release Notes:
{content}

Provide the user-focused release notes in markdown format.`,
  },
  executive: {
    system: 'You are a strategic advisor preparing executive briefings.',
    prompt: `Create an executive summary of the following release notes. Include:
- 2-3 sentence overview
- Key metrics (number of features, fixes, etc.)
- Strategic impact
- Any risks or dependencies

Keep it under 200 words. Focus on high-level impact.

Release Notes:
{content}

Provide the executive summary in markdown format.`,
  },
  technical: {
    system: 'You are a senior software architect enhancing technical documentation.',
    prompt: `Enhance the following release notes with technical details. Add:
- Architecture implications
- Performance considerations
- Migration requirements
- API changes
- Database schema changes (if applicable)

Maintain accuracy. Only add details that can be inferred from the existing content.

Release Notes:
{content}

Provide the technically enhanced release notes in markdown format.`,
  },
};

/**
 * Call Claude API
 */
async function callClaudeAPI(systemPrompt, userPrompt, apiKey, model = DEFAULT_MODEL) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const options = {
      hostname: ANTHROPIC_API_URL,
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);

          if (res.statusCode !== 200) {
            reject(new Error(`API error (${res.statusCode}): ${response.error?.message || responseData}`));
            return;
          }

          if (response.content && response.content[0]) {
            resolve(response.content[0].text);
          } else {
            reject(new Error('Unexpected API response format'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse API response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Transform release notes using Claude
 */
async function transformNotes(content, transformType, apiKey, options = {}) {
  const template = TRANSFORM_PROMPTS[transformType];

  if (!template) {
    throw new Error(`Unknown transform type: ${transformType}. Available: ${Object.keys(TRANSFORM_PROMPTS).join(', ')}`);
  }

  const userPrompt = template.prompt.replace('{content}', content);
  const model = options.model || DEFAULT_MODEL;

  console.error(`Transforming to "${transformType}" using ${model}...`);

  const result = await callClaudeAPI(template.system, userPrompt, apiKey, model);

  return result;
}

/**
 * Simple cache for transformed content
 */
const CACHE_DIR = path.join(process.cwd(), '.cache', 'release-notes-transforms');

function getCacheKey(content, transformType) {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(content + transformType).digest('hex');
  return hash;
}

function getCachedResult(content, transformType) {
  const cacheKey = getCacheKey(content, transformType);
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.md`);

  if (fs.existsSync(cachePath)) {
    const stats = fs.statSync(cachePath);
    const age = Date.now() - stats.mtimeMs;
    // Cache valid for 24 hours
    if (age < 24 * 60 * 60 * 1000) {
      return fs.readFileSync(cachePath, 'utf-8');
    }
  }

  return null;
}

function cacheResult(content, transformType, result) {
  const cacheKey = getCacheKey(content, transformType);
  const cachePath = path.join(CACHE_DIR, `${cacheKey}.md`);

  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  fs.writeFileSync(cachePath, result);
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const options = {
    inputFile: null,
    transformType: 'summarize',
    output: null,
    model: DEFAULT_MODEL,
    noCache: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--transform' && args[i + 1]) {
      options.transformType = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[++i];
    } else if (args[i] === '--model' && args[i + 1]) {
      options.model = args[++i];
    } else if (args[i] === '--no-cache') {
      options.noCache = true;
    } else if (!args[i].startsWith('--')) {
      options.inputFile = args[i];
    }
  }

  return options;
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    console.error('');
    console.error('Set it with:');
    console.error('  export ANTHROPIC_API_KEY="your-api-key"  # Linux/Mac');
    console.error('  set ANTHROPIC_API_KEY=your-api-key       # Windows CMD');
    console.error('  $env:ANTHROPIC_API_KEY="your-api-key"    # Windows PowerShell');
    process.exit(1);
  }

  // Read content
  let content = '';
  if (options.inputFile && fs.existsSync(options.inputFile)) {
    content = fs.readFileSync(options.inputFile, 'utf-8');
  } else if (!process.stdin.isTTY) {
    content = fs.readFileSync(0, 'utf-8');
  } else {
    console.error('Usage: node transform-llm.cjs <release-notes.md> --transform <type> [--output path]');
    console.error('');
    console.error('Transform types:');
    Object.entries(TRANSFORM_PROMPTS).forEach(([type, config]) => {
      console.error(`  ${type.padEnd(12)} - ${config.system.split('.')[0]}`);
    });
    console.error('');
    console.error('Options:');
    console.error('  --transform <type>  Transform type (default: summarize)');
    console.error('  --output <path>     Output file path');
    console.error('  --model <model>     Claude model to use (default: sonnet)');
    console.error('  --no-cache          Skip cache lookup');
    process.exit(1);
  }

  // Validate input not empty (prevents wasted API calls)
  validateInputNotEmpty(content, 'transform-llm');

  try {
    // Check cache first
    if (!options.noCache) {
      const cached = getCachedResult(content, options.transformType);
      if (cached) {
        console.error('Using cached result');
        if (options.output) {
          const safePath = validateOutputPath(options.output);
          fs.writeFileSync(safePath, cached);
          console.error(`Output written to: ${safePath}`);
        } else {
          console.log(cached);
        }
        return;
      }
    }

    // Transform
    const result = await transformNotes(content, options.transformType, apiKey, {
      model: options.model,
    });

    // Cache result
    cacheResult(content, options.transformType, result);

    // Output
    if (options.output) {
      // Validate output path (prevent path traversal)
      const safePath = validateOutputPath(options.output);
      const dir = path.dirname(safePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(safePath, result);
      console.error(`Output written to: ${safePath}`);
    } else {
      console.log(result);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  transformNotes,
  callClaudeAPI,
  TRANSFORM_PROMPTS,
};
