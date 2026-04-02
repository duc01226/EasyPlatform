# Design Patterns Quality Checklist

> **MANDATORY** for: `/code-review`, `/code-simplifier`, `/refactoring`, `/review-changes`, `/review-post-task`
> **When to read:** During code quality assessment, after implementation, during refactoring
> **Reference report:** `plans/reports/research-260317-1236-common-design-patterns-in-programming.md` (80+ patterns, 8 categories)

---

## Priority Principles (MUST CHECK — ordered by importance)

### 1. DRY via OOP Abstraction (HIGHEST PRIORITY)

- **Base classes:** Classes with same suffix (`*Entity`, `*Dto`, `*Service`, `*Component`, `*Handler`) MUST share a common base class — even if empty now (enables future shared logic + child overrides)
- **Generics:** Repeated logic differing only by type → extract to generic class/method
- **Helpers/Extensions:** Utility logic used in 3+ places → extract to shared helper or extension method
- **Shared interfaces:** When 2+ classes expose the same contract → extract interface (`IRepository<T>`, `IValidator<T>`)
- **Grep test:** Before accepting new code, grep for similar patterns — if 3+ exist, flag for extraction

### 2. Right Responsibility (logic in LOWEST appropriate layer)

```
Entity/Model > Domain Service > Application Service > Handler/Controller > Component/UI
     ↑ PREFER                                                    AVOID ↓
```

- **Business rules** → Entity methods or Value Objects (not in handlers)
- **Mapping logic** → DTO.MapToEntity() or Command.UpdateEntity() (not in handlers)
- **Display logic** → Model getters (not in component templates or switch statements)
- **Constants/Enums** → Static properties on the relevant Model class (not scattered in components)
- **Cross-entity logic** → Domain Service (not in individual entity or handler)
- **Query filters** → Entity static expressions (not inline in handlers)

### 3. Abstraction for Extensibility & Tech-Agnostic Design

- **Dependency Inversion:** High-level modules depend on abstractions, not concretions
    - Flag: direct `new ConcreteService()` in business logic → use DI + interface
    - Flag: framework-specific types in domain layer → abstract behind interface
- **Abstract class/interface for variation points:** When behavior varies by type → Strategy or Template Method pattern, not switch/if chains
- **Technology agnostic:** Domain/business logic MUST NOT depend on specific framework, ORM, or transport mechanism
    - Flag: `HttpContext`, `DbContext`, framework annotations in domain entities
    - Solution: Ports & Adapters — domain defines interfaces, infrastructure implements

### 4. Scalability & Change-Resilience

- **Open/Closed Principle:** New behavior via extension (new class), not modification (editing existing code)
- **Interface Segregation:** Clients should not depend on methods they don't use — split fat interfaces
- **Loose Coupling:** Components communicate through abstractions/events, not direct references
- **Composition over Inheritance:** Prefer composing behaviors via interfaces/delegation over deep inheritance hierarchies

---

## Design Pattern Opportunity Quick-Scan

During review, check if any of these pattern opportunities apply:

### Creational (object creation smells)

| Smell                                               | Pattern Opportunity  | Action                    |
| --------------------------------------------------- | -------------------- | ------------------------- |
| Complex constructor with many params                | **Builder**          | Suggest builder pattern   |
| `new ConcreteClass()` scattered in business logic   | **Factory Method**   | Extract factory or use DI |
| Object families created together                    | **Abstract Factory** | Group creation logic      |
| Expensive object creation, objects mostly identical | **Prototype**        | Consider cloning          |

### Structural (composition smells)

| Smell                                        | Pattern Opportunity | Action                         |
| -------------------------------------------- | ------------------- | ------------------------------ |
| Incompatible interface integration           | **Adapter**         | Wrap with adapter class        |
| Complex subsystem with many classes          | **Facade**          | Introduce simplified interface |
| Need to add behavior without modifying class | **Decorator**       | Wrap with decorator            |
| Tree/hierarchical data structures            | **Composite**       | Uniform node interface         |
| Expensive objects loaded eagerly             | **Proxy**           | Lazy-loading proxy             |

### Behavioral (logic/flow smells)

| Smell                                         | Pattern Opportunity         | Action                                                     |
| --------------------------------------------- | --------------------------- | ---------------------------------------------------------- |
| Long switch/if-else on type                   | **Strategy** or **State**   | Extract each branch to class implementing shared interface |
| Multiple objects need notification of changes | **Observer**                | Implement event/pub-sub                                    |
| Request processing pipeline                   | **Chain of Responsibility** | Middleware/pipeline pattern                                |
| Need undo/redo capability                     | **Command + Memento**       | Encapsulate operations as objects                          |
| Algorithm with fixed steps, variable details  | **Template Method**         | Abstract base with hook methods                            |

### Enterprise/Architectural (structure smells)

| Smell                                   | Pattern Opportunity | Action                                     |
| --------------------------------------- | ------------------- | ------------------------------------------ |
| Data access mixed with business logic   | **Repository**      | Abstract persistence behind interface      |
| Read/write have different scaling needs | **CQRS**            | Separate command/query models              |
| Cross-service data consistency needed   | **Saga**            | Orchestrate with compensating transactions |
| Distributed service calls failing       | **Circuit Breaker** | Add resilience wrapper                     |

---

## Refactoring Completeness Check (MANDATORY after extraction/move/rename)

> **AI failure mode:** Finishes primary file, misses secondary files. Reports "done" with dangling references.

After ANY code extraction, move, rename, or deletion:

1. **List every removed/renamed symbol** — fields, methods, imports, template bindings, CSS classes
2. **Grep the ENTIRE scope for each** — all file types (code, templates, styles, configs, tests)
3. **Zero dangling = complete.** Any match = incomplete migration. Fix before reporting done.
4. **Verify new artifact is wired** — registered, imported, referenced by all consumers. Creation without registration = runtime failure.
5. **Match lifetime to state** — if extracted code holds mutable state, verify each consumer gets its own instance (not shared). Shared mutable state across independent consumers = silent cross-contamination.

---

## Anti-Pattern Red Flags (MUST FLAG)

| Anti-Pattern              | Detection Signal                                                          | Severity                                     |
| ------------------------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| **God Object**            | Class >500 lines or >10 responsibilities                                  | HIGH — split by responsibility               |
| **Golden Hammer**         | Same pattern/tool used everywhere regardless of fit                       | MEDIUM — evaluate alternatives               |
| **Copy-Paste Code**       | 3+ near-identical code blocks                                             | HIGH — extract to shared method/class        |
| **Circular Dependency**   | A depends on B depends on A                                               | HIGH — introduce interface or mediator       |
| **Singleton Overuse**     | >3 singletons, or singleton holding mutable state                         | MEDIUM — evaluate if truly needed            |
| **Premature Abstraction** | Generic/abstract code with only 1 implementation and no planned variation | LOW — simplify until 2nd use case exists     |
| **Lava Flow**             | Dead code, commented-out blocks, unused classes                           | MEDIUM — remove with grep verification       |
| **Spaghetti Code**        | No clear layering, everything calls everything                            | HIGH — restructure with layered architecture |

---

## When NOT to Apply Patterns (Prevent Over-Engineering)

**CRITICAL:** Pattern recommendations MUST satisfy ALL of these:

1. **Evidence of need:** Grep shows 3+ occurrences of the problem the pattern solves
2. **ROI justified:** Pattern reduces complexity, not adds it — simpler code wins
3. **YAGNI compliant:** Pattern solves a current problem, not a hypothetical future one
4. **Team fit:** Pattern is appropriate for the project's tech stack and team experience

**DO NOT recommend patterns when:**

- The code is simple and works — "don't fix what isn't broken"
- Only 1 implementation exists — wait for the 2nd before abstracting (Rule of Three)
- The pattern adds more code than it saves — prefer inline solution
- The pattern requires significant refactoring unrelated to the current task

---

## How to Report Pattern Findings

In review reports, add a **"Design Pattern Assessment"** section:

```markdown
## Design Pattern Assessment

### Opportunities Identified

- [file:line] — {smell detected} → Recommend **{Pattern}** because {evidence}

### Anti-Patterns Found

- [file:line] — {anti-pattern name}: {description} → Severity: {H/M/L}

### Positive Pattern Usage

- [file:line] — Good use of **{Pattern}** for {purpose}

### No Action Needed

- Codebase follows appropriate patterns for current complexity level
```
