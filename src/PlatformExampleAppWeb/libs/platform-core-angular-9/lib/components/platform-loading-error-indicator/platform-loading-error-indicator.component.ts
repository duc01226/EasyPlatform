import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    ViewEncapsulation
} from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { ToastrService } from 'ngx-toastr';
import { PlatformCachingService } from '../../caching';
import { PlatformTranslateService } from '../../translations';
import { PlatformComponent } from '../abstracts/platform.component';

/**
 * Platform Loading and Error Indicator Component
 *
 * A general-purpose loading and error indicator component for platform-core projects.
 * Provides Angular Material-styled error messages and loading states without dependencies
 * on bravo-common library components.
 *
 * Features:
 * - Loading state display using Angular Material progress bars
 * - Error state display with Angular Material danger styling
 * - Custom error template support via ng-content projection
 * - Integration with PlatformComponent error and loading state management
 * - Multi-request state tracking support
 * - Dismiss and reload action support
 * - Angular 8 compatible (uses Observable patterns, not Signals)
 *
 * @example
 * **Basic usage with target component:**
 * ```html
 * <platform-loading-error-indicator
 *   [target]="this"
 *   [enableReloadAction]="true"
 *   [enableDismissAction]="true"
 *   (reloadAction)="onReload()"
 *   (dismiss)="onDismiss()">
 * </platform-loading-error-indicator>
 * ```
 *
 * @example
 * **Usage with custom loading template:**
 * ```html
 * <platform-loading-error-indicator [target]="this">
 *   <div slot="loading" class="custom-loading">
 *     <div class="spinner"></div>
 *     <p>Loading your data...</p>
 *   </div>
 * </platform-loading-error-indicator>
 * ```
 *
 * @example
 * **Usage with custom reloading template:**
 * ```html
 * <platform-loading-error-indicator [target]="this">
 *   <div slot="reloading" class="custom-reloading">
 *     <mat-progress-bar mode="indeterminate"></mat-progress-bar>
 *     <p>Refreshing data...</p>
 *   </div>
 * </platform-loading-error-indicator>
 * ```
 *
 * @example
 * **Usage with custom error template:**
 * ```html
 * <platform-loading-error-indicator [target]="this">
 *   <div slot="error" class="custom-error">
 *     <h4>Custom Error Title</h4>
 *     <p>{{ customErrorMessage }}</p>
 *     <button (click)="handleCustomRetry()">Custom Retry</button>
 *   </div>
 * </platform-loading-error-indicator>
 * ```
 *
 * @example
 * **Usage with all custom templates:**
 * ```html
 * <platform-loading-error-indicator [target]="this">
 *   <div slot="loading" class="custom-loading">
 *     <mat-spinner diameter="30"></mat-spinner>
 *     <span>Loading...</span>
 *   </div>
 *   <div slot="reloading" class="custom-reloading">
 *     <mat-progress-bar mode="indeterminate"></mat-progress-bar>
 *     <span>Refreshing...</span>
 *   </div>
 *   <div slot="error" class="custom-error">
 *     <mat-icon>error_outline</mat-icon>
 *     <span>{{ errorMessage$ | async }}</span>
 *     <button mat-button (click)="onReload()">Try Again</button>
 *   </div>
 * </platform-loading-error-indicator>
 * ```
 *
 * @example
 * **Usage with specific request keys:**
 * ```html
 * <platform-loading-error-indicator
 *   [target]="this"
 *   [loadingRequestKeys]="['load-users', 'load-roles']"
 *   [errorRequestKeys]="['load-users', 'load-roles']">
 * </platform-loading-error-indicator>
 * ```
 */
@Component({
    selector: 'platform-loading-error-indicator',
    templateUrl: './platform-loading-error-indicator.component.html',
    styleUrls: ['./platform-loading-error-indicator.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
    encapsulation: ViewEncapsulation.None
})
export class PlatformLoadingErrorIndicatorComponent extends PlatformComponent implements OnInit, OnDestroy {
    constructor(
        changeDetector: ChangeDetectorRef,
        elementRef: ElementRef<HTMLElement>,
        cacheService: PlatformCachingService,
        toast: ToastrService,
        translateSrv: PlatformTranslateService
    ) {
        super(changeDetector, elementRef, cacheService, toast, translateSrv);
    }

    /**
     * Target component to observe for loading and error states.
     * If not provided, the component will observe its own states.
     */
    @Input() public target?: PlatformComponent;

    /**
     * Specific loading request keys to monitor.
     * If provided, only these request keys will be monitored for loading states.
     * If not provided, the default request key will be monitored.
     */
    @Input() public loadingRequestKeys?: string[];

    /**
     * Specific error request keys to monitor.
     * If provided, only these request keys will be monitored for error states.
     * If not provided, all error request keys will be monitored.
     */
    @Input() public errorRequestKeys?: string[];

    /**
     * Error request keys to exclude from monitoring.
     * These keys will be excluded from error state monitoring.
     */
    @Input() public excludeErrorRequestKeys?: string[];

    /**
     * Delay in milliseconds before showing the loading indicator.
     * Helps prevent flickering for fast operations.
     */
    @Input() public showLoadingDelay: number = 300;

    /**
     * Whether to hide the component when there are no errors.
     */
    @Input() public hideOnNoError: boolean = true;

    /**
     * Whether to hide the component when not loading.
     */
    @Input() public hideOnNoLoading: boolean = true;

    /**
     * Whether to show the reload/retry action button.
     */
    @Input() public enableReloadAction: boolean = true;

    /**
     * Whether to show the dismiss action button.
     */
    @Input() public enableDismissAction: boolean = true;

    /**
     * Whether to use progress bar for loading states.
     */
    @Input() public useProgressBarForLoading: boolean = false;

    /**
     * Whether to use progress bar for reloading states.
     */
    @Input() public useProgressBarForReloading: boolean = true;

    /**
     * Whether to use skeleton loading for initial loading states.
     */
    @Input() public useSkeletonForLoading: boolean = true;

    /**
     * Delay before showing the progress bar in milliseconds.
     */
    @Input() public showProgressBarDelayMs: number = 500;

    /**
     * Minimum time to show loading indicators in milliseconds.
     * Prevents flickering for fast operations.
     */
    @Input() public minLiveTimeOfLoadingIndicatorMs: number = 0;

    /**
     * Position mode for the progress bar.
     */
    @Input() public progressBarPositionMode: 'default' | 'absolute' = 'absolute';

    /**
     * Event emitted when the reload/retry action is triggered.
     */
    @Output() public reloadAction = new EventEmitter<void>();

    /**
     * Event emitted when the dismiss action is triggered.
     */
    @Output() public dismiss = new EventEmitter<void>();

    /**
     * Observable that emits true when loading indicator should be shown.
     */
    public showLoading$: Observable<boolean>;

    /**
     * Observable that emits true when reloading indicator should be shown.
     */
    public showReloading$: Observable<boolean>;

    /**
     * Observable that emits true when progress bar should be shown.
     */
    public showProgressBar$: Observable<boolean>;

    /**
     * Observable that emits true when skeleton loading should be shown.
     */
    public showSkeletonLoading$: Observable<boolean>;

    /**
     * Observable that emits true when error message should be shown.
     */
    public showError$: Observable<boolean>;

    /**
     * Observable that emits the current error message to display.
     */
    public errorMessage$: Observable<string | undefined>;

    /**
     * Observable that emits true when the entire component should be hidden.
     */
    public isHidden$: Observable<boolean>;

    /**
     * Whether the component has custom loading content projected via ng-content.
     */
    public get hasCustomLoadingContent(): boolean {
        return this.elementRef?.nativeElement?.querySelector('[slot="loading"]') != null;
    }

    /**
     * Whether the component has custom reloading content projected via ng-content.
     */
    public get hasCustomReloadingContent(): boolean {
        return this.elementRef?.nativeElement?.querySelector('[slot="reloading"]') != null;
    }

    /**
     * Whether the component has custom error content projected via ng-content.
     */
    public get hasCustomErrorContent(): boolean {
        return this.elementRef?.nativeElement?.querySelector('[slot="error"]') != null;
    }

    /**
     * Whether the custom error content has its own action buttons.
     */
    public get hasCustomActions(): boolean {
        const customErrorElement = this.elementRef?.nativeElement?.querySelector('[slot="error"]');
        return customErrorElement?.querySelector('button, [role="button"], .action-btn, .btn') != null;
    }

    /**
     * Whether the custom loading content has its own action buttons or controls.
     */
    public get hasCustomLoadingActions(): boolean {
        const customLoadingElement = this.elementRef?.nativeElement?.querySelector('[slot="loading"]');
        return customLoadingElement?.querySelector('button, [role="button"], .action-btn, .btn') != null;
    }

    /**
     * Whether the custom reloading content has its own action buttons or controls.
     */
    public get hasCustomReloadingActions(): boolean {
        const customReloadingElement = this.elementRef?.nativeElement?.querySelector('[slot="reloading"]');
        return customReloadingElement?.querySelector('button, [role="button"], .action-btn, .btn') != null;
    }
    /**
     * Initializes the component and sets up reactive state management.
     */
    public ngOnInit(): void {
        super.ngOnInit();

        const targetComponent = this.target || this;

        // Setup loading state observables
        this.showLoading$ = this.createLoadingObservable(targetComponent);
        this.showReloading$ = this.createReloadingObservable(targetComponent);
        // Setup error state observables
        this.errorMessage$ = this.createErrorObservable(targetComponent);
        this.showError$ = this.errorMessage$.pipe(
            map(msg => !!msg && msg.trim() !== ''),
            distinctUntilChanged()
        );

        // Setup progress bar and skeleton loading observables
        this.showProgressBar$ = this.createProgressBarObservable(targetComponent);
        this.showSkeletonLoading$ = this.createSkeletonLoadingObservable(targetComponent);

        // Setup visibility management
        this.isHidden$ = combineLatest([this.showLoading$, this.showReloading$, this.showProgressBar$, this.showSkeletonLoading$, this.showError$]).pipe(
            map(([loading, reloading, progressBar, skeleton, error]) => {
                const hasAnyLoading = loading || reloading || progressBar || skeleton;
                if (this.hideOnNoError && this.hideOnNoLoading) {
                    return !hasAnyLoading && !error;
                }
                if (this.hideOnNoError) return !error;
                if (this.hideOnNoLoading) return !hasAnyLoading;
                return false;
            }),
            distinctUntilChanged(),
            this.untilDestroyed()
        );
    }

    /**
     * Handles the reload/retry action.
     * Emits the reload event and clears error messages if target component supports it.
     */
    public onReload(): void {
        this.reloadAction.emit();

        // Clear error messages if target component has reload functionality
        const targetComponent = this.target || this;
        if (typeof targetComponent.reload === 'function') {
            targetComponent.reload();
        } else {
            // Clear all error messages as fallback
            targetComponent.clearAllErrorMsgs();
        }
    }

    /**
     * Handles the dismiss action.
     * Emits the dismiss event and clears error messages.
     */
    public onDismiss(): void {
        this.dismiss.emit();

        // Clear error messages
        const targetComponent = this.target || this;
        if (this.errorRequestKeys?.length) {
            // Clear specific error request keys
            this.errorRequestKeys.forEach(key => targetComponent.clearErrorMsg(key));
        } else {
            // Clear all error messages
            targetComponent.clearAllErrorMsgs();
        }
    }

    /**
     * Creates an observable that tracks loading state from the target component.
     * @param target The target component to observe
     * @returns Observable that emits loading state
     */
    private createLoadingObservable(target: PlatformComponent): Observable<boolean> {
        if (this.loadingRequestKeys?.length) {
            // Monitor specific request keys
            const loadingObservables = this.loadingRequestKeys.map(key =>
                target.isLoading$(key).pipe(
                    map(loading => loading === true),
                    distinctUntilChanged()
                )
            );

            return combineLatest(loadingObservables).pipe(
                map(loadingStates => loadingStates.some(loading => loading)),
                distinctUntilChanged(),
                this.untilDestroyed()
            );
        }

        // Monitor default loading state
        return target.isStateLoading.pipe(
            map(loading => loading === true),
            distinctUntilChanged(),
            this.untilDestroyed()
        );
    }

    /**
     * Creates an observable that tracks reloading state from the target component.
     * @param target The target component to observe
     * @returns Observable that emits reloading state
     */
    private createReloadingObservable(target: PlatformComponent): Observable<boolean> {
        if (this.loadingRequestKeys?.length) {
            // Monitor specific request keys for reloading
            const reloadingObservables = this.loadingRequestKeys.map(key =>
                target.isReloading$(key).pipe(
                    map(reloading => reloading === true),
                    distinctUntilChanged()
                )
            );

            return combineLatest(reloadingObservables).pipe(
                map(reloadingStates => reloadingStates.some(reloading => reloading)),
                distinctUntilChanged(),
                this.untilDestroyed()
            );
        }

        // Monitor default reloading state
        return target.isStateReloading.pipe(
            map(reloading => reloading === true),
            distinctUntilChanged(),
            this.untilDestroyed()
        );
    }

    /**
     * Creates an observable that determines when to show progress bar.
     * @param target The target component to observe
     * @returns Observable that emits progress bar visibility
     */
    private createProgressBarObservable(target: PlatformComponent): Observable<boolean> {
        return combineLatest([this.showLoading$, this.showReloading$, this.showError$]).pipe(
            map(([loading, reloading, hasError]) => {
                if (hasError) return false;

                // Show progress bar for reloading if enabled
                if (reloading && this.useProgressBarForReloading) return true;

                // Show progress bar for initial loading if enabled
                if (loading && this.useProgressBarForLoading) return true;

                return false;
            }),
            distinctUntilChanged(),
            this.untilDestroyed()
        );
    }

    /**
     * Creates an observable that determines when to show skeleton loading.
     * @param target The target component to observe
     * @returns Observable that emits skeleton loading visibility
     */
    private createSkeletonLoadingObservable(target: PlatformComponent): Observable<boolean> {
        return combineLatest([this.showLoading$, this.showError$]).pipe(
            map(([loading, hasError]) => {
                if (hasError) return false;
                if (this.useProgressBarForLoading) return false; // Don't show skeleton if using progress bar

                return loading && this.useSkeletonForLoading;
            }),
            distinctUntilChanged(),
            this.untilDestroyed()
        );
    }

    /**
     * Creates an observable that tracks error messages from the target component.
     * @param target The target component to observe
     * @returns Observable that emits error messages
     */
    private createErrorObservable(target: PlatformComponent): Observable<string | undefined> {
        return target.getAllErrorMsgs$(this.errorRequestKeys, this.excludeErrorRequestKeys).pipe(distinctUntilChanged(), this.untilDestroyed());
    }

    /**
     * Protected method required by PlatformComponent.
     * Not used in this component as it doesn't manage its own data.
     */
    protected initOrReloadVm = (isReload: boolean) => {
        return undefined;
    };
}
