import { inject, Injectable, NgZone } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

import { filter, map, Observable, of, tap } from 'rxjs';

import { TranslateService } from '@ngx-translate/core';

import { PlatformCachingService } from './caching';
import { date_timeDiff, task_interval } from './utils';

@Injectable()
export class PlatformServiceWorkerService {
    public static maxWaitingForAutoReloadNewVersionSeconds = 30;
    public static checkNewVersionInterval = 60000;

    private readonly translateSvc = inject(TranslateService);

    constructor(
        private swUpdate: SwUpdate,
        private cacheService: PlatformCachingService,
        private ngZone: NgZone
    ) {}

    public startCheckNewAppVersionTime: Date = new Date();

    protected getTranslate(key: string): Observable<string> {
        if (this.translateSvc == null) return of(key);
        return this.translateSvc.get(key);
    }

    public setupCheckNewAppVersionProcess(
        onNewAppVersionAvailableFn?: () => unknown,
        handleNewVersionMsgFn?: (msg: string) => void
    ) {
        if (!this.swUpdate.isEnabled) {
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
                                PlatformServiceWorkerService.maxWaitingForAutoReloadNewVersionSeconds
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
                                this.isShowingDownloadBlocker()
                            ) {
                                console.log('Auto reload to get new version.');
                                this.reloadPageWithNewVersion();
                            } else {
                                this.swUpdate.activateUpdate().then(
                                    () => {
                                        this.handleShowReloadNewVersionAlert(handleNewVersionMsgFn);
                                    },
                                    err => {
                                        PlatformServiceWorkerService.clearNgswCacheStorage(
                                            PlatformServiceWorkerService.allNgswCacheKeysRegex
                                        );
                                        this.handleShowReloadNewVersionAlert(handleNewVersionMsgFn);
                                    }
                                );
                            }
                        });
                    })
                )
                .subscribe();

            // 3) Fatal SW errors – also force reload:
            this.swUpdate.unrecoverable
                .pipe(
                    tap(e => {
                        this.getTranslate('This current version is broken. Reload New Version?').subscribe(
                            (msg: string) => {
                                if (confirm(msg)) {
                                    this.clearCacheReload(PlatformServiceWorkerService.allNgswCacheKeysRegex);
                                }
                            }
                        );
                    })
                )
                .subscribe();

            this.startCheckAppVersionInterval();
        }
    }

    // Use arrow function to prevent missing "this" context
    private handleShowReloadNewVersionAlert = (handleNewVersionMsgFn: ((msg: string) => void) | undefined) => {
        this.getTranslate('New version available. Please refresh to update to prevent unexpected errors.').subscribe(
            (msg: string) => {
                if (handleNewVersionMsgFn != undefined) {
                    handleNewVersionMsgFn(msg);
                } else {
                    this.showReloadNewVersionAlert(msg);
                }
            }
        );
    };

    public startCheckAppVersionInterval() {
        this.ngZone.runOutsideAngular(() => {
            this.startCheckNewAppVersionTime = new Date();
            this.swUpdate.checkForUpdate();
            if (PlatformServiceWorkerService.checkNewVersionInterval > 0) {
                console.log('Start check app version interval.');
                setInterval(() => {
                    this.swUpdate.checkForUpdate();
                }, PlatformServiceWorkerService.checkNewVersionInterval);
            }
        });
    }

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

    public reloadPageWithNewVersion() {
        this.swUpdate.activateUpdate().then(
            () => {
                this.clearCacheReload();
            },
            err => {
                this.clearCacheReload(PlatformServiceWorkerService.allNgswCacheKeysRegex);
            }
        );

        // if for some reason activateUpdate() promise never resolves,
        // we still want to clear the cache and reload the page after a timeout
        setTimeout(() => {
            this.clearCacheReload(PlatformServiceWorkerService.allNgswCacheKeysRegex);
        }, 120000);
    }

    // Use arrow function to prevent missing "this" context
    public clearCacheReload = (cacheKeysRegex?: RegExp) => {
        this.clearCache(cacheKeysRegex).then(
            () => window.location.reload(),
            () => window.location.reload()
        );
    };

    // Use arrow function to prevent missing "this" context
    public clearCache = (cacheKeysRegex?: RegExp) => {
        this.cacheService.clear();
        return PlatformServiceWorkerService.clearNgswCacheStorage(
            cacheKeysRegex ?? PlatformServiceWorkerService.apiDataCacheKeysRegex
        );
    };

    public clearCacheInterval = task_interval(() => {
        this.clearCache();
    }, 1000);

    public static allNgswCacheKeysRegex = /^ngsw:.*/;
    public static apiDataCacheKeysRegex = /^ngsw:.*:data:/;
    public static async clearNgswCacheStorage(cacheKeysRegex: RegExp, name?: string): Promise<boolean[]> {
        const allCacheKeys = await window.caches.keys();
        const ngswCacheKeys = allCacheKeys.filter(
            p => cacheKeysRegex.test(p) && (name == undefined || p.indexOf(name) > -1)
        );
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
        // avoid duplicating
        if (document.getElementById('sw-update-blocker')) {
            return;
        }
        const blocker = document.createElement('div');
        blocker.id = 'sw-update-blocker';
        Object.assign(blocker.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '100000',
            fontSize: '1.4rem',
            userSelect: 'none',
            pointerEvents: 'all'
        });
        blocker.textContent = this.translateSvc.instant('Updating app to the latest version… please wait');
        document.body.appendChild(blocker);
    }

    private isShowingDownloadBlocker(): boolean {
        return document.getElementById('sw-update-blocker') != null;
    }
}
