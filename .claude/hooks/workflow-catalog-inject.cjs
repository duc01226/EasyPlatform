#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Workflow catalog injection for UserPromptSubmit: the second output of the workflow route.
 * `lib/workflow-route-delivery.cjs` owns both outputs; this entry exists because a host cuts any single
 * hook output above its cap, so the catalog needs an output of its own to keep its compact form
 * whatever the gate's length.
 */
require('./lib/workflow-route-delivery.cjs').runHook('catalog');
