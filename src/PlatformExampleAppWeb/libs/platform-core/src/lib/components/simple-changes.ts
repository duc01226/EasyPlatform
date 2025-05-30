/**
 * Type definition for tracking changes across all properties of a component.
 *
 * @remarks
 * This type provides type-safe change tracking for component properties,
 * similar to Angular's SimpleChanges but with enhanced type safety and
 * platform-specific functionality.
 *
 * **Key Features:**
 * - **Type Safety**: Maintains property types from the original component
 * - **Optional Changes**: Only changed properties are included
 * - **Angular Compatibility**: Compatible with Angular's change detection
 * - **Platform Integration**: Works seamlessly with PlatformComponent ecosystem
 *
 * @template TComponent - The component type whose changes are being tracked
 *
 * @example
 * **Component change tracking:**
 * ```typescript
 * export class UserComponent extends PlatformComponent {
 *   @Input() user?: User;
 *   @Input() permissions: string[] = [];
 *
 *   ngOnChanges(changes: ComponentSimpleChanges<UserComponent>) {
 *     if (changes.user) {
 *       console.log('User changed:', changes.user.previousValue, '->', changes.user.currentValue);
 *       console.log('Is first change:', changes.user.isFirstChange());
 *     }
 *
 *     if (changes.permissions) {
 *       this.updateUserInterface();
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **Conditional processing based on changes:**
 * ```typescript
 * ngOnChanges(changes: ComponentSimpleChanges<ProductComponent>) {
 *   // Process only specific property changes
 *   const significantChanges = ['product', 'category', 'pricing'];
 *   const hasSignificantChange = significantChanges.some(prop => changes[prop]);
 *
 *   if (hasSignificantChange) {
 *     this.recalculateData();
 *   }
 *
 *   // Handle first-time initialization
 *   if (changes.product?.isFirstChange()) {
 *     this.initializeProductView();
 *   }
 * }
 * ```
 */
export type ComponentSimpleChanges<TComponent> = {
    [P in keyof TComponent]?: ComponentSimpleChange<TComponent[P]>;
};

/**
 * Represents a change in a single component property value.
 *
 * @remarks
 * This interface tracks the transition of a property value from its previous
 * state to its current state, providing metadata about the change context
 * such as whether it's the first change (initialization).
 *
 * **Change Context:**
 * - **Previous Value**: The value before the change occurred
 * - **Current Value**: The new value after the change
 * - **First Change**: Whether this is the initial value assignment
 * - **Change Detection**: Helper method for first-change detection
 *
 * @template TValue - The type of the property value being tracked
 *
 * @example
 * **Processing individual property changes:**
 * ```typescript
 * processUserChange(userChange: ComponentSimpleChange<User>) {
 *   if (userChange.isFirstChange()) {
 *     // Initial user assignment
 *     this.initializeUserProfile(userChange.currentValue);
 *   } else {
 *     // User update
 *     this.updateUserProfile(
 *       userChange.previousValue,
 *       userChange.currentValue
 *     );
 *   }
 * }
 * ```
 *
 * @example
 * **Validation and comparison:**
 * ```typescript
 * validatePermissionChange(permissionChange: ComponentSimpleChange<string[]>) {
 *   const { previousValue, currentValue } = permissionChange;
 *
 *   // Check if permissions were added or removed
 *   const added = currentValue.filter(p => !previousValue.includes(p));
 *   const removed = previousValue.filter(p => !currentValue.includes(p));
 *
 *   if (added.length > 0) {
 *     this.handlePermissionsAdded(added);
 *   }
 *
 *   if (removed.length > 0) {
 *     this.handlePermissionsRemoved(removed);
 *   }
 * }
 * ```
 *
 * @example
 * **Configuration updates:**
 * ```typescript
 * handleConfigChange(configChange: ComponentSimpleChange<AppConfig>) {
 *   if (!configChange.isFirstChange()) {
 *     // Compare configuration objects
 *     const oldConfig = configChange.previousValue;
 *     const newConfig = configChange.currentValue;
 *
 *     // Restart services if critical settings changed
 *     if (oldConfig.apiUrl !== newConfig.apiUrl) {
 *       this.restartApiConnections();
 *     }
 *
 *     // Update UI theme if theme changed
 *     if (oldConfig.theme !== newConfig.theme) {
 *       this.applyTheme(newConfig.theme);
 *     }
 *   }
 * }
 * ```
 */
export type ComponentSimpleChange<TValue> = {
    /** The value before the change occurred */
    previousValue: TValue;
    /** The current value after the change */
    currentValue: TValue;
    /** Whether this is the first change (initial assignment) */
    firstChange: boolean;
    /** Helper method to check if this is the first change */
    isFirstChange(): boolean;
};
