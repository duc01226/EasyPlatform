const test = JSON.stringify(
    {
        database: {
            host: 'localhost',
            password: 'db-password-here'
        },
        api: {
            key: 'api-key-12345'
        }
    },
    null,
    2
);

console.log('Original:');
console.log(test);
console.log('\n---\n');

// Try different regex patterns
const patterns = [
    { name: 'Current', regex: /password\s*[:=]\s*["']?[^"'\s,}]+["']?/gi },
    { name: 'With quotes on key', regex: /"password"\s*:\s*"[^"]+"/gi },
    { name: 'Generic key-value', regex: /["']?password["']?\s*[:=]\s*["']([^"']+)["']/gi },
    { name: 'Simpler', regex: /password["\s:]*"([^"]+)"/gi }
];

patterns.forEach(({ name, regex }) => {
    const result = test.replace(regex, 'password=***');
    console.log(`${name}:`);
    console.log(`  Removed: ${!result.includes('db-password-here')}`);
    console.log(`  Result excerpt: ${result.substring(40, 100)}`);
});
