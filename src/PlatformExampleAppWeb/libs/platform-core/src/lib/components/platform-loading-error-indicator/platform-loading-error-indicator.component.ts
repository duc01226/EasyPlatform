/**
 * Platform Loading and Error Indicator Component (WebV2)
 *
 * A standalone Angular 18 component for displaying loading and error states with signal-based reactive programming.
 * Provides Angular Material-styled error messages and loading states with modern signal architecture.
 *
 * Features:
 * - Loading state display using progress bars and skeleton loading
 * - Error state display with Material Design styling
 * - Custom template support via ng-content projection
 * - Integration with PlatformComponent signal-based state management
 * - Multi-request state tracking support
 * - Dismiss and reload action support
 * - Angular 18 standalone component with signals
 * - WebV2-style loading and reloading differentiation
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
 * **Usage with custom templates:**
 * ```html
 * <platform-loading-error-indicator [target]="this">
 *   <div slot="loading" class="custom-loading">
 *     <div class="spinner"></div>
 *     <p>Loading your data...</p>
 *   </div>
 *   <div slot="reloading" class="custom-reloading">
 *     <p>Refreshing data...</p>
 *   </div>
 *   <div slot="error" class="custom-error">
 *     <h4>Something went wrong</h4>
 *     <button (click)="handleRetry()">Try Again</button>
 *   </div>
 * </platform-loading-error-indicator>
 * ```
 */

import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    EventEmitter,
    HostBinding,
    Input,
    OnDestroy,
    Output,
    signal,
    Signal,
    ViewEncapsulation,
    WritableSignal
} from '@angular/core';
import { Observable } from 'rxjs';
import { PlatformComponent } from '../abstracts/platform.component';

@Component({
    selector: 'platform-loading-error-indicator',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './platform-loading-error-indicator.component.html',
    styleUrls: ['./platform-loading-error-indicator.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class PlatformLoadingErrorIndicatorComponent extends PlatformComponent implements OnDestroy {
    /**
     * Target component to observe for loading and error states.
     * If not provided, manual state management is expected.
     */
    @Input() public target?: PlatformComponent;

    /**
     * Specific loading request keys to monitor.
     */
    @Input() public loadingRequestKeys?: string[];

    /**
     * Specific error request keys to monitor.
     */
    @Input() public errorRequestKeys?: string[];

    /**
     * Error request keys to exclude from monitoring.
     */
    @Input() public excludeErrorRequestKeys?: string[];

    /**
     * Whether to show the reload/retry action button.
     * @default true
     */
    @Input() public enableReloadAction: boolean = true;

    /**
     * Whether to show the dismiss action button.
     * @default true
     */
    @Input() public enableDismissAction: boolean = true;

    /**
     * Whether to use progress bar for loading states.
     * @default false
     */
    @Input() public useProgressBarForLoading: boolean = false;

    /**
     * Whether to use progress bar for reloading states.
     * @default true
     */
    @Input() public useProgressBarForReloading: boolean = true;

    /**
     * Whether to use skeleton loading for initial loading states.
     * @default true
     */
    @Input() public useSkeletonForLoading: boolean = true;

    /**
     * Delay before showing the progress bar in milliseconds.
     * @default 500
     */
    @Input() public showProgressBarDelayMs: number = 500;

    /**
     * Delay before showing skeleton loading in milliseconds.
     * @default 100
     */
    @Input() public showSkeletonDelayMs: number = 100;

    /**
     * Minimum time to show loading indicators in milliseconds.
     * @default 0
     */
    @Input() public minLiveTimeOfLoadingIndicatorMs: number = 0;

    /**
     * Position mode for the progress bar.
     * @default 'absolute'
     */
    @Input() public progressBarPositionMode: 'default' | 'absolute' = 'absolute';

    /**
     * Whether to suppress error message display.
     * @default false
     */
    @Input() public notShowErrorMsg: boolean = false;

    /**
     * Custom loading state function.
     */
    @Input() public customIsLoading$?: (requestKey?: string | null) => Signal<boolean | null>;

    /**
     * Custom reloading state function.
     */
    @Input() public customIsReloading$?: (requestKey?: string | null) => Signal<boolean | null>;

    /**
     * Custom error message function.
     */
    @Input() public customGetAllErrorMsgs$?: (requestKeys?: string[], excludeKeys?: string[]) => Signal<string | undefined>;

    /**
     * Custom clear error message function.
     */
    @Input() public customClearErrorMsg?: (requestKey?: string | null) => void;

    /**
     * Custom reload function.
     */
    @Input() public customReload?: () => void;

    /**
     * Event emitted when the reload/retry action is triggered.
     */
    @Output() public reloadAction = new EventEmitter<void>();

    /**
     * Event emitted when the dismiss action is triggered.
     */
    @Output() public dismiss = new EventEmitter<void>();

    // Host bindings for CSS classes
    @HostBinding('class.--progress-bar') public hasProgressBarClass = false;
    @HostBinding('class.--error') public hasErrorClass = false;
    @HostBinding('class.--skeleton-loading') public hasSkeletonLoadingClass = false;
    @HostBinding('class.--loading') public hasLoadingClass = false;
    @HostBinding('class.--reloading') public hasReloadingClass = false;
    @HostBinding('class.--hidden') public hasHiddenClass = false;
    @HostBinding('class.--progress-bar-absolute-position-mode') public hasProgressBarAbsolutePositionModeClass = false;
    @HostBinding('class.--custom-loading-template') public hasCustomLoadingTemplateClass = false;
    @HostBinding('class.--custom-reloading-template') public hasCustomReloadingTemplateClass = false;
    @HostBinding('class.--custom-error-template') public hasCustomErrorTemplateClass = false;

    // Internal signals for state management
    public shouldShowProgressBarLoading: WritableSignal<boolean> = signal(false);
    public shouldShowSkeletonLoading: WritableSignal<boolean> = signal(false);

    private checkShouldShowProgressBarLoadingIntervalId?: number;
    private checkShouldShowProgressBarLoadingIntervalCount: number = 0;
    private lastStartShowProgressBarLoadingDate?: Date;

    protected override initOrReloadVm: (isReload: boolean) => Observable<unknown | undefined> | undefined = (isReload: boolean) => {
        return undefined;
    };

    // Computed signals for reactive state
    public showLoading$: Signal<boolean> = computed(() => {
        if (this.shouldShowError()) return false;

        if (this.loadingRequestKeys?.length) {
            return this.loadingRequestKeys.some(key => (this.customIsLoading$ ? this.customIsLoading$(key)() === true : this.target?.isLoading(key) === true));
        }

        return this.customIsLoading$ ? this.customIsLoading$()() === true : this.target?.isLoadingToInitVm() === true;
    });

    public showReloading$: Signal<boolean> = computed(() => {
        if (this.shouldShowError()) return false;

        if (this.loadingRequestKeys?.length) {
            return this.loadingRequestKeys.some(key =>
                this.customIsReloading$ ? this.customIsReloading$(key)() === true : this.target?.isReloading(key) === true
            );
        }

        return this.customIsReloading$ ? this.customIsReloading$()() === true : this.target?.isStateReloading() === true;
    });

    public showProgressBar$: Signal<boolean> = computed(() => {
        return this.shouldShowProgressBarLoading();
    });

    public showSkeletonLoading$: Signal<boolean> = computed(() => {
        return this.shouldShowSkeletonLoading();
    });

    public showError$: Signal<boolean> = computed(() => {
        return this.shouldShowError();
    });

    public errorMessage$: Signal<string | undefined> = computed(() => {
        return this.getShowErrorMsg$();
    });

    public isHidden$: Signal<boolean> = computed(() => {
        return !this.shouldShowSkeletonLoading() && !this.shouldShowError() && !this.shouldShowProgressBarLoading();
    });

    // Computed for checking what should show
    private checkShouldShowSkeletonLoading: Signal<boolean> = computed(() => {
        if (this.useProgressBarForLoading || this.shouldShowError()) return false;
        if (!this.useSkeletonForLoading) return false;

        return this.showLoading$();
    });

    private shouldShowError: Signal<boolean> = computed(() => {
        const error = this.getShowErrorMsg$();
        return error != null && error !== '' && !this.notShowErrorMsg;
    });

    private getShowErrorMsg$: Signal<string | undefined> = computed(() => {
        return this.customGetAllErrorMsgs$
            ? this.customGetAllErrorMsgs$(this.errorRequestKeys, this.excludeErrorRequestKeys)()
            : this.target?.getAllErrorMsgs$(this.errorRequestKeys, this.excludeErrorRequestKeys)();
    });

    constructor() {
        super();

        // Setup effects for reactive updates
        effect(() => this.setShouldShowSkeletonLoading(this.checkShouldShowSkeletonLoading()));

        effect(() => {
            if (this.elementRef.nativeElement != null) {
                // Recheck for progress bar display logic
                if (this.checkShouldShowProgressBarLoadingIntervalId != undefined) {
                    clearInterval(this.checkShouldShowProgressBarLoadingIntervalId);
                }

                if (this.checkShouldShowProgressBarLoading(false)) {
                    this.checkShouldShowProgressBarLoadingIntervalId = setInterval(() => {
                        if (this.checkShouldShowProgressBarLoadingIntervalCount >= 5 || !this.checkShouldShowProgressBarLoading(false)) {
                            clearInterval(this.checkShouldShowProgressBarLoadingIntervalId);
                            this.checkShouldShowProgressBarLoadingIntervalCount = 0;
                        } else {
                            this.checkShouldShowProgressBarLoadingIntervalCount++;
                        }
                        this.updateShouldShowProgressBarLoading();
                    }, 100);
                } else {
                    this.updateShouldShowProgressBarLoading();
                }
            }
        });

        effect(() => this.updateHostElementClasses());
    }

    public override ngOnDestroy(): void {
        super.ngOnDestroy();

        if (this.checkShouldShowProgressBarLoadingIntervalId != undefined) {
            clearInterval(this.checkShouldShowProgressBarLoadingIntervalId);
        }
    }

    /**
     * Whether the component has custom loading content projected via ng-content.
     */
    public get hasCustomLoadingContent(): boolean {
        return this.elementRef.nativeElement?.querySelector('[slot="loading"]') != null;
    }

    /**
     * Whether the component has custom reloading content projected via ng-content.
     */
    public get hasCustomReloadingContent(): boolean {
        return this.elementRef.nativeElement?.querySelector('[slot="reloading"]') != null;
    }

    /**
     * Whether the component has custom error content projected via ng-content.
     */
    public get hasCustomErrorContent(): boolean {
        return this.elementRef.nativeElement?.querySelector('[slot="error"]') != null;
    }

    /**
     * Whether the custom error content has its own action buttons.
     */
    public get hasCustomActions(): boolean {
        const customErrorContent = this.elementRef.nativeElement?.querySelector('[slot="error"]');
        return customErrorContent?.querySelector('button, [role="button"]') != null;
    }

    /**
     * Handles the reload/retry action.
     */
    public onReload(): void {
        this.reloadAction.emit();

        if (this.customReload) {
            this.customReload();
        } else if (this.target) {
            this.target.reload();
        }
    }

    /**
     * Handles the dismiss action.
     */
    public onDismiss(): void {
        this.dismiss.emit();

        if (this.customClearErrorMsg) {
            this.customClearErrorMsg();
        } else if (this.target) {
            this.target.clearAllErrorMsgs();
        }
    }

    private checkShouldShowProgressBarLoading(withCheckNoSkeletonLoading: boolean = true): boolean {
        return (
            !this.shouldShowSkeletonLoading() &&
            this.isTargetLoadOrReloadState() &&
            this.useProgressBarForReloading &&
            (withCheckNoSkeletonLoading === false || this.elementRef.nativeElement?.parentElement?.querySelector('skeleton-loading') == undefined)
        );
    }

    private isTargetLoadOrReloadState(): boolean {
        if (this.shouldShowError()) return false;

        return this.showLoading$() || this.showReloading$();
    }

    private getCurrentShouldShowSkeletonLoading(): boolean {
        const value = this.shouldShowSkeletonLoading();
        return Array.isArray(value) ? value[0] : value;
    }

    private updateShouldShowProgressBarLoading(): void {
        if (this.checkShouldShowProgressBarLoading() === false) {
            const progressBarLiveTimeTotalMs = this.lastStartShowProgressBarLoadingDate
                ? new Date().getTime() - this.lastStartShowProgressBarLoadingDate.getTime()
                : 0;

            const delay = Math.max(0, this.minLiveTimeOfLoadingIndicatorMs - progressBarLiveTimeTotalMs);

            setTimeout(() => {
                this.shouldShowProgressBarLoading.set(this.checkShouldShowProgressBarLoading());
            }, delay);
        } else {
            setTimeout(() => {
                this.shouldShowProgressBarLoading.set(this.checkShouldShowProgressBarLoading());
                setTimeout(() => {
                    this.lastStartShowProgressBarLoadingDate = new Date();
                });
            }, this.showProgressBarDelayMs);
        }
    }

    private setShouldShowSkeletonLoading(value: boolean): void {
        if (value === this.getCurrentShouldShowSkeletonLoading()) return;

        if (value === false) {
            this.shouldShowSkeletonLoading.set(value);
        } else {
            setTimeout(() => {
                this.shouldShowSkeletonLoading.set(value);
            }, this.showSkeletonDelayMs);
        }
    }

    private updateHostElementClasses(): void {
        this.hasProgressBarClass = this.shouldShowProgressBarLoading();
        this.hasErrorClass = this.shouldShowError();
        this.hasSkeletonLoadingClass = this.shouldShowSkeletonLoading();
        this.hasLoadingClass = this.showLoading$();
        this.hasReloadingClass = this.showReloading$();
        this.hasHiddenClass = this.isHidden$();
        this.hasProgressBarAbsolutePositionModeClass = this.progressBarPositionMode === 'absolute';
        this.hasCustomLoadingTemplateClass = this.hasCustomLoadingContent;
        this.hasCustomReloadingTemplateClass = this.hasCustomReloadingContent;
        this.hasCustomErrorTemplateClass = this.hasCustomErrorContent;
    }
}
