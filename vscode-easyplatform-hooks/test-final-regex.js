// Test comprehensive regex pattern
const testCases = [
    { input: 'password: "secret123"', expected: false },
    { input: 'password = secret123', expected: false },
    { input: '"password": "db-password-here"', expected: false },
    { input: 'DB_PASSWORD=super-secret-password', expected: false },
    { input: 'api_key: "sk-1234"', expected: false },
    { input: 'api-key=my-api-key', expected: false }
];

const patterns = [
    {
        name: 'Flexible pattern',
        regex: /password[\s:="]*([^\s,}"]+)/gi
    },
    {
        name: 'With optional quotes',
        regex: /["']?password["']?[\s:=]+["']?([^"'\s,}]+)["']?/gi
    }
];

patterns.forEach(({ name, regex }) => {
    console.log(`\n=== ${name} ===`);

    testCases.forEach(({ input, expected }) => {
        const sanitized = input.replace(regex, 'password=***');
        const secretRemoved = sanitized.includes('***') && !sanitized.match(/secret|password-|api-key|sk-/i);
        console.log(`${secretRemoved === expected ? '✓' : '✗'} "${input}"`);
        console.log(`  Result: "${sanitized}"`);
        console.log(`  Secret removed: ${secretRemoved}`);
    });
});
