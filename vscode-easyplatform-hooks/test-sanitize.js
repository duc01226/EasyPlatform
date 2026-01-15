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

console.log('Original JSON:');
console.log(test);
console.log('\n---\n');

// Test current regex
const sanitized = test
    .replace(/password\s*[:=]\s*["']?[^"'\s,}]+["']?/gi, 'password=***')
    .replace(/api[_-]?key\s*[:=]\s*["']?[^"'\s,}]+["']?/gi, 'api_key=***');

console.log('After sanitization:');
console.log(sanitized);
console.log('\n---\n');

console.log('Check if secrets remain:');
console.log('Contains db-password-here:', sanitized.includes('db-password-here'));
console.log('Contains api-key-12345:', sanitized.includes('api-key-12345'));
