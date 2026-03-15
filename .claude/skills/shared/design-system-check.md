# Design System Documentation

Before creating any frontend component, store, form, or API service, read the design system documentation for your target application.

## Application Design System Locations

Read `docs/project-config.json` → `designSystem` section for project-specific design system doc paths and app mappings.

| Application      | Design System Location                                           |
| ---------------- | ---------------------------------------------------------------- |
| **Default**      | `docs/project-reference/design-system/`                          |
| **App-specific** | Check `designSystem.appMappings[]` in `docs/project-config.json` |

## Key Docs to Read

| Doc                                                     | Content                                                                  | When to Read                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------- |
| `docs/project-reference/design-system/README.md`        | Design tokens, component inventory, icon library, theme variants         | New UI components, design decisions, wireframes |
| `docs/project-reference/frontend-patterns-reference.md` | Component base classes, stores, forms, API services, directives, routing | Any frontend code change                        |
| `docs/project-reference/scss-styling-guide.md`          | BEM methodology, SCSS variables, mixins, responsive patterns, theming    | Any styling/CSS/SCSS change, new components     |

**Note:** Doc paths are configured per-project. Check `docs/project-config.json` → `contextGroups[].patternsDoc`, `contextGroups[].stylingDoc`, `contextGroups[].designSystemDoc` for project-specific paths.

**⚠️ MUST READ** the docs most relevant to your task type (component, form, store, or API service).
