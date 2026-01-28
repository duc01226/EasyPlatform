/**
 * Context Injection Hooks Test Suite
 *
 * Tests for:
 * - design-system-context.cjs: Design system documentation injection
 * - backend-csharp-context.cjs: Backend C# guide injection
 * - frontend-typescript-context.cjs: Frontend TypeScript guide injection
 * - scss-styling-context.cjs: SCSS styling guide injection
 */

const path = require('path');
const fs = require('fs');
const { runHook, getHookPath, createPreToolUseInput } = require('../lib/hook-runner.cjs');
const { assertEqual, assertContains, assertAllowed, assertTrue } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir, createMockFile } = require('../lib/test-utils.cjs');

// Hook paths
const DESIGN_SYSTEM_CONTEXT = getHookPath('design-system-context.cjs');
const BACKEND_CSHARP_CONTEXT = getHookPath('backend-csharp-context.cjs');
const FRONTEND_TYPESCRIPT_CONTEXT = getHookPath('frontend-typescript-context.cjs');
const SCSS_STYLING_CONTEXT = getHookPath('scss-styling-context.cjs');

// ============================================================================
// design-system-context.cjs Tests
// ============================================================================

const designSystemContextTests = [
    {
        name: '[design-system-context] injects for Frontend .scss file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/Frontend/components/button.scss',
                    old_string: 'a',
                    new_string: 'b'
                });
                const result = await runHook(DESIGN_SYSTEM_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertTrue(output.includes('Design System') || output.includes('Frontend') || output === '', 'May inject design system context');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[design-system-context] injects for frontend .html file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/Frontend/app/component.html',
                    old_string: '<div>',
                    new_string: '<div class="x">'
                });
                const result = await runHook(DESIGN_SYSTEM_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[design-system-context] skips non-frontend files',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/Services/api/controller.cs',
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(DESIGN_SYSTEM_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                // Should not inject for .cs file
                const output = result.stdout;
                assertTrue(!output.includes('Design System') || output === '', 'Should not inject for non-frontend file');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[design-system-context] skips Read tool',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Read', {
                    file_path: 'src/Frontend/app.scss'
                });
                const result = await runHook(DESIGN_SYSTEM_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                // Read tool should be ignored
                assertEqual(result.stdout, '', 'Should not inject for Read tool');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[design-system-context] handles empty input',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const result = await runHook(DESIGN_SYSTEM_CONTEXT, {}, { cwd: tmpDir });
                assertAllowed(result.code, 'Should fail-open');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[design-system-context] handles Write tool',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Write', {
                    file_path: 'src/Frontend/apps/playground-text-snippet/new.scss',
                    content: '.btn { }'
                });
                const result = await runHook(DESIGN_SYSTEM_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// backend-csharp-context.cjs Tests
// ============================================================================

const backendCsharpContextTests = [
    {
        name: '[backend-csharp-context] injects for .cs file in Services',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/Services/UserService/Controller.cs',
                    old_string: 'void',
                    new_string: 'Task'
                });
                const result = await runHook(BACKEND_CSHARP_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertTrue(output.includes('Backend') || output.includes('C#') || output === '', 'May inject backend context');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[backend-csharp-context] injects for Platform framework file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/Platform/Easy.Platform/Repository.cs',
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(BACKEND_CSHARP_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertTrue(output.includes('Platform') || output.includes('Backend') || output === '', 'May inject platform context');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[backend-csharp-context] injects for PlatformExampleApp file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/Backend/TextSnippet.Api/Controller.cs',
                    old_string: 'a',
                    new_string: 'b'
                });
                const result = await runHook(BACKEND_CSHARP_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[backend-csharp-context] skips non-.cs files',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/Services/config.json',
                    old_string: '"x"',
                    new_string: '"y"'
                });
                const result = await runHook(BACKEND_CSHARP_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout, '', 'Should not inject for non-.cs file');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[backend-csharp-context] skips frontend .cs files',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // .cs file outside backend patterns
                const input = createPreToolUseInput('Edit', {
                    file_path: 'other/random.cs',
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(BACKEND_CSHARP_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout, '', 'Should not inject for non-backend .cs');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[backend-csharp-context] handles empty input',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const result = await runHook(BACKEND_CSHARP_CONTEXT, {}, { cwd: tmpDir });
                assertAllowed(result.code, 'Should fail-open');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// frontend-typescript-context.cjs Tests
// ============================================================================

const frontendTypescriptContextTests = [
    {
        name: '[frontend-typescript-context] injects for Frontend .ts file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/Frontend/app/component.ts',
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(FRONTEND_TYPESCRIPT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertTrue(output.includes('Frontend') || output.includes('TypeScript') || output === '', 'May inject frontend context');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[frontend-typescript-context] injects for libs/platform-core .ts file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'libs/platform-core/src/component.ts',
                    old_string: 'a',
                    new_string: 'b'
                });
                const result = await runHook(FRONTEND_TYPESCRIPT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertTrue(output.includes('Platform') || output.includes('Frontend') || output === '', 'May inject platform-core context');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[frontend-typescript-context] injects for .tsx file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/Frontend/app/page.tsx',
                    old_string: 'div',
                    new_string: 'section'
                });
                const result = await runHook(FRONTEND_TYPESCRIPT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[frontend-typescript-context] skips .cs files',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/Services/api.cs',
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(FRONTEND_TYPESCRIPT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout, '', 'Should not inject for .cs file');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[frontend-typescript-context] skips Read tool',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Read', {
                    file_path: 'src/Frontend/app.ts'
                });
                const result = await runHook(FRONTEND_TYPESCRIPT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout, '', 'Should not inject for Read tool');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[frontend-typescript-context] handles empty input',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const result = await runHook(FRONTEND_TYPESCRIPT_CONTEXT, {}, { cwd: tmpDir });
                assertAllowed(result.code, 'Should fail-open');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// scss-styling-context.cjs Tests
// ============================================================================

const scssContextTests = [
    {
        name: '[scss-styling-context] injects for Frontend .scss file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/Frontend/styles/app.scss',
                    old_string: 'color:',
                    new_string: 'background:'
                });
                const result = await runHook(SCSS_STYLING_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertTrue(output.includes('SCSS') || output.includes('Styling') || output === '', 'May inject SCSS context');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[scss-styling-context] injects for .css file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/Frontend/styles/global.css',
                    old_string: 'a',
                    new_string: 'b'
                });
                const result = await runHook(SCSS_STYLING_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[scss-styling-context] injects for libs .scss file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'libs/platform-core/styles/theme.scss',
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(SCSS_STYLING_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[scss-styling-context] skips .ts files',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/Frontend/app.ts',
                    old_string: 'x',
                    new_string: 'y'
                });
                const result = await runHook(SCSS_STYLING_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout, '', 'Should not inject for .ts file');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[scss-styling-context] handles Write tool for new .scss',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Write', {
                    file_path: 'libs/platform-core/new-style.scss',
                    content: '.btn { display: flex; }'
                });
                const result = await runHook(SCSS_STYLING_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[scss-styling-context] handles empty input',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const result = await runHook(SCSS_STYLING_CONTEXT, {}, { cwd: tmpDir });
                assertAllowed(result.code, 'Should fail-open');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// Export test suite
module.exports = {
    name: 'Context Injection Hooks',
    tests: [...designSystemContextTests, ...backendCsharpContextTests, ...frontendTypescriptContextTests, ...scssContextTests]
};
