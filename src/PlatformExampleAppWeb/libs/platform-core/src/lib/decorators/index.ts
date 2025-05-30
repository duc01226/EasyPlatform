/**
 * @fileoverview Property Watching Decorators
 *
 * This module provides powerful property watching decorators for automatic change detection
 * and reactive programming patterns in TypeScript classes. The decorators enable developers
 * to monitor property changes and execute custom logic when values are modified.
 *
 * **Key Features:**
 * - **Automatic Change Detection**: Monitor property assignments with zero boilerplate
 * - **Type-Safe Callbacks**: Full TypeScript generics support with intellisense
 * - **Performance Optimization**: Built-in change filtering and conditional execution
 * - **Flexible Execution**: Support for both method references and inline functions
 * - **Change Metadata**: Access to previous values, current values, and first-time flags
 * - **Lifecycle Integration**: Seamless integration with component and service lifecycles
 *
 * **Core Decorators:**
 * - `@Watch`: Basic property watching with customizable callbacks
 * - `@WatchWhenValuesDiff`: Optimized watching that only triggers on actual value changes
 *
 * **Common Use Cases:**
 * - **Component State Management**: Reactive updates to UI when properties change
 * - **Form Validation**: Automatic validation when form fields are modified
 * - **Data Persistence**: Save changes to storage when model properties update
 * - **Cache Invalidation**: Clear caches when dependent data changes
 * - **Event Propagation**: Notify subscribers when observable properties change
 * - **Undo/Redo Systems**: Track property changes for history management
 * - **Performance Monitoring**: Log or measure property access patterns
 *
 * @example
 * **Basic component property watching:**
 * ```typescript
 * import { Watch, WatchWhenValuesDiff } from '@libs/platform-core';
 *
 * export class ProductListComponent {
 *   // Watch with method reference - triggers on every assignment
 *   @Watch('onSearchTermChanged')
 *   public searchTerm: string = '';
 *
 *   // Watch with value difference checking - only triggers on actual changes
 *   @WatchWhenValuesDiff('onFiltersChanged')
 *   public filters: ProductFilters = new ProductFilters();
 *
 *   private onSearchTermChanged(value: string, change: SimpleChange<string>) {
 *     if (!change.isFirstTimeSet) {
 *       this.performSearch(value);
 *     }
 *   }
 *
 *   private onFiltersChanged(filters: ProductFilters, change: SimpleChange<ProductFilters>) {
 *     this.applyFilters(filters);
 *     this.saveUserPreferences(filters);
 *   }
 * }
 * ```
 *
 * @example
 * **Advanced watching with inline callbacks:**
 * ```typescript
 * export class DocumentEditorService {
 *   @Watch<DocumentEditorService, Document>(
 *     (doc, change, service) => {
 *       if (!change.isFirstTimeSet) {
 *         service.addToHistory(change.previousValue);
 *         service.markAsModified();
 *         service.autoSave();
 *       }
 *     },
 *     (service, change) => service.isAutoSaveEnabled, // Only when auto-save is on
 *     (service) => service.updateLastModifiedTime() // After callback
 *   )
 *   public document?: Document;
 *
 *   public isAutoSaveEnabled = true;
 *   private documentHistory: Document[] = [];
 * }
 * ```
 *
 * @example
 * **Form validation with property watching:**
 * ```typescript
 * export class RegistrationFormComponent {
 *   @WatchWhenValuesDiff('validateEmail')
 *   public email: string = '';
 *
 *   @WatchWhenValuesDiff('validatePassword')
 *   public password: string = '';
 *
 *   @WatchWhenValuesDiff('validatePasswordConfirm')
 *   public passwordConfirm: string = '';
 *
 *   public emailErrors: string[] = [];
 *   public passwordErrors: string[] = [];
 *
 *   private validateEmail(email: string) {
 *     this.emailErrors = this.validationService.validateEmail(email);
 *   }
 *
 *   private validatePassword(password: string) {
 *     this.passwordErrors = this.validationService.validatePassword(password);
 *     this.validatePasswordConfirm(this.passwordConfirm); // Revalidate confirm
 *   }
 *
 *   private validatePasswordConfirm(confirm: string) {
 *     if (this.password !== confirm) {
 *       this.passwordErrors = [...this.passwordErrors, 'Passwords do not match'];
 *     }
 *   }
 * }
 * ```
 *
 * @module decorators
 * @version 1.0.0
 * @see {@link Watch} For basic property watching functionality
 * @see {@link WatchWhenValuesDiff} For optimized watching with change detection
 * @see {@link SimpleChange} For change event data structure
 */
export * from './watch';
