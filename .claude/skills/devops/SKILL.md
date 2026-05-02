---
name: devops
version: 1.0.0
description: '[DevOps] Use when deploying to Cloudflare (Workers, R2, D1, KV, Pages), Docker, or GCP (Compute Engine, GKE, Cloud Run). Covers serverless deployment, container management, CI/CD pipelines, cloud infrastructure costs, caching strategies, and cloud-native applications.'
license: MIT
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Deploy and manage cloud infrastructure across Cloudflare (Workers, R2, D1), Docker containers, and Google Cloud Platform.

**Workflow:**

1. **Platform Selection** — Choose Cloudflare (edge/low-latency), Docker (containers/microservices), or GCP (enterprise/K8s)
2. **Project Setup** — Initialize with Wrangler CLI, Dockerfile, or gcloud CLI
3. **Local Development** — Test locally before deploying
4. **Deploy & Verify** — Deploy to target platform with health checks

**Key Rules:**

- Run containers as non-root user; scan images for vulnerabilities
- Use multi-stage Docker builds to minimize image size
- Store secrets in environment variables, never in code
- Use R2 over S3 when zero egress cost matters

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# DevOps Skill

Comprehensive guide for deploying and managing cloud infrastructure across Cloudflare edge platform, Docker containerization, and Google Cloud Platform.

## When to Use This Skill

Use this skill when:

- Deploying serverless applications to Cloudflare Workers
- Containerizing applications with Docker
- Managing Google Cloud infrastructure with gcloud CLI
- Setting up CI/CD pipelines across platforms
- Optimizing cloud infrastructure costs
- Implementing multi-region deployments
- Building edge-first architectures
- Managing container orchestration with Kubernetes
- Configuring cloud storage solutions (R2, Cloud Storage)
- Automating infrastructure with scripts and IaC

## Platform Selection Guide

### When to Use Cloudflare

**Best For:**

- Edge-first applications with global distribution
- Ultra-low latency requirements (<50ms)
- Static sites with serverless functions
- Zero egress cost scenarios (R2 storage)
- WebSocket/real-time applications (Durable Objects)
- AI/ML at the edge (Workers AI)

**Key Products:**

- Workers (serverless functions)
- R2 (object storage, S3-compatible)
- D1 (SQLite database with global replication)
- KV (key-value store)
- Pages (static hosting + functions)
- Durable Objects (stateful compute)
- Browser Rendering (headless browser automation)

**Cost Profile:** Pay-per-request, generous free tier, zero egress fees

### When to Use Docker

**Best For:**

- Local development consistency
- Microservices architectures
- Multi-language stack applications
- Traditional VPS/VM deployments
- Kubernetes orchestration
- CI/CD build environments
- Database containerization (dev/test)

**Key Capabilities:**

- Application isolation and portability
- Multi-stage builds for optimization
- Docker Compose for multi-container apps
- Volume management for data persistence
- Network configuration and service discovery
- Cross-platform compatibility (amd64, arm64)

**Cost Profile:** Infrastructure cost only (compute + storage)

### When to Use Google Cloud

**Best For:**

- Enterprise-scale applications
- Data analytics and ML pipelines (BigQuery, Vertex AI)
- Hybrid/multi-cloud deployments
- Kubernetes at scale (GKE)
- Managed databases (Cloud SQL, Firestore, Spanner)
- Complex IAM and compliance requirements

**Key Services:**

- Compute Engine (VMs)
- GKE (managed Kubernetes)
- Cloud Run (containerized serverless)
- App Engine (PaaS)
- Cloud Storage (object storage)
- Cloud SQL (managed databases)

**Cost Profile:** Varied pricing, sustained use discounts, committed use contracts

## Quick Start

### Cloudflare Workers

```bash
# Install Wrangler CLI
npm install -g wrangler

# Create and deploy Worker
wrangler init my-worker
cd my-worker
wrangler deploy
```

See: `references/cloudflare-workers-basics.md`

### Docker Container

```bash
# Create Dockerfile
cat > Dockerfile <<EOF
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
EOF

# Build and run
docker build -t myapp .
docker run -p 3000:3000 myapp
```

See: `references/docker-basics.md`

### Google Cloud Deployment

```bash
# Install and authenticate
curl https://sdk.cloud.google.com | bash
gcloud init
gcloud auth login

# Deploy to Cloud Run
gcloud run deploy my-service \
  --image gcr.io/project/image \
  --region us-central1
```

See: `references/gcloud-platform.md`

## Reference Navigation

### Cloudflare Platform

- `cloudflare-platform.md` - Edge computing overview, key components
- `cloudflare-workers-basics.md` - Getting started, handler types, basic patterns
- `cloudflare-workers-advanced.md` - Advanced patterns, performance, optimization
- `cloudflare-workers-apis.md` - Runtime APIs, bindings, integrations
- `cloudflare-r2-storage.md` - R2 object storage, S3 compatibility, best practices
- `cloudflare-d1-kv.md` - D1 SQLite database, KV store, use cases
- `browser-rendering.md` - Puppeteer/Playwright automation on Cloudflare

### Docker Containerization

- `docker-basics.md` - Core concepts, Dockerfile, images, containers
- `docker-compose.md` - Multi-container apps, networking, volumes

### Google Cloud Platform

- `gcloud-platform.md` - GCP overview, gcloud CLI, authentication
- `gcloud-services.md` - Compute Engine, GKE, Cloud Run, App Engine

### Python Utilities

- `scripts/cloudflare-deploy.py` - Automate Cloudflare Worker deployments
- `scripts/docker-optimize.py` - Analyze and optimize Dockerfiles

## Common Workflows

### Edge + Container Hybrid

```yaml
# Cloudflare Workers (API Gateway)
# -> Docker containers on Cloud Run (Backend Services)
# -> R2 (Object Storage)

# Benefits:
# - Edge caching and routing
# - Containerized business logic
# - Global distribution
```

### Multi-Stage Docker Build

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER node
CMD ["node", "dist/server.js"]
```

### CI/CD Pipeline Pattern

```yaml
# 1. Build: Docker multi-stage build
# 2. Test: Run tests in container
# 3. Push: Push to registry (GCR, Docker Hub)
# 4. Deploy: Deploy to Cloudflare Workers / Cloud Run
# 5. Verify: Health checks and smoke tests
```

## Best Practices

### Security

- Run containers as non-root user
- Use service account impersonation (GCP)
- Store secrets in environment variables, not code
- Scan images for vulnerabilities (Docker Scout)
- Use API tokens with minimal permissions

### Performance

- Multi-stage Docker builds to reduce image size
- Edge caching with Cloudflare KV
- Use R2 for zero egress cost storage
- Implement health checks for containers
- Set appropriate timeouts and resource limits

### Cost Optimization

- Use Cloudflare R2 instead of S3 for large egress
- Implement caching strategies (edge + KV)
- Right-size container resources
- Use sustained use discounts (GCP)
- Monitor usage with cloud provider dashboards

### Development

- Use Docker Compose for local development
- Wrangler dev for local Worker testing
- Named gcloud configurations for multi-environment
- Version control infrastructure code
- Implement automated testing in CI/CD

## Decision Matrix

| Need                             | Choose                       |
| -------------------------------- | ---------------------------- |
| Sub-50ms latency globally        | Cloudflare Workers           |
| Large file storage (zero egress) | Cloudflare R2                |
| SQL database (global reads)      | Cloudflare D1                |
| Containerized workloads          | Docker + Cloud Run/GKE       |
| Enterprise Kubernetes            | GKE                          |
| Managed relational DB            | Cloud SQL                    |
| Static site + API                | Cloudflare Pages             |
| WebSocket/real-time              | Cloudflare Durable Objects   |
| ML/AI pipelines                  | GCP Vertex AI                |
| Browser automation               | Cloudflare Browser Rendering |

## Resources

- **Cloudflare Docs:** https://developers.cloudflare.com
- **Docker Docs:** https://docs.docker.com
- **GCP Docs:** https://cloud.google.com/docs
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/
- **gcloud CLI:** https://cloud.google.com/sdk/gcloud

## Implementation Checklist

### Cloudflare Workers

- [ ] Install Wrangler CLI
- [ ] Create Worker project
- [ ] Configure wrangler.toml (bindings, routes)
- [ ] Test locally with `wrangler dev`
- [ ] Deploy with `wrangler deploy`

### Docker

- [ ] Write Dockerfile with multi-stage builds
- [ ] Create .dockerignore file
- [ ] Test build locally
- [ ] Push to registry
- [ ] Deploy to target platform

### Google Cloud

- [ ] Install gcloud CLI
- [ ] Authenticate with service account
- [ ] Create project and enable APIs
- [ ] Configure IAM permissions
- [ ] Deploy and monitor resources

## Related

- `databases`
- `api-design`

---

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
