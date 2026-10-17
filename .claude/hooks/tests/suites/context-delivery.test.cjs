'use strict';
const { cases } = require('../lib/context-delivery-cases.cjs');
module.exports = { name: 'context-delivery', tests: Object.entries(cases).map(([name, fn]) => ({ name: `Context delivery protects ${name}`, fn })) };
