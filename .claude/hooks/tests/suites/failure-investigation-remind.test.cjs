'use strict';
const { cases } = require('../lib/failure-investigation-reminder-cases.cjs');
module.exports = {
    name: 'failure-investigation-remind',
    tests: Object.entries(cases).map(([name, fn]) => ({ name: `Failure reminder protects ${name}`, fn }))
};
