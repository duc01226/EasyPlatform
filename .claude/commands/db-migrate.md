---
description: Run or create database migrations
allowed-tools: Bash, Read, Write, Edit, Glob, TodoWrite
---

Database migration: $ARGUMENTS

## Instructions

1. **Parse arguments**:
   - `add <name>` → Create new EF Core migration
   - `update` → Apply pending migrations
   - `list` → List all migrations and status
   - `rollback` → Revert last migration
   - No argument → Show migration status

2. **Identify database provider** from project:
   - SQL Server: `PlatformExampleApp.TextSnippet.Persistence`
   - PostgreSQL: `PlatformExampleApp.TextSnippet.Persistence.PostgreSql`
   - MongoDB: Uses `PlatformMongoMigrationExecutor` (code-based)

3. **For EF Core (SQL Server/PostgreSQL)**:

   Add migration:

   ```bash
   cd src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence
   dotnet ef migrations add <MigrationName> --startup-project ../PlatformExampleApp.TextSnippet.Api
   ```

   Update database:

   ```bash
   dotnet ef database update --startup-project ../PlatformExampleApp.TextSnippet.Api
   ```

   List migrations:

   ```bash
   dotnet ef migrations list --startup-project ../PlatformExampleApp.TextSnippet.Api
   ```

4. **For MongoDB migrations**:
   - MongoDB uses code-based migrations via `PlatformMongoMigrationExecutor`
   - Location: `*.Persistence.Mongo/Migrations/`
   - Migrations run automatically on application startup
   - To create: Generate new migration class following existing patterns

5. **Safety checks**:
   - Warn before applying migrations to production
   - Show what changes will be applied
   - Recommend backup before destructive operations
