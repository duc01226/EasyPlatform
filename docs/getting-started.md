# Getting Started

> Quick setup guide for Easy.Platform development environment.

## Prerequisites

```bash
dotnet --version    # Should be 9.0+
node --version      # Should be 20.0+
npm --version       # Should be 10.0+
```

## Backend Setup

```bash
cd src/PlatformExampleApp
dotnet build
dotnet run --project PlatformExampleApp.TextSnippet.Api
```

API available at: `http://localhost:5000`

## Frontend Setup (Nx Workspace)

```bash
cd src/PlatformExampleAppWeb
npm install
nx serve playground-text-snippet
```

App available at: `http://localhost:4200`

## Infrastructure (Docker)

```bash
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```

### Database Connections (Dev)

| Service    | Host:Port       | Credentials         |
| ---------- | --------------- | ------------------- |
| SQL Server | localhost,14330 | sa / 123456Abc      |
| MongoDB    | localhost:27017 | root / rootPassXXX  |
| PostgreSQL | localhost:54320 | postgres / postgres |
| Redis      | localhost:6379  | -                   |
| RabbitMQ   | localhost:15672 | guest / guest       |

## Recommended VS Code Extensions

```json
{
    "recommendations": [
        "angular.ng-template",
        "esbenp.prettier-vscode",
        "ms-dotnettools.csharp",
        "ms-dotnettools.csdevkit",
        "nrwl.angular-console",
        "dbaeumer.vscode-eslint",
        "firsttris.vscode-jest-runner",
        "sonarsource.sonarlint-vscode",
        "eamodio.gitlens",
        "streetsidesoftware.code-spell-checker"
    ]
}
```

## Troubleshooting

### Common Backend Issues

```csharp
// Problem: Repository not found
// Solution: Ensure proper registration
services.AddScoped<ITextSnippetRepository<TextSnippet>, TextSnippetRepository<TextSnippet>>();

// Problem: Validation not triggered
// Solution: Override Validate() method and call EnsureValid()
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate().And(_ => !string.IsNullOrEmpty(Name), "Name is required");
```

### Common Frontend Issues

```typescript
// Problem: Store not updating UI
// Solution: Ensure proper store initialization
ngOnInit() { this.store.initOrReloadVm(false); }

// Problem: Effects not triggering
// Solution: Use effectSimple() pattern
public loadData = this.effectSimple(() =>
    this.api.getData().pipe(this.tapResponse(data => this.updateState({ data }))));
```

## Next Steps

- [Architecture Overview](./architecture-overview.md) - System design
- [Backend Quickref](./backend-quickref.md) - Backend patterns
- [Frontend Quickref](./frontend-quickref.md) - Frontend patterns
- [CLAUDE.md](../CLAUDE.md) - Complete code patterns
