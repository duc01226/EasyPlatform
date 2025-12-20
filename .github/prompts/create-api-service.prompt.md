---
mode: 'agent'
tools: ['editFiles', 'codebase', 'terminal']
description: 'Scaffold Angular API service extending PlatformApiService'
---

# Create Angular API Service

Generate an Angular API service for the following domain:

**Entity Name:** ${input:entityName}
**Domain Name:** ${input:domainName}
**API Base Path:** ${input:apiPath}

## Requirements

1. Extend `PlatformApiService` base class
2. Provide as singleton (`providedIn: 'root'`)
3. Include standard CRUD operations
4. Add caching for read operations where appropriate

---

## File Location

`src/PlatformExampleAppWeb/libs/apps-domains/{domain}-domain/src/lib/api-services/{entity}-api.service.ts`

---

## Template

```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { PlatformApiService } from '@libs/platform-core';
import { environment } from '@env/environment';

import { {Entity}Dto, Save{Entity}Command, Save{Entity}CommandResult } from '../dtos';
import { PagedResult, PagedQuery } from '@libs/platform-core';

@Injectable({ providedIn: 'root' })
export class {Entity}ApiService extends PlatformApiService {
  // ═══════════════════════════════════════════════════════════════════════════
  // API URL Configuration
  // ═══════════════════════════════════════════════════════════════════════════

  protected override get apiUrl(): string {
    return environment.apiUrl + '/api/{Entity}';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // READ Operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get a single {entity} by ID
   */
  getById(id: string): Observable<{Entity}Dto> {
    return this.get<{Entity}Dto>(`/${id}`);
  }

  /**
   * Get paginated list of {entity}s with optional filtering
   */
  getList(query?: PagedQuery): Observable<PagedResult<{Entity}Dto>> {
    return this.get<PagedResult<{Entity}Dto>>('', query);
  }

  /**
   * Get all {entity}s (use sparingly - prefer getList with pagination)
   */
  getAll(): Observable<{Entity}Dto[]> {
    return this.get<{Entity}Dto[]>('/all');
  }

  /**
   * Search {entity}s with caching enabled
   */
  search(searchText: string, options?: { enableCache?: boolean }): Observable<{Entity}Dto[]> {
    return this.get<{Entity}Dto[]>('/search', { searchText }, {
      enableCache: options?.enableCache ?? true
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE Operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create or update a {entity}
   */
  save(command: Save{Entity}Command): Observable<Save{Entity}CommandResult> {
    return this.post<Save{Entity}CommandResult>('', command);
  }

  /**
   * Delete a {entity} by ID
   */
  delete(id: string): Observable<void> {
    return this.deleteRequest<void>(`/${id}`);
  }

  /**
   * Delete multiple {entity}s
   */
  deleteMany(ids: string[]): Observable<void> {
    return this.post<void>('/delete-many', { ids });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Domain-Specific Operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get {entity}s by company ID
   */
  getByCompanyId(companyId: string): Observable<{Entity}Dto[]> {
    return this.get<{Entity}Dto[]>('/by-company', { companyId });
  }

  /**
   * Check if {entity} code is unique
   */
  checkCodeUnique(code: string, excludeId?: string): Observable<boolean> {
    return this.get<boolean>('/check-code-unique', { code, excludeId });
  }
}
```

---

## DTO Definitions

Create corresponding DTOs in `libs/apps-domains/{domain}-domain/src/lib/dtos/`:

```typescript
// {entity}.dto.ts
export interface {Entity}Dto {
  id: string;
  name: string;
  code?: string;
  isActive: boolean;
  createdDate?: Date;
  updatedDate?: Date;
  // Add domain-specific properties
}

// save-{entity}.command.ts
export interface Save{Entity}Command {
  id?: string;
  name: string;
  code?: string;
  isActive?: boolean;
  // Add command properties
}

// save-{entity}.command-result.ts
export interface Save{Entity}CommandResult {
  entity: {Entity}Dto;
}
```

---

## Usage Example

```typescript
// In component or store
import { inject } from '@angular/core';
import { {Entity}ApiService } from '@libs/apps-domains/{domain}-domain';

export class {Entity}Store extends PlatformVmStore<{Entity}State> {
  private {entity}Api = inject({Entity}ApiService);

  public load{Entity}s = this.effectSimple(() =>
    this.{entity}Api.getList().pipe(
      this.observerLoadingErrorState('load{Entity}s'),
      this.tapResponse({entity}s => this.updateState({ {entity}s }))
    ));

  public save{Entity} = this.effectSimple(({entity}: {Entity}Dto) =>
    this.{entity}Api.save({entity}).pipe(
      this.observerLoadingErrorState('save{Entity}'),
      this.tapResponse(result => this.updateState({
        {entity}s: this.currentVm().{entity}s.map(e =>
          e.id === result.entity.id ? result.entity : e
        )
      }))
    ));
}
```

---

## Export Configuration

Update barrel exports in `libs/apps-domains/{domain}-domain/src/index.ts`:

```typescript
// API Services
export * from './lib/api-services/{entity}-api.service';

// DTOs
export * from './lib/dtos/{entity}.dto';
export * from './lib/dtos/save-{entity}.command';
export * from './lib/dtos/save-{entity}.command-result';
```

---

## Anti-Patterns to Avoid

- **Never** use `HttpClient` directly (always extend `PlatformApiService`)
- **Never** hardcode API URLs (use environment configuration)
- **Never** mix query and body parameters inappropriately
- **Never** forget to handle loading/error states in consumers
