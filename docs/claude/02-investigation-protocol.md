# Investigation Protocol

## Step 0: Bug Analysis & Debugging (CRITICAL)

**Core Principles:**

- NEVER assume based on first glance
- ALWAYS verify with multiple search patterns
- CHECK both static AND dynamic code usage
- READ actual implementation, not just interfaces
- TRACE full dependency chains
- DECLARE confidence level and uncertainties
- REQUEST user confirmation when confidence < 90%

**Quick Verification Checklist:**

```
Before removing/changing ANY code:
☐ Searched static imports?
☐ Searched string literals in code?
☐ Checked dynamic invocations (attr, prop, runtime)?
☐ Read actual implementations?
☐ Traced who depends on this?
☐ Assessed what breaks if removed?
☐ Documented evidence clearly?
☐ Declared confidence level?

If ANY unchecked → DO MORE INVESTIGATION
If confidence < 90% → REQUEST USER CONFIRMATION
```

## Step 1: Context Discovery

1. Extract domain concepts from requirements
2. Do semantic search to find related entities and components
3. Do grep search to validate patterns and find evidence
4. Do list code usages to map complete ecosystems
5. Never assume - always verify with code evidence

## Step 2: Service Boundary Verification

1. Identify which microservice owns the domain concept
2. Use `grep_search("localhost:\\d+|UseUrls.*\\d+", isRegexp=true)` to find service ports
3. Verify service responsibilities through actual code analysis
4. Check for existing implementations before creating new ones

## Step 3: Platform Pattern Recognition

1. Check CLAUDE.md for pattern guidance
2. Use established platform patterns over custom solutions
3. Follow Easy.Platform framework conventions
4. Verify base class APIs before using component methods

## Critical File Locations

### Essential Documentation (READ FIRST)

```
📖 README.md                            # Platform overview
📖 ../architecture-overview.md          # System architecture
📖 CLEAN-CODE-RULES.md                  # Coding standards
📖 .github/AI-DEBUGGING-PROTOCOL.md    # Debugging protocol
```

### Backend Architecture

```
src/Platform/                           # Easy.Platform framework
├── Easy.Platform/                      # Core (CQRS, validation, repositories)
├── Easy.Platform.AspNetCore/           # ASP.NET Core integration
├── Easy.Platform.MongoDB/              # MongoDB patterns
└── Easy.Platform.RabbitMQ/             # Message bus

src/PlatformExampleApp/                 # Example microservice
├── *.Api/                              # Web API layer
├── *.Application/                      # CQRS handlers, jobs
├── *.Domain/                           # Entities, events
└── *.Persistence*/                     # Data access
```

### Frontend Architecture (Nx Workspace)

```
src/PlatformExampleAppWeb/
├── apps/playground-text-snippet/       # Example app
└── libs/
    ├── platform-core/                  # Framework base classes
    ├── apps-domains/                   # Business domain code
    ├── share-styles/                   # SCSS themes
    └── share-assets/                   # Static assets
```
