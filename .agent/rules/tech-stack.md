# Technology Stack

## Backend (.NET)
- Framework: .NET 9
- Language: C# 12
- Web Framework: ASP.NET Core 9
- Platform Framework: Easy.Platform (custom Clean Architecture framework)
- CQRS: MediatR pattern via Easy.Platform
- ORM: Entity Framework Core (SQL Server, PostgreSQL), MongoDB Driver

## Frontend (Angular)
- Framework: Angular 19.1.3, TypeScript 5.6.0, Nx 20.4.0
- State Management: NgRx ComponentStore 19.0.0 via PlatformVmStore
- Core Library: platform-core (base components, stores, utilities)
- Styling: SCSS with shared themes

## Databases
- SQL Server: Entity Framework Core support
- PostgreSQL: Entity Framework Core support
- MongoDB: MongoDB Driver support

## Infrastructure
- Message Bus: RabbitMQ for event-driven communication
- Caching: Redis
- Storage: Azure Blob Storage
- Containers: Docker, Kubernetes
- Monitoring: Grafana, Prometheus, Azure Monitor

## Development Tools
- Backend IDE: Visual Studio 2022
- Frontend IDE: Visual Studio Code
- Code Formatter: CSharpier (mandatory for C#), Prettier (TypeScript)
- Node.js: 20.19.2+
- npm: 10.0+

## Key Packages (Frontend)
- @angular/material
- @kendo/angular-* (Grid, Dropdowns, DateInputs)
- rxjs@7.8.1
- moment@2.29.4, moment-timezone@0.5.43

## Development Ports
- RabbitMQ Admin: localhost:15672 (guest/guest)
- SQL Server: localhost:14330 (sa/123456Abc)
- MongoDB: localhost:27017 (root/rootPassXXX)
- PostgreSQL: localhost:54320 (postgres/postgres)
- Redis: localhost:6379
