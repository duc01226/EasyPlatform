> **Design-System Check** — Before UI work, resolve applicable design, accessibility, platform, styling, and component references from `docs/project-config.json`, its docs index, and code. Read existing, relevant references; assume no platform/framework.
>
> 1. Follow configured design-system tokens, components, icons, themes, and interaction patterns where present.
> 2. Follow applicable UI architecture/styling references; require BEM, SCSS, stores, API wrappers, or base classes only with config/code evidence.
> 3. Use documented component ownership; otherwise record actual owners/boundaries without imposing tiers or base abstractions.
> 4. Reuse/compose components when behavior and platform fit; justify new abstractions or pattern deviations concretely.
>
> App-specific routing: `designSystem.appMappings[]` and `contextGroups[]` in project config.
