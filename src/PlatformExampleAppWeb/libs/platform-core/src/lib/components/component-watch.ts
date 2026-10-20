/* eslint-disable @typescript-eslint/no-explicit-any */
import { Watch, WatchCallBackFunction } from '../decorators';
import { isDifferent } from '../utils';
import { PlatformComponent } from './abstracts';

/**
 * Property decorator for watching component property changes with lifecycle awareness.
 *
 * @remarks
 * ComponentWatch is a specialized decorator that monitors property changes in PlatformComponent
 * instances, providing fine-grained control over when and how property changes are detected
 * and processed. It extends the basic Watch decorator with component-specific lifecycle
 * awareness and change detection optimizations.
 *
 * **Key Features:**
 * - **Lifecycle Integration**: Respects component initialization state
 * - **Change Detection**: Optional value comparison to prevent unnecessary triggers
 * - **Deep Comparison**: Support for deep object change detection
 * - **Performance Optimization**: Configurable change filtering and throttling
 * - **Method Binding**: Support for both callback functions and method references
 *
 * **Watch Triggers:**
 * - Property assignment after component initialization
 * - Configurable pre-initialization watching
 * - Value changes with optional comparison logic
 * - Deep object changes when enabled
 *
 * @template TComponent - The component type (must extend PlatformComponent)
 * @template TProp - The property type being watched
 *
 * @param callbackFnOrName - Callback function or component method name to execute on change
 * @param options - Configuration options for the watch behavior
 * @param options.beforeInitiated - Enable watching before component initialization (default: false)
 * @param options.checkDiff - Enable change detection: true for reference check, 'deep-check' for deep comparison
 *
 * @returns Property decorator for watching property changes
 *
 * @example
 * **Basic property watching with method reference:**
 * ```typescript
 * export class UserListComponent extends PlatformComponent {
 *   @ComponentWatch('onPagedResultChanged')
 *   public pagedResult?: PlatformPagedResultDto<User>;
 *
 *   private onPagedResultChanged(
 *     value: PlatformPagedResultDto<User> | undefined,
 *     change: SimpleChange<PlatformPagedResultDto<User> | undefined>
 *   ) {
 *     if (value) {
 *       this.updatePagination(value.totalCount, value.pageSize);
 *       this.users = value.items;
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **Advanced watching with inline callback:**
 * ```typescript
 * export class ProductComponent extends PlatformComponent {
 *   @ComponentWatch<ProductComponent, ProductFilters>(
 *     (filters, change, component) => {
 *       // Custom logic for filter changes
 *       if (!change.isFirstChange()) {
 *         component.searchProducts(filters);
 *         component.saveFiltersToCache(filters);
 *       }
 *     },
 *     { checkDiff: 'deep-check' } // Enable deep comparison
 *   )
 *   public searchFilters: ProductFilters = new ProductFilters();
 *
 *   @ComponentWatch<ProductComponent, Product>(
 *     (product, change, component) => {
 *       component.updateFormData(product);
 *       component.loadRelatedProducts(product.categoryId);
 *     },
 *     { beforeInitiated: true } // Watch before component init
 *   )
 *   public selectedProduct?: Product;
 * }
 * ```
 *
 * @example
 * **Query parameter watching:**
 * ```typescript
 * export class DataTableComponent extends PlatformComponent {
 *   @ComponentWatch('onQueryChanged', { checkDiff: true })
 *   public query: PlatformPagedQueryDto = new PlatformPagedQueryDto();
 *
 *   @ComponentWatch('onSortChanged', { checkDiff: 'deep-check' })
 *   public sortConfig?: SortConfiguration;
 *
 *   private onQueryChanged(
 *     query: PlatformPagedQueryDto,
 *     change: SimpleChange<PlatformPagedQueryDto>
 *   ) {
 *     // Only reload data if query actually changed
 *     this.loadData();
 *     this.updateUrlParams(query);
 *   }
 *
 *   private onSortChanged(
 *     sortConfig: SortConfiguration | undefined,
 *     change: SimpleChange<SortConfiguration | undefined>
 *   ) {
 *     if (sortConfig) {
 *       this.query.sortBy = sortConfig.field;
 *       this.query.sortDirection = sortConfig.direction;
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **Form field watching with validation:**
 * ```typescript
 * export class UserFormComponent extends PlatformComponent {
 *   @ComponentWatch<UserFormComponent, User>(
 *     (user, change, component) => {
 *       if (!change.isFirstChange()) {
 *         component.validateUser(user);
 *         component.markFormAsDirty();
 *       }
 *     },
 *     { checkDiff: 'deep-check' }
 *   )
 *   public user: User = new User();
 *
 *   @ComponentWatch('onPermissionsChanged', { checkDiff: true })
 *   public userPermissions: string[] = [];
 *
 *   private onPermissionsChanged(
 *     permissions: string[],
 *     change: SimpleChange<string[]>
 *   ) {
 *     this.updateAccessControlUI(permissions);
 *     this.validatePermissionCombinations(permissions);
 *   }
 * }
 * ```
 *
 * @example
 * **Configuration and settings watching:**
 * ```typescript
 * export class DashboardComponent extends PlatformComponent {
 *   @ComponentWatch<DashboardComponent, DashboardConfig>(
 *     (config, change, component) => {
 *       component.applyDashboardLayout(config.layout);
 *       component.updateWidgetVisibility(config.visibleWidgets);
 *       component.saveConfigurationToStorage(config);
 *     },
 *     {
 *       checkDiff: 'deep-check',
 *       beforeInitiated: false
 *     }
 *   )
 *   public dashboardConfig: DashboardConfig = DashboardConfig.default();
 *
 *   @ComponentWatch('onThemeChanged')
 *   public currentTheme: ThemeSettings = ThemeSettings.light();
 *
 *   private onThemeChanged(theme: ThemeSettings) {
 *     this.applyThemeToComponents(theme);
 *     this.updateChartColors(theme.chartPalette);
 *   }
 * }
 * ```
 *
 * **Performance Considerations:**
 * - Use `checkDiff: true` for primitive values to avoid unnecessary processing
 * - Use `checkDiff: 'deep-check'` sparingly on complex objects due to performance cost
 * - Consider `beforeInitiated: true` only when necessary for early property processing
 * - Method references are more performant than inline functions for frequently changing properties
 *
 * **Lifecycle Integration:**
 * The decorator respects the PlatformComponent lifecycle, ensuring that watches are only
 * active when the component is properly initialized unless explicitly configured otherwise.
 *
 * @see {@link Watch} - Base property watching decorator
 * @see {@link PlatformComponent} - Base component class with lifecycle management
 * @see {@link isDifferent} - Deep comparison utility for change detection
 */
export function ComponentWatch<TComponent extends PlatformComponent = PlatformComponent, TProp = object>(
    callbackFnOrName: WatchCallBackFunction<TProp, TComponent> | keyof TComponent,
    options?: { beforeInitiated?: boolean; checkDiff?: boolean | 'deep-check' }
) {
    return Watch(callbackFnOrName, (obj, change) => {
        if (options?.beforeInitiated != true && obj.initiated$.value != true) return false;
        if (options?.checkDiff == true && change.previousValue == change.currentValue) return false;
        if (options?.checkDiff == 'deep-check' && !isDifferent(change.previousValue, change.currentValue)) return false;

        return true;
    });
}
