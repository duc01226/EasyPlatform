# Deployment & Infrastructure

> Docker, Kubernetes, and infrastructure setup for BravoSUITE

## Infrastructure Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Container Orchestration** | Kubernetes | Microservice deployment |
| **Service Mesh** | Istio (Optional) | Service communication |
| **Message Bus** | RabbitMQ | Event-driven communication |
| **Databases** | SQL Server, MongoDB, PostgreSQL | Data persistence |
| **Caching** | Redis | Performance optimization |
| **Storage** | Azure Blob Storage | File management |
| **Monitoring** | Grafana + Azure Monitor | System observability |

---

## Development Environment

### Database Connections

| Database | Connection | Credentials |
|----------|------------|-------------|
| **SQL Server** | `localhost,14330` | `sa` / `123456Abc` |
| **MongoDB** | `localhost:27017` | `root` / `rootPassXXX` |
| **PostgreSQL** | `localhost:54320` | `postgres` / `postgres` |
| **Redis** | `localhost:6379` | - |
| **RabbitMQ** | `localhost:15672` | `guest` / `guest` |

### Management Tools

- **SQL Server**: SQL Server Management Studio
- **MongoDB**: Studio 3T or MongoDB Compass
- **PostgreSQL**: pgAdmin

---

## Docker Deployment

### Development Startup

```bash
# Start infrastructure (RabbitMQ, databases, Redis)
.\Bravo-DevStarts\"COMMON Infrastructure Dev-start.cmd"

# Start authentication service
.\Bravo-DevStarts\"COMMON Accounts Api Dev-start.cmd"

# Start specific microservice
.\Bravo-DevStarts\"GROWTH Api Dev-start.cmd"
.\Bravo-DevStarts\"TALENTS Api Dev-start.cmd"
.\Bravo-DevStarts\"SURVEYS Api Dev-start.cmd"

# Full system (requires 6GB RAM)
.\Bravo-DevStarts\StartDocker\"START-ALL.cmd"
```

### Docker Build Context

For Angular apps with shared libs:

```dockerfile
FROM node:18-alpine AS angular-built
WORKDIR /usr/src/app

# Copy shared libs FIRST
COPY libs /usr/src/libs

# Copy package files
COPY ClientApp/package.json ./
COPY ClientApp/package-lock.json ./

# Install dependencies
RUN npm install --force

# Copy application source
COPY ClientApp/ .

# Build application
RUN npm run build
```

**Docker Compose:**

```yaml
services:
    client-app:
        build:
            context: ../../src/Web  # Parent directory for libs/ access
            dockerfile: ClientApp/Dockerfile
```

---

## Kubernetes Deployment

Configuration files located in `deploy/bravosuite/`.

---

## Clean Architecture Per Service

```
ServiceName/
├── Domain/           # Business entities, rules, repository interfaces
├── Application/      # Use cases, CQRS handlers, event handlers
├── Persistence/      # Data access implementations
└── Service/          # API controllers and web layer
```

---

## Event-Driven Communication

Services communicate through RabbitMQ:

- **Entity Events**: Automatic cross-service data synchronization
- **Domain Events**: Business rule notifications within service boundaries
- **Application Events**: Custom business workflows

---

## Data Access Patterns

- **Repository Pattern**: Microservice-specific repository interfaces
- **Unit of Work**: Transaction management across aggregates
- **Change Tracking**: Automatic field-level change detection
- **Multi-Database**: Support for MongoDB, SQL Server, PostgreSQL

---

## Debug Tools

### Backend

```bash
# Check service logs
docker logs <container-name>

# Test API endpoints
curl -X GET "https://localhost:7001/swagger/index.html"
```

### Frontend

```bash
ng version
npm run dev-start:growth -- --verbose
# Use Chrome DevTools: Network, Console, Angular DevTools
```

### Infrastructure

```bash
# RabbitMQ management
http://localhost:15672 (guest/guest)

# Redis
redis-cli ping

# MongoDB
mongosh "mongodb://root:rootPassXXX@localhost:27017"
```

---

## Resources

- **Deployment Configs**: `deploy/bravosuite/`
- **Infrastructure Setup**: `dev-infrastructure/`
- **Azure Functions**: `src/AzureFunctions/`

---

**Next:** [Monitoring](./monitoring.md) | [Getting Started](./getting-started.md)
