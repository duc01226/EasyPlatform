import { Injectable } from '@angular/core';
import { MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';
import { PlatformCoreModuleConfig } from '../platform-core.config';
import { task_debounce } from '../utils';

@Injectable()
export class PlatformDefaultMissingTranslationHandler implements MissingTranslationHandler {
    private warnMsgs: Set<string> = new Set<string>();

    constructor(protected readonly moduleConfig: PlatformCoreModuleConfig) {}

    public handle(params: MissingTranslationHandlerParams) {
        if (this.moduleConfig.isDevelopment) {
            const message = `[DEV-WARNING] Missing translation for key '${params.key}' in '${params.translateService.currentLang}'. Click F12 to see warning logs for more details.`;

            console.warn(message);
            if (!this.moduleConfig.disableMissingTranslationWarnings) {
                if (!this.warnMsgs.has(message)) this.warnMsgs.add(message);

                this.showNonBlockingWarning();
            }
        }

        return params.key;
    }

    private showNonBlockingWarning = task_debounce(() => {
        const existingBanner = document.getElementById('platform-missing-translation-banner');
        if (existingBanner) {
            existingBanner.remove(); // Remove existing banner if any
        }

        if (this.warnMsgs.size == 0) return;

        const banner = document.createElement('div');
        banner.id = 'platform-missing-translation-banner';
        this.warnMsgs.forEach(msg => {
            banner.innerHTML += `<div>${msg}</div>`;
        });

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

        this.warnMsgs.clear(); // Clear the messages after displaying

        setTimeout(() => {
            banner.remove();
        }, 5000); // Auto-remove after 5 seconds
    }, 1000);
}
