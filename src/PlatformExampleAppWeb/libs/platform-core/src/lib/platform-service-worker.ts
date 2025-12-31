import { inject, Injectable, NgZone, Optional } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

import { filter, map, Observable, of, tap } from 'rxjs';

import { TranslateService } from '@ngx-translate/core';

import { PlatformCachingService } from './caching';
import { date_timeDiff, task_interval } from './utils';

/**
 * Service responsible for managing Progressive Web App (PWA) service worker functionality.
 *
 * This service handles:
 * - Automatic detection of new app versions
 * - User notification and app reload for updates
 * - Service worker error handling and recovery
 * - Cache management and cleanup
 * - Progressive update strategies with user experience considerations
 *
 * @example
 * ```typescript
 * constructor(private swService: PlatformServiceWorkerService) {
 *   this.swService.setupCheckNewAppVersionProcess(
 *     () => console.log('New version available'),
 *     (msg) => this.showCustomAlert(msg)
 *   );
 * }
 * ```
 */
@Injectable()
export class PlatformServiceWorkerService {
    /** Maximum time in seconds to wait before auto-reloading for new version */
    public static maxWaitingForAutoReloadNewVersionSeconds = 30;

    /** Interval in milliseconds to check for new app versions */
    public static checkNewVersionInterval = 60000;

    private readonly translateSvc = inject(TranslateService);

    constructor(
        @Optional() private swUpdate: SwUpdate | null,
        private cacheService: PlatformCachingService,
        private ngZone: NgZone
    ) {}

    /** Timestamp when the version checking process started */ /** Timestamp when the version checking process started */
    public startCheckNewAppVersionTime: Date = new Date();

    /**
     * Gets translated text for the given key.
     * Falls back to the key itself if translation service is not available.
     *
     * @param key - Translation key
     * @returns Observable with translated text
     */
    protected getTranslate(key: string): Observable<string> {
        if (this.translateSvc == null) return of(key);
        return this.translateSvc.get(key);
    }

    /**
     * Sets up the complete new app version checking and update process.
     *
     * This method establishes three main event streams:
     * 1. VERSION_DETECTED - Shows download blocker for immediate updates
     * 2. VERSION_READY - Handles version activation and user notification
     * 3. Unrecoverable errors - Forces cache clear and reload
     *
     * @param onNewAppVersionAvailableFn - Optional callback when new version is available
     * @param handleNewVersionMsgFn - Optional custom handler for version messages
     */
    public setupCheckNewAppVersionProcess(
        onNewAppVersionAvailableFn?: () => unknown,
        handleNewVersionMsgFn?: (msg: string) => void,
        option?: { disableShowNewVersionAlert?: boolean; disableDownloadNewVersionBlocker?: boolean }
    ) {
        if (!this.swUpdate || !this.swUpdate.isEnabled) {
            PlatformServiceWorkerService.unregisterRegisteredServiceWorker();
        } else {
            // 1) When the SW *detects* a new version, immediately block the UI:
            this.swUpdate.versionUpdates
                .pipe(
                    filter(evt => evt.type === 'VERSION_DETECTED'),
                    tap(() =>
                        this.ngZone.run(() => {
                            console.log('New app version detected.');

                            this.clearCacheInterval();

                            if (
                                date_timeDiff(new Date(), this.startCheckNewAppVersionTime) / 1000 <=
                                    PlatformServiceWorkerService.maxWaitingForAutoReloadNewVersionSeconds &&
                                !option?.disableDownloadNewVersionBlocker
                            ) {
                                this.showDownloadBlocker();
                            }
                        })
                    )
                )
                .subscribe();

            // 2) When the SW has *finished* downloading & installing, activate & reload:
            this.swUpdate.versionUpdates
                .pipe(
                    map(e => {
                        if (e.type != 'VERSION_READY') return;

                        this.ngZone.run(() => {
                            console.log('New app version available.');

                            if (onNewAppVersionAvailableFn != undefined) onNewAppVersionAvailableFn();
                            if (
                                date_timeDiff(new Date(), this.startCheckNewAppVersionTime) / 1000 <=
                                    PlatformServiceWorkerService.maxWaitingForAutoReloadNewVersionSeconds ||
                                this.isShowingDownloadBlocker() ||
                                option?.disableShowNewVersionAlert
                            ) {
                                console.log('Auto reload to get new version.');
                                this.reloadPageWithNewVersion();
                            } else {
                                if (this.swUpdate) {
                                    this.swUpdate.activateUpdate().then(
                                        () => {
                                            this.handleShowReloadNewVersionAlert(handleNewVersionMsgFn);
                                        },
                                        err => {
                                            PlatformServiceWorkerService.clearNgswCacheStorage(PlatformServiceWorkerService.allNgswCacheKeysRegex);
                                            this.handleShowReloadNewVersionAlert(handleNewVersionMsgFn);
                                        }
                                    );
                                } else {
                                    this.handleShowReloadNewVersionAlert(handleNewVersionMsgFn);
                                }
                            }
                        });
                    })
                )
                .subscribe();

            // 3) Fatal SW errors – also force reload:
            this.swUpdate.unrecoverable
                .pipe(
                    tap(e => {
                        this.getTranslate('This current version is broken. Reload New Version?').subscribe((msg: string) => {
                            if (confirm(msg)) {
                                this.clearCacheReload(PlatformServiceWorkerService.allNgswCacheKeysRegex);
                            }
                        });
                    })
                )
                .subscribe();

            this.startCheckAppVersionInterval();
        }
    }

    /**
     * Handles showing reload alert to user when new version is available.
     * Uses arrow function to preserve 'this' context in callbacks.
     *
     * @param handleNewVersionMsgFn - Optional custom message handler
     */
    // Use arrow function to prevent missing "this" context
    private handleShowReloadNewVersionAlert = (handleNewVersionMsgFn: ((msg: string) => void) | undefined) => {
        this.getTranslate('New version available. Please refresh to update to prevent unexpected errors.').subscribe((msg: string) => {
            if (handleNewVersionMsgFn != undefined) {
                handleNewVersionMsgFn(msg);
            } else {
                this.showReloadNewVersionAlert(msg);
            }
        });
    };

    /**
     * Starts the periodic check for new app versions.
     * Runs outside Angular zone to avoid triggering change detection.
     * Sets up interval to automatically check for updates.
     */
    public startCheckAppVersionInterval() {
        this.ngZone.runOutsideAngular(() => {
            this.startCheckNewAppVersionTime = new Date();
            if (this.swUpdate) {
                this.swUpdate.checkForUpdate();
                if (PlatformServiceWorkerService.checkNewVersionInterval > 0) {
                    console.log('Start check app version interval.');
                    setInterval(() => {
                        if (this.swUpdate) {
                            this.swUpdate.checkForUpdate();
                        }
                    }, PlatformServiceWorkerService.checkNewVersionInterval);
                }
            }
        });
    }

    /**
     * Shows a styled banner notification to the user about new version availability.
     * Creates or replaces existing warning banner with update message.
     *
     * @param msg - Message to display to the user
     */
    public showReloadNewVersionAlert(msg: string) {
        const existingBanner = document.getElementById('sw-update-warning');
        if (existingBanner) existingBanner.remove(); // Remove existing banner if any

        const banner = document.createElement('div');
        banner.id = 'sw-update-warning';
        banner.innerHTML = `<div>${msg}</div>`;

        Object.assign(banner.style, {
            position: 'fixed',
            top: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#fff3cd',
            color: '#856404',
            border: '1px solid #ffeeba',
            padding: '10px 20px',
            borderRadius: '0 0 5px 5px',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: '9999',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            maxWidth: '90%',
            maxHeight: '40vh',
            overflowY: 'auto',
            textAlign: 'center'
        });

        document.body.appendChild(banner);
    }

    /**
     * Activates the new service worker version and reloads the page.
     * Includes fallback timeout in case activation fails.
     */
    public reloadPageWithNewVersion() {
        if (this.swUpdate) {
            this.swUpdate.activateUpdate().then(
                () => {
                    this.clearCacheReload();
                },
                err => {
                    this.clearCacheReload(PlatformServiceWorkerService.allNgswCacheKeysRegex);
                }
            );
        } else {
            this.clearCacheReload(PlatformServiceWorkerService.allNgswCacheKeysRegex);
        }

        // if for some reason activateUpdate() promise never resolves,
        // we still want to clear the cache and reload the page after a timeout
        setTimeout(() => {
            this.clearCacheReload(PlatformServiceWorkerService.allNgswCacheKeysRegex);
        }, 120000);
    }

    /**
     * Clears cache and reloads the page.
     * Uses arrow function to preserve 'this' context.
     *
     * @param cacheKeysRegex - Optional regex to match specific cache keys
     */
    // Use arrow function to prevent missing "this" context
    public clearCacheReload = (cacheKeysRegex?: RegExp) => {
        this.clearCache(cacheKeysRegex).then(
            () => window.location.reload(),
            () => window.location.reload()
        );
    };

    /**
     * Clears application cache using both platform cache service and service worker cache.
     * Uses arrow function to preserve 'this' context.
     *
     * @param cacheKeysRegex - Optional regex to match specific cache keys, defaults to API data cache
     * @returns Promise that resolves when cache is cleared
     */
    // Use arrow function to prevent missing "this" context
    public clearCache = (cacheKeysRegex?: RegExp) => {
        this.cacheService.clear();
        return PlatformServiceWorkerService.clearNgswCacheStorage(cacheKeysRegex ?? PlatformServiceWorkerService.apiDataCacheKeysRegex);
    };

    /** Interval task that clears cache every 1000ms */
    public clearCacheInterval = task_interval(() => {
        this.clearCache();
    }, 1000);

    /** Regex pattern to match all Angular service worker cache keys */
    public static allNgswCacheKeysRegex = /^ngsw:.*/;

    /** Regex pattern to match API data cache keys specifically */
    public static apiDataCacheKeysRegex = /^ngsw:.*:data:/;
    /**
     * Clears Angular service worker cache storage based on regex pattern.
     *
     * @param cacheKeysRegex - Regex pattern to match cache keys to clear
     * @param name - Optional name filter for cache keys
     * @returns Promise<boolean[]> - Array of boolean results for each cache operation
     */
    public static async clearNgswCacheStorage(cacheKeysRegex: RegExp, name?: string): Promise<boolean[]> {
        const allCacheKeys = await window.caches.keys();
        const ngswCacheKeys = allCacheKeys.filter(p => cacheKeysRegex.test(p) && (name == undefined || p.indexOf(name) > -1));
        // Cast any because of angular cli bug build prod failed
        return Promise.all(
            ngswCacheKeys.map(async p => {
                const cache = await window.caches.open(p);
                const cacheKeys = await cache.keys();
                const deleteResults = await Promise.all(cacheKeys.map(cacheKey => cache.delete(cacheKey)));
                return deleteResults.indexOf(false) < 0 && deleteResults.length == cacheKeys.length;
            })
        );
    }

    /**
     * Unregisters all existing service workers and clears their cache.
     * Used when service worker is disabled or needs to be reset.
     */
    public static unregisterRegisteredServiceWorker() {
        // Unregister service worker if already registered
        if (navigator.serviceWorker != null) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (const registration of registrations) {
                    registration.unregister();
                }
            });

            this.clearNgswCacheStorage(this.allNgswCacheKeysRegex);
        }
    }

    /**
     * Registers or unregisters the service worker based on the enabled flag.
     *
     * @param ngswWorkerEnabled - Whether service worker should be enabled
     * @param ngSwFilePath - Path to the service worker file, defaults to '/ngsw-worker.js'
     * @returns Promise that resolves when operation completes
     */
    public static registerServiceWorker(ngswWorkerEnabled: boolean, ngSwFilePath: string = '/ngsw-worker.js') {
        return new Promise(resolve => {
            try {
                if (navigator.serviceWorker != null && ngswWorkerEnabled) {
                    navigator.serviceWorker.register(ngSwFilePath);
                } else if (navigator.serviceWorker != null && !ngswWorkerEnabled) {
                    this.unregisterRegisteredServiceWorker();
                }

                resolve({});
            } catch (error) {
                console.error(error);
                resolve({});
            }
        });
    }

    /**
     * Injects a full‐screen, click‐blocking overlay
     * so the user can’t do anything until the SW is ready.
     */
    private showDownloadBlocker() {
        this.getTranslate('Updating app to the latest version… please wait').subscribe((msg: string) => {
            // avoid duplicating
            const existingBlocker = document.getElementById('sw-update-blocker');
            if (existingBlocker != null) {
                existingBlocker.remove();
            }

            const blocker = document.createElement('div');
            blocker.id = 'sw-update-blocker';
            Object.assign(blocker.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                backgroundColor: '#fff', // white background, not transparent
                color: '#000',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '100000',
                fontSize: '1.4rem',
                userSelect: 'none',
                pointerEvents: 'all'
            });

            const message = document.createElement('div');
            message.textContent = msg;
            message.style.marginBottom = '20px';

            const spinner = document.createElement('div');
            Object.assign(spinner.style, {
                width: '40px',
                height: '40px',
                border: '4px solid #ccc',
                borderTop: '4px solid #000',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            });

            // Add spinner animation keyframes to <style> if not yet added
            if (!document.getElementById('sw-update-spinner-style')) {
                const style = document.createElement('style');
                style.id = 'sw-update-spinner-style';
                style.innerHTML = `
                        @keyframes spin {
                            0%   { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `;
                document.head.appendChild(style);
            }

            blocker.appendChild(message);
            blocker.appendChild(spinner);
            document.body.appendChild(blocker);
        });
    }

    /**
     * Checks if the download blocker overlay is currently being displayed.
     *
     * @returns True if download blocker is visible, false otherwise
     */
    private isShowingDownloadBlocker(): boolean {
        return document.getElementById('sw-update-blocker') != null;
    }
}
