# README Template & Guidelines

## README-Specific Discovery

Before writing a README, perform these discovery steps:

### 1. Project Structure Analysis
- Find entry points, map key directories, identify technologies
- Document under `## Project Structure`

### 2. Feature Discovery
- Find user-facing features and map API endpoints
- Document under `## Feature Mapping`

### 3. Setup Requirements Analysis
- Find package files, map dependencies, identify configuration needs
- Document under `## Setup Requirements`

---

## README Structure Template

```markdown
# Project Name

Brief description of the project.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features
- Feature 1
- Feature 2

## Prerequisites
- Node.js >= 18
- .NET 9 SDK

## Installation
```bash
# Clone the repository
git clone [url]

# Install dependencies
npm install
dotnet restore
```

## Configuration
[Configuration details]

## Usage
[Usage examples]

## Development
[Development setup]

## Testing
[Testing instructions]

## Troubleshooting
[Common issues and solutions]
```

---

## README Guidelines

- **User-first approach**: Organize content for new users getting started
- **Verified instructions**: Test all setup and installation commands before documenting
- **Clear project purpose**: Explain what the project does, why it exists, and who it's for
- **Practical examples**: Include working examples users can copy-paste and follow
- **No assumptions**: Don't assume prior knowledge; explain prerequisites explicitly
- **Progressive disclosure**: Start simple (quick start), then provide detailed sections

## README Knowledge Graph Fields

When analyzing files for README relevance, track:

| Field | Description |
|-------|-------------|
| `readmeRelevance` | How component should be represented (1-10) |
| `userImpact` | How component affects end users |
| `setupRequirements` | Prerequisites for this component |
| `configurationNeeds` | Configuration required |
| `featureDescription` | User-facing features provided |
| `troubleshootingAreas` | Common issues users might encounter |
| `exampleUsage` | Usage examples for README |

## Validation Checklist

- [ ] All setup instructions tested and working
- [ ] Prerequisites clearly listed with version requirements
- [ ] Examples are copy-pasteable and functional
- [ ] Troubleshooting covers common first-time issues
- [ ] Table of contents matches actual sections
