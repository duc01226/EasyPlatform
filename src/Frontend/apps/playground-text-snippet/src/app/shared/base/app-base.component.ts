import { Directive } from '@angular/core';
import { PlatformComponent } from '@libs/platform-core';

/**
 * Base component class for all playground-text-snippet components.
 *
 * Extend this class instead of PlatformComponent directly to enable:
 * - App-wide custom toast configuration
 * - Centralized analytics tracking
 * - Custom error handling integration
 * - Future app-specific enhancements without changing feature components
 *
 * @example
 * ```typescript
 * export class MySimpleComponent extends AppBaseComponent {
 *   // Component logic
 * }
 * ```
 */
@Directive()
export abstract class AppBaseComponent extends PlatformComponent {
    // App-wide customizations can be added here:
    // - Override toast methods for custom styling
    // - Add analytics tracking
    // - Custom error boundary integration
}
