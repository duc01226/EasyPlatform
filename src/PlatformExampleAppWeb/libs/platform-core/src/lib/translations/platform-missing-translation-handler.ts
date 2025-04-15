import { Injectable } from '@angular/core';
import { MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';
import { PlatformCoreModuleConfig } from '../platform-core.config';

@Injectable()
export class PlatformDefaultMissingTranslationHandler implements MissingTranslationHandler {
    constructor(protected readonly moduleConfig: PlatformCoreModuleConfig) {}

    public handle(params: MissingTranslationHandlerParams) {
        if (this.moduleConfig.isDevelopment && !this.moduleConfig.disableMissingTranslationWarnings) {
            const message = `[DEV-WARNING] Missing translation for key '${params.key}' in '${params.translateService.currentLang}'. Click F12 to see warning logs for more details.`;
            console.warn(message);

            this.showNonBlockingWarning(message);
        }

        return params.key;
    }

    private showNonBlockingWarning(message: string) {
        const existingBanner = document.getElementById('platform-missing-translation-banner');
        if (existingBanner) {
            existingBanner.remove(); // Remove existing banner if any
        }

        const banner = document.createElement('div');
        banner.id = 'platform-missing-translation-banner';
        banner.innerText = message;

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
            textAlign: 'center'
        });

        document.body.appendChild(banner);

        setTimeout(() => {
            banner.remove();
        }, 5000); // Auto-remove after 5 seconds
    }
}
