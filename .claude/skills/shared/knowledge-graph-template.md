# Knowledge Graph Template

Standard structure for codebase knowledge capture during investigation and feature analysis.

---

## Per-File Entry Template

For each analyzed file, document under `## Knowledge Graph`:

### Core Fields

- **filePath**: Full path to the file
- **type**: Component classification (Entity, Command, Query, EventHandler, Controller, Consumer, Component, Store, Service)
- **architecturalPattern**: Design pattern used (CQRS, Repository, Event-Driven, etc.)
- **content**: Purpose and logic summary
- **symbols**: Key classes, interfaces, methods
- **dependencies**: Imported modules / `using` statements
- **businessContext**: Business logic contribution
- **referenceFiles**: Files using this file's symbols
- **relevanceScore**: 1-10 (relevance to the task)
- **evidenceLevel**: "verified" or "inferred"
- **platformAbstractions**: Platform base classes used
- **serviceContext**: Microservice ownership

### Investigation Fields

- **entryPoints**: How this code is triggered/called
- **outputPoints**: What this code produces/returns
- **dataTransformations**: How data is modified
- **errorScenarios**: What can go wrong, error handling

### Consumer/Message Bus Fields

- **messageBusMessage**: Message type consumed
- **messageBusProducers**: Who sends this message (grep across all services)
- **crossServiceIntegration**: Cross-service data flow

### Frontend Fields

- **componentHierarchy**: Parent/child component relationships
- **stateManagementStores**: Associated stores
- **dataBindingPatterns**: Input/output bindings
- **validationStrategies**: Form validation approach
