import { isDifferent } from '../utils';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Represents a simple change event for a watched property.
 *
 * @template T The type of the property value
 *
 * @interface SimpleChange
 * @description
 * This interface encapsulates information about property changes detected by the Watch decorator.
 * It provides access to both the previous and current values, along with metadata about
 * whether this is the first time the property has been set.
 *
 * **Use Cases:**
 * - Property change tracking in reactive components
 * - State management and change detection
 * - Triggering side effects on property updates
 * - Implementing undo/redo functionality
 * - Performance optimization through change comparison
 *
 * @example
 * **Accessing change information in a watch callback:**
 * ```typescript
 * export class UserComponent {
 *   @Watch('onUserChanged')
 *   public user?: User;
 *
 *   private onUserChanged(
 *     value: User | undefined,
 *     change: SimpleChange<User | undefined>
 *   ) {
 *     if (change.isFirstTimeSet) {
 *       console.log('User set for the first time:', change.currentValue);
 *     } else {
 *       console.log('User changed from:', change.previousValue, 'to:', change.currentValue);
 *     }
 *   }
 * }
 * ```
 */
export interface SimpleChange<T> {
    /** The previous value of the property before the change occurred */
    previousValue: T;
    /** The current value of the property after the change */
    currentValue: T;
    /** Indicates whether this is the first time the property has been set */
    isFirstTimeSet: boolean;
}

/**
 * Callback function type for Watch decorator handlers.
 *
 * @template T The type of the property value being watched
 * @template TTargetObj The type of the target object containing the watched property
 *
 * @param value - The current value of the watched property
 * @param change - Change information including previous/current values and first-time flag
 * @param targetObj - The object instance containing the watched property
 *
 * @description
 * This function type defines the signature for callbacks executed when watched properties change.
 * It provides access to the new value, change metadata, and the target object instance.
 *
 * **Callback Parameters:**
 * - `value`: The new property value after the change
 * - `change`: Detailed change information (previous, current, isFirstTimeSet)
 * - `targetObj`: Reference to the object instance for additional context
 *
 * @example
 * **Inline callback function:**
 * ```typescript
 * @Watch<MyComponent, string>((value, change, targetObj) => {
 *   if (!change.isFirstTimeSet && change.previousValue !== change.currentValue) {
 *     targetObj.saveChanges();
 *   }
 * })
 * public title: string = '';
 * ```
 */
export type WatchCallBackFunction<T, TTargetObj> = (value: T, change: SimpleChange<T>, targetObj: TTargetObj) => void;

/**
 * Property decorator for watching and reacting to property changes with advanced change detection.
 *
 * @template TTargetObj The type of the target object (defaults to object)
 * @template TProp The type of the property being watched (defaults to object)
 *
 * @param callbackFnOrName - Callback function or method name to execute when the property changes
 * @param onlyWhen - Optional condition function to determine if the callback should be executed
 * @param afterCallback - Optional function to execute after the main callback
 *
 * @returns Property decorator function
 *
 * @description
 * The Watch decorator provides a powerful property watching mechanism that automatically
 * detects changes to class properties and executes specified callbacks. It supports both
 * inline callback functions and method references, with optional conditional execution
 * and post-callback hooks.
 *
 * **Key Features:**
 * - **Automatic Change Detection**: Monitors property assignments automatically
 * - **Flexible Callbacks**: Support for both functions and method names
 * - **Conditional Execution**: Optional `onlyWhen` filtering for callback execution
 * - **Change Metadata**: Provides detailed change information including previous/current values
 * - **First-Time Detection**: Identifies initial property assignments
 * - **Post-Callback Hooks**: Optional `afterCallback` for additional processing
 * - **Type Safety**: Full TypeScript generics support for type checking
 *
 * **Implementation Details:**
 * - Creates a private backing property to store the actual value
 * - Replaces the original property with getter/setter pair
 * - Executes callbacks on setter invocation with change detection
 * - Prevents conflicts with existing getter/setter properties
 *
 * **Performance Considerations:**
 * - Each watched property creates a getter/setter pair
 * - Callback execution adds overhead to property assignments
 * - Use `onlyWhen` filtering to reduce unnecessary callback invocations
 * - Consider using `WatchWhenValuesDiff` for reference-based change detection
 *
 * @example
 * **Method reference approach (recommended for component methods):**
 * ```typescript
 * export class ProductListComponent {
 *   @Watch('onPagedResultChanged')
 *   public pagedResult?: PlatformPagedResultDto<Product>;
 *
 *   @Watch('onQueryChanged')
 *   public query: ProductQueryDto = new ProductQueryDto();
 *
 *   private onPagedResultChanged(
 *     value: PlatformPagedResultDto<Product> | undefined,
 *     change: SimpleChange<PlatformPagedResultDto<Product> | undefined>
 *   ) {
 *     if (change.isFirstTimeSet) {
 *       this.initializePagination();
 *     } else {
 *       this.updateUI();
 *     }
 *   }
 *
 *   private onQueryChanged(
 *     value: ProductQueryDto,
 *     change: SimpleChange<ProductQueryDto>
 *   ) {
 *     this.loadProducts();
 *   }
 * }
 * ```
 *
 * @example
 * **Inline callback function with conditional execution:**
 * ```typescript
 * export class UserPreferencesStore {
 *   @Watch<UserPreferencesStore, string>(
 *     (value, change, targetObj) => {
 *       targetObj.saveToLocalStorage(value);
 *       targetObj.notifySubscribers();
 *     },
 *     (obj, change) => !change.isFirstTimeSet, // Only save after initial load
 *     (target) => target.logActivity('preference-changed')
 *   )
 *   public theme: string = 'default';
 * }
 * ```
 *
 * @example
 * **Form validation with Watch decorator:**
 * ```typescript
 * export class RegistrationFormComponent {
 *   @Watch('validateEmail')
 *   public email: string = '';
 *
 *   @Watch('validatePassword')
 *   public password: string = '';
 *
 *   private validateEmail(value: string, change: SimpleChange<string>) {
 *     if (!change.isFirstTimeSet) {
 *       this.emailErrors = this.validateEmailFormat(value);
 *     }
 *   }
 *
 *   private validatePassword(value: string, change: SimpleChange<string>) {
 *     if (!change.isFirstTimeSet) {
 *       this.passwordErrors = this.validatePasswordStrength(value);
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **State management with change tracking:**
 * ```typescript
 * export class DocumentEditorState {
 *   @Watch<DocumentEditorState, Document>(
 *     (value, change, targetObj) => {
 *       if (!change.isFirstTimeSet) {
 *         targetObj.addToHistory(change.previousValue);
 *         targetObj.markAsModified();
 *       }
 *     }
 *   )
 *   public document?: Document;
 *
 *   private history: Document[] = [];
 *   private isModified = false;
 *
 *   private addToHistory(previousDoc?: Document) {
 *     if (previousDoc) {
 *       this.history.push(previousDoc);
 *       if (this.history.length > 50) {
 *         this.history.shift(); // Keep history manageable
 *       }
 *     }
 *   }
 *
 *   private markAsModified() {
 *     this.isModified = true;
 *   }
 * }
 * ```
 *
 * @see {@link WatchWhenValuesDiff} For optimized watching with automatic change detection
 * @see {@link SimpleChange} For change event structure details
 * @see {@link WatchCallBackFunction} For callback function signature
 */
export function Watch<TTargetObj extends object = object, TProp = object>(
    callbackFnOrName: WatchCallBackFunction<TProp, TTargetObj> | keyof TTargetObj,
    onlyWhen?: (obj: TTargetObj, change: SimpleChange<TProp>) => boolean,
    afterCallback?: (target: TTargetObj) => void
) {
    return (target: TTargetObj, key: keyof TTargetObj) => {
        EnsureNotExistingSetterForKey(target, key);

        const privatePropKey = `_${key.toString()}`;
        let isFirstTimeSet: boolean | undefined;

        Object.defineProperty(target, key, {
            set: function (value: TProp) {
                const oldValue = this[privatePropKey];
                this[privatePropKey] = value;

                isFirstTimeSet = isFirstTimeSet == undefined;

                const simpleChange: SimpleChange<TProp> = {
                    previousValue: oldValue,
                    currentValue: this[privatePropKey],
                    isFirstTimeSet: isFirstTimeSet
                };

                if (onlyWhen != null && !onlyWhen(this, simpleChange)) return;

                if (typeof callbackFnOrName === 'string') {
                    const callBackMethod = (target as any)[callbackFnOrName];
                    if (callBackMethod == null) {
                        throw new Error(`Cannot find method ${callbackFnOrName} in class ${target.constructor.name}`);
                    }

                    callBackMethod.call(this, this[privatePropKey], simpleChange, this);
                } else if (typeof callbackFnOrName == 'function') {
                    callbackFnOrName(this[privatePropKey], simpleChange, this);
                }

                if (afterCallback != null) afterCallback(this);
            },
            get: function () {
                return this[privatePropKey];
            },
            enumerable: true,
            configurable: true
        });
    }; /**
     * Internal utility function to validate that a property doesn't already have getter/setter methods.
     *
     * @param target - The target object being decorated
     * @param key - The property key being watched
     *
     * @throws {Error} When the property already has getter/setter methods defined
     *
     * @description
     * This function prevents conflicts between the Watch decorator and existing property
     * accessors. It ensures that only one approach (either getter/setter or @Watch) is
     * used per property to maintain predictable behavior.
     */
    function EnsureNotExistingSetterForKey<TTargetObj extends object>(target: TTargetObj, key: PropertyKey) {
        const existingTargetKeyProp = Object.getOwnPropertyDescriptors(target)[key.toString()];

        if (existingTargetKeyProp?.set != null || existingTargetKeyProp?.get != null)
            throw Error(
                'Could not use watch decorator on a existing get/set property. Should only use one solution, either get/set property or @Watch decorator'
            );
    }
}

/**
 * Enhanced Watch decorator that only triggers callbacks when property values actually differ.
 *
 * @template TTargetObj The type of the target object (defaults to object)
 * @template TProp The type of the property being watched (defaults to object)
 *
 * @param callbackFnOrName - Callback function or method name to execute when the property changes
 * @param onlyWhen - Optional additional condition function for callback execution
 * @param afterCallback - Optional function to execute after the main callback
 *
 * @returns Property decorator function with built-in change detection
 *
 * @description
 * WatchWhenValuesDiff is an optimized version of the Watch decorator that automatically
 * includes value difference checking. It only executes callbacks when the property value
 * actually changes, preventing unnecessary processing for repeated assignments of the same value.
 *
 * **Key Benefits:**
 * - **Performance Optimization**: Prevents callback execution for unchanged values
 * - **Automatic Change Detection**: Built-in `isDifferent` comparison
 * - **Reduced Processing**: Eliminates redundant operations for same-value assignments
 * - **Memory Efficiency**: Reduces unnecessary object creation and method calls
 * - **Developer Convenience**: No need to manually implement change detection logic
 *
 * **Change Detection Algorithm:**
 * - Uses the `isDifferent` utility for deep comparison
 * - Handles primitive types, objects, arrays, and complex nested structures
 * - Supports custom comparison logic when combined with `onlyWhen`
 * - Respects both built-in and custom change detection conditions
 *
 * **When to Use:**
 * - Properties that may be assigned the same value multiple times
 * - Expensive callback operations that should be avoided when possible
 * - Form controls that receive frequent but potentially unchanged updates
 * - State management scenarios with reactive programming patterns
 * - API response handling where duplicate data might be assigned
 *
 * @example
 * **Performance-optimized form field watching:**
 * ```typescript
 * export class SearchComponent {
 *   @WatchWhenValuesDiff('performSearch')
 *   public searchTerm: string = '';
 *
 *   @WatchWhenValuesDiff('updateFilters')
 *   public filters: SearchFilters = new SearchFilters();
 *
 *   private performSearch(term: string, change: SimpleChange<string>) {
 *     // Only called when searchTerm actually changes
 *     // Prevents unnecessary API calls for duplicate assignments
 *     this.apiService.search(term).subscribe(results => {
 *       this.searchResults = results;
 *     });
 *   }
 *
 *   private updateFilters(filters: SearchFilters, change: SimpleChange<SearchFilters>) {
 *     // Only triggered when filter values actually differ
 *     this.applyFilters(filters);
 *   }
 * }
 * ```
 *
 * @example
 * **State management with duplicate prevention:**
 * ```typescript
 * export class UserProfileStore {
 *   @WatchWhenValuesDiff<UserProfileStore, User>(
 *     (user, change, store) => {
 *       store.persistToDatabase(user);
 *       store.notifySubscribers(user);
 *     }
 *   )
 *   public currentUser?: User;
 *
 *   private persistToDatabase(user: User) {
 *     // Only called when user data actually changes
 *     // Prevents unnecessary database writes
 *     this.userService.saveUser(user);
 *   }
 *
 *   private notifySubscribers(user: User) {
 *     // Only notifies when there are real changes
 *     this.userChanged$.next(user);
 *   }
 * }
 * ```
 *
 * @example
 * **Complex object watching with additional conditions:**
 * ```typescript
 * export class DocumentEditor {
 *   @WatchWhenValuesDiff(
 *     'onDocumentChanged',
 *     (obj, change) => obj.isEditMode && !obj.isLoading // Additional conditions
 *   )
 *   public document?: Document;
 *
 *   public isEditMode = false;
 *   public isLoading = false;
 *
 *   private onDocumentChanged(doc: Document | undefined, change: SimpleChange<Document | undefined>) {
 *     // Called only when:
 *     // 1. Document actually changes (built-in isDifferent check)
 *     // 2. Editor is in edit mode (custom onlyWhen condition)
 *     // 3. Not currently loading (custom onlyWhen condition)
 *     this.updateEditor(doc);
 *     this.markAsModified();
 *   }
 * }
 * ```
 *
 * @example
 * **Array and collection watching:**
 * ```typescript
 * export class TaskListComponent {
 *   @WatchWhenValuesDiff('onTasksChanged')
 *   public tasks: Task[] = [];
 *
 *   @WatchWhenValuesDiff('onSelectedTasksChanged')
 *   public selectedTaskIds: Set<string> = new Set();
 *
 *   private onTasksChanged(tasks: Task[], change: SimpleChange<Task[]>) {
 *     // Only called when task array contents actually change
 *     // Handles deep comparison of array elements
 *     this.updateTaskSummary();
 *     this.refreshView();
 *   }
 *
 *   private onSelectedTasksChanged(ids: Set<string>, change: SimpleChange<Set<string>>) {
 *     // Only called when selection set actually changes
 *     this.updateSelectionActions();
 *   }
 * }
 * ```
 *
 * @see {@link Watch} For basic property watching without automatic change detection
 * @see {@link isDifferent} For the underlying change detection algorithm
 * @see {@link SimpleChange} For change event structure details
 */

export function WatchWhenValuesDiff<TTargetObj extends object = object, TProp = object>(
    callbackFnOrName: WatchCallBackFunction<TProp, TTargetObj> | keyof TTargetObj,
    onlyWhen?: (obj: TTargetObj, change: SimpleChange<TProp>) => boolean,
    afterCallback?: (target: TTargetObj) => void
) {
    return Watch(
        callbackFnOrName,
        (obj, change) => {
            return isDifferent(change.previousValue, change.currentValue) && (onlyWhen == undefined || onlyWhen(obj, change));
        },
        afterCallback
    );
}
