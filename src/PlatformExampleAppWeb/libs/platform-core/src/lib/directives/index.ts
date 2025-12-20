/**
 * @fileoverview Platform UI Directives
 *
 * This module provides a comprehensive collection of reusable Angular directives
 * for enhancing user interface interactions, form controls, and accessibility features.
 * All directives are built on the PlatformDirective base class for consistent behavior,
 * automatic cleanup, and seamless integration with the platform architecture.
 *
 * **Key Features:**
 * - **Form Enhancement**: Advanced form control management and validation
 * - **Touch Interactions**: Mobile-first gesture and touch support
 * - **Accessibility**: Built-in ARIA support and keyboard navigation
 * - **Performance**: Optimized event handling and memory management
 * - **Cross-Platform**: Consistent behavior across desktop, mobile, and tablet
 * - **Type Safety**: Full TypeScript support with comprehensive intellisense
 *
 * **Directive Categories:**
 * - **Base Classes**: Foundation classes for custom directive development
 * - **Form Directives**: Form control enhancement and validation helpers
 * - **Interaction Directives**: Touch, mouse, and gesture handling
 * - **Accessibility Directives**: ARIA and keyboard navigation support
 * - **Utility Directives**: Common UI patterns and behaviors
 *
 * **Architecture Benefits:**
 * - Consistent API across all directives through PlatformDirective base
 * - Automatic subscription management and memory leak prevention
 * - Unified error handling and logging capabilities
 * - Seamless integration with platform services and dependency injection
 * - Standardized lifecycle management and cleanup procedures
 *
 * @example
 * **Basic directive usage in components:**
 * ```typescript
 * import {
 *   DisabledControlDirective,
 *   SwipeToScrollDirective,
 *   PlatformDirective
 * } from '@libs/platform-core';
 *
 * @Component({
 *   selector: 'app-user-form',
 *   imports: [
 *     CommonModule,
 *     ReactiveFormsModule,
 *     DisabledControlDirective,
 *     SwipeToScrollDirective
 *   ],
 *   template: `
 *     <!-- Form with conditional disabled states -->
 *     <form [formGroup]="userForm">
 *       <input
 *         formControlName="email"
 *         [platformDisabledControl]="!canEditEmail">
 *
 *       <input
 *         formControlName="phone"
 *         [platformDisabledControl]="isSubmitting">
 *
 *       <button
 *         type="submit"
 *         [platformDisabledControl]="!userForm.valid || isSubmitting">
 *         Save Changes
 *       </button>
 *     </form>
 *
 *     <!-- Horizontal scrolling gallery -->
 *     <div class="image-gallery" platformSwipeToScroll>
 *       <img *ngFor="let image of images" [src]="image.url">
 *     </div>
 *   `
 * })
 * export class UserFormComponent {
 *   userForm = this.fb.group({
 *     email: ['', Validators.required],
 *     phone: ['']
 *   });
 *
 *   canEditEmail = true;
 *   isSubmitting = false;
 *   images = [...];
 * }
 * ```
 *
 * @example
 * **Creating custom directives with PlatformDirective:**
 * ```typescript
 * import { PlatformDirective } from '@libs/platform-core';
 *
 * @Directive({
 *   selector: '[appAutoFocus]',
 *   standalone: true
 * })
 * export class AutoFocusDirective extends PlatformDirective implements OnInit {
 *   @Input() appAutoFocus: boolean = true;
 *   @Input() delay: number = 0;
 *
 *   public override ngOnInit() {
 *     super.ngOnInit();
 *
 *     if (this.appAutoFocus) {
 *       setTimeout(() => {
 *         this.element.focus();
 *       }, this.delay);
 *     }
 *   }
 *
 *   @HostListener('blur')
 *   onBlur() {
 *     // Handle blur events with platform integration
 *     this.element.classList.remove('auto-focused');
 *   }
 * }
 * ```
 *
 * @example
 * **Advanced form directive patterns:**
 * ```typescript
 * // Component template with multiple directive combinations
 * @Component({
 *   template: `
 *     <!-- Multi-step form with conditional controls -->
 *     <div class="form-steps" platformSwipeToScroll>
 *       <div class="step" [class.active]="currentStep === 1">
 *         <input
 *           formControlName="firstName"
 *           [platformDisabledControl]="currentStep !== 1">
 *         <input
 *           formControlName="lastName"
 *           [platformDisabledControl]="currentStep !== 1">
 *       </div>
 *
 *       <div class="step" [class.active]="currentStep === 2">
 *         <input
 *           formControlName="email"
 *           [platformDisabledControl]="currentStep !== 2 || !step1Valid">
 *         <input
 *           formControlName="phone"
 *           [platformDisabledControl]="currentStep !== 2 || !step1Valid">
 *       </div>
 *
 *       <div class="step" [class.active]="currentStep === 3">
 *         <textarea
 *           formControlName="bio"
 *           [platformDisabledControl]="currentStep !== 3 || !step2Valid">
 *         </textarea>
 *       </div>
 *     </div>
 *
 *     <!-- Navigation with scroll-aware buttons -->
 *     <div class="form-navigation">
 *       <button
 *         type="button"
 *         [platformDisabledControl]="currentStep === 1"
 *         (click)="previousStep()">
 *         Previous
 *       </button>
 *
 *       <button
 *         type="button"
 *         [platformDisabledControl]="!canProceedToNext"
 *         (click)="nextStep()">
 *         Next
 *       </button>
 *
 *       <button
 *         type="submit"
 *         [platformDisabledControl]="!allStepsValid"
 *         *ngIf="currentStep === 3">
 *         Complete
 *       </button>
 *     </div>
 *   `
 * })
 * export class MultiStepFormComponent {
 *   currentStep = 1;
 *
 *   get step1Valid(): boolean {
 *     return this.form.get('firstName')?.valid &&
 *            this.form.get('lastName')?.valid;
 *   }
 *
 *   get step2Valid(): boolean {
 *     return this.form.get('email')?.valid &&
 *            this.form.get('phone')?.valid;
 *   }
 *
 *   get canProceedToNext(): boolean {
 *     switch(this.currentStep) {
 *       case 1: return this.step1Valid;
 *       case 2: return this.step2Valid;
 *       default: return false;
 *     }
 *   }
 *
 *   get allStepsValid(): boolean {
 *     return this.step1Valid && this.step2Valid && this.form.valid;
 *   }
 * }
 * ```
 *
 * @example
 * **Mobile-optimized interfaces with touch directives:**
 * ```typescript
 * @Component({
 *   template: `
 *     <!-- Card-based dashboard with swipe navigation -->
 *     <div class="dashboard-container">
 *       <!-- Widget carousel -->
 *       <div class="widget-carousel" platformSwipeToScroll>
 *         <div class="widget-card" *ngFor="let widget of widgets">
 *           <h3>{{ widget.title }}</h3>
 *           <div class="widget-content">{{ widget.content }}</div>
 *
 *           <!-- Widget controls with conditional enabling -->
 *           <div class="widget-actions">
 *             <button
 *               [platformDisabledControl]="!widget.canEdit || isUpdating"
 *               (click)="editWidget(widget)">
 *               Edit
 *             </button>
 *             <button
 *               [platformDisabledControl]="!widget.canDelete || isUpdating"
 *               (click)="deleteWidget(widget)">
 *               Delete
 *             </button>
 *           </div>
 *         </div>
 *       </div>
 *
 *       <!-- Settings panel with form controls -->
 *       <div class="settings-panel">
 *         <form [formGroup]="settingsForm">
 *           <div class="form-group">
 *             <label>Theme</label>
 *             <select
 *               formControlName="theme"
 *               [platformDisabledControl]="!userPermissions.canChangeTheme">
 *               <option value="light">Light</option>
 *               <option value="dark">Dark</option>
 *             </select>
 *           </div>
 *
 *           <div class="form-group">
 *             <label>Notifications</label>
 *             <input
 *               type="checkbox"
 *               formControlName="notifications"
 *               [platformDisabledControl]="!userPermissions.canChangeNotifications">
 *           </div>
 *         </form>
 *       </div>
 *     </div>
 *   `
 * })
 * export class DashboardComponent {
 *   widgets = [...];
 *   isUpdating = false;
 *   userPermissions = {
 *     canChangeTheme: true,
 *     canChangeNotifications: true
 *   };
 *
 *   settingsForm = this.fb.group({
 *     theme: ['light'],
 *     notifications: [true]
 *   });
 * }
 * ```
 *
 * **Performance Optimization:**
 * - All directives use efficient event handling with automatic cleanup
 * - Memory leaks are prevented through proper subscription management
 * - Touch events use passive listeners where appropriate for smooth scrolling
 * - Change detection is optimized to minimize unnecessary updates
 *
 * **Accessibility Features:**
 * - Keyboard navigation support in interactive directives
 * - Screen reader compatibility with proper ARIA attributes
 * - Focus management for disabled controls
 * - High contrast and reduced motion support
 *
 * **Testing Support:**
 * - All directives include comprehensive unit tests
 * - Mock implementations available for testing environments
 * - E2E testing helpers for interaction scenarios
 * - Accessibility testing integration
 *
 * @module directives
 * @version 1.0.0
 * @see {@link PlatformDirective} For base directive functionality
 * @see {@link DisabledControlDirective} For form control management
 * @see {@link SwipeToScrollDirective} For touch and scroll interactions
 */
export * from './abstracts/platform.directive';
export * from './disabled-control.directive';
export * from './swipe-to-scroll.directive';
