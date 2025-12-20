# PlatformExampleAppWeb - Angular Frontend

Angular 19 Nx workspace demonstrating EasyPlatform frontend patterns.

## Workspace Structure

### Applications (`/apps`)

| App | Port | Description |
|-----|------|-------------|
| `playground-text-snippet` | 4001 | Demo app for TextSnippet API integration |

### Libraries (`/libs`)

| Library | Purpose |
|---------|---------|
| `platform-core` | Framework foundation - components, stores, utilities, validators |
| `apps-domains` | Domain-specific APIs, repositories, models |
| `apps-domains-components` | Domain-specific UI components |
| `apps-shared-components` | Cross-app shared UI components |
| `platform-components` | Platform-level reusable components |

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
ng serve playground-text-snippet

# Build for production
nx build playground-text-snippet

# Run tests
nx test platform-core

# Generate new component
nx g @nx/angular:component my-component --project=platform-core
```

## Key Patterns

### Component Hierarchy
```
PlatformComponent              # Base: lifecycle, signals, subscriptions
├── PlatformVmComponent        # + ViewModel injection
├── PlatformFormComponent      # + Reactive forms integration
└── PlatformVmStoreComponent   # + ComponentStore state management
```

### State Management
- Uses `PlatformVmStore` with ComponentStore pattern
- Signal-based reactivity
- Built-in loading/error state tracking

### API Services
- Extends `PlatformApiService` for HTTP operations
- Built-in caching support
- Consistent error handling

## Related Documentation

- [Platform-core README](./libs/platform-core/README.md) - Core library details
- [CLAUDE.md](../../CLAUDE.md) - Complete development patterns
- [README.md](../../README.md) - Project overview
