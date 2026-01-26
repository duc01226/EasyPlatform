# EasyPlatform File Location Reference

Standard paths for implementing features in EasyPlatform.

---

## Backend Paths

```
src/Backend/{Service}/{Service}.Domain/Entities/
src/Backend/{Service}/{Service}.Application/UseCaseCommands/{Feature}/
src/Backend/{Service}/{Service}.Application/UseCaseQueries/{Feature}/
src/Backend/{Service}/{Service}.Application/UseCaseEvents/{Feature}/
src/Backend/{Service}/{Service}.Application/EntityDtos/
src/Backend/{Service}/{Service}.Persistence*/EntityConfigurations/
src/Backend/{Service}/{Service}.Api/Controllers/
```

## Frontend Paths

```
src/Frontend/apps/{app}/src/app/features/{feature}/
src/Frontend/libs/apps-domains/src/{domain}/
src/Frontend/libs/platform-core/src/
```

---

## Related Skills

Use these complementary skills during implementation:

| Skill | Purpose |
|-------|---------|
| `easyplatform-backend` | CQRS commands/queries |
| `frontend-angular-component` | UI components |
| `frontend-angular-form` | Form components with validation |
| `frontend-angular-store` | State management |
| `frontend-angular-api-service` | API services |
| `feature-investigation` | READ-ONLY exploration (no code changes) |
| `debugging` | Root cause investigation (`--autonomous` for headless) |
