# platform-core

Core Angular library providing the foundation for EasyPlatform frontend applications.

## Library Structure

```
src/lib/
├── api-services/       # Base API service classes
├── app-ui-state/       # Application UI state management
├── caching/            # Client-side caching utilities
├── common-types/       # Shared TypeScript interfaces
├── common-values/      # Constants and enums
├── components/         # Base component classes
├── decorators/         # TypeScript decorators (@Watch, etc.)
├── directives/         # Angular directives
├── domain/             # Domain model utilities
├── dtos/               # Data transfer objects
├── events/             # Event handling utilities
├── form-validators/    # Custom form validators
├── helpers/            # Helper functions
├── http-services/      # HTTP client utilities
├── pipes/              # Angular pipes
├── rxjs/               # Custom RxJS operators
├── translations/       # i18n utilities
├── ui-services/        # UI-related services
├── utils/              # General utilities
├── validation/         # Validation utilities
└── view-models/        # ViewModel base classes
```

## Key Exports

### Component Base Classes

```typescript
import {
  PlatformComponent,        // Base: lifecycle, signals, subscriptions
  PlatformVmComponent,      // + ViewModel management
  PlatformFormComponent,    // + Reactive forms integration
  PlatformVmStoreComponent  // + ComponentStore state management
} from '@libs/platform-core';
```

### State Management

```typescript
import { PlatformVmStore } from '@libs/platform-core';

@Injectable()
export class MyStore extends PlatformVmStore<MyViewModel> {
  public loadData = this.effectSimple(() =>
    this.api.getData().pipe(
      this.observerLoadingErrorState('loadData'),
      this.tapResponse(data => this.updateState({ data }))
    ));
}
```

### API Services

```typescript
import { PlatformApiService } from '@libs/platform-core';

@Injectable({ providedIn: 'root' })
export class MyApiService extends PlatformApiService {
  protected get apiUrl() { return environment.apiUrl + '/api/my'; }

  getData(): Observable<Data[]> {
    return this.get<Data[]>('');
  }
}
```

### Form Validators

```typescript
import {
  ifAsyncValidator,
  noWhitespaceValidator,
  startEndValidator
} from '@libs/platform-core';
```

### Decorators

```typescript
import { Watch, WatchWhenValuesDiff } from '@libs/platform-core';

@Watch('onDataChanged')
public data: MyData;
```

### Utilities

```typescript
import {
  date_format, date_addDays,
  list_groupBy, list_distinctBy,
  string_isEmpty, string_truncate,
  immutableUpdate, deepClone
} from '@libs/platform-core';
```

## Module Configuration

```typescript
import { PlatformCoreModule } from '@libs/platform-core';

@NgModule({
  imports: [PlatformCoreModule]
})
export class AppModule {}
```

## Related Documentation

- [CLAUDE.md](../../../../CLAUDE.md) - Complete frontend patterns reference
- [README.md](../../../../README.md) - Project overview
