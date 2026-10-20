import { Injector, ViewContainerRef, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PlatformComponent } from '../../components';

/**
 * Abstract base class for all platform directives providing common directive functionality.
 *
 * @abstract
 * @extends PlatformComponent
 *
 * @description
 * PlatformDirective serves as the foundation for all custom directives in the platform
 * architecture. It extends PlatformComponent to inherit reactive state management,
 * lifecycle integration, and subscription handling while adding directive-specific
 * functionality for DOM manipulation and dependency injection.
 *
 * **Key Features:**
 * - **Component Base**: Inherits all PlatformComponent functionality (lifecycle, subscriptions, state)
 * - **Dependency Injection**: Direct access to Angular's dependency injection system
 * - **DOM Access**: Convenient access to host element and view container
 * - **View Manipulation**: Built-in ViewContainerRef for dynamic content creation
 * - **Lifecycle Integration**: Automatic cleanup and subscription management
 * - **Type Safety**: Strongly typed dependency injection and element access
 *
 * **Architecture Benefits:**
 * - Consistent directive development patterns across the platform
 * - Reduced boilerplate code for common directive operations
 * - Automatic memory leak prevention through inherited cleanup
 * - Unified error handling and logging capabilities
 * - Seamless integration with platform services and stores
 *
 * **Common Use Cases:**
 * - **Form Control Directives**: Custom form validation and control behavior
 * - **UI Enhancement Directives**: Adding interactive behaviors to elements
 * - **Data Binding Directives**: Custom property and event binding logic
 * - **Accessibility Directives**: ARIA and keyboard navigation enhancements
 * - **Animation Directives**: Custom animations and transitions
 * - **Behavior Directives**: Mouse, touch, and keyboard interaction handling
 *
 * @example
 * **Creating a custom tooltip directive:**
 * ```typescript
 * @Directive({
 *   selector: '[appTooltip]',
 *   standalone: true
 * })
 * export class TooltipDirective extends PlatformDirective implements OnInit {
 *   @Input('appTooltip') tooltipText: string = '';
 *   @Input() placement: 'top' | 'bottom' | 'left' | 'right' = 'top';
 *
 *   private overlayRef?: OverlayRef;
 *
 *   public override ngOnInit() {
 *     super.ngOnInit();
 *     this.setupTooltipBehavior();
 *   }
 *
 *   @HostListener('mouseenter')
 *   showTooltip() {
 *     if (this.tooltipText) {
 *       this.createTooltip();
 *     }
 *   }
 *
 *   @HostListener('mouseleave')
 *   hideTooltip() {
 *     this.destroyTooltip();
 *   }
 *
 *   private createTooltip() {
 *     // Use injector for overlay services
 *     const overlay = this.injector.get(Overlay);
 *     // Use viewContainerRef for dynamic content
 *     const portal = new ComponentPortal(TooltipComponent, this.viewContainerRef);
 *     this.overlayRef = overlay.create({
 *       positionStrategy: this.getPositionStrategy()
 *     });
 *     const tooltipRef = this.overlayRef.attach(portal);
 *     tooltipRef.instance.text = this.tooltipText;
 *   }
 *
 *   private getPositionStrategy() {
 *     return this.injector.get(Overlay)
 *       .position()
 *       .flexibleConnectedTo(this.element)
 *       .withPositions([{
 *         originX: 'center',
 *         originY: this.placement === 'top' ? 'top' : 'bottom',
 *         overlayX: 'center',
 *         overlayY: this.placement === 'top' ? 'bottom' : 'top'
 *       }]);
 *   }
 * }
 * ```
 *
 * @example
 * **Creating a form validation directive:**
 * ```typescript
 * @Directive({
 *   selector: '[appCustomValidator]',
 *   standalone: true
 * })
 * export class CustomValidatorDirective extends PlatformDirective
 *   implements OnInit, Validator {
 *
 *   @Input() validationRule: string = '';
 *
 *   private validationService: ValidationService;
 *
 *   public override ngOnInit() {
 *     super.ngOnInit();
 *     // Use injector to get services
 *     this.validationService = this.injector.get(ValidationService);
 *   }
 *
 *   validate(control: AbstractControl): ValidationErrors | null {
 *     if (!this.validationRule || !control.value) {
 *       return null;
 *     }
 *
 *     const isValid = this.validationService.validate(
 *       control.value,
 *       this.validationRule
 *     );
 *
 *     return isValid ? null : { customValidation: true };
 *   }
 *
 *   @HostListener('blur')
 *   onBlur() {
 *     // Access native element for styling
 *     this.element.classList.toggle('validation-error', !this.isValid);
 *   }
 * }
 * ```
 *
 * @example
 * **Creating a behavior directive with subscriptions:**
 * ```typescript
 * @Directive({
 *   selector: '[appAutoSave]',
 *   standalone: true
 * })
 * export class AutoSaveDirective extends PlatformDirective implements OnInit {
 *   @Input() autoSaveInterval: number = 5000;
 *
 *   private formControl: NgControl;
 *   private autoSaveService: AutoSaveService;
 *
 *   public override ngOnInit() {
 *     super.ngOnInit();
 *
 *     // Use injector for optional dependencies
 *     this.formControl = this.injector.get(NgControl, null);
 *     this.autoSaveService = this.injector.get(AutoSaveService);
 *
 *     if (this.formControl) {
 *       this.setupAutoSave();
 *     }
 *   }
 *
 *   private setupAutoSave() {
 *     // Use inherited subscription management
 *     this.formControl.valueChanges?.pipe(
 *       debounceTime(this.autoSaveInterval),
 *       distinctUntilChanged(),
 *       this.untilDestroy() // Automatic cleanup from PlatformComponent
 *     ).subscribe(value => {
 *       this.autoSaveService.save(value).subscribe();
 *     });
 *   }
 * }
 * ```
 *
 * **Properties Overview:**
 * - `viewContainerRef`: Access to Angular's ViewContainerRef for dynamic content
 * - `injector`: Direct access to Angular's dependency injection system
 * - `element`: Convenient getter for the native HTML element
 * - Plus all inherited PlatformComponent properties (cdr, elementRef, etc.)
 *
 * @see {@link PlatformComponent} For inherited base functionality
 * @see {@link DisabledControlDirective} For form control directive example
 * @see {@link SwipeToScrollDirective} For interaction directive example
 */
export abstract class PlatformDirective extends PlatformComponent {
    constructor() {
        super();
    }

    /** ViewContainerRef for creating dynamic content and component instances */
    protected viewContainerRef: ViewContainerRef = inject(ViewContainerRef);

    /** Injector for accessing Angular's dependency injection system */
    protected injector: Injector = inject(Injector);

    /**
     * Convenience getter for accessing the native HTML element.
     *
     * @returns The native HTML element that this directive is applied to
     *
     * @example
     * ```typescript
     * // Add CSS class to the host element
     * this.element.classList.add('directive-applied');
     *
     * // Set attribute on the element
     * this.element.setAttribute('data-processed', 'true');
     *
     * // Access element properties
     * const elementWidth = this.element.offsetWidth;
     * ```
     */
    public get element(): HTMLElement {
        return this.elementRef.nativeElement;
    }

    protected override initOrReloadVm: (isReload: boolean) => Observable<unknown | undefined> | undefined = (isReload: boolean) => {
        return undefined;
    };

    protected override get autoRunInitOrReloadVmInNgOnInit(): boolean {
        return false;
    }
}
