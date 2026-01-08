---
name: readme-improvement
description: Use when creating or improving README files, project documentation, getting started guides, or installation instructions.
---

# README Improvement for EasyPlatform

## README Structure Template

```markdown
# Project Name

Brief description of what the project does.

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

## Features

- Feature 1: Description
- Feature 2: Description

## Prerequisites

- Node.js >= 18
- .NET 9 SDK
- MongoDB 6.0+

## Installation

\`\`\`bash

# Clone the repository

git clone [url]

# Install frontend dependencies

cd src/WebV2 && npm install

# Restore backend packages

dotnet restore
\`\`\`

## Configuration

### Environment Variables

| Variable | Description | Default |
| -------- | ----------- | ------- |

### Configuration Files

- `appsettings.json`: Backend configuration
- `environment.ts`: Frontend configuration

## Usage

\`\`\`bash

# Start development server

npm run dev-start:growth
\`\`\`

## Development

### Project Structure

\`\`\`
src/
├── Services/ # Backend microservices
├── WebV2/ # Angular 19 frontend
└── Platform/ # Shared platform code
\`\`\`

## Testing

\`\`\`bash

# Backend tests

dotnet test

# Frontend tests

npm test
\`\`\`

## Troubleshooting

### Common Issues

| Issue | Solution |
| ----- | -------- |
```

## Discovery Workflow

1. **Project Structure**: Map key directories
2. **Entry Points**: Find main files
3. **Technologies**: Identify frameworks used
4. **Setup Requirements**: List dependencies
5. **Configuration**: Document settings needed

## Quality Checklist

- [ ] Clear project purpose explained
- [ ] Prerequisites listed with versions
- [ ] Installation steps tested and verified
- [ ] Configuration options documented
- [ ] Usage examples provided
- [ ] Common troubleshooting covered

## Writing Guidelines

| Principle      | Practice                                 |
| -------------- | ---------------------------------------- |
| User-first     | Organize for new users                   |
| Verified       | Test all instructions before documenting |
| Practical      | Include working examples                 |
| No assumptions | Don't assume prior knowledge             |
| Up-to-date     | Verify versions and paths are current    |

## Section Priorities

| Section         | Priority | Reason                          |
| --------------- | -------- | ------------------------------- |
| Overview        | Critical | First impression, project value |
| Prerequisites   | Critical | Prevent setup failures          |
| Installation    | Critical | Enable usage                    |
| Configuration   | High     | Customize for environment       |
| Usage           | High     | Enable basic functionality      |
| Development     | Medium   | For contributors                |
| Troubleshooting | Medium   | Reduce support burden           |
