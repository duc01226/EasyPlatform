# Getting Started with BravoSUITE

> Complete setup guide for development environment

## Prerequisites & Installation

### Required Software

#### 1. Docker Installation

**Install Docker Desktop:**
- Download: https://docs.docker.com/engine/install/
- **Minimum RAM**: 9GB for infrastructure services only
- **Recommended RAM**: 10GB for full system in Docker

**Configure Docker Memory (WSL2 on Windows):**

Copy WSL config to user folder:
```powershell
Copy-Item .\dev-infrastructure\.wslconfig $env:USERPROFILE\
```

Edit `.wslconfig` to adjust memory:
```ini
[wsl2]
memory=6GB
processors=4
```

Apply changes:
```powershell
wsl --shutdown
# Then restart Docker Desktop
```

#### 2. OpenSSL Installation

**Windows:** Download from https://slproweb.com/products/Win32OpenSSL.html
- Select "Win64 OpenSSL" for 64-bit
- Required for certificate generation and HTTPS

#### 3. Development Tools

**Backend (.NET 9):**
- Download .NET 9 SDK: https://dotnet.microsoft.com/en-us/download/dotnet/9.0
- Verify: `dotnet --version` (should show 9.0+)
- Install Visual Studio 2022 with **ASP.NET and web development** workload
- **Required:** CSharpier extension - enable "Reformat with CSharpier on Save"
- **Recommended:** ReSharper for advanced code analysis

**Frontend (Angular 19):**
- Download Node.js 20.19.2+: https://nodejs.org/en/blog/release/v20.19.2
- Verify: `node --version` and `npm --version` (10.0+)
- **Optional:** NVM for Windows for multiple Node versions
- Install VS Code and accept recommended extensions when opening client projects

#### 4. NPM Registry Configuration

Create `.npmrc` in `C:\Users\[YourUserName]\`:

```ini
; begin auth token
//vsonline.orientsoftware.net/tfs/DefaultCollection/_packaging/Common/npm/registry/:username=DefaultCollection
//vsonline.orientsoftware.net/tfs/DefaultCollection/_packaging/Common/npm/registry/:_password=[BASE64_ENCODED_PAT]
//vsonline.orientsoftware.net/tfs/DefaultCollection/_packaging/Common/npm/registry/:email=npm requires email to be set but doesn't use the value
//vsonline.orientsoftware.net/tfs/DefaultCollection/_packaging/Common/npm/:username=DefaultCollection
//vsonline.orientsoftware.net/tfs/DefaultCollection/_packaging/Common/npm/:_password=[BASE64_ENCODED_PAT]
//vsonline.orientsoftware.net/tfs/DefaultCollection/_packaging/Common/npm/:email=npm requires email to be set but doesn't use the value
; end auth token
```

**Generate PAT:**
1. Go to: https://vsonline.orientsoftware.net/tfs/DefaultCollection/_usersSettings/tokens
2. Create token with **Packaging (Read)** permission
3. Encode to Base64:
```powershell
node -e "require('readline').createInterface({input:process.stdin,output:process.stdout,historySize:0}).question('PAT> ',p => { b64=Buffer.from(p.trim()).toString('base64');console.log(b64);process.exit(); })"
```
4. Replace `[BASE64_ENCODED_PAT]` in `.npmrc`

### Verify Installation

```bash
docker --version          # Docker 20.10+
dotnet --version          # .NET 9.0+
node --version            # Node.js 20.19.2+
npm --version             # npm 10.0+

# Test Docker memory
docker info | Select-String -Pattern "Total Memory"

# Test npm registry
npm ping --registry https://vsonline.orientsoftware.net/tfs/DefaultCollection/_packaging/Common/npm/registry/
```

---

## Quick Setup (5 Minutes)

### Step 1: Clone & Infrastructure

```bash
git clone <repository-url>
cd BravoSUITE

# Start infrastructure (SQL Server, MongoDB, RabbitMQ, Redis)
.\Bravo-DevStarts\"COMMON Infrastructure Dev-start.cmd"

# Start authentication service
.\Bravo-DevStarts\"COMMON Accounts Api Dev-start.cmd"
```

### Step 2: Choose Development Path

#### Frontend Development

**Modern Angular 19 (WebV2):**
```bash
cd src\WebV2
code .
npm install --force
npm run dev-start:growth    # Port 4206
# OR
npm run dev-start:employee  # Port 4205
```

**Legacy Angular 12:**
```bash
cd src\Web\bravoTALENTSClient
code .
npm install --force
npm start                   # Port 4200
```

#### Backend Development (.NET 9)

```bash
# Open in Visual Studio
start BravoSUITE.sln

# Start microservices
.\Bravo-DevStarts\"GROWTH Api Dev-start.cmd"
.\Bravo-DevStarts\"TALENTS Api Dev-start.cmd"
.\Bravo-DevStarts\"SURVEYS Api Dev-start.cmd"
```

#### Full Stack (Docker)

```bash
# Requires 6GB RAM
.\Bravo-DevStarts\StartDocker\"START-ALL.cmd"
```

### Step 3: Verify Setup

- **Infrastructure**: http://localhost:15672 (RabbitMQ: guest/guest)
- **API**: https://localhost:7001/swagger (Accounts API)
- **Frontend**: http://localhost:4200 (Angular App)

### Step 4: Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `surveytool123456@gmail.com` | `Bravo@123` |
| HR Manager | `test.hr-manager@mailinator.com` | `Bravo@123` |
| Employee | `test.default@mailinator.com` | `Bravo@123` |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Docker memory limit not applied | Run `wsl --shutdown` and restart Docker |
| npm authentication fails | Regenerate PAT and update `.npmrc` |
| CSharpier not formatting | Enable in Tools → Options → CSharpier |
| Node version conflicts | Use NVM: `nvm use 20.19.2` |
| Angular build fails | Run `npm install --force` |
| .NET build fails | Run `dotnet restore` |

---

## Development Commands

```bash
# Backend
dotnet build BravoSUITE.sln
dotnet run --project [Service].Service

# Frontend (WebV2)
npm run dev-start:growth    # Port 4206
npm run dev-start:employee  # Port 4205
nx build growth-for-company
nx test bravo-domain
```

## Database Connections

| Database | Connection | Credentials |
|----------|------------|-------------|
| SQL Server | localhost,14330 | sa / 123456Abc |
| MongoDB | localhost:27017 | root / rootPassXXX |
| PostgreSQL | localhost:54320 | postgres / postgres |
| Redis | localhost:6379 | - |
| RabbitMQ | localhost:15672 | guest / guest |

---

**Next:** [Architecture Overview](../README.md#architecture-overview) | [Learning Paths](../README.md#learning-paths)
