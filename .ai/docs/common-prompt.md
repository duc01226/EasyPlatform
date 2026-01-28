# AI Agent Prompt Library

## Implementing a New Feature or Enhancement

You are to operate as an expert full-stack dotnet angular principle developer, software architecture to implement the new requirements in `[task-description-or-task-info-file-path]`.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation. Todo list must cover all phases, from start to end, include child tasks in each phases too, everything is flatted out into a long detailed todo list.

### **🛡️ CORE ANTI-HALLUCINATION PROTOCOLS**

**ASSUMPTION_VALIDATION_CHECKPOINT**: Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

**EVIDENCE_CHAIN_VALIDATION**: Before claiming any relationship:

- "I believe X calls Y because..." → show actual code
- "This follows pattern Z because..." → cite specific examples
- "Service A owns B because..." → grep for actual boundaries

**TOOL_EFFICIENCY_PROTOCOL**:

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords
- Batch Write operations when creating multiple files

**CONTEXT_ANCHOR_SYSTEM**: Every 10 operations:

1. Re-read the original task description from the `## Metadata` section.
2. Verify the current operation aligns with original goals.
3. Check if we're solving the right problem.
4. Update the `Current Focus` bullet point within the `## Progress` section.

### **📋 QUICK REFERENCE CHECKLIST**

Before any major operation: [ ] ASSUMPTION_VALIDATION_CHECKPOINT [ ] EVIDENCE_CHAIN_VALIDATION [ ] TOOL_EFFICIENCY_PROTOCOL
Every 10 operations: [ ] CONTEXT_ANCHOR_CHECK [ ] Update **'Current Focus'** in **## Progress** section
Emergency: **Context Drift** → Re-read **## Metadata** section | **Assumption Creep** → Halt, validate with code | **Evidence Gap** → Mark as "inferred"

---

#### **PHASE 1: EXTERNAL MEMORY-DRIVEN KNOWLEDGE MODEL CONSTRUCTION.** Your sole objective is to build a structured knowledge model in a Markdown analysis file at `.ai/workspace/analysis/[some-sort-semantic-name-of-this-task].md` with systematic external memory management

#### **PHASE 1A: INITIALIZATION AND DISCOVERY**

First, **initialize** the analysis file with a `## Metadata` heading and under it is my full original prompt in a markdown box , like this: `markdown [content of metadata in here]` (MUST 5 chars for start and end of markdown box), then continue add the task description and full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). the task description, and the full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). You **MUST** also create the following top-level headings: `## Progress`, `## Errors`, `## Assumption Validations`, `## Performance Metrics`, `## Memory Management`, `## Processed Files`, `## File List`, `## Knowledge Graph`. Populate the `## Progress` section with:

- **Phase**: 1
- **Items Processed**: 0
- **Total Items**: 0
- **Current Operation**: "initialization"
- **Current Focus**: "[original task summary]"

Next, do semantic search and grep search all keywords of the task to find all related files, prioritizing the discovery of core logic files like **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**. **CRITICAL:** Save ALL file paths immediately as a numbered list under a `## File List` heading.
After semantic search, perform additional targeted searches to ensure no critical infrastructure is missed: `grep search` with patterns: `.*EventHandler.*{EntityName}|{EntityName}.*EventHandler`, `.*BackgroundJob.*{EntityName}|{EntityName}.*BackgroundJob`, `grep search` with patterns: `.*Consumer.*{EntityName}|{EntityName}.*Consumer`, `grep search` with patterns: `.*Service.*{EntityName}|{EntityName}.*Service`, `grep search` with patterns: `.*Helper.*{EntityName}|{EntityName}.*Helper`, and all (include pattern: `**/*.{cs,ts,html}`). High Priority files MUST be analyzed: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**. Update the `Total Items` count in the `## Progress` section.

#### **PHASE 1B: KNOWLEDGE GRAPH CONSTRUCTION** **IMPORTANT MUST DO WITH TODO LIST**

Count total files in file list, split it into many batch of group 10 files in priority order, each group insert in the current todo list new task for Analyze each batch of files group for all of files in file list.

**CRITICAL:** You must analyze all files in the file list identified as belonging to the highest IMPORTANT priority categories: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**.

For each file in the `## File List` (following the prioritized order if applicable), read and analyze it, add result into `## Knowledge Graph` section. The heading of each analyzed file must have the item order number in heading. Each file analyzing result detail the following information:

- **`filePath`**: The full path to the file.
- **`type`**: The component's classification.
- **`architecturalPattern`**: The main design pattern used.
- **`content`**: A summary of purpose and logic.
- **`symbols`**: Important classes, interfaces, methods.
- **`dependencies`**: All imported modules or `using` statements.
- **`businessContext`**: Comprehensive detail all business logic, how it contributes to the requirements.
- **`referenceFiles`**: Other files that use this file's symbols.
- **`relevanceScore`**: A numerical score (1-10).
- **`evidenceLevel`**: "verified" or "inferred".
- **`uncertainties`**: Any aspects you are unsure about.
- **`platformAbstractions`**: Any platform base classes used.
- **`serviceContext`**: Which microservice this file belongs to.
- **`dependencyInjection`**: Any DI registrations.
- **`genericTypeParameters`**: Generic type relationships.
- **`messageBusAnalysis`**: **CRITICAL FOR CONSUMERS**: When analyzing any Consumer file (files ending with `Consumer.cs` that extend `PlatformApplicationMessageBusConsumer<T>`), identify the `*BusMessage` type used. Then perform a grep search across ALL services to find files that **send/publish** this message type. List all producer files and their service locations in the `messageBusProducers` field. This analysis is crucial for understanding cross-service integration.
- **`targetedAspectAnalysis`** Populate `specificAspects:` key with deeper analysis:
    - **For Front-End items:** `componentHierarchy`, `routeConfig`, `routeGuards`, `stateManagementStores`, `dataBindingPatterns`, `validationStrategies`
    - **For Back-End items:** `authorizationPolicies`, `commands`, `queries`, `domainEntities`, `repositoryPatterns`, `businessRuleImplementations`
    - **For Consumer items:** `messageBusMessage`, `messageBusProducers`, `crossServiceIntegration`, `handleLogicWorkflow`

**MANDATORY PROGRESS TRACKING**: After processing every 10 files, you **MUST** update `Items Processed` in `## Progress`, run a `CONTEXT_ANCHOR_CHECK`, and explicitly state your progress. After each file, add its path to the `## Processed Files` list.

#### **PHASE 1C: Overall Analysis**

Write comprehensive `overallAnalysis:` summary showing:

- Complete end-to-end workflows discovered
- Key architectural patterns and relationships
- All business logic work flow: From front-end to back-end. (Example: Front-end Component => Controller Api Service => Command/Query => EventHandler => Others (Send email, producer bus message); From background job => event handler => others);
- Integration points and dependencies

#### **PHASE 2: PLAN GENERATION.** You MUST ensure all files are analyzed. Then read the ENTIRE Markdown analysis notes file. Then Generate a detailed implementation plan under a `## Plan` heading. Your plan **MUST** follow coding convention and patterns in `.ai/docs/prompt-context.md`, must ultrathink and think step-by-step todo list to make code changes, for each step must read `.ai/docs/prompt-context.md` to follow code convention and patterns

#### **PHASE 2.1: VERIFY AND REFACTOR** First, verify and ensure your implementation plan that code patterns, solution must follow code patterns and example in these files: `.github/copilot-instructions.md`, `.github/instructions/frontend-typescript.instructions.md`, `.github/instructions/backend-csharp.instructions.md`. Then verify and ensure your implementation plan satisfy clean code rules in `.github/instructions/code-review.instructions.md`

#### **PHASE 3: APPROVAL GATE.** You must present the plan for my explicit approval. **DO NOT** proceed without it

#### **PHASE 4: EXECUTION.** Once approved, execute the plan. Before creating or modifying **ANY** file, you **MUST** first load its relevant entry from your `## Knowledge Graph`. Use all **EXECUTION_SAFEGUARDS**. If any step fails, **HALT**, report the failure, and return to the APPROVAL GATE

**SUCCESS VALIDATION:** Before completion, verify the implementation against all requirements. Document this under a `## Success Validation` heading and summarize changes in `changelog.md`.

### Generate Coding Guidelines

- **Evidence-based approach:** Use `grep` and semantic search to verify assumptions.
- **Service boundary discovery:** Find endpoints before assuming responsibilities.
- **Never assume service ownership:** Verify patterns with code evidence.
- **Platform-first approach:** Use established templates.
- **Cross-service sync:** Use an event bus, not direct database access.
- **CQRS adherence:** Follow established Command/Query patterns.
- **Clean architecture respect:** Maintain proper layer dependencies.

---

---

## Bug Diagnosis & Debugging

You are to operate as an expert full-stack dotnet angular debugging engineer to diagnose, debug, and fix the bug described in `[bug-description-or-bug-info-file-path]`.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation. Todo list must cover all phases, from start to end, include child tasks in each phases too, everything is flatted out into a long detailed todo list.

### **🛡️ CORE ANTI-HALLUCINATION PROTOCOLS**

**ASSUMPTION_VALIDATION_CHECKPOINT**: Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

**EVIDENCE_CHAIN_VALIDATION**: Before claiming any relationship:

- "I believe X calls Y because..." → show actual code
- "This follows pattern Z because..." → cite specific examples
- "Service A owns B because..." → grep for actual boundaries

**TOOL_EFFICIENCY_PROTOCOL**:

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords
- Batch Write operations when creating multiple files

**CONTEXT_ANCHOR_SYSTEM**: Every 10 operations:

1. Re-read the original task description from the `## Metadata` section.
2. Verify the current operation aligns with original goals.
3. Check if we're solving the right problem.
4. Update the `Current Focus` bullet point within the `## Progress` section.

### **📋 QUICK REFERENCE CHECKLIST**

Before any major operation: [ ] ASSUMPTION_VALIDATION_CHECKPOINT [ ] EVIDENCE_CHAIN_VALIDATION [ ] TOOL_EFFICIENCY_PROTOCOL
Every 10 operations: [ ] CONTEXT_ANCHOR_CHECK [ ] Update **'Current Focus'** in **## Progress** section
Emergency: **Context Drift** → Re-read **## Metadata** section | **Assumption Creep** → Halt, validate with code | **Evidence Gap** → Mark as "inferred"

---

#### **PHASE 1: EXTERNAL MEMORY-DRIVEN BUG ANALYSIS.** Your sole objective is to build a structured knowledge model in a Markdown analysis file at `.ai/workspace/analysis/[some-sort-semantic-name-of-this-task].md` with systematic external memory management

#### **PHASE 1A: INITIALIZATION AND DISCOVERY**

First, **initialize** the analysis file with a `## Metadata` heading and under it is my full original prompt in a markdown box , like this: `markdown [content of metadata in here]` (MUST 5 chars for start and end of markdown box), then continue add the task description and full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). the task description, and the full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). You **MUST** also create the following top-level headings: `## Progress`, `## Errors`, `## Assumption Validations`, `## Performance Metrics`, `## Memory Management`, `## Processed Files`, `## File List`, `## Knowledge Graph`. Populate the `## Progress` section with:

- **Phase**: 1
- **Items Processed**: 0
- **Total Items**: 0
- **Current Operation**: "initialization"
- **Current Focus**: "[original bug diagnosis task]"

### **🐛 DEBUGGING-SPECIFIC DISCOVERY**

**ERROR_BOUNDARY_DISCOVERY**: Focus on debugging-relevant patterns:

1. **Error Tracing Analysis:** Find stack traces, map error propagation paths, and identify handling patterns. Document under `## Error Boundaries`.
2. **Component Interaction Debugging:** Discover service dependencies, find relevant endpoints/handlers, and analyze request flows. Document under `## Interaction Map`.
3. **Platform Debugging Intelligence:** Find platform error patterns (`PlatformValidationResult`, `PlatformException`), CQRS error paths, and repository error patterns. Document under `## Platform Error Patterns`.

Next, do semantic search and grep search all keywords of the task to find all related files, prioritizing the discovery of core logic files like **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**. **CRITICAL:** Save ALL file paths immediately as a numbered list under a `## File List` heading.
After semantic search, perform additional targeted searches to ensure no critical infrastructure is missed: `grep search` with patterns: `.*EventHandler.*{EntityName}|{EntityName}.*EventHandler`, `.*BackgroundJob.*{EntityName}|{EntityName}.*BackgroundJob`, `grep search` with patterns: `.*Consumer.*{EntityName}|{EntityName}.*Consumer`, `grep search` with patterns: `.*Service.*{EntityName}|{EntityName}.*Service`, `grep search` with patterns: `.*Helper.*{EntityName}|{EntityName}.*Helper`, and all (include pattern: `**/*.{cs,ts,html}`). High Priority files MUST be analyzed: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**. Update the `Total Items` count in the `## Progress` section.

#### **PHASE 1B: SYSTEMATIC FILE ANALYSIS FOR DEBUGGING** **IMPORTANT MUST DO WITH TODO LIST**

Count total files in file list, split it into many batch of group 10 files in priority order, each group insert in the current todo list new task for Analyze each batch of files group for all of files in file list.

**CRITICAL:** You must analyze all files in the file list identified as belonging to the highest IMPORTANT priority categories: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**.

For each file in the `## File List` (following the prioritized order if applicable), read and analyze it, add result into `## Knowledge Graph` section. The heading of each analyzed file must have the item order number in heading. Each file analyzing result detail the following information:

- **`filePath`**: The full path to the file.
- **`type`**: The component's classification.
- **`architecturalPattern`**: The main design pattern used.
- **`content`**: A summary of purpose and logic.
- **`symbols`**: Important classes, interfaces, methods.
- **`dependencies`**: All imported modules or `using` statements.
- **`businessContext`**: Comprehensive detail all business logic, how it contributes to the requirements.
- **`referenceFiles`**: Other files that use this file's symbols.
- **`relevanceScore`**: A numerical score (1-10).
- **`evidenceLevel`**: "verified" or "inferred".
- **`uncertainties`**: Any aspects you are unsure about.
- **`platformAbstractions`**: Any platform base classes used.
- **`serviceContext`**: Which microservice this file belongs to.
- **`dependencyInjection`**: Any DI registrations.
- **`genericTypeParameters`**: Generic type relationships.
- **`messageBusAnalysis`**: **CRITICAL FOR CONSUMERS**: When analyzing any Consumer file (files ending with `Consumer.cs` that extend `PlatformApplicationMessageBusConsumer<T>`), identify the `*BusMessage` type used. Then perform a grep search across ALL services to find files that **send/publish** this message type. List all producer files and their service locations in the `messageBusProducers` field. This analysis is crucial for understanding cross-service integration.
- **`targetedAspectAnalysis`** Populate `specificAspects:` key with deeper analysis:
    - **For Front-End items:** `componentHierarchy`, `routeConfig`, `routeGuards`, `stateManagementStores`, `dataBindingPatterns`, `validationStrategies`
    - **For Back-End items:** `authorizationPolicies`, `commands`, `queries`, `domainEntities`, `repositoryPatterns`, `businessRuleImplementations`
    - **For Consumer items:** `messageBusMessage`, `messageBusProducers`, `crossServiceIntegration`, `handleLogicWorkflow`
- **`errorPatterns`**: Exception handling, validation logic.
- **`stackTraceRelevance`**: Relation to any stack traces.
- **`debuggingComplexity`**: Difficulty to debug (1-10).
- **`errorPropagation`**: How errors flow through the component.
- **`platformErrorHandling`**: Use of platform error patterns.
- **`crossServiceErrors`**: Any cross-service error scenarios.
- **`validationLogic`**: Business rule validation that could fail.
- **`dependencyErrors`**: Potential dependency failures.

#### **PHASE 1C: Overall Analysis**

Write comprehensive `overallAnalysis:` summary showing:

- Complete end-to-end workflows discovered
- Key architectural patterns and relationships
- All business logic work flow: From front-end to back-end. (Example: Front-end Component => Controller Api Service => Command/Query => EventHandler => Others (Send email, producer bus message); From background job => event handler => others);
- Integration points and dependencies

#### **PHASE 2: MULTI-DIMENSIONAL ROOT CAUSE ANALYSIS & COMPREHENSIVE FIX STRATEGY.** You MUST ensure all files are analyzed. Then read the ENTIRE Markdown analysis notes file. Then Perform a systematic analysis under a `## Root Cause Analysis` heading with these dimensions

1. **Technical Root Causes:** Code defects, architectural issues.
2. **Business Logic Root Causes:** Rule violations, validation failures.
3. **Process Root Causes:** Missing validation, inadequate testing.
4. **Data Root Causes:** Data corruption, integrity violations.
5. **Environmental Root Causes:** Configuration issues, deployment problems.
6. **Integration Root Causes:** API contract violations, communication failures.

Document `potentialRootCauses` ranked by probability. Then, generate a comprehensive `## Fix Strategy` with alternatives, each including `suggestedFix`, `riskAssessment`, `regressionMitigation`, `testingStrategy`, and a `rollbackPlan`.

##### **PHASE 2.1: VERIFY AND REFACTOR** First, verify and ensure your implementation plan that code patterns, solution must follow code patterns and example in these files: `.github/copilot-instructions.md`, `.github/instructions/frontend-typescript.instructions.md`, `.github/instructions/backend-csharp.instructions.md`. Then verify and ensure your implementation plan satisfy clean code rules in `.github/instructions/code-review.instructions.md`

#### **PHASE 3: APPROVAL GATE.** You must present the comprehensive root cause analysis and prioritized fix strategy for my explicit approval. **DO NOT** proceed without it

#### **PHASE 4: DEBUGGING EXECUTION.** Once approved, execute the plan. Use all **DEBUGGING_SAFEGUARDS**

**SUCCESS VALIDATION:** Verify the fix resolves the bug without regressions. Document this under a `## Debugging Validation` heading.

### Debugging Guidelines

- **Evidence-based debugging:** Start with actual error messages, stack traces, and logs.
- **Platform error patterns:** Use `PlatformValidationResult` and `PlatformException` patterns.
- **Hypothesis-driven approach:** Test one hypothesis at a time with evidence.
- **Minimal impact fixes:** Prefer targeted fixes over broad refactoring.

---

---

## Code Review and Refactoring

You are to operate as an expert full-stack dotnet angular principle developer, software architecture to analyze and refactor the file `[file-name]` according to the task in `[task-description-or-task-info-file-path]`.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation. Todo list must cover all phases, from start to end, include child tasks in each phases too, everything is flatted out into a long detailed todo list.

### **🛡️ CORE ANTI-HALLUCINATION PROTOCOLS**

**ASSUMPTION_VALIDATION_CHECKPOINT**: Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

**EVIDENCE_CHAIN_VALIDATION**: Before claiming any relationship:

- "I believe X calls Y because..." → show actual code
- "This follows pattern Z because..." → cite specific examples
- "Service A owns B because..." → grep for actual boundaries

**TOOL_EFFICIENCY_PROTOCOL**:

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords
- Batch Write operations when creating multiple files

**CONTEXT_ANCHOR_SYSTEM**: Every 10 operations:

1. Re-read the original task description from the `## Metadata` section.
2. Verify the current operation aligns with original goals.
3. Check if we're solving the right problem.
4. Update the `Current Focus` bullet point within the `## Progress` section.

### **📋 QUICK REFERENCE CHECKLIST**

Before any major operation: [ ] ASSUMPTION_VALIDATION_CHECKPOINT [ ] EVIDENCE_CHAIN_VALIDATION [ ] TOOL_EFFICIENCY_PROTOCOL
Every 10 operations: [ ] CONTEXT_ANCHOR_CHECK [ ] Update **'Current Focus'** in **## Progress** section
Emergency: **Context Drift** → Re-read **## Metadata** section | **Assumption Creep** → Halt, validate with code | **Evidence Gap** → Mark as "inferred"

---

#### **PHASE 1: EXTERNAL MEMORY-DRIVEN REFACTORING ANALYSIS.** Your sole objective is to build a structured knowledge model in a Markdown analysis file at `.ai/workspace/analysis/[some-sort-semantic-name-of-this-task].md` with systematic external memory management

#### **PHASE 1A: INITIALIZATION AND DISCOVERY**

First, **initialize** the analysis file with a `## Metadata` heading and under it is my full original prompt in a markdown box , like this: `markdown [content of metadata in here]` (MUST 5 chars for start and end of markdown box), then continue add the task description and full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). the task description, and the full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). You **MUST** also create the following top-level headings: `## Progress`, `## Errors`, `## Assumption Validations`, `## Performance Metrics`, `## Memory Management`, `## Processed Files`, `## File List`, `## Knowledge Graph`. Populate the `## Progress` section with:

- **Phase**: 1
- **Items Processed**: 0
- **Total Items**: 0
- **Current Operation**: "initialization"
- **Current Focus**: "[original refactoring task]"

Next, do semantic search and grep search all keywords of the task to find all related files, prioritizing the discovery of core logic files like **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**. **CRITICAL:** Save ALL file paths immediately as a numbered list under a `## File List` heading.
After semantic search, perform additional targeted searches to ensure no critical infrastructure is missed: `grep search` with patterns: `.*EventHandler.*{EntityName}|{EntityName}.*EventHandler`, `.*BackgroundJob.*{EntityName}|{EntityName}.*BackgroundJob`, `grep search` with patterns: `.*Consumer.*{EntityName}|{EntityName}.*Consumer`, `grep search` with patterns: `.*Service.*{EntityName}|{EntityName}.*Service`, `grep search` with patterns: `.*Helper.*{EntityName}|{EntityName}.*Helper`, and all (include pattern: `**/*.{cs,ts,html}`). High Priority files MUST be analyzed: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**. Update the `Total Items` count in the `## Progress` section.

### **♻️ REFACTORING-SPECIFIC DISCOVERY**

**IMPACT_ANALYSIS_DISCOVERY**: Focus on refactoring-relevant patterns:

1. **Dependency Analysis:** Find all files that reference the refactoring target, map inheritance chains, and identify DI usages. Document under `## Dependency Map`.
2. **Platform Pattern Recognition:** Find usage of platform base classes, CQRS patterns, and repository patterns. Document under `## Platform Patterns`.
3. **SOLID Principle Validation:** Analyze the code for adherence to SOLID principles. Document under `## SOLID Analysis`.

#### **PHASE 1B: SYSTEMATIC FILE ANALYSIS FOR REFACTORING** **IMPORTANT MUST DO WITH TODO LIST**

Count total files in file list, split it into many batch of group 10 files in priority order, each group insert in the current todo list new task for Analyze each batch of files group for all of files in file list.

**CRITICAL:** You must analyze all files in the file list identified as belonging to the highest IMPORTANT priority categories: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**.

For each file in the `## File List` (following the prioritized order if applicable), read and analyze it, add result into `## Knowledge Graph` section. The heading of each analyzed file must have the item order number in heading. Each file analyzing result detail the following information:

- **`filePath`**: The full path to the file.
- **`type`**: The component's classification.
- **`architecturalPattern`**: The main design pattern used.
- **`content`**: A summary of purpose and logic.
- **`symbols`**: Important classes, interfaces, methods.
- **`dependencies`**: All imported modules or `using` statements.
- **`businessContext`**: Comprehensive detail all business logic, how it contributes to the requirements.
- **`referenceFiles`**: Other files that use this file's symbols.
- **`relevanceScore`**: A numerical score (1-10).
- **`evidenceLevel`**: "verified" or "inferred".
- **`uncertainties`**: Any aspects you are unsure about.
- **`platformAbstractions`**: Any platform base classes used.
- **`serviceContext`**: Which microservice this file belongs to.
- **`dependencyInjection`**: Any DI registrations.
- **`genericTypeParameters`**: Generic type relationships.
- **`targetedAspectAnalysis`** Populate `specificAspects:` key with deeper analysis:
    - **For Front-End items:** `componentHierarchy`, `routeConfig`, `routeGuards`, `stateManagementStores`, `dataBindingPatterns`, `validationStrategies`
    - **For Back-End items:** `authorizationPolicies`, `commands`, `queries`, `domainEntities`, `repositoryPatterns`, `businessRuleImplementations`
- **`refactoringComplexity`**: Difficulty of refactoring (1-10).
- **`dependencyImpact`**: Files affected by changes.
- **`platformCompliance`**: Adherence to platform patterns.
- **`solidViolations`**: Any SOLID principle violations.
- **`codeSmells`**: Any code smells or anti-patterns.
- **`refactoringOpportunities`**: Specific improvement ideas.
- **`riskAssessment`**: Potential risks of refactoring.
- **`consistencyPatterns`**: Patterns to maintain.

#### **PHASE 1C: Overall Analysis**

Write comprehensive `overallAnalysis:` summary showing:

- Complete end-to-end workflows discovered
- Key architectural patterns and relationships
- All business logic work flow: From front-end to back-end. (Example: Front-end Component => Controller Api Service => Command/Query => EventHandler => Others (Send email, producer bus message); From background job => event handler => others);
- Integration points and dependencies

#### **PHASE 2: REFACTORING PLAN GENERATION.** You MUST ensure all files are analyzed. Then read the ENTIRE Markdown analysis notes file. Then Generate a detailed refactoring plan under a `## Refactoring Plan` heading focusing on minimizing impact, improving pattern consistency, and adhering to SOLID principles. Your plan **MUST** follow coding convention and patterns in `.ai/docs/prompt-context.md`, must ultrathink and think step-by-step todo list to make code changes, for each step must read `.ai/docs/prompt-context.md` to follow code convention and patterns

#### **PHASE 3: APPROVAL GATE.** Present the refactoring plan with impact analysis and risk mitigation for explicit approval. **DO NOT** proceed without it

#### **PHASE 4: REFACTORING EXECUTION.** Once approved, execute the refactoring plan. Use all **REFACTORING_SAFEGUARDS**

#### **PHASE 5: VERIFY AND REFACTOR** First, verify and ensure your implementation plan that code patterns, solution must follow code patterns and example in these files: `.github/copilot-instructions.md`, `.github/instructions/frontend-typescript.instructions.md`, `.github/instructions/backend-csharp.instructions.md`. Then verify and ensure your implementation plan satisfy clean code rules in `.github/instructions/code-review.instructions.md`

**SUCCESS VALIDATION:** Verify the refactoring improves code quality, maintains functionality, and follows platform patterns. Document this under a `## Refactoring Validation` heading.

### Refactoring Guidelines

- **Evidence-based refactoring:** Always analyze dependencies before making changes.
- **Platform pattern consistency:** Use platform patterns consistently.
- **SOLID principle adherence:** Ensure refactoring improves SOLID compliance.
- **Minimal breaking changes:** Prefer backward-compatible changes.

---

---

## Test Case Generation

You are to operate as an expert full-stack QA engineer and SDET to analyze the feature described in `[feature_description_or_file_paths]` and generate a comprehensive set of test cases (Given...When...Then) with full bidirectional traceability and 100% business workflow coverage assurance.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation. Todo list must cover all phases, from start to end, include child tasks in each phases too, everything is flatted out into a long detailed todo list.

### **🛡️ CORE ANTI-HALLUCINATION PROTOCOLS**

**ASSUMPTION_VALIDATION_CHECKPOINT**: Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

**EVIDENCE_CHAIN_VALIDATION**: Before claiming any relationship:

- "I believe X calls Y because..." → show actual code
- "This follows pattern Z because..." → cite specific examples
- "Service A owns B because..." → grep for actual boundaries

**TOOL_EFFICIENCY_PROTOCOL**:

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords
- Batch Write operations when creating multiple files

**CONTEXT_ANCHOR_SYSTEM**: Every 10 operations:

1. Re-read the original task description from the `## Metadata` section.
2. Verify the current operation aligns with original goals.
3. Check if we're solving the right problem.
4. Update the `Current Focus` bullet point within the `## Progress` section.

### **📋 QUICK REFERENCE CHECKLIST**

Before any major operation: [ ] ASSUMPTION_VALIDATION_CHECKPOINT [ ] EVIDENCE_CHAIN_VALIDATION [ ] TOOL_EFFICIENCY_PROTOCOL
Every 10 operations: [ ] CONTEXT_ANCHOR_CHECK [ ] Update **'Current Focus'** in **## Progress** section
Emergency: **Context Drift** → Re-read **## Metadata** section | **Assumption Creep** → Halt, validate with code | **Evidence Gap** → Mark as "inferred"

---

#### **PHASE 1: EXTERNAL MEMORY-DRIVEN TEST ANALYSIS.** Your sole objective is to build a structured knowledge model in a Markdown analysis file at `.ai/workspace/analysis/[some-sort-semantic-name-of-this-task].md` with systematic external memory management

#### **PHASE 1A: INITIALIZATION AND DISCOVERY**

First, **initialize** the analysis file with a `## Metadata` heading and under it is my full original prompt in a markdown box , like this: `markdown [content of metadata in here]` (MUST 5 chars for start and end of markdown box), then continue add the task description and full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). the task description, and the full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). You **MUST** also create the following top-level headings: `## Progress`, `## Errors`, `## Assumption Validations`, `## Performance Metrics`, `## Memory Management`, `## Processed Files`, `## File List`, `## Knowledge Graph`. Populate the `## Progress` section with:

- **Phase**: 1
- **Items Processed**: 0
- **Total Items**: 0
- **Current Operation**: "initialization"
- **Current Focus**: "[original test analysis task]"

Next, do semantic search and grep search all keywords of the task to find all related files, prioritizing the discovery of core logic files like **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**. **CRITICAL:** Save ALL file paths immediately as a numbered list under a `## File List` heading.
After semantic search, perform additional targeted searches to ensure no critical infrastructure is missed: `grep search` with patterns: `.*EventHandler.*{EntityName}|{EntityName}.*EventHandler`, `.*BackgroundJob.*{EntityName}|{EntityName}.*BackgroundJob`, `grep search` with patterns: `.*Consumer.*{EntityName}|{EntityName}.*Consumer`, `grep search` with patterns: `.*Service.*{EntityName}|{EntityName}.*Service`, `grep search` with patterns: `.*Helper.*{EntityName}|{EntityName}.*Helper`, and all (include pattern: `**/*.{cs,ts,html}`). High Priority files MUST be analyzed: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**. Update the `Total Items` count in the `## Progress` section.

#### **PHASE 1B: SYSTEMATIC FILE ANALYSIS FOR TESTING** **IMPORTANT MUST DO WITH TODO LIST**

Count total files in file list, split it into many batch of group 10 files in priority order, each group insert in the current todo list new task for Analyze each batch of files group for all of files in file list.

**CRITICAL:** You must analyze all files in the file list identified as belonging to the highest IMPORTANT priority categories: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**.

For each file in the `## File List` (following the prioritized order if applicable), read and analyze it, add result into `## Knowledge Graph` section. The heading of each analyzed file must have the item order number in heading. Each file analyzing result detail the following information:

- **`filePath`**: The full path to the file.
- **`type`**: The component's classification.
- **`architecturalPattern`**: The main design pattern used.
- **`content`**: A summary of purpose and logic.
- **`symbols`**: Important classes, interfaces, methods.
- **`dependencies`**: All imported modules or `using` statements.
- **`businessContext`**: Comprehensive detail all business logic, how it contributes to the requirements.
- **`referenceFiles`**: Other files that use this file's symbols.
- **`relevanceScore`**: A numerical score (1-10).
- **`evidenceLevel`**: "verified" or "inferred".
- **`uncertainties`**: Any aspects you are unsure about.
- **`platformAbstractions`**: Any platform base classes used.
- **`serviceContext`**: Which microservice this file belongs to.
- **`dependencyInjection`**: Any DI registrations.
- **`genericTypeParameters`**: Generic type relationships.
- **`messageBusAnalysis`**: **CRITICAL FOR CONSUMERS**: When analyzing any Consumer file (files ending with `Consumer.cs` that extend `PlatformApplicationMessageBusConsumer<T>`), identify the `*BusMessage` type used. Then perform a grep search across ALL services to find files that **send/publish** this message type. List all producer files and their service locations in the `messageBusProducers` field. This analysis is crucial for understanding cross-service integration.
- **`targetedAspectAnalysis`** Populate `specificAspects:` key with deeper analysis:
    - **For Front-End items:** `componentHierarchy`, `routeConfig`, `routeGuards`, `stateManagementStores`, `dataBindingPatterns`, `validationStrategies`
    - **For Back-End items:** `authorizationPolicies`, `commands`, `queries`, `domainEntities`, `repositoryPatterns`, `businessRuleImplementations`
    - **For Consumer items:** `messageBusMessage`, `messageBusProducers`, `crossServiceIntegration`, `handleLogicWorkflow`
- **`coverageTargets`**: Specific coverage goals.
- **`edgeCases`**: Edge cases and boundary conditions.
- **`businessScenarios`**: Business scenarios supported.
- **`detailedFunctionalRequirements`**: Detailed business logic and functional requirements.
- **`detailedTestCases`**: Detailed business logic test cases
    - Given ... When ... Then

#### **PHASE 2: Overall Analysis**

Write comprehensive `overallAnalysis:` summary showing:

- Complete end-to-end workflows discovered
- Key architectural patterns and relationships
- All business logic work flow: From front-end to back-end. (Example: Front-end Component => Controller Api Service => Command/Query => EventHandler => Others (Send email, producer bus message); From background job => event handler => others);
- Integration points and dependencies

#### **PHASE 3: APPROVAL GATE.** Present the test plan with coverage analysis for explicit approval. **DO NOT** proceed without it

#### **PHASE 4: EXECUTION.** Once approved, write the comprehensive feature requirements document, generated test cases, and coverage analysis into a new markdown file named `[some-sort-semantic-name-of-this-task].ai_spec_doc.md` in the `ai_spec_docs/[some-sort-semantic-name-of-this-task].ai_spec_doc.md` directory. Try to init the empty file first, write into it sections by sections, breakdown smaller todo task

You MUST ensure all files are analyzed. Then read the ENTIRE Markdown analysis notes file. Then generate a comprehensive list of all possible test cases, in format Given...When...Then, organized into 4 categories group by Critical, High, Medium, Low priority levels. All test cases should cover all conditional logic paths (conditionalLogicPaths). Each test cases should also include all related code components involve if available (Entities, Api/Controller, Services, Query/Command, EventHandler, Consumer, Producer, BackgroundJob, Ui Front-end Component). **IMPORTANT** Each test case should also include workflow between components of the test case (**Examples**: User submits form → API endpoint `/api/leave-requests` → `CreateLeaveRequestCommand` → triggers `SendEmailEvent` → `EmailNotificationHandler` → email sent; "Approval triggers → `LeaveApprovedEvent` → `UpdateTimesheetHandler` + `SendEmailHandler`"; "Background job `AutoApprovalExecutor` → triggers `ProcessLeaveRequestCommand` → fires `ApprovalCompletedEvent` → updates TimeLog + sends notification")

**IMPORTANT MANDATORY DOCUMENT STRUCTURE:** The markdown file **MUST** follow this standardized structure with clickable navigation:

````markdown
# [Feature Name] - Comprehensive QA Test Cases

## Table of Contents

1. [Feature Overview](## 1. Feature Overview)
   [Should also list out navigation link to sub header or section if available]
2. [Entity Relationship Diagram](## 2. Entity Relationship Diagram)
   [Should also list out navigation link to sub header or section if available]
3. [Detailed Test Cases](## 3. Detailed Test Cases)
   [Should also list out navigation link to sub header or section if available]
4. [Traceability Matrix](## 4. Traceability Matrix)
   [Should also list out navigation link to sub header or section if available]
5. [Coverage Analysis](## 5. Coverage Analysis)
   [Should also list out navigation link to sub header or section if available]

## 1. Feature Overview

**Example Outline to Generate**

- **Epic:** Goal Creation and Management (OKR Implementation)
    - **Summary (The Why):** As an employee or manager, I want to create and manage goals using the OKR methodology, so that I can align individual objectives with organizational strategy, track progress systematically, and ensure accountability through transparent goal visibility and measurement.

    - **User Story 1: Hierarchical Goal Creation**
        - **ID:** US-GOAL-001
        - **Story:** As a manager, I want to create a new "Key Result" and link it to an existing "Objective," so that I can build a clear hierarchical goal structure.
        - **Acceptance Criteria (AC):**
            - **AC 1:** `GIVEN` I am viewing an "Objective," `WHEN` I click the "Add Key Result" button, `THEN` a new goal creation form should appear with the parent objective pre-selected.
            - **AC 2:** `GIVEN` the new goal is created, `WHEN` I view the parent objective's page, `THEN` the new key result should be listed as a child item.
            - **AC 3:** `GIVEN` I am on the goal creation page, `THEN` I must not be able to set a "Key Result" as the parent of an "Objective."
            - _(Add as many AC as needed)_

    - _(Add as many User Story as needed)_

    - **Business Requirements:**
        - [Each business requirement here]
    - **Roles/Permission Authorization:**
        - [Each role and permission authorization here]

_(Add as many Epic as needed)_

### 1-A. Cross Services Business Logic Overview

[Cross Service Consumer Producer Business Logic Here]

Example:
**Critical Cross-Service Integration Patterns for Employee Management:**

#### **1. Employee Entity Synchronization (TextSnippetService → TextSnippetService)**

- **Producer**: `EmployeeEntityEventBusMessageProducer` in TextSnippetService
- **Consumer**: `UpsertOrDeleteEmployeeInfoOnEmployeeEntityEventBusConsumer` in TextSnippetService
- **Message**: `EmployeeEntityEventBusMessage`
- **Business Logic**: When Employee entities are created/updated in TALENTS (recruitment pipeline), they automatically sync to GROWTH for performance review workflows, goal management, and organizational hierarchy management. The consumer only syncs essential fields like UserId, Email, ManagerId, and Status to maintain loose coupling.

---

For **every single feature** listed in the outline above, generate a detailed breakdown using this exact format:

**Feature Name:** [The specific feature name from the outline]

- **Summary (The "Why")**: A paragraph starting with a user story in the format: "As a [user type], I want to [action], so that [benefit]."
- **Business Requirements / User Stories**: A list of all requirements, each starting with a unique ID like `BR-XXX`. Should be comprehensive, detailed as possible. Logic must be verified from source code.
- **Roles/Permission Authorization (Who can access)**: A list of the user roles (e.g., Admin, Authenticated User, Guest) or specific permissions needed to use the each features. Detailed who can and can not do what.

---

## 2. Entity Relationship Diagram

### Core Entities and Relationships

[List of all entities info here. Name should match actually class name in source code, note that one file could contains many classes names.]
Example:
**Employee** (Aggregate Root)

- **Properties**: EmployeeId, Name, Department
- **Relationships**:
    - Submits many LeaveRequests (1:N)
    - Submits many AttendanceRequests (1:N)
    - Submits many TimeSheetRequests (1:N)
    - Has many TimeLogs (1:N)
    - Can be assigned to many RequestPolicies (N:M)
    - Can be assigned to many WorkingShifts (N:M)

### Entity Relationship Flow

[Entity Relationship Flow here. Name should match actually class name in source code, note that one file could contains many classes names.]

### Mermaid Diagram

[A mermaid diagram of all entities relationship here. Name should match actually class name in source code, note that one file could contains many classes names. No bidirectional redundancy between two entities, either from A to B or from B to A, not define both A to B and B to A.]

### External Micro-Service BusMessage Integration [Optional]

[All information about external services bus consumer integration related to feature]

---

## 3. Detailed Test Cases

**Example Outline to Generate**

### **[Priority Level (Critical/High/Medium/Low)]:**

#### **TC-001: Pipeline Stage Transition with Validation**

**Feature Module:** Pipeline Management System
**Business Requirement:** BR-007, BR-008, BR-009
**Priority:** Critical

**Given** I am a hiring manager with pipeline management permissions
**And** a candidate application exists in "Screening" stage
**When** I move the application to "Interview" stage via MoveApplicationInPipelineCommand
**Then** the system should:

- Validate user permissions for the pipeline operation
- Verify the stage transition is valid (Screening → Interview allowed)
- Update application's current pipeline stage
- Create history entry for the stage transition
- Publish entity events for analytics integration
- Update application timestamp and audit trail

**Component Interaction Flow:**

```
Frontend → CandidatesController → MoveApplicationInPipelineCommand →
Pipeline Repository → Validation Logic → Application Repository →
History Tracking → Message Bus → AnalyticsService Integration →
Event Publishing
```

**Test Data:**

- Application in "Screening" stage with valid candidate
- Hiring manager with department-level pipeline permissions
- Target stage "Interview" with proper configuration

**Expected Outcomes:**

- Application.PipelineStageId updated to Interview stage
- History record created with timestamp and user information
- Event published to analytics service for reporting
- No unauthorized stage transitions allowed

**Edge Cases to Validate:**

- Invalid stage transitions (Interview → Applied)
- User without permissions for specific pipeline
- Application in final "Hired" state (should trigger automation)
- Missing or invalid pipeline stage configuration
- Concurrent stage modification scenarios

[other test cases in same Priority Group Level]

## 4. Traceability Matrix

[Bidirectional mapping between tests and business components]

## 5. Coverage Analysis

[Multi-dimensional coverage validation with percentages]
````

#### **PHASE 5: Review and Update `## Table of Contents` section more detailed sub section links in the generated ai_spec_doc.md again**

---

---

## Documentation Enhancement

You are to operate as an expert technical writer and software documentation specialist to enhance the documentation in `[file-path-or-documentation-scope]` according to the requirements in `[task-description-or-task-info-file-path]`.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation. Todo list must cover all phases, from start to end, include child tasks in each phases too, everything is flatted out into a long detailed todo list.

### **🛡️ CORE ANTI-HALLUCINATION PROTOCOLS**

**ASSUMPTION_VALIDATION_CHECKPOINT**: Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

**EVIDENCE_CHAIN_VALIDATION**: Before claiming any relationship:

- "I believe X calls Y because..." → show actual code
- "This follows pattern Z because..." → cite specific examples
- "Service A owns B because..." → grep for actual boundaries

**TOOL_EFFICIENCY_PROTOCOL**:

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords
- Batch Write operations when creating multiple files

**CONTEXT_ANCHOR_SYSTEM**: Every 10 operations:

1. Re-read the original task description from the `## Metadata` section.
2. Verify the current operation aligns with original goals.
3. Check if we're solving the right problem.
4. Update the `Current Focus` bullet point within the `## Progress` section.

### **📋 QUICK REFERENCE CHECKLIST**

Before any major operation: [ ] ASSUMPTION_VALIDATION_CHECKPOINT [ ] EVIDENCE_CHAIN_VALIDATION [ ] TOOL_EFFICIENCY_PROTOCOL
Every 10 operations: [ ] CONTEXT_ANCHOR_CHECK [ ] Update **'Current Focus'** in **## Progress** section
Emergency: **Context Drift** → Re-read **## Metadata** section | **Assumption Creep** → Halt, validate with code | **Evidence Gap** → Mark as "inferred"

---

#### **PHASE 1: EXTERNAL MEMORY-DRIVEN DOCUMENTATION ANALYSIS.** Your sole objective is to build a structured knowledge model in a Markdown analysis file at `.ai/workspace/analysis/[some-sort-semantic-name-of-this-task].md` with systematic external memory management

#### **PHASE 1A: INITIALIZATION AND DISCOVERY**

First, **initialize** the analysis file with a `## Metadata` heading and under it is my full original prompt in a markdown box , like this: `markdown [content of metadata in here]` (MUST 5 chars for start and end of markdown box), then continue add the task description and full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). the task description, and the full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). You **MUST** also create the following top-level headings: `## Progress`, `## Errors`, `## Assumption Validations`, `## Performance Metrics`, `## Memory Management`, `## Processed Files`, `## File List`, `## Knowledge Graph`. Populate the `## Progress` section with:

- **Phase**: 1
- **Items Processed**: 0
- **Total Items**: 0
- **Current Operation**: "initialization"
- **Current Focus**: "[original documentation task]"

Next, do semantic search and grep search all keywords of the task to find all related files, prioritizing the discovery of core logic files like **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**. **CRITICAL:** Save ALL file paths immediately as a numbered list under a `## File List` heading.
After semantic search, perform additional targeted searches to ensure no critical infrastructure is missed: `grep search` with patterns: `.*EventHandler.*{EntityName}|{EntityName}.*EventHandler`, `.*BackgroundJob.*{EntityName}|{EntityName}.*BackgroundJob`, `grep search` with patterns: `.*Consumer.*{EntityName}|{EntityName}.*Consumer`, `grep search` with patterns: `.*Service.*{EntityName}|{EntityName}.*Service`, `grep search` with patterns: `.*Helper.*{EntityName}|{EntityName}.*Helper`, and all (include pattern: `**/*.{cs,ts,html}`). High Priority files MUST be analyzed: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**. Update the `Total Items` count in the `## Progress` section.

### **📚 DOCUMENTATION-SPECIFIC DISCOVERY**

**DOCUMENTATION_COMPLETENESS_DISCOVERY**: Focus on documentation-relevant patterns:

1. **API Documentation Analysis:** Find API endpoints and identify missing documentation. Document under `## API Documentation`.
2. **Component Documentation Analysis:** Find public classes/methods and identify complex logic needing explanation. Document under `## Component Documentation`.
3. **Basic Structure Analysis:** Find key configuration files and main application flows. Document under `## Structure Documentation`.

#### **PHASE 1B: SYSTEMATIC FILE ANALYSIS FOR DOCUMENTATION** **IMPORTANT MUST DO WITH TODO LIST**

Count total files in file list, split it into many batch of group 10 files in priority order, each group insert in the current todo list new task for Analyze each batch of files group for all of files in file list.

**CRITICAL:** You must analyze all files in the file list identified as belonging to the highest IMPORTANT priority categories: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**.

For each file in the `## File List` (following the prioritized order if applicable), read and analyze it, add result into `## Knowledge Graph` section. The heading of each analyzed file must have the item order number in heading. Each file analyzing result detail the following information:

- **`filePath`**: The full path to the file.
- **`type`**: The component's classification.
- **`architecturalPattern`**: The main design pattern used.
- **`content`**: A summary of purpose and logic.
- **`symbols`**: Important classes, interfaces, methods.
- **`dependencies`**: All imported modules or `using` statements.
- **`businessContext`**: Comprehensive detail all business logic, how it contributes to the requirements.
- **`referenceFiles`**: Other files that use this file's symbols.
- **`relevanceScore`**: A numerical score (1-10).
- **`evidenceLevel`**: "verified" or "inferred".
- **`uncertainties`**: Any aspects you are unsure about.
- **`platformAbstractions`**: Any platform base classes used.
- **`serviceContext`**: Which microservice this file belongs to.
- **`dependencyInjection`**: Any DI registrations.
- **`genericTypeParameters`**: Generic type relationships.
- **`targetedAspectAnalysis`** Populate `specificAspects:` key with deeper analysis:
    - **For Front-End items:** `componentHierarchy`, `routeConfig`, `routeGuards`, `stateManagementStores`, `dataBindingPatterns`, `validationStrategies`
    - **For Back-End items:** `authorizationPolicies`, `commands`, `queries`, `domainEntities`, `repositoryPatterns`, `businessRuleImplementations`
- **`documentationGaps`**: Missing or incomplete documentation.
- **`complexityLevel`**: How difficult the component is to understand (1-10).
- **`userFacingFeatures`**: Features needing user documentation.
- **`developerNotes`**: Technical details needing developer documentation.
- **`exampleRequirements`**: Code examples or usage scenarios needed.
- **`apiDocumentationNeeds`**: API endpoints requiring documentation.
- **`configurationOptions`**: Configuration parameters needing explanation.
- **`troubleshootingAreas`**: Common issues requiring troubleshooting docs.

#### **PHASE 1C: Overall Analysis**

Write comprehensive `overallAnalysis:` summary showing:

- Complete end-to-end workflows discovered
- Key architectural patterns and relationships
- All business logic work flow: From front-end to back-end. (Example: Front-end Component => Controller Api Service => Command/Query => EventHandler => Others (Send email, producer bus message); From background job => event handler => others);
- Integration points and dependencies

#### **PHASE 2: DOCUMENTATION PLAN GENERATION.** You MUST ensure all files are analyzed. Then read the ENTIRE Markdown analysis notes file. Then Generate a detailed documentation plan under a `## Documentation Plan` heading focusing on completeness, clarity, examples, and consistency

#### **PHASE 3: APPROVAL GATE.** Present the documentation plan for explicit approval. **DO NOT** proceed without it

#### **PHASE 4: DOCUMENTATION EXECUTION.** Once approved, execute the plan. Use all **DOCUMENTATION_SAFEGUARDS**

**SUCCESS VALIDATION:** Verify documentation is accurate, complete, and helpful. Document this under a `## Documentation Validation` heading.

### Documentation Guidelines

- **Accuracy-first approach:** Verify every documented feature with actual code.
- **User-focused content:** Organize documentation based on user needs.
- **Example-driven documentation:** Include practical examples and usage scenarios.
- **Consistency maintenance:** Follow established documentation patterns.

---

---

## README Improvement

You are to operate as an expert technical writer and project documentation specialist to create a comprehensive, accurate README.md file per `[task-description-or-task-info-file-path]`.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation. Todo list must cover all phases, from start to end, include child tasks in each phases too, everything is flatted out into a long detailed todo list.

### **🛡️ CORE ANTI-HALLUCINATION PROTOCOLS**

**ASSUMPTION_VALIDATION_CHECKPOINT**: Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

**EVIDENCE_CHAIN_VALIDATION**: Before claiming any relationship:

- "I believe X calls Y because..." → show actual code
- "This follows pattern Z because..." → cite specific examples
- "Service A owns B because..." → grep for actual boundaries

**TOOL_EFFICIENCY_PROTOCOL**:

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords
- Batch Write operations when creating multiple files

**CONTEXT_ANCHOR_SYSTEM**: Every 10 operations:

1. Re-read the original task description from the `## Metadata` section.
2. Verify the current operation aligns with original goals.
3. Check if we're solving the right problem.
4. Update the `Current Focus` bullet point within the `## Progress` section.

### **📋 QUICK REFERENCE CHECKLIST**

Before any major operation: [ ] ASSUMPTION_VALIDATION_CHECKPOINT [ ] EVIDENCE_CHAIN_VALIDATION [ ] TOOL_EFFICIENCY_PROTOCOL
Every 10 operations: [ ] CONTEXT_ANCHOR_CHECK [ ] Update **'Current Focus'** in **## Progress** section
Emergency: **Context Drift** → Re-read **## Metadata** section | **Assumption Creep** → Halt, validate with code | **Evidence Gap** → Mark as "inferred"

---

#### **PHASE 1: EXTERNAL MEMORY-DRIVEN README ANALYSIS.** Your sole objective is to build a structured knowledge model in a Markdown analysis file at `.ai/workspace/analysis/[some-sort-semantic-name-of-this-task].md` with systematic external memory management

#### **PHASE 1A: INITIALIZATION AND DISCOVERY**

First, **initialize** the analysis file with a `## Metadata` heading and under it is my full original prompt in a markdown box , like this: `markdown [content of metadata in here]` (MUST 5 chars for start and end of markdown box), then continue add the task description and full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). the task description, and the full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). You **MUST** also create the following top-level headings: `## Progress`, `## Errors`, `## Assumption Validations`, `## Performance Metrics`, `## Memory Management`, `## Processed Files`, `## File List`, `## Knowledge Graph`. Populate the `## Progress` section with:

- **Phase**: 1
- **Items Processed**: 0
- **Total Items**: 0
- **Current Operation**: "initialization"
- **Current Focus**: "[original README improvement task]"

Next, do semantic search and grep search all keywords of the task to find all related files, prioritizing the discovery of core logic files like **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**. **CRITICAL:** Save ALL file paths immediately as a numbered list under a `## File List` heading.
After semantic search, perform additional targeted searches to ensure no critical infrastructure is missed: `grep search` with patterns: `.*EventHandler.*{EntityName}|{EntityName}.*EventHandler`, `.*BackgroundJob.*{EntityName}|{EntityName}.*BackgroundJob`, `grep search` with patterns: `.*Consumer.*{EntityName}|{EntityName}.*Consumer`, `grep search` with patterns: `.*Service.*{EntityName}|{EntityName}.*Service`, `grep search` with patterns: `.*Helper.*{EntityName}|{EntityName}.*Helper`, and all (include pattern: `**/*.{cs,ts,html}`). High Priority files MUST be analyzed: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**. Update the `Total Items` count in the `## Progress` section.

### **📖 README-SPECIFIC DISCOVERY**

**PROJECT_OVERVIEW_DISCOVERY**: Focus on README-relevant patterns:

1. **Project Structure Analysis:** Find entry points, map key directories, and identify technologies. Document under `## Project Structure`.
2. **Feature Discovery:** Find user-facing features and map API endpoints. Document under `## Feature Mapping`.
3. **Setup Requirements Analysis:** Find package files, map dependencies, and identify configuration needs. Document under `## Setup Requirements`.

#### **PHASE 1B: SYSTEMATIC FILE ANALYSIS FOR README** **IMPORTANT MUST DO WITH TODO LIST**

Count total files in file list, split it into many batch of group 10 files in priority order, each group insert in the current todo list new task for Analyze each batch of files group for all of files in file list.

**CRITICAL:** You must analyze all files in the file list identified as belonging to the highest IMPORTANT priority categories: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**.

For each file in the `## File List` (following the prioritized order if applicable), read and analyze it, add result into `## Knowledge Graph` section. The heading of each analyzed file must have the item order number in heading. Each file analyzing result detail the following information:

- **`filePath`**: The full path to the file.
- **`type`**: The component's classification.
- **`architecturalPattern`**: The main design pattern used.
- **`content`**: A summary of purpose and logic.
- **`symbols`**: Important classes, interfaces, methods.
- **`dependencies`**: All imported modules or `using` statements.
- **`businessContext`**: Comprehensive detail all business logic, how it contributes to the requirements.
- **`referenceFiles`**: Other files that use this file's symbols.
- **`relevanceScore`**: A numerical score (1-10).
- **`evidenceLevel`**: "verified" or "inferred".
- **`uncertainties`**: Any aspects you are unsure about.
- **`platformAbstractions`**: Any platform base classes used.
- **`serviceContext`**: Which microservice this file belongs to.
- **`dependencyInjection`**: Any DI registrations.
- **`genericTypeParameters`**: Generic type relationships.
- **`messageBusAnalysis`**: **CRITICAL FOR CONSUMERS**: When analyzing any Consumer file (files ending with `Consumer.cs` that extend `PlatformApplicationMessageBusConsumer<T>`), identify the `*BusMessage` type used. Then perform a grep search across ALL services to find files that **send/publish** this message type. List all producer files and their service locations in the `messageBusProducers` field. This analysis is crucial for understanding cross-service integration.
- **`targetedAspectAnalysis`** Populate `specificAspects:` key with deeper analysis:
    - **For Front-End items:** `componentHierarchy`, `routeConfig`, `routeGuards`, `stateManagementStores`, `dataBindingPatterns`, `validationStrategies`
    - **For Back-End items:** `authorizationPolicies`, `commands`, `queries`, `domainEntities`, `repositoryPatterns`, `businessRuleImplementations`
    - **For Consumer items:** `messageBusMessage`, `messageBusProducers`, `crossServiceIntegration`, `handleLogicWorkflow`
- **`readmeRelevance`**: How the component should be represented in the README (1-10).
- **`userImpact`**: How the component affects end users.
- **`setupRequirements`**: Prerequisites for this component.
- **`configurationNeeds`**: Configuration required.
- **`featureDescription`**: User-facing features provided.
- **`troubleshootingAreas`**: Common issues users might encounter.
- **`exampleUsage`**: Usage examples relevant for the README.
- **`projectContext`**: How it fits into the overall project.

#### **PHASE 1C: Overall Analysis**

Write comprehensive `overallAnalysis:` summary showing:

- Complete end-to-end workflows discovered
- Key architectural patterns and relationships
- All business logic work flow: From front-end to back-end. (Example: Front-end Component => Controller Api Service => Command/Query => EventHandler => Others (Send email, producer bus message); From background job => event handler => others);
- Integration points and dependencies

#### **PHASE 2: README PLAN GENERATION.** You MUST ensure all files are analyzed. Then read the ENTIRE Markdown analysis notes file. Then Generate a detailed README outline under a `## README Plan` heading, focusing on Project Overview, Installation, Usage, Configuration, and Development guidelines

#### **PHASE 3: APPROVAL GATE.** Present the README plan for explicit approval. **DO NOT** proceed without it

#### **PHASE 4: README EXECUTION.** Once approved, create the comprehensive README. Use all **README_SAFEGUARDS**

**SUCCESS VALIDATION:** Verify the README is accurate, comprehensive, and helpful. Document this under a `## README Validation` heading.

### README Guidelines

- **User-first approach:** Organize the README for new users.
- **Verified instructions:** Test all setup and installation instructions.
- **Clear project purpose:** Explain what the project does and why it is useful.
- **Practical examples:** Include working examples that users can follow.

---

---

## Branch Comparison & Specification Update

You are to operate as an expert full-stack dotnet angular principle developer, software architect, and technical analyst to analyze all file changes between branch `[source-branch]` and branch `[target-branch]`, perform comprehensive impact analysis, and update the existing specification document `[existing-spec-doc-file-path]` with new requirements and test specifications.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation. Todo list must cover all phases, from start to end, include child tasks in each phases too, everything is flatted out into a long detailed todo list.

### **🛡️ CORE ANTI-HALLUCINATION PROTOCOLS**

**ASSUMPTION_VALIDATION_CHECKPOINT**: Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

**EVIDENCE_CHAIN_VALIDATION**: Before claiming any relationship:

- "I believe X calls Y because..." → show actual code
- "This follows pattern Z because..." → cite specific examples
- "Service A owns B because..." → grep for actual boundaries

**TOOL_EFFICIENCY_PROTOCOL**:

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords
- Batch Write operations when creating multiple files

**CONTEXT_ANCHOR_SYSTEM**: Every 10 operations:

1. Re-read the original task description from the `## Metadata` section.
2. Verify the current operation aligns with original goals.
3. Check if we're solving the right problem.
4. Update the `Current Focus` bullet point within the `## Progress` section.

### **📋 QUICK REFERENCE CHECKLIST**

Before any major operation: [ ] ASSUMPTION_VALIDATION_CHECKPOINT [ ] EVIDENCE_CHAIN_VALIDATION [ ] TOOL_EFFICIENCY_PROTOCOL
Every 10 operations: [ ] CONTEXT_ANCHOR_CHECK [ ] Update **'Current Focus'** in **## Progress** section
Emergency: **Context Drift** → Re-read **## Metadata** section | **Assumption Creep** → Halt, validate with code | **Evidence Gap** → Mark as "inferred"

---

#### **PHASE 1: EXTERNAL MEMORY-DRIVEN BRANCH ANALYSIS MODEL CONSTRUCTION.** Your sole objective is to build a structured knowledge model in a **Markdown** analysis file at `.ai/workspace/analysis/[some-sort-semantic-name-of-this-task].md` with systematic external memory management

#### **PHASE 1A: INITIALIZATION AND DISCOVERY**

First, **initialize** the analysis file with a `## Metadata` heading and under it is my full original prompt in a markdown box , like this: `markdown [content of metadata in here]` (MUST 5 chars for start and end of markdown box), then continue add the task description and full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). the task description, and the full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). You **MUST** also create the following top-level headings: `## Progress`, `## Errors`, `## Assumption Validations`, `## Performance Metrics`, `## Memory Management`, `## Processed Files`, `## File List`, `## Knowledge Graph`. Populate the `## Progress` section with:

- **Phase:** 1
- **Items Processed:** 0
- **Total Items**: 0
- **Current Operation:** "initialization"
- **Current Focus:** "[original branch comparison task]"

### **🔄 GIT BRANCH ANALYSIS DISCOVERY**

**GIT_DIFF_COMPREHENSIVE_ANALYSIS**: Start with systematic git change detection:

1. **Primary Change Detection Commands:**

    ```bash
    git diff --name-status [source-branch]..[target-branch]
    git diff --stat [source-branch]..[target-branch]
    git log --oneline [source-branch]..[target-branch]
    ```

    - Document results under `## Git Diff Analysis` and `## Commit History`.

2. **Change Impact & Scope Classification:** Document under `## Change Classification` and `## Change Scope Analysis` the types of changes (Frontend, Backend, Config, DB) and their purpose (Feature, Bug Fix, Refactor).

**RELATED_FILES_COMPREHENSIVE_DISCOVERY**: For each changed file, discover all related components using `grep` and file analysis to find importers, dependencies, test files, API consumers, and UI components.

**CRITICAL:** Save ALL changed files AND their related files to a `## Comprehensive File List` heading. For each file, include:

- `filePath`, `changeType`, `relationshipType`, `impactLevel`, and `serviceContext`.

**INTELLIGENT_SCOPE_MANAGEMENT**: If the file list exceeds 75, prioritize analysis by `impactLevel` (Critical > High > Medium > Low) and document the rationale in the `## Memory Management` section.

#### **PHASE 1B: COMPREHENSIVE KNOWLEDGE GRAPH CONSTRUCTION FOR CHANGES** **IMPORTANT MUST DO WITH TODO LIST**

Count total files in file list, split it into many batch of group 10 files in priority order, each group insert in the current todo list new task for Analyze each batch of files group for all of files in file list.

**CRITICAL:** You must analyze all files in the file list identified as belonging to the highest IMPORTANT priority categories: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**.

For each file in the `## Comprehensive File List` (prioritizing by `impactLevel`), add a new sub-section under the `## Knowledge Graph` heading. For each, detail:

- **`filePath`**: The full path to the file.
- **`type`**: The component's classification.
- **`architecturalPattern`**: The main design pattern used.
- **`content`**: A summary of purpose and logic.
- **`symbols`**: Important classes, interfaces, methods.
- **`dependencies`**: All imported modules or `using` statements.
- **`businessContext`**: Comprehensive detail all business logic, how it contributes to the requirements.
- **`referenceFiles`**: Other files that use this file's symbols.
- **`relevanceScore`**: A numerical score (1-10).
- **`evidenceLevel`**: "verified" or "inferred".
- **`uncertainties`**: Any aspects you are unsure about.
- **`platformAbstractions`**: Any platform base classes used.
- **`serviceContext`**: Which microservice this file belongs to.
- **`dependencyInjection`**: Any DI registrations.
- **`genericTypeParameters`**: Generic type relationships.
- **`targetedAspectAnalysis`** Populate `specificAspects:` key with deeper analysis:
    - **For Front-End items:** `componentHierarchy`, `routeConfig`, `routeGuards`, `stateManagementStores`, `dataBindingPatterns`, `validationStrategies`
    - **For Back-End items:** `authorizationPolicies`, `commands`, `queries`, `domainEntities`, `repositoryPatterns`, `businessRuleImplementations`

#### **PHASE 1C: Overall Analysis**

Write comprehensive `overallAnalysis:` summary showing:

- Complete end-to-end workflows discovered
- Key architectural patterns and relationships
- All business logic work flow: From front-end to back-end. (Example: Front-end Component => Controller Api Service => Command/Query => EventHandler => Others (Send email, producer bus message); From background job => event handler => others);
- Integration points and dependencies

#### **PHASE 2: COMPREHENSIVE ANALYSIS AND PLANNING.** You MUST ensure all files are analyzed. Then read the ENTIRE Markdown analysis notes file. Then Generate detailed analysis and plans under these headings

1. `## Code Review Analysis`: Include Strengths, Weaknesses, Security, Performance, and Maintainability reviews.
2. `## Refactoring Recommendations`: Detail Immediate, Structural, and Technical Debt improvements.
3. `## Specification Update Plan`: Detail New Requirements Discovery, Test Specification Updates, and Documentation Strategy.

#### **PHASE 3: APPROVAL GATE.** Present the comprehensive analysis, code review, refactoring recommendations, and specification update plan for explicit approval. **DO NOT** proceed without it

#### **PHASE 4: SPECIFICATION UPDATE EXECUTION.** Once approved, read the existing specification document `[existing-spec-doc-file-path]` and update it with Requirements, Test Specifications, Architecture Documentation, and Code Review findings

**SUCCESS VALIDATION:** Before completion, verify that the updated specification accurately reflects all changes. Document this under `## Specification Validation`.

### **🎯 Branch Comparison & Specification Guidelines**

- **Evidence-Based Analysis:** Start with `git diff` and base all updates on concrete code changes.
- **Comprehensive Impact Assessment:** Analyze direct and indirect effects, including cross-service impacts.
- **Enterprise Architecture Awareness:** Respect platform patterns, CQRS, and Clean Architecture.
- **Quality-Focused Approach:** Perform thorough code review and identify refactoring opportunities.
- **Specification Completeness:** Ensure full traceability between code, requirements, and tests.

---

---

## Frontend Package Upgrade Analysis & Planning

You are to operate as an expert frontend package management specialist, npm ecosystem analyst, and software architecture expert to analyze all frontend package.json files across the system, research the latest package versions, collect breaking changes and migration guides, and generate a comprehensive upgrade plan with risk assessment and migration strategy.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation. Todo list must cover all phases, from start to end, include child tasks in each phases too, everything is flatted out into a long detailed todo list.

### **🛡️ CORE ANTI-HALLUCINATION PROTOCOLS**

**ASSUMPTION_VALIDATION_CHECKPOINT**: Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

**EVIDENCE_CHAIN_VALIDATION**: Before claiming any relationship:

- "I believe package X is compatible because..." → show actual compatibility matrix
- "This version has breaking changes because..." → cite official changelog
- "Migration effort is Y hours because..." → show evidence from similar migrations

**TOOL_EFFICIENCY_PROTOCOL**:

- Batch multiple WebSearch calls for related packages
- Use parallel Read operations for package.json files
- Batch package research into groups of 10

**CONTEXT_ANCHOR_SYSTEM**: Every 10 packages researched:

1. Re-read the original task description from the `## Metadata` section.
2. Verify the current operation aligns with original goals.
3. Update the `Current Focus` bullet point within the `## Progress` section.

### **📋 QUICK REFERENCE CHECKLIST**

Before any major operation: [ ] ASSUMPTION_VALIDATION_CHECKPOINT [ ] EVIDENCE_CHAIN_VALIDATION [ ] TOOL_EFFICIENCY_PROTOCOL
Every 10 packages: [ ] CONTEXT_ANCHOR_CHECK [ ] Update **'Current Focus'** in **## Progress** section
Emergency: **Context Drift** → Re-read **## Metadata** section | **Missing Research** → Halt, gather evidence | **Confidence < 90%** → Request user confirmation

---

#### **PHASE 1: PACKAGE INVENTORY & CURRENT STATE ANALYSIS.** Build a comprehensive package inventory in a Markdown analysis file at `.ai/workspace/analysis/frontend-package-upgrade-analysis.md`

#### **PHASE 1A: INITIALIZATION AND PACKAGE DISCOVERY**

First, **initialize** the analysis file with:

- `## Metadata` - Original prompt and task description
- `## Progress` - Track phase, items processed, total items
- `## Package Inventory` - All package.json files and their dependencies
- `## Version Research Results` - Latest versions and changelogs
- `## Breaking Changes Analysis` - Breaking changes catalog
- `## Migration Complexity Assessment` - Risk levels and effort estimates
- `## Upgrade Strategy` - Phased migration plan

Find all package.json files:

```bash
# Frontend (Nx workspace - Angular 19)
src/Frontend/package.json
src/Frontend/apps/*/package.json
src/Frontend/libs/*/package.json

# Frontend legacy apps
src/Frontend/*/package.json
```

For each package.json, document:

- **Project Name & Location**
- **Framework Version** (Angular/React version)
- **Dependencies** (categorized: Framework, UI, Build Tools, Testing, Utilities)
- **DevDependencies**

Create **Master Package List** consolidating all unique packages across projects.

#### **PHASE 1B: PACKAGE USAGE ANALYSIS**

For each unique package, analyze codebase usage:

```bash
grep -r "from 'package-name'" --include="*.ts" --include="*.js"
grep -r "package-specific-selectors" --include="*.html"
find . -name "*package-config*" -type f
```

Document:

- **Projects Using**: Which projects depend on this
- **Import Count**: Number of files importing
- **Key Usage Areas**: Where primarily used
- **Configuration Files**: Config files for this package
- **Upgrade Risk Level**: Low/Medium/High/Critical based on usage breadth

Update `Total Items` in `## Progress` with total unique packages to research.

#### **PHASE 2: WEB RESEARCH & VERSION DISCOVERY** **IMPORTANT: BATCH INTO GROUPS OF 10**

For **EACH** package in Master Package List, use WebSearch to find:

**Latest Version Discovery:**

- Search: "[package-name] npm latest version"
- Check: <https://www.npmjs.com/package/[package-name>]
- Extract: Latest stable version, release date, downloads, stars

**Breaking Changes Research:**

- Search: "[package-name] migration guide [old-version] to [new-version]"
- Search: "[package-name] v[X] breaking changes" (for each major version gap)
- Search: "[package-name] changelog" or "[package-name] release notes"
- GitHub: Check CHANGELOG.md, releases, issues with "breaking" label

**Ecosystem Compatibility:**

- Angular version compatibility: "[package-name] angular [version] compatibility"
- Check peerDependencies in package.json
- Cross-package dependencies (Material with Angular, RxJS with @ngrx, etc.)

Document under `## Version Research Results` and `## Breaking Changes Analysis`:

- Current vs. Latest versions
- Version gap (major/minor/patch versions behind)
- Breaking changes catalog with migration steps
- Deprecation warnings
- New features and security fixes
- Peer dependency changes

**MANDATORY PROGRESS TRACKING**: After every 10 packages, update `Items Processed` and run `CONTEXT_ANCHOR_CHECK`.

#### **PHASE 3: RISK ASSESSMENT & PRIORITIZATION**

Categorize packages by risk level based on:

- Breaking changes count (more = higher risk)
- Usage breadth (many files = higher risk)
- Core framework dependency (Angular core = higher risk)
- Migration complexity (API changes = higher risk)

**Risk Categories:**

- **Critical Risk**: 5+ major versions behind, framework packages, 50+ breaking changes
- **High Risk**: 3-4 major versions, state management, 20-30 breaking changes
- **Medium Risk**: 1-2 major versions, some breaking changes, manageable with testing
- **Low Risk**: Patch/minor updates, backward compatible

Build **Dependency Graph** to determine upgrade order:

1. Foundation packages first (Node.js, TypeScript)
2. Framework packages (Angular Core, CLI)
3. Framework extensions (Material, RxJS)
4. Third-party libraries
5. Dev tools last

#### **PHASE 4: COMPREHENSIVE REPORT GENERATION**

Generate detailed markdown report at `ai_package_upgrade_reports/[YYYY-MM-DD]-frontend-package-upgrade-report.md`

**Report Structure:**

### 1. Executive Summary

- Total packages analyzed

- Packages requiring updates
- Critical security updates
- Major version upgrades needed
- Estimated total effort
- Risk summary table

### 2. Package Inventory by Project

- Frontend projects (Angular 19)

- Legacy projects (Angular 8-12)
- Master package consolidation table

### 3. Version Gap Analysis

- Critical gaps (5+ major versions)

- High priority gaps (3-4 major versions)
- Moderate gaps (1-2 major versions)
- Minor updates (patch/minor only)

### 4. Breaking Changes Catalog

For major packages (Angular, RxJS, TypeScript):

- Version-by-version breaking changes
- Migration steps for each
- Affected code areas
- Effort estimates
- References to official docs

### 5. Migration Complexity Assessment

- Complexity scoring methodology

- Package complexity rankings
- Project-level complexity (per frontend app)
- Recommended approach (incremental vs. rewrite for very old apps)

### 6. Ecosystem Compatibility Analysis

- Framework compatibility matrix

- Build tool compatibility
- Testing framework compatibility
- Peer dependency conflicts

### 7. Recommended Upgrade Strategy

**Phased Migration Plan:**

- Phase 0: Preparation (testing baseline, backups)
- Phase 1: Dev environment setup (Node.js, npm, CLI tools)
- Phase 2: Framework upgrades (incremental: Angular 12→13→14→...→19)
- Phase 3: Supporting libraries (RxJS, TypeScript)
- Phase 4: Third-party libraries
- Phase 5: Testing frameworks
- Phase 6: Build optimization
- Phase 7: Final validation & deployment

For each phase:

- Goals
- Tasks (with checkboxes)
- Estimated effort (hours)
- Risk level
- Dependencies
- Rollback plan

### 8. Detailed Migration Guides

Step-by-step guides for major packages:

- Pre-migration checklist
- Angular update commands (`ng update`)
- Common issues & solutions
- Post-migration verification

### 9. Testing Strategy

- Unit testing approach

- Integration testing requirements
- E2E testing updates
- Manual testing checklist per phase

### 10. Rollback Plan

- Rollback triggers (when to rollback)

- Rollback procedures (step-by-step)
- Rollback points (for each phase)
- Database rollback considerations

### 11. Timeline & Resource Estimation

- Timeline overview (weeks/months)

- Resource requirements (team composition)
- Cost estimation (labor + tools)
- Risk-adjusted timelines (best/expected/worst case)
- Milestone tracking table

### 12. Appendices

- Complete package version matrix

- Breaking changes reference
- Migration scripts
- Testing templates
- Communication templates
- Useful resources (official docs, tools)

#### **PHASE 5: APPROVAL GATE.** Present the comprehensive package upgrade report for explicit approval. **DO NOT** proceed without it

#### **PHASE 6: CONFIDENCE DECLARATION & VALIDATION**

Before marking complete, provide:

## Solution Confidence Assessment

**Overall Confidence:** [High 90-100% / Medium 70-89% / Low <70%]

**Evidence Summary:**

- ✅ All package.json files discovered: [count]
- ✅ Web research completed: [X/Y packages] ([percentage]%)
- ✅ Breaking changes documented: [count major packages]
- ✅ Official sources used: npm, GitHub, official docs
- ⚠️ Packages without changelog: [list or "None"]

**Research Quality:**

- Packages researched: [count]
- Official changelogs found: [percentage]%
- Migration guides found: [percentage]%
- Compatibility verified: [percentage]%

**Plan Completeness:**

- ✅ Executive summary created
- ✅ Migration phases defined ([count] phases)
- ✅ Effort estimates provided
- ✅ Risk assessment completed
- ✅ Rollback plan included
- ✅ Testing strategy defined

**Assumptions Made:**

- [List ALL assumptions, or state "None - fully evidence-based"]

**Potential Risks:**

- [Risk 1 - mitigation strategy]
- [Risk 2 - mitigation strategy]
- [Or state "No identified risks"]

**Limitations:**

- Third-party library release schedules unknown (e.g., PrimeNG v19)
- Actual migration effort may vary based on code quality
- [Other limitations or "None identified"]

**User Confirmation Needed:**

- IF confidence < 90%: "Please verify [specific packages/research] before proceeding"
- IF confidence >= 90%: "Analysis is comprehensive and evidence-based, ready for migration planning"

**SUCCESS VALIDATION:** Verify all checklist items completed:

- ✅ All package.json files discovered and analyzed
- ✅ Web research completed for all packages
- ✅ Breaking changes documented with sources
- ✅ Migration complexity assessed with effort estimates
- ✅ Phased upgrade plan generated
- ✅ Risk assessment completed
- ✅ Timeline and resources estimated
- ✅ Comprehensive report generated with all 12 sections

### Package Upgrade Analysis Guidelines

- **Comprehensive Discovery:** Find ALL package.json files across entire codebase (Frontend + Legacy)
- **Web Research Accuracy:** Use official sources only (npm, GitHub repos, official docs)
- **Breaking Changes Focus:** Prioritize identifying breaking changes requiring code changes
- **Risk Assessment:** Evaluate complexity based on breaking changes, usage breadth, dependencies
- **Practical Planning:** Create actionable phased plan with realistic timelines and effort estimates
- **Evidence-Based Decisions:** Base ALL recommendations on actual research with sources cited
- **Confidence Declaration:** Declare confidence level; if < 90%, request user confirmation
- **Batch Processing:** Research packages in batches of 10 to avoid context loss
- **Progress Tracking:** Update progress every 10 items

---

---

---

## Implementation Plan Analysis & Specification Update

You are to operate as an expert full-stack dotnet angular principle developer, software architect, and technical analyst to analyze a detailed implementation plan file at `[implementation-plan-file-path]`, perform comprehensive impact analysis of the planned changes, and update the existing specification document `[existing-spec-doc-file-path]` with new requirements, updated business logic, and comprehensive test specifications.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation. Todo list must cover all phases, from start to end, include child tasks in each phases too, everything is flatted out into a long detailed todo list.

### **🛡️ CORE ANTI-HALLUCINATION PROTOCOLS**

**ASSUMPTION_VALIDATION_CHECKPOINT**: Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

**EVIDENCE_CHAIN_VALIDATION**: Before claiming any relationship:

- "I believe X calls Y because..." → show actual code
- "This follows pattern Z because..." → cite specific examples
- "Service A owns B because..." → grep for actual boundaries

**TOOL_EFFICIENCY_PROTOCOL**:

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords
- Batch Write operations when creating multiple files

**CONTEXT_ANCHOR_SYSTEM**: Every 10 operations:

1. Re-read the original task description from the `## Metadata` section.
2. Verify the current operation aligns with original goals.
3. Check if we're solving the right problem.
4. Update the `Current Focus` bullet point within the `## Progress` section.

### **📋 QUICK REFERENCE CHECKLIST**

Before any major operation: [ ] ASSUMPTION_VALIDATION_CHECKPOINT [ ] EVIDENCE_CHAIN_VALIDATION [ ] TOOL_EFFICIENCY_PROTOCOL
Every 10 operations: [ ] CONTEXT_ANCHOR_CHECK [ ] Update **'Current Focus'** in **## Progress** section
Emergency: **Context Drift** → Re-read **## Metadata** section | **Assumption Creep** → Halt, validate with code | **Evidence Gap** → Mark as "inferred"

---

#### **PHASE 1: EXTERNAL MEMORY-DRIVEN IMPLEMENTATION PLAN ANALYSIS.** Your sole objective is to build a structured knowledge model in a **Markdown** analysis file at `.ai/workspace/analysis/[some-sort-semantic-name-of-this-task].md` with systematic external memory management

#### **PHASE 1A: INITIALIZATION AND DISCOVERY**

First, **initialize** the analysis file with a `## Metadata` heading and under it is my full original prompt in a markdown box , like this: `markdown [content of metadata in here]` (MUST 5 chars for start and end of markdown box), then continue add the task description and full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). the task description, and the full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). You **MUST** also create the following top-level headings: `## Progress`, `## Errors`, `## Assumption Validations`, `## Performance Metrics`, `## Memory Management`, `## Processed Files`, `## File List`, `## Knowledge Graph`. Populate the `## Progress` section with:

- **Phase:** 1
- **Items Processed:** 0
- **Total Items**: 0
- **Current Operation:** "initialization"
- **Current Focus:** "[original implementation plan analysis task]"

### **📋 IMPLEMENTATION PLAN COMPREHENSIVE ANALYSIS**

**IMPLEMENTATION_PLAN_DEEP_ANALYSIS**: Start with thorough analysis of the implementation plan file:

1. **Plan Structure Analysis:**
    - Read and parse the implementation plan file completely
    - Extract all planned features, requirements, and changes from the `## Plan` section
    - Identify implementation phases and dependencies from the plan
    - Document under `## Implementation Plan Overview`

2. **Requirements Extraction:**
    - Parse the `## Knowledge Graph` from the implementation plan to identify business context
    - Extract new business requirements from the plan's `overallAnalysis`
    - Map functional and non-functional requirements
    - Identify changed business workflows and processes
    - Document under `## Extracted Requirements`

3. **Planned Changes Analysis:**
    - Catalog all planned code changes (new files, modifications, deletions) from implementation plan
    - Identify affected components, services, and layers
    - Map file-level changes to business capabilities
    - Extract integration points and cross-service impacts
    - Document under `## Planned Changes Analysis`

4. **Architecture Impact Assessment:**
    - Analyze how changes affect overall system architecture based on plan details
    - Identify CQRS pattern impacts (new Commands/Queries/Events)
    - Map domain entity changes and repository pattern impacts
    - Assess platform pattern compliance from implementation plan
    - Document under `## Architecture Impact Assessment`

5. **Existing Specification Analysis:**
    - Read and analyze the existing specification document structure
    - Identify current test cases, business requirements, and entity relationships
    - Map existing test coverage to planned changes
    - Document under `## Current Specification Analysis`

**AFFECTED_COMPONENTS_COMPREHENSIVE_DISCOVERY**: For each planned change from the implementation plan, discover all related components:

1. **Direct Dependencies:** Files explicitly mentioned in the implementation plan
2. **Indirect Dependencies:** Related components found through `grep` and semantic search
3. **Test Coverage Impact:** Existing test cases that need updates based on planned changes
4. **API Integration Impact:** Frontend components that consume affected APIs
5. **Cross-Service Communication:** Message bus, entity events, and integration points
6. **Database Schema Impact:** Entity changes affecting data structure

**CRITICAL:** Save ALL affected files AND their related files to a `## Comprehensive File List` heading. For each file, include:

- `filePath`, `changeType`, `relationshipType`, `impactLevel`, `serviceContext`, `planContext`, and `specificationRelevance`.

**INTELLIGENT_SCOPE_MANAGEMENT**: If the file list exceeds 75, prioritize analysis by `impactLevel` (Critical > High > Medium > Low) and document the rationale in the `## Memory Management` section.

#### **PHASE 1B: COMPREHENSIVE KNOWLEDGE GRAPH CONSTRUCTION FOR PLANNED CHANGES** **IMPORTANT MUST DO WITH TODO LIST**

Count total files in file list, split it into many batch of group 10 files in priority order, each group insert in the current todo list new task for Analyze each batch of files group for all of files in file list.

**CRITICAL:** You must analyze all files in the file list identified as belonging to the highest IMPORTANT priority categories: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**.

For each file in the `## Comprehensive File List` (prioritizing by `impactLevel`), add a new sub-section under the `## Knowledge Graph` heading. For each, detail:

- **`filePath`**: The full path to the file.
- **`type`**: The component's classification.
- **`architecturalPattern`**: The main design pattern used.
- **`currentContent`**: Summary of existing functionality (if file exists).
- **`plannedChanges`**: Specific changes planned for this file from implementation plan.
- **`symbols`**: Important classes, interfaces, methods (current and planned).
- **`dependencies`**: All imported modules or `using` statements (current and planned).
- **`businessContext`**: How this component contributes to business requirements.
- **`referenceFiles`**: Other files that use this file's symbols.
- **`relevanceScore`**: A numerical score (1-10).
- **`evidenceLevel`**: "verified" or "inferred".
- **`uncertainties`**: Any aspects you are unsure about.
- **`platformAbstractions`**: Any platform base classes used.
- **`serviceContext`**: Which microservice this file belongs to.
- **`dependencyInjection`**: Any DI registrations (current and planned).
- **`genericTypeParameters`**: Generic type relationships.
- **`messageBusAnalysis`**: **CRITICAL FOR CONSUMERS**: When analyzing any Consumer file (files ending with `Consumer.cs` that extend `PlatformApplicationMessageBusConsumer<T>`), identify the `*BusMessage` type used. Then perform a grep search across ALL services to find files that **send/publish** this message type. List all producer files and their service locations in the `messageBusProducers` field. This analysis is crucial for understanding cross-service integration.
- **`changeImpactAnalysis`**: How changes to this file affect other components.
- **`testingRequirements`**: New test cases needed for this component.
- **`specificationMapping`**: How this component maps to existing specification sections.
- **`testCaseImpact`**: Existing test cases that need modification or new ones needed.
- **`targetedAspectAnalysis`** Populate `specificAspects:` key with deeper analysis:
    - **For Front-End items:** `componentHierarchy`, `routeConfig`, `routeGuards`, `stateManagementStores`, `dataBindingPatterns`, `validationStrategies`
    - **For Back-End items:** `authorizationPolicies`, `commands`, `queries`, `domainEntities`, `repositoryPatterns`, `businessRuleImplementations`
    - **For Consumer items:** `messageBusMessage`, `messageBusProducers`, `crossServiceIntegration`, `handleLogicWorkflow`

#### **PHASE 1C: Specification Mapping Analysis**

Write comprehensive analysis of how implementation plan maps to existing specification:

- **Test Case Mapping:** Which existing test cases are affected by planned changes
- **Business Requirement Mapping:** How new requirements relate to existing ones
- **Entity Relationship Impact:** Changes to entity relationships and data flow
- **Workflow Integration:** How new workflows integrate with existing business processes
- **Coverage Gap Analysis:** Areas where new test cases are needed

#### **PHASE 1D: Overall Analysis**

Write comprehensive `overallAnalysis:` summary showing:

- Complete end-to-end workflows affected by planned changes
- Key architectural patterns and relationships impacted
- All business logic workflow changes: From front-end to back-end
- Integration points and dependencies affected by implementation plan
- New workflows introduced and their relationship to existing specifications
- Comprehensive test coverage requirements for all changes

#### **PHASE 2: COMPREHENSIVE ANALYSIS AND PLANNING.** You MUST ensure all files are analyzed. Then read the ENTIRE Markdown analysis notes file. Then Generate detailed analysis and plans under these headings

1. `## Implementation Impact Analysis`: Include component impact assessment, integration points affected, data flow changes, and platform pattern compliance.

2. `## Business Logic Analysis`: Detail new business rules, modified workflows, validation requirements, and process integration points.

3. `## Testing Strategy Analysis`: Detail test coverage requirements, new test scenarios, regression testing needs, and test case modification requirements.

4. `## Specification Update Strategy`: Detail how to integrate new requirements into existing specification structure, maintain traceability matrix, and preserve existing test case coverage.

5. `## Rollback and Safety Strategy`: Detail backup procedures for specification document, rollback plan if updates cause issues, and validation checkpoints.

#### **PHASE 3: APPROVAL GATE.** Present the comprehensive analysis, impact assessment, business logic analysis, testing strategy, specification update strategy, and safety measures for explicit approval. **DO NOT** proceed without it

#### **PHASE 4: SPECIFICATION UPDATE EXECUTION.** Once approved, execute the specification update with these MANDATORY steps

1. **Backup Original Specification:** Create backup copy of existing specification document with timestamp

2. **Read and Parse Existing Specification:** Analyze current document structure, extract existing business requirements, test cases, and entity relationships

3. **Execute Planned Updates:**
    - **New Requirements Integration:** Add new business requirements from implementation plan to Feature Overview section
    - **Entity Relationship Updates:** Update Entity Relationship Diagram with new or modified entities
    - **Test Case Enhancement:** Add comprehensive test cases covering:
        - New functionality introduced by the implementation plan
        - Modified existing functionality and its impact
        - Integration points and cross-service communication changes
        - Edge cases and error scenarios identified in the plan
        - Regression testing for all affected components
        - End-to-end workflow validation for modified business processes
    - **Traceability Matrix Updates:** Update bidirectional mapping between tests and business components
    - **Coverage Analysis Updates:** Recalculate coverage percentages and identify gaps

4. **Specification Structure Maintenance:** Ensure updated document maintains the standardized structure:

    ```markdown
    # [Feature Name] - Comprehensive QA Test Cases

    ## Table of Contents (with updated navigation)

    ## 1. Feature Overview (enhanced with new requirements)

    ## 2. Entity Relationship Diagram (updated relationships)

    ## 3. Detailed Test Cases (new and modified test cases organized by priority)

    ## 4. Traceability Matrix (updated mappings)

    ## 5. Coverage Analysis (recalculated coverage)
    ```

5. **Quality Assurance Validation:**
    - Verify all new requirements have corresponding test cases
    - Ensure existing test cases are updated for modified functionality
    - Validate traceability between implementation plan items and test cases
    - Check that coverage percentages reflect actual test coverage

**SUCCESS VALIDATION:** Before completion, verify that the updated specification accurately reflects all planned changes and their impacts. Document this under `## Specification Validation` with:

- **Requirements Traceability:** All implementation plan requirements mapped to specification
- **Test Coverage Validation:** All planned changes covered by test cases
- **Business Workflow Validation:** End-to-end workflows properly documented and tested
- **Integration Testing Coverage:** Cross-service impacts properly covered
- **Regression Prevention:** Existing functionality properly protected by updated tests

### **🎯 Implementation Plan Analysis & Specification Guidelines**

- **Plan-Driven Analysis:** Base all analysis on the detailed implementation plan from "Implementing a New Feature or Enhancement" process, not assumptions.
- **Specification Structure Preservation:** Maintain the standardized specification format from "Test Case Generation" process.
- **Comprehensive Impact Assessment:** Analyze direct and indirect effects of all planned changes on existing specifications.
- **End-to-End Workflow Mapping:** Ensure complete understanding of affected business processes and their test coverage.
- **Enterprise Architecture Awareness:** Respect platform patterns, CQRS, and Clean Architecture in both analysis and specification updates.
- **Quality-Focused Testing:** Create comprehensive test specifications covering all change impacts without losing existing coverage.
- **Specification Completeness:** Ensure full traceability between implementation plan, requirements, existing specifications, and updated tests.
- **Risk Assessment and Mitigation:** Identify potential risks of specification changes and provide rollback strategies.
- **Bidirectional Traceability:** Maintain clear mapping between implementation plan items and specification elements.
- **Coverage Preservation:** Ensure existing test coverage is maintained while adding new coverage for planned changes.

---

---

## Feature Documentation Generation & Verification

You are to operate as an expert full-stack dotnet angular principle developer, software architect, and technical documentation specialist to generate comprehensive feature documentation with verified test cases for the feature described in `[feature-description-and-keywords]`.

**REFERENCE EXAMPLE FILES:**

- Feature README format: `docs/features/README.GoalManagementFeature.md` and `docs/features/README.JobBoardIntegrationFeature.md`

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation. Todo list must cover all phases, from start to end, include child tasks in each phases too, everything is flatted out into a long detailed todo list.

**CRITICAL TASK MANAGEMENT FOR LONG-RUNNING DOCUMENTATION:**

- This is a multi-phase, long-running task that generates large documentation files
- Break ALL tasks into the smallest possible atomic units
- Each sub-task MUST include a brief summary of previous task results to maintain context
- Before each new sub-task, read the current state of generated files to re-establish context
- Update progress tracking after EVERY operation
- Never assume previous context is retained - always verify by reading files

**🔴 MANDATORY TODO LIST MANAGEMENT:**

1. **At START**: Create a comprehensive TODO list covering ALL phases (1A through 5) with ALL sub-tasks
2. **Before EACH phase**: Mark current task as "in_progress"
3. **After EACH phase**: Mark task as "completed", update "Last Task Summary"
4. **Never skip**: If context is lost, re-read analysis file's `## Progress` section to restore TODO state
5. **Never compact**: Keep full detailed TODO list even if long - this prevents forgetting tasks

**🔴 MANDATORY BEFORE EACH PHASE CHECKLIST:**

```
□ Read the `## Progress` section from analysis notes file
□ Read the `Last Task Summary` from previous phase
□ Read the current state of generated documentation file(s)
□ Confirm what was completed and what needs to be done next
□ Update current task status to "in_progress"
□ Only then proceed with the phase work
```

### **🛡️ CORE ANTI-HALLUCINATION PROTOCOLS**

**ASSUMPTION_VALIDATION_CHECKPOINT**: Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

**EVIDENCE_CHAIN_VALIDATION**: Before claiming any relationship:

- "I believe X calls Y because..." → show actual code
- "This follows pattern Z because..." → cite specific examples
- "Service A owns B because..." → grep for actual boundaries

**DOCUMENTATION_ACCURACY_CHECKPOINT**: Before writing any documentation:

- "Have I read the actual code that implements this?"
- "Are my line number references accurate and current?"
- "Can I provide a code snippet as evidence?"

**TOOL_EFFICIENCY_PROTOCOL**:

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords
- For large files, update in sections rather than rewriting entirely

**CONTEXT_ANCHOR_SYSTEM**: Every 10 operations:

1. Re-read the original task description from the `## Metadata` section.
2. Verify the current operation aligns with original goals.
3. Check if we're solving the right problem.
4. Update the `Current Focus` bullet point within the `## Progress` section.
5. **CRITICAL**: Re-read the last 50 lines of the documentation file being generated to maintain continuity.

### **📋 QUICK REFERENCE CHECKLIST**

Before any major operation: [ ] ASSUMPTION_VALIDATION_CHECKPOINT [ ] EVIDENCE_CHAIN_VALIDATION [ ] DOCUMENTATION_ACCURACY_CHECKPOINT [ ] TOOL_EFFICIENCY_PROTOCOL
Every 10 operations: [ ] CONTEXT_ANCHOR_CHECK [ ] Update **'Current Focus'** in **## Progress** section [ ] Re-read generated documentation for context continuity
Emergency: **Context Drift** → Re-read **## Metadata** section | **Assumption Creep** → Halt, validate with code | **Evidence Gap** → Mark as "inferred" and flag for verification

---

#### **PHASE 1: EXTERNAL MEMORY-DRIVEN FEATURE ANALYSIS.** Your sole objective is to build a structured knowledge model in a Markdown analysis file at `.ai/workspace/analysis/[feature-name].md` with systematic external memory management

#### **PHASE 1A: INITIALIZATION AND DISCOVERY**

First, **initialize** the analysis file with a `## Metadata` heading and under it is my full original prompt in a markdown box, like this: `markdown [content of metadata in here]` (MUST 5 chars for start and end of markdown box), then continue add the task description and full details of the `Source Code Structure` from `.ai/docs/prompt-context.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST 6 chars for start and end of markdown box). You **MUST** also create the following top-level headings: `## Progress`, `## Errors`, `## Assumption Validations`, `## Performance Metrics`, `## Memory Management`, `## Processed Files`, `## File List`, `## Knowledge Graph`, `## Feature Summary`. Populate the `## Progress` section with:

- **Phase**: 1A
- **Items Processed**: 0
- **Total Items**: 0
- **Current Operation**: "initialization"
- **Current Focus**: "[original feature documentation task]"
- **Last Task Summary**: "Starting feature documentation generation"

### **📖 FEATURE-SPECIFIC DISCOVERY**

**FEATURE_COMPREHENSIVE_DISCOVERY**: Focus on feature-relevant patterns:

1. **Domain Entity Discovery:** Find all domain entities, value objects, enums related to the feature. Document under `## Domain Model Discovery`.
2. **Workflow Discovery:** Find Commands, Queries, Event Handlers, Background Jobs, Consumers. Document under `## Workflow Discovery`.
3. **API Discovery:** Find Controllers, API endpoints, DTOs. Document under `## API Discovery`.
4. **Frontend Discovery:** Find Components, Services, Stores related to the feature. Document under `## Frontend Discovery`.
5. **Cross-Service Discovery:** Find Message Bus messages, producers, consumers. Document under `## Cross-Service Discovery`.
6. **Configuration Discovery:** Find configuration classes, settings, environment variables. Document under `## Configuration Discovery`.

Next, do semantic search and grep search all keywords of the task to find all related files, prioritizing the discovery of core logic files like **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**. **CRITICAL:** Save ALL file paths immediately as a numbered list under a `## File List` heading.

After semantic search, perform additional targeted searches to ensure no critical infrastructure is missed:

- `grep search` with patterns: `.*EventHandler.*{FeatureKeyword}|{FeatureKeyword}.*EventHandler`
- `grep search` with patterns: `.*BackgroundJob.*{FeatureKeyword}|{FeatureKeyword}.*BackgroundJob`
- `grep search` with patterns: `.*Consumer.*{FeatureKeyword}|{FeatureKeyword}.*Consumer`
- `grep search` with patterns: `.*Service.*{FeatureKeyword}|{FeatureKeyword}.*Service`
- `grep search` with patterns: `.*Provider.*{FeatureKeyword}|{FeatureKeyword}.*Provider`
- `grep search` with patterns: `.*Helper.*{FeatureKeyword}|{FeatureKeyword}.*Helper`
- `grep search` with patterns: `.*Command.*{FeatureKeyword}|{FeatureKeyword}.*Command`
- `grep search` with patterns: `.*Query.*{FeatureKeyword}|{FeatureKeyword}.*Query`

Update the `Total Items` count in the `## Progress` section.

#### **PHASE 1B: KNOWLEDGE GRAPH CONSTRUCTION** **IMPORTANT MUST DO WITH TODO LIST**

Count total files in file list, split it into many batch of group 10 files in priority order, each group insert in the current todo list new task for Analyze each batch of files group for all of files in file list.

**CRITICAL:** You must analyze all files in the file list identified as belonging to the highest IMPORTANT priority categories: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components .ts**.

For each file in the `## File List` (following the prioritized order if applicable), read and analyze it, add result into `## Knowledge Graph` section. The heading of each analyzed file must have the item order number in heading. Each file analyzing result detail the following information:

- **`filePath`**: The full path to the file.
- **`type`**: The component's classification.
- **`architecturalPattern`**: The main design pattern used (Strategy, Template Method, Factory, CQRS, etc.).
- **`content`**: A summary of purpose and logic.
- **`symbols`**: Important classes, interfaces, methods with line numbers.
- **`dependencies`**: All imported modules or `using` statements.
- **`businessContext`**: Comprehensive detail all business logic, how it contributes to the feature.
- **`referenceFiles`**: Other files that use this file's symbols.
- **`relevanceScore`**: A numerical score (1-10).
- **`evidenceLevel`**: "verified" or "inferred".
- **`uncertainties`**: Any aspects you are unsure about.
- **`platformAbstractions`**: Any platform base classes used.
- **`serviceContext`**: Which microservice this file belongs to.
- **`messageBusAnalysis`**: For Consumers, identify message types and find producers.
- **`testableAspects`**: What aspects of this component should be tested (P0/P1/P2).
- **`codeSnippets`**: Key code snippets with line numbers for documentation reference.

**MANDATORY PROGRESS TRACKING**: After processing every 10 files, you **MUST** update `Items Processed` in `## Progress`, run a `CONTEXT_ANCHOR_CHECK`, and explicitly state your progress. After each file, add its path to the `## Processed Files` list.

#### **PHASE 1C: Overall Analysis**

Write comprehensive `## Feature Summary` showing:

- **Feature Overview**: What the feature does, its purpose
- **Complete End-to-End Workflows**: From trigger to completion
- **Key Architectural Patterns**: Design patterns used
- **Service Responsibilities**: Which service owns what
- **Integration Points**: Cross-service communication
- **Security Considerations**: Authentication, authorization, encryption
- **Performance Considerations**: Pagination, caching, parallelism
- **Error Handling Patterns**: How errors are handled

---

#### **PHASE 2: FEATURE README GENERATION** Generate the comprehensive README file at `docs/README.[FeatureName].md`

**CRITICAL**: This phase generates a large file. Break into multiple sub-tasks, updating the file incrementally. After each sub-task, write a summary to the `## Progress` section's `Last Task Summary` field.

#### **PHASE 2A: Generate README - Overview & Architecture Sections**

**Before starting**: Read `docs/features/README.GoalManagementFeature.md` and `docs/features/README.JobBoardIntegrationFeature.md` as format reference.

Create the README file with initial sections:

1. **Title and Overview Section**:
    - Feature name and description
    - Table of Contents
    - Key Capabilities list
    - Integration Methods comparison (if applicable)
    - Supported Providers/Components table

2. **Architecture Section**:
    - High-Level Architecture diagram (ASCII art)
    - Service Responsibilities table
    - Design Patterns Used table

**After completing 2A**: Update `Last Task Summary` with: "Completed README overview and architecture sections. Generated [X] lines covering: [list of subsections]."

#### **PHASE 2B: Generate README - Domain Model & Workflow Sections**

**Before starting**: Read the current README file to maintain context continuity.

Add the following sections:

1. **Domain Model Section**:
    - Entity Relationship Diagram (ASCII art)
    - Entity descriptions with properties
    - Enumerations with values
    - Value Objects with embedded structure

2. **Workflow Sections** (one per major workflow):
    - Flow diagram (ASCII art)
    - Step-by-step process description
    - Code snippets with file paths and line numbers
    - Message formats (for message bus)

**After completing 2B**: Update `Last Task Summary` with: "Completed README domain model and workflow sections. Added [X] entities, [Y] workflows. Current file size: [Z] lines."

#### **PHASE 2C: Generate README - API Reference & Configuration Sections**

**Before starting**: Read the current README file to maintain context continuity.

Add the following sections:

1. **API Reference Section**:
    - Endpoint table with methods, paths, descriptions
    - Request/Response models
    - Authorization requirements

2. **Configuration Section**:
    - Required configuration settings
    - Environment variables
    - Sample configuration

3. **Security Considerations Section**:
    - Authentication methods
    - Authorization rules
    - Encryption details

4. **Performance Tuning Section**:
    - Pagination settings
    - Parallelism configuration
    - Caching strategies

**After completing 2C**: Update `Last Task Summary` with: "Completed README API reference, configuration, security, and performance sections. Current file size: [Z] lines."

#### **PHASE 2D: Generate README - Test Specifications Section**

**CRITICAL**: This is the largest section. MUST be broken into sub-tasks by category to prevent context loss and ensure thoroughness.

**Before starting**:

1. Run MANDATORY BEFORE EACH PHASE CHECKLIST
2. Read the current README file and the `## Feature Summary` from analysis notes
3. Identify all test categories based on feature workflows (typically 4-8 categories)
4. Create sub-tasks in TODO list: one sub-task per test category

**Test Case Format Template:**

```markdown
### [Category Name] Test Specs

#### P0 - Critical (Must Pass for Release)

##### TS-[CATEGORY]-P0-001: [Test Name]

**Priority:** P0 - Critical
**Category:** [Category]
**Component:** [Component being tested]

**Preconditions:**

- [List preconditions]

**Test Steps:**
| Step | Action   | Expected Result |
| ---- | -------- | --------------- |
| 1    | [Action] | [Expected]      |

**GIVEN** [initial context]
**WHEN** [action performed]
**THEN** [expected outcome]

**Code Reference:**

- File: `[file-path]`
- Lines: [line-range]
- Key Logic: [brief description]

---

#### P1 - High Priority

[Similar format for P1 tests]

#### P2 - Medium Priority

[Similar format for P2 tests]
```

**SUB-TASK BREAKDOWN - Execute one category at a time:**

**Phase 2D-1: Test Summary Table + First Category**

- Create test specifications section header
- Create summary table placeholder (will update counts after all categories)
- Write all P0/P1/P2 test cases for FIRST category
- Update `Last Task Summary`: "Completed test category 1: [Name]. Added [X] P0, [Y] P1, [Z] P2 tests."

**Phase 2D-2 through 2D-N: Remaining Categories**

- For EACH remaining category, create a separate sub-task:
    - Read current README file to maintain context
    - Read `Last Task Summary` to know what was completed
    - Write all P0/P1/P2 test cases for THIS category
    - Update `Last Task Summary`: "Completed test category N: [Name]. Running total: [X] P0, [Y] P1, [Z] P2 tests."

**Phase 2D-Final: Update Summary Table**

- Read all test categories written
- Count total P0, P1, P2 per category
- Update the summary table with accurate counts
- Update `Last Task Summary`: "Completed all test specifications. Total: [X] P0, [Y] P1, [Z] P2 test cases across [N] categories."

**Test Case Requirements:**

- Each test case MUST have: ID, Priority, Category, Component, Preconditions, Test Steps table, GIVEN/WHEN/THEN format, Code Reference
- P0: Critical path, security, data integrity (typically 3-5 per category)
- P1: Important functionality, edge cases (typically 4-6 per category)
- P2: Nice-to-have, performance, UI polish (typically 3-5 per category)
- **NEVER proceed to next category without updating `Last Task Summary`**

#### **PHASE 2E: Generate README - Final Sections**

**Before starting**: Read the current README file to maintain context continuity.

Add final sections:

1. **Troubleshooting Section**:
    - Common issues and solutions
    - Error messages and meanings

2. **Adding New Providers Section** (if applicable):
    - Step-by-step guide
    - Required interfaces to implement

3. **Related Documentation Section**:
    - Links to related docs

4. **Version History Section**:
    - Changelog format

**After completing 2E**: Update `Last Task Summary` with: "Completed README final sections. Total file size: [Z] lines. Total test cases: [X]."

---

#### **PHASE 3: README VERIFICATION - FIRST PASS**

**PURPOSE**: Verify the generated README matches actual code implementation. NO HALLUCINATION ALLOWED.

**Before starting**:

1. Run MANDATORY BEFORE EACH PHASE CHECKLIST
2. Read `Last Task Summary` from Phase 2E
3. Read the complete README file section by section

**SUB-TASK BREAKDOWN - Verify one section at a time:**

**Phase 3-1 through 3-N: Verify Each Major Section**
For EACH major section of the README (Overview, Architecture, Domain Model, Workflows, API, Config, Test Specs):

1. Read the ENTIRE section from README
2. For EACH code reference in this section:
    - Read the actual source file at referenced lines
    - Compare character-by-character if code snippet included
    - Verify line numbers are accurate
    - If mismatch: log in `## Verification Log - First Pass` and correct immediately
3. Update `Last Task Summary`: "Phase 3 - Verified section: [Name]. Found [X] issues, corrected [Y]."

**VERIFICATION CHECKLIST - FIRST PASS (per section):**

1. **Line Number Verification**:
    - Read each referenced file at the specified line numbers
    - Verify code snippets match actual code
    - Update any incorrect line numbers

2. **Code Logic Verification**:
    - Verify described logic matches actual implementation
    - Check method names, class names are correct
    - Verify enum values, property names are accurate

3. **Flow Verification**:
    - Trace each described workflow through actual code
    - Verify service boundaries are correct
    - Verify message bus patterns are accurate

4. **Test Case Code Reference Verification**:
    - For each test case, verify the referenced code exists
    - Verify the described behavior matches actual implementation

**Document all corrections in `## Verification Log - First Pass` section of analysis notes:**

- `[Section]: [Issue Found] → [Correction Made]`

**After completing Phase 3**: Update `Last Task Summary` with: "Completed first verification pass. Verified [N] sections. Found and corrected [X] issues: [list major corrections]."

---

#### **PHASE 4: README VERIFICATION - SECOND PASS**

**PURPOSE**: Double-check all corrections and ensure no issues were missed.

**Before starting**:

1. Run MANDATORY BEFORE EACH PHASE CHECKLIST
2. Read `## Verification Log - First Pass` to understand what was corrected
3. Read `Last Task Summary` from Phase 3

**SUB-TASK BREAKDOWN:**

**Phase 4-1: Re-verify All First-Pass Corrections**

1. Read `## Verification Log - First Pass`
2. For EACH logged correction:
    - Re-read the source file
    - Verify the correction in README is accurate
    - Log any issues in `## Verification Log - Second Pass`
3. Update `Last Task Summary`: "Phase 4-1 complete. Re-verified [X] corrections. Found [Y] additional issues."

**Phase 4-2: Cross-Reference and TOC Verification**

1. Read Table of Contents
2. Verify EVERY entry links to an actual section
3. Verify summary tables match detailed content
4. Update `Last Task Summary`: "Phase 4-2 complete. TOC and cross-references [ACCURATE/CORRECTED]."

**Phase 4-3: Random Sampling and Completeness Check**

1. Randomly select 10 code references from different sections
2. Re-read each source file and verify line numbers
3. Verify all major code paths are documented
4. Update `Last Task Summary`: "Phase 4-3 complete. Random sampled [10] references. Found [X] issues."

**VERIFICATION CHECKLIST - SECOND PASS:**

1. **Re-verify All Corrected Items**:
    - Read each file that was corrected in first pass
    - Confirm corrections are accurate

2. **Cross-Reference Verification**:
    - Verify all cross-references between sections are consistent
    - Verify Table of Contents matches actual sections
    - Verify summary tables match detailed content

3. **Completeness Check**:
    - Verify all major code paths are documented
    - Verify all test categories have appropriate coverage
    - Verify no critical components are missing

4. **Final Line Number Audit**:
    - Randomly select 10 code references and verify line numbers
    - Update any that have drifted

**Document all findings in `## Verification Log - Second Pass` section of analysis notes.**

**CRITICAL**: If Second Pass finds MORE THAN 5 issues, HALT and re-run Phase 3 with more rigorous verification.

**After completing Phase 4**: Update `Last Task Summary` with: "Completed second verification pass. Found [X] additional issues. README is [VERIFIED/NEEDS RE-VERIFICATION]."

---

#### **PHASE 5: FINAL VALIDATION AND CLEANUP**

**PURPOSE**: Final checks and cleanup.

**Before starting**:

1. Run MANDATORY BEFORE EACH PHASE CHECKLIST
2. Read `Last Task Summary` from Phase 4
3. Read the generated README document

**SUB-TASK BREAKDOWN:**

**Phase 5-1: README Consistency Check**

1. Read README document completely
2. Verify test case IDs are unique and sequential
3. Verify table of contents matches sections
4. Verify counts match in summary tables
5. Update `Last Task Summary`: "Phase 5-1 complete. Consistency check [VERIFIED/ISSUES FOUND: list]."

**Phase 5-2: Final Quality Report**

1. Count total lines in README file
2. Count test cases by priority (P0, P1, P2)
3. Count total issues found and corrected across all phases
4. Calculate verification coverage percentage
5. Update `Last Task Summary`: "Phase 5-2 complete. Quality metrics calculated."

**Phase 5-3: Generate Final Summary**

1. Write final summary to analysis notes `## Final Validation` section
2. List all generated files
3. Provide completion status

**VALIDATION CHECKLIST:**

1. **README Consistency Check**:
    - Verify test case IDs are unique and sequential
    - Verify all test categories are present
    - Verify total test case counts are accurate

2. **Generated Files Summary**:
    - List generated file with size
    - Provide brief summary of content

3. **Quality Metrics**:
    - Total test cases by priority
    - Verification coverage percentage
    - Issues found and corrected count

**SUCCESS VALIDATION:** Document under `## Final Validation` with:

- **README Accuracy:** [VERIFIED after 2 passes]
- **Total Issues Found and Corrected:** [X issues]
- **Generated Files:** `docs/README.[FeatureName].md` - [X] lines
- **Final Task Summary:** "Feature documentation complete. Generated [X] lines README. Total [N] test cases (P0:[a], P1:[b], P2:[c]). All verifications passed."

---

### Feature Documentation Guidelines

- **Evidence-based documentation:** Every claim must have code evidence with file path and line numbers.
- **No hallucination tolerance:** If uncertain, mark as "inferred" and verify before finalizing.
- **Incremental generation:** Break large documents into sections, verify each section.
- **Context preservation:** Always re-read generated content before continuing.
- **Multiple verification passes:** Minimum 2 verification passes for each document.
- **BDD test format:** All test cases must follow GIVEN/WHEN/THEN format.
- **Priority classification:** P0 (critical), P1 (high), P2 (medium) - clear criteria for each.
- **Code snippets:** Include actual code, not paraphrased descriptions.
- **Line number accuracy:** Always verify line numbers are current before finalizing.
- **Cross-reference consistency:** Ensure all internal references are accurate and consistent

---

---

## UI Screenshot Analysis & Component Documentation

You are to operate as an expert UI/UX analyst and Angular developer to analyze UI screenshots from `[raw-screenshots-folder-path]` and generate comprehensive annotated documentation and component analysis for the application source code at `[source-code-app-path]`.

**IMPORTANT**: Always think hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summarize it when memory context limit is reached. Always preserve and carry your to-do list through every operation. Todo list must cover all phases, from start to end, include child tasks in each phase too, everything is flattened out into a long detailed todo list.

### **🛡️ CORE ANTI-HALLUCINATION PROTOCOLS**

**ASSUMPTION_VALIDATION_CHECKPOINT**: Before every major operation:

1. "What assumptions am I making about this UI component?"
2. "Have I verified this with actual source code evidence?"
3. "Could I be wrong about this component/selector mapping?"

**EVIDENCE_CHAIN_VALIDATION**: Before claiming any component mapping:

- "I believe this UI element is Component X because..." → show actual HTML/TS code
- "This follows pattern Z because..." → cite specific file examples
- "This selector is used here because..." → grep for actual usage

**VISUAL_VERIFICATION_PROTOCOL**:

- Always cross-reference screenshot regions with actual component templates
- Verify selector names exist in source code before documenting
- Confirm component hierarchy matches visual nesting in screenshots

**CONTEXT_ANCHOR_SYSTEM**: Every 10 operations:

1. Re-read the original task description from the `## Metadata` section.
2. Verify the current operation aligns with original goals.
3. Check if we're analyzing the correct application.
4. Update the `Current Focus` bullet point within the `## Progress` section.

### **📋 QUICK REFERENCE CHECKLIST**

Before any major operation: [ ] ASSUMPTION_VALIDATION_CHECKPOINT [ ] EVIDENCE_CHAIN_VALIDATION [ ] VISUAL_VERIFICATION_PROTOCOL
Every 10 operations: [ ] CONTEXT_ANCHOR_CHECK [ ] Update **'Current Focus'** in **## Progress** section
Emergency: **Context Drift** → Re-read **## Metadata** section | **Component Mismatch** → Verify with source code | **Evidence Gap** → Mark as "inferred"

---

#### **PHASE 1: EXTERNAL MEMORY-DRIVEN SCREENSHOT ANALYSIS.** Your sole objective is to build a structured knowledge model in a Markdown analysis file with systematic external memory management

#### **PHASE 1A: INITIALIZATION AND DISCOVERY**

First, **initialize** the analysis file at `[raw-screenshots-folder-path]/../analysis/01-component-inventory.md` with a `## Metadata` heading containing:

```markdown
## Metadata

- **Source App Path:** [source-code-app-path]
- **Raw Screenshots Path:** [raw-screenshots-folder-path]
- **Analysis Date:** [current date]
- **Status:** In Progress
```

You **MUST** also create the following top-level headings in the analysis file: `## Progress`, `## Source Screenshots`, `## Components from Metadata Files`, `## Analysis Progress`, `## Discovered Child Components`, `## Common/Shared Components Used`, `## SCSS Styles Analysis`.

Populate the `## Progress` section with:

- **Phase**: 1
- **Screenshots Processed**: 0
- **Total Screenshots**: 0
- **Current Operation**: "initialization"
- **Current Focus**: "[original screenshot analysis task]"

**SCREENSHOT DISCOVERY:**

1. List all `.png` and `.jpg` files in `[raw-screenshots-folder-path]`
2. List all `.md` metadata files in `[raw-screenshots-folder-path]` (these contain component paths)
3. Document each screenshot under `## Source Screenshots` with brief description

**COMPONENT PATH EXTRACTION:**

For each `.md` metadata file in the raw screenshots folder:

1. Read the file to extract component file paths
2. Verify each path exists in `[source-code-app-path]`
3. Add validated paths to `## Components from Metadata Files` section
4. Mark non-existent paths as `[NOT FOUND]`

#### **PHASE 1B: VISUAL-TO-CODE MAPPING** **IMPORTANT MUST DO WITH TODO LIST**

For each screenshot in the raw screenshots folder:

1. **Visual Element Identification:**
    - Open/view the screenshot image
    - Identify all visible UI elements (buttons, tables, panels, filters, dialogs, etc.)
    - Note the visual hierarchy and layout structure

2. **Source Code Correlation:**
    - Search for HTML template files in `[source-code-app-path]` that match the visual elements
    - Grep for component selectors visible in templates
    - Trace component hierarchy from parent to child

3. **Component Deep Analysis:**
   For each identified component, document:
    - **`componentName`**: The class name
    - **`selector`**: The HTML selector (e.g., `<app-component-name>`)
    - **`templatePath`**: Path to `.html` file
    - **`stylePath`**: Path to `.scss` file
    - **`typescriptPath`**: Path to `.ts` file
    - **`inputs`**: All @Input() properties
    - **`outputs`**: All @Output() events
    - **`childComponents`**: Nested component selectors
    - **`visualDescription`**: How it appears in the screenshot
    - **`screenshotRegion`**: Approximate x, y, width, height in screenshot

**MANDATORY PROGRESS TRACKING**: After processing every 5 components, update `## Analysis Progress` with component counts and mark checkboxes for completed components.

#### **PHASE 1C: SHARED COMPONENT DISCOVERY**

1. **Common Component Library Search:**
    - Search for `platform-` prefixed selectors in templates (from `@libs/platform-core`)
    - Search for `app-` prefixed shared selectors
    - Search for Material Design components (`mat-`)

2. **Document in `## Common/Shared Components Used`:**

    | Component      | Selector          | Purpose        | Location      |
    | -------------- | ----------------- | -------------- | ------------- |
    | PlatformButton | `platform-button` | Action buttons | platform-core |
    | PlatformTable  | `platform-table`  | Data tables    | platform-core |

3. **SCSS Analysis:**
    - Read main `variables.scss` and `mixins.scss` files
    - Document CSS custom properties and theme variables
    - Extract common color palette and typography settings
    - Save to `## SCSS Styles Analysis` section

#### **PHASE 1D: OVERALL INVENTORY SUMMARY**

Write comprehensive summary showing:

- Total components discovered
- Component hierarchy tree structure
- Key architectural patterns identified
- Integration with shared component libraries
- SCSS theming approach

Save completed analysis to `[raw-screenshots-folder-path]/../analysis/01-component-inventory.md`

---

#### **PHASE 2: DETAILED COMPONENT ANALYSIS.** Generate comprehensive component analysis documentation

Create file: `[raw-screenshots-folder-path]/../analysis/02-component-analysis.md`

**For each screenshot, document:**

```markdown
### [N]. [screenshot-filename.png]

**Components visible in screenshot:**

- `component-selector` (description)
    - `child-component-selector` (description)
        - `nested-component` (description)
```

**Generate Component Hierarchy Trees:**

```
AppComponent (app.component)
├── navigation-bar
├── router-outlet
│   ├── PageComponent (page.component)
│   │   └── router-outlet
│   │       └── FeatureContainerComponent
```

**Document Key Patterns:**

1. **Table Pattern** - How data tables are implemented
2. **Slide Panel Pattern** - Side panels with animations
3. **Modal/Dialog Pattern** - Confirmation dialogs
4. **Button Pattern** - Primary/secondary button usage
5. **Filter Pattern** - Filter tabs and forms
6. **Form Pattern** - Form layouts and validation

**Include code examples for each pattern:**

```html
<!-- Example from actual codebase -->
<platform-table [tableData]="items" [displayedColumns]="columns"> </platform-table>
```

---

#### **PHASE 3: ANNOTATION CONFIGURATION GENERATION.** Create the annotation config for the screenshot annotation tool

Create file: `[raw-screenshots-folder-path]/../annotations.config.json`

**JSON Structure:**

```json
{
    "$schema": "../../../tools/annotations.schema.json",
    "description": "Annotation configuration for [app-name] screenshots",
    "version": "1.0",

    "annotate": [
        {
            "name": "Page Description",
            "input": "raw-screenshots/screenshot.png",
            "output": "annotated/screenshot.annotated.png",
            "annotations": [
                {
                    "type": "marker-region",
                    "number": 1,
                    "x": 0,
                    "y": 0,
                    "width": 200,
                    "height": 50,
                    "color": "#E53935",
                    "comment": "Component description"
                }
            ],
            "legend": [
                {
                    "number": 1,
                    "component": "ComponentName",
                    "selector": "<component-selector>",
                    "description": "What this component does"
                }
            ]
        }
    ],

    "crop": [
        {
            "name": "Component Example",
            "input": "raw-screenshots/screenshot.png",
            "output": "annotated/components/component-name.png",
            "region": { "x": 0, "y": 0, "width": 100, "height": 50 },
            "padding": 8
        }
    ]
}
```

**Annotation Guidelines:**

1. **Identify Key Regions:**
    - Navigation bar (typically top, full width)
    - Main content area
    - Side panels
    - Toolbars
    - Action buttons
    - Data tables/lists
    - Filter sections

2. **Assign Numbers:**
    - Number regions top-to-bottom, left-to-right
    - Use consistent numbering across similar pages
    - Keep primary navigation as #1 consistently

3. **Color Coding:**
    - Red (`#E53935`) - Primary markers, navigation
    - Blue (`#1976D2`) - Primary action buttons
    - Green (`#4CAF50`) - Side panels, filters
    - Orange (`#FF9800`) - Detail panels
    - Purple (`#9C27B0`) - Edit modes
    - Cyan (`#00BCD4`) - Secondary actions

4. **Generate Crop Regions:**
    - Create crop entries for reusable component examples
    - Include buttons, dropdowns, tabs, table headers
    - Add 8px padding for visual clarity

---

#### **PHASE 4: UI AI AGENT GUIDE GENERATION.** Generate comprehensive guide for AI agents

Create file: `[raw-screenshots-folder-path]/../analysis/UI-AI-AGENT-GUIDE.md`

**Document Structure:**

```markdown
# [App Name] UI Development Guide for AI Agents

> **Purpose:** Reference documentation for AI agents to build consistent, production-ready UI features
> **Generated:** [date]
> **App:** [app name and version]

---

## Table of Contents

1. [Application Structure](#application-structure)
2. [Component Hierarchy & Base Classes](#component-hierarchy--base-classes)
3. [Common Components Library](#common-components-library)
4. [UI Patterns & Templates](#ui-patterns--templates)
5. [Styling Guide](#styling-guide)
6. [Icon System](#icon-system)
7. [Internationalization](#internationalization)
8. [Authorization Patterns](#authorization-patterns)
9. [Data Flow & State Management](#data-flow--state-management)
10. [Building New Features](#building-new-features)
11. [Visual Component Mapping](#visual-component-mapping)
12. [Complete Component Inventory](#complete-component-inventory)

---

## Application Structure

[Directory structure with descriptions]

---

## Component Hierarchy & Base Classes

[Base classes, inheritance patterns, usage examples]

---

## Common Components Library

[All shared components with selectors, inputs, outputs, examples]

---

## UI Patterns & Templates

[Page layout, slide panels, modals, forms with code examples]

---

## Styling Guide

[SCSS variables, mixins, BEM naming, responsive breakpoints]

---

## Icon System

[Icon components, common icon names, usage patterns]

---

## Internationalization

[Translation pipe, key structure, examples]

---

## Authorization Patterns

[Role-based visibility, permission checks, examples]

---

## Data Flow & State Management

[Input/output bindings, store patterns (NgRx/PlatformVmStore)]

---

## Building New Features

[Step-by-step checklist for creating new components]

---

## Visual Component Mapping

[Screenshot annotation references with component tables]

### AI Agent Visual Pattern Matching

[Decision tree for identifying components from new screenshots]

---

## Complete Component Inventory

[Full table of all components with selectors and purposes]
```

---

#### **PHASE 5: RUN ANNOTATION TOOL & VALIDATION**

**5A: Run Annotation Tool**

```bash
cd docs/ui-frontend/tools
npm install  # If not already installed
node annotate.js --config=[relative-path-to-annotations.config.json]
```

**5B: Verify Generated Outputs**

Check that the following were created:

- `annotated/*.annotated.png` - Annotated screenshot images
- `annotated/*-legend.md` - Legend markdown files
- `annotated/components/*.png` - Cropped component images

**5C: Cross-Validation**

1. Open each annotated image and verify:
    - All numbered markers are visible and correctly positioned
    - Region highlights cover the intended components
    - No overlapping annotations obscuring content

2. Verify legend files:
    - All numbers have corresponding legend entries
    - Component names match source code
    - Selectors are accurate

**5D: Update Analysis Documentation**

Add visual component mapping section to UI-AI-AGENT-GUIDE.md:

```markdown
## Visual Component Mapping

### [Page Name] Annotated

![Page Annotated](../annotated/page-name.annotated.png)

| #   | Visual Element | Component     | Selector           | Usage          |
| --- | -------------- | ------------- | ------------------ | -------------- |
| 1   | Top navigation | NavigationBar | `<navigation-bar>` | App header     |
| 2   | Tab filters    | MainFilter    | `<main-filter>`    | Tab navigation |
```

---

#### **PHASE 6: APPROVAL GATE**

Present the complete analysis for explicit approval before finalizing:

1. **Show generated files list:**
    - `analysis/01-component-inventory.md`
    - `analysis/02-component-analysis.md`
    - `analysis/UI-AI-AGENT-GUIDE.md`
    - `annotations.config.json`
    - `annotated/*.annotated.png`
    - `annotated/*-legend.md`
    - `annotated/components/*.png`

2. **Summary metrics:**
    - Total screenshots processed
    - Total components documented
    - Total annotations created
    - Total cropped component examples

3. **Request approval to finalize or request changes**

**DO NOT** mark task complete without explicit user approval.

---

**SUCCESS VALIDATION:** Verify the documentation is complete, accurate, and useful for AI agents building new features. Document this under a `## Success Validation` heading.

### UI Screenshot Analysis Guidelines

- **Visual-first approach:** Start with screenshots, then trace to code
- **Source code verification:** Every component mapping must have code evidence
- **Consistent annotation:** Use standardized colors and numbering
- **Comprehensive coverage:** Document ALL visible components, not just major ones
- **Pattern extraction:** Identify and document reusable patterns
- **Practical examples:** Include working code snippets, not theoretical descriptions
- **Cross-validation:** Verify annotations against actual rendered UI
- **Incremental documentation:** Save progress frequently to prevent context loss

---

### Input Placeholders

Replace these placeholders when using this prompt:

| Placeholder                     | Description                                  | Example                                                         |
| ------------------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| `[source-code-app-path]`        | Path to the Angular application source code  | `src/Frontend/TextSnippetServiceClient`                         |
| `[raw-screenshots-folder-path]` | Path to folder containing raw UI screenshots | `docs/ui-frontend/Web/TextSnippetServiceClient/raw-screenshots` |

### Example Usage

```
Analyze UI screenshots and generate component documentation:
- Source Code: src/Frontend/apps/playground-text-snippet
- Screenshots: docs/ui-frontend/Frontend/raw-screenshots
```

---

### Output Folder Structure

After running this prompt, the following structure will be generated:

```
[raw-screenshots-folder-path]/../
├── analysis/
│   ├── 01-component-inventory.md     # Component catalog with file paths
│   ├── 02-component-analysis.md      # Detailed component analysis & patterns
│   └── UI-AI-AGENT-GUIDE.md          # Comprehensive AI agent guide
├── annotated/
│   ├── [screenshot].annotated.png    # Annotated screenshots
│   ├── [screenshot]-legend.md        # Legend markdown files
│   └── components/
│       └── [component].png           # Cropped component examples
├── raw-screenshots/                   # Original screenshots (input)
└── annotations.config.json            # Annotation tool configuration
```
