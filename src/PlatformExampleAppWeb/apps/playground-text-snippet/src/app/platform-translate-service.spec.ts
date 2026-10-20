import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { PlatformLanguageItem, PlatformTranslateConfig, PlatformTranslateService, PlatformTranslationCurrentLangLocalStorageKey } from '@libs/platform-core';
import { of } from 'rxjs';

describe('Translation service preserves its public configuration token in JIT and DI', () => {
    let storedLanguage: string | null;

    beforeEach(() => {
        storedLanguage = localStorage.getItem(PlatformTranslationCurrentLangLocalStorageKey);
        localStorage.removeItem(PlatformTranslationCurrentLangLocalStorageKey);
    });

    afterEach(() => {
        TestBed.resetTestingModule();
        if (storedLanguage == null) localStorage.removeItem(PlatformTranslationCurrentLangLocalStorageKey);
        else localStorage.setItem(PlatformTranslationCurrentLangLocalStorageKey, storedLanguage);
    });

    it('resolves the actual exported service and keeps the supplied config identity and values', () => {
        const language: PlatformLanguageItem = new PlatformLanguageItem('Vietnamese', 'vi', 'VIE');
        const config: PlatformTranslateConfig = new PlatformTranslateConfig({ defaultLanguage: 'vi', slowRequestBreakpoint: 750, availableLangs: [language] });
        const translate: { setDefaultLang: jest.Mock; use: jest.Mock } = {
            setDefaultLang: jest.fn(),
            use: jest.fn(() => of({}))
        };
        TestBed.configureTestingModule({
            providers: [PlatformTranslateService, { provide: PlatformTranslateConfig, useValue: config }, { provide: TranslateService, useValue: translate }]
        });

        const service: PlatformTranslateService = TestBed.inject(PlatformTranslateService);

        expect(TestBed.inject(PlatformTranslateConfig)).toBe(config);
        expect(service.defaultLanguage).toBe('vi');
        expect(service.getAvailableLangs()).toBe(config.availableLangs);
        expect(config.slowRequestBreakpoint).toBe(750);
        expect(translate.setDefaultLang).toHaveBeenCalledWith('vi');
        expect(translate.use).toHaveBeenCalledWith('vi');
        service.defaultLanguage = 'en';
        expect(config.defaultLanguage).toBe('en');
    });

    it('retains the existing default configuration values', () => {
        const config: PlatformTranslateConfig = PlatformTranslateConfig.defaultConfig();

        expect(config.defaultLanguage).toBe('en');
        expect(config.slowRequestBreakpoint).toBe(500);
        expect(config.availableLangs).toEqual([new PlatformLanguageItem('English', 'en', 'ENG')]);
        expect(config.restrictSupportLangs).toBeUndefined();
    });
});
