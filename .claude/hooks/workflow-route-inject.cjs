#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Workflow route injection for UserPromptSubmit: the first output of the workflow route (the
 * `Route mode:` state line, the gate and the project protocol). `lib/workflow-route-delivery.cjs` owns
 * both outputs; `workflow-catalog-inject.cjs` is the entry for the second one.
 */
require('./lib/workflow-route-delivery.cjs').runHook('route');
