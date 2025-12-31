/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';
import { Dictionary } from '../common-types';

export const PlatformTranslationCurrentLangLocalStorageKey = 'i18n';

@Injectable({ providedIn: 'root' })
export class PlatformTranslateService {
    /**
     * Tracks the latest requested language while a language load is in progress.
     * This ensures that if multiple language requests come in during loading,
     * only the final requested language is applied after the current load completes.
     */
    private pendingLanguage: string | null = null;
    private isLanguageLoading = false;
    private currentLoadingLanguage: string | null = null;

    constructor(
        private ngxTranslate: TranslateService,
        private config: PlatformTranslateConfig
    ) {
        this.setDefaultLang(config.defaultLanguage);
    }

    public get defaultLanguage(): string {
        return this.config.defaultLanguage;
    }
    public set defaultLanguage(v: string) {
        this.config.defaultLanguage = v;
    }

    public setDefaultLang(useLanguage: string) {
        this.defaultLanguage = useLanguage;
        this.ngxTranslate.setDefaultLang(this.defaultLanguage);
        this.useLanguage(this.getCurrentLang() ?? this.defaultLanguage);
    }

    public setRestrictSupportLangs(value: string[] | null | undefined) {
        this.config.restrictSupportLangs = value;

        if (value != null && value.length > 0) {
            if (!value.includes(this.defaultLanguage)) this.setDefaultLang(value[0]!);
            if (this.getCurrentOrDefaultLang() && !value.includes(this.getCurrentOrDefaultLang())) this.setCurrentLang(value[0]!);
        }
    }

    public get(key: string, interpolateParams?: Dictionary<string>): Observable<string> {
        return this.ngxTranslate.get(key, interpolateParams);
    }

    public getList(keys: string[], params?: Dictionary<string>): Observable<string[]> {
        return this.ngxTranslate.get(keys, params).pipe(
            map(value => {
                if (typeof value == 'object') return Object.keys(value).map(key => value[key]);
                if (value == undefined) return [];
                return [value];
            })
        );
    }

    public getValue(key: string | string[]) {
        return this.ngxTranslate.instant(key);
    }

    public getBrowserLangTranslatedText(value: Dictionary<string>) {
        const browserLang = PlatformLanguageUtil.getBrowserLang();
        return value[browserLang] != undefined ? value[browserLang] : value[this.defaultLanguage] != undefined ? value[this.defaultLanguage] : '';
    }

    public getBrowserLanguage() {
        return PlatformLanguageUtil.getBrowserLang();
    }

    public getAvailableLangs(): PlatformLanguageItem[] {
        return this.config.availableLangs;
    }

    public setAvailableLangs(v: PlatformLanguageItem[]) {
        this.config.availableLangs = v;
    }

    public getRestrictSupportLangs(): string[] | undefined | null {
        return this.config.restrictSupportLangs;
    }

    public getCurrentOrDefaultLang(): string {
        return localStorage.getItem(PlatformTranslationCurrentLangLocalStorageKey) ?? this.defaultLanguage;
    }

    public getCurrentLang(): string | null {
        return localStorage.getItem(PlatformTranslationCurrentLangLocalStorageKey);
    }

    public setCurrentLang(lang: string): void {
        localStorage.setItem(PlatformTranslationCurrentLangLocalStorageKey, lang);
        this.useLanguage(lang);
    }

    /**
     * Queues a language change request. If a language load is already in progress,
     * the request is stored as pending and will be processed after the current load completes.
     * Only the latest pending language is kept, ensuring the final requested language is always applied last.
     */
    private useLanguage(lang: string): void {
        this.pendingLanguage = lang;
        this.processLanguageQueue();
    }

    /**
     * Processes the language queue. If no load is in progress and there's a pending language
     * different from what's currently loaded, it starts loading the pending language.
     * After completion, it recursively checks for any new pending requests.
     */
    private processLanguageQueue(): void {
        if (this.isLanguageLoading || this.pendingLanguage == null) return;

        // Skip if the pending language is the same as what's currently being loaded
        if (this.pendingLanguage === this.currentLoadingLanguage) {
            this.pendingLanguage = null;
            return;
        }

        const langToLoad = this.pendingLanguage;
        this.pendingLanguage = null;
        this.isLanguageLoading = true;
        this.currentLoadingLanguage = langToLoad;

        this.ngxTranslate.use(langToLoad).subscribe({
            next: () => {
                this.isLanguageLoading = false;
                // After completion, check if a newer language was requested while loading
                this.processLanguageQueue();
            },
            error: () => {
                this.isLanguageLoading = false;
                this.currentLoadingLanguage = null;
                // On error, still try to process any pending language
                this.processLanguageQueue();
            }
        });
    }
}

export class PlatformLanguageItem {
    public title: string;
    public value: string;
    public shortTitle?: string;

    constructor(title: string, value: string, shortTitle?: string) {
        this.title = title;
        this.value = value;
        this.shortTitle = shortTitle;
    }
}

export class PlatformLanguageUtil {
    public static getBrowserLang() {
        return window.navigator.language.substring(0, 2);
    }

    public static getBrowserLangTranslatedText(value: Dictionary<string>, defaultLang: string) {
        const browserLang = PlatformLanguageUtil.getBrowserLang();
        return value[browserLang] != undefined ? value[browserLang] : value[defaultLang] != undefined ? value[defaultLang] : '';
    }
}

export class PlatformTranslateConfig {
    public static defaultConfig(): PlatformTranslateConfig {
        return new PlatformTranslateConfig();
    }

    public defaultLanguage: string = 'en';
    public slowRequestBreakpoint: number = 500;
    public availableLangs: PlatformLanguageItem[] = [new PlatformLanguageItem('English', 'en', 'ENG')];
    public restrictSupportLangs?: string[] | null;

    constructor(data?: Partial<PlatformTranslateConfig>) {
        if (data == null) return;

        if (data.defaultLanguage != null) this.defaultLanguage = data.defaultLanguage;
        if (data.slowRequestBreakpoint != null) this.slowRequestBreakpoint = data.slowRequestBreakpoint;
        if (data.availableLangs != null) this.availableLangs = data.availableLangs;
    }
}
