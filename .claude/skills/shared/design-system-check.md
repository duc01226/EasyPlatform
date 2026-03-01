# Design System Documentation

Before creating any frontend component, store, form, or API service, read the design system documentation for your target application.

## Application Design System Locations

Read `docs/project-config.json` → `designSystem` section for project-specific design system doc paths and app mappings.

| Application                       | Design System Location                                              |
| --------------------------------- | ------------------------------------------------------------------- |
| **Default**                       | `docs/design-system/`                                               |
| **App-specific**                  | Check `designSystem.appMappings[]` in `docs/project-config.json`    |

## Key Docs to Read

| Doc File | Content |
| -------- | ------- |
| `README.md` | Component overview, base classes, library summary |
| `01-design-tokens.md` | Colors, typography, spacing tokens |
| `02-component-catalog.md` | Available components and usage examples |
| `03-form-patterns.md` | Form validation, modes, error handling patterns |
| `06-state-management.md` | State management and API integration patterns |
| `07-technical-guide.md` | Implementation checklist, best practices |

**⚠️ MUST READ** the docs most relevant to your task type (component, form, store, or API service).
