# Angular API Service Patterns Reference

Detailed code examples for PlatformApiService: CRUD, caching, file upload/download, custom headers, search/autocomplete.

---

## File Location

```
src/Frontend/libs/apps-domains/src/lib/
└── {domain}/
    └── services/
        └── {feature}-api.service.ts
```

---

## Pattern 1: Basic CRUD API Service

```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PlatformApiService } from '@libs/platform-core';
import { environment } from '@env/environment';

export interface FeatureDto {
    id: string;
    name: string;
    code: string;
    status: FeatureStatus;
    createdDate: Date;
}

export interface FeatureListQuery {
    searchText?: string;
    statuses?: FeatureStatus[];
    skipCount?: number;
    maxResultCount?: number;
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
}

export interface SaveFeatureCommand {
    id?: string;
    name: string;
    code: string;
    status: FeatureStatus;
}

@Injectable({ providedIn: 'root' })
export class FeatureApiService extends PlatformApiService {
    protected get apiUrl(): string {
        return environment.apiUrl + '/api/Feature';
    }

    // Queries
    getList(query?: FeatureListQuery): Observable<PagedResult<FeatureDto>> {
        return this.get<PagedResult<FeatureDto>>('', query);
    }

    getById(id: string): Observable<FeatureDto> {
        return this.get<FeatureDto>(`/${id}`);
    }

    getByCode(code: string): Observable<FeatureDto> {
        return this.get<FeatureDto>('/by-code', { code });
    }

    // Commands
    save(command: SaveFeatureCommand): Observable<FeatureDto> {
        return this.post<FeatureDto>('', command);
    }

    update(id: string, command: Partial<SaveFeatureCommand>): Observable<FeatureDto> {
        return this.put<FeatureDto>(`/${id}`, command);
    }

    delete(id: string): Observable<void> {
        return this.deleteRequest<void>(`/${id}`);
    }

    // Validation
    checkCodeExists(code: string, excludeId?: string): Observable<boolean> {
        return this.get<boolean>('/check-code-exists', { code, excludeId });
    }
}
```

---

## Pattern 2: API Service with Caching

```typescript
@Injectable({ providedIn: 'root' })
export class LookupApiService extends PlatformApiService {
    protected get apiUrl(): string {
        return environment.apiUrl + '/api/Lookup';
    }

    getCountries(): Observable<CountryDto[]> {
        return this.get<CountryDto[]>('/countries', null, {
            enableCache: true,
            cacheKey: 'countries',
            cacheDurationMs: 60 * 60 * 1000 // 1 hour
        });
    }

    getCurrencies(): Observable<CurrencyDto[]> {
        return this.get<CurrencyDto[]>('/currencies', null, {
            enableCache: true,
            cacheKey: 'currencies'
        });
    }

    getTimezones(): Observable<TimezoneDto[]> {
        return this.get<TimezoneDto[]>('/timezones', null, { enableCache: true });
    }

    invalidateCountriesCache(): void { this.clearCache('countries'); }
    invalidateAllCache(): void { this.clearAllCache(); }
}
```

---

## Pattern 3: File Upload/Download

```typescript
@Injectable({ providedIn: 'root' })
export class DocumentApiService extends PlatformApiService {
    protected get apiUrl(): string {
        return environment.apiUrl + '/api/Document';
    }

    upload(file: File, metadata?: DocumentMetadata): Observable<DocumentDto> {
        const formData = new FormData();
        formData.append('file', file, file.name);
        if (metadata) formData.append('metadata', JSON.stringify(metadata));
        return this.postFormData<DocumentDto>('/upload', formData);
    }

    uploadMultiple(files: File[]): Observable<DocumentDto[]> {
        const formData = new FormData();
        files.forEach((file, index) => formData.append(`files[${index}]`, file, file.name));
        return this.postFormData<DocumentDto[]>('/upload-multiple', formData);
    }

    download(id: string): Observable<Blob> {
        return this.getBlob(`/${id}/download`);
    }

    downloadAndSave(id: string, fileName: string): Observable<void> {
        return this.download(id).pipe(
            tap(blob => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                link.click();
                window.URL.revokeObjectURL(url);
            }),
            map(() => void 0)
        );
    }
}
```

---

## Pattern 4: Custom Headers

```typescript
@Injectable({ providedIn: 'root' })
export class ExternalApiService extends PlatformApiService {
    protected get apiUrl(): string {
        return environment.externalApiUrl;
    }

    protected override getDefaultHeaders(): HttpHeaders {
        return super.getDefaultHeaders()
            .set('X-Api-Key', environment.externalApiKey)
            .set('X-Request-Id', this.generateRequestId());
    }

    getWithCustomHeaders(endpoint: string): Observable<any> {
        return this.get(endpoint, null, { headers: { 'X-Custom-Header': 'custom-value' } });
    }

    private generateRequestId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
```

---

## Pattern 5: Search/Autocomplete

```typescript
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    protected get apiUrl(): string {
        return environment.apiUrl + '/api/Employee';
    }

    search(term: string): Observable<EmployeeDto[]> {
        if (!term || term.length < 2) return of([]);
        return this.get<EmployeeDto[]>('/search', { searchText: term, maxResultCount: 10 });
    }

    autocomplete(prefix: string): Observable<AutocompleteItem[]> {
        return this.get<AutocompleteItem[]>('/autocomplete', { prefix }, {
            enableCache: true,
            cacheKey: `autocomplete-${prefix}`,
            cacheDurationMs: 30 * 1000
        });
    }
}

// Component usage with debounce:
@Component({...})
export class EmployeeSearchComponent {
    private searchSubject = new Subject<string>();
    search$ = this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => this.employeeApi.search(term))
    );
    onSearchInput(term: string): void { this.searchSubject.next(term); }
}
```

---

## Base PlatformApiService Methods

| Method               | Purpose              | Example                                  |
| -------------------- | -------------------- | ---------------------------------------- |
| `get<T>()`           | GET request          | `this.get<User>('/users/1')`             |
| `post<T>()`          | POST request         | `this.post<User>('/users', data)`        |
| `put<T>()`           | PUT request          | `this.put<User>('/users/1', data)`       |
| `patch<T>()`         | PATCH request        | `this.patch<User>('/users/1', partial)`  |
| `deleteRequest<T>()` | DELETE request       | `this.deleteRequest('/users/1')`         |
| `postFormData<T>()`  | POST with FormData   | `this.postFormData('/upload', formData)` |
| `getBlob()`          | GET binary data      | `this.getBlob('/file/download')`         |
| `clearCache()`       | Clear specific cache | `this.clearCache('cacheKey')`            |
| `clearAllCache()`    | Clear all cache      | `this.clearAllCache()`                   |

## Request Options

```typescript
interface RequestOptions {
    enableCache?: boolean;
    cacheKey?: string;
    cacheDurationMs?: number;
    headers?: { [key: string]: string };
    responseType?: 'json' | 'text' | 'blob' | 'arraybuffer';
    reportProgress?: boolean;
    observe?: 'body' | 'events' | 'response';
}
```
