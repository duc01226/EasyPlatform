/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';

import { skip } from 'rxjs';
import { PlatformLanguageItem, PlatformTranslateService } from '../translations';

/**
 * Interface defining the state structure for translation management.
 *
 * @remarks
 * This interface represents the centralized state for managing language and translation
 * settings across the platform. It provides a single source of truth for:
 * - Current active language
 * - Default fallback language
 * - Available language options
 * - Restricted language support configuration
 *
 * The state is managed through NgRx ComponentStore to provide reactive updates
 * to all components that depend on translation state changes.
 */
export interface TranslateState {
    /**
     * The currently active language code (e.g., 'en', 'es', 'fr').
     * Can be null if no specific language is selected.
     */
    currentLang?: string | null;

    /**
     * The default language code used as fallback when current language is not set.
     * This is always required and should never be null.
     */
    defaultLanguage: string;

    /**
     * Array of all available language options that users can select from.
     * Each item contains language code, display name, and other metadata.
     */
    availableLangs: PlatformLanguageItem[];

    /**
     * Optional array of language codes that restricts which languages are supported.
     * When set, only these languages will be available for selection, even if
     * more languages are defined in availableLangs.
     */
    restrictSupportLangs?: string[] | null;
}

/**
 * Centralized state store for managing translation and language settings across the platform.
 *
 * This service provides reactive state management for language preferences using NgRx ComponentStore.
 * It automatically synchronizes with the PlatformTranslateService and ensures consistency
 * between the state store and the underlying translation service.
 *
 * @remarks
 * **Key Features:**
 * - **Reactive State Management**: All language changes are observable and automatically propagated
 * - **Automatic Synchronization**: Changes in state are automatically applied to the translation service
 * - **Language Validation**: Automatically ensures selected languages are available and supported
 * - **Fallback Handling**: Provides intelligent fallback to default language when needed
 * - **Restriction Support**: Allows limiting available languages based on configuration
 *
 * **State Synchronization:**
 * The store automatically synchronizes with PlatformTranslateService in both directions:
 * - State changes update the translation service
 * - Translation service initialization updates the state
 *
 * **Language Validation:**
 * The store includes automatic validation logic that ensures:
 * - Selected languages exist in the available languages list
 * - Current language respects restriction settings
 * - Default language is always valid and available
 *
 * @example
 * **Basic usage in components:**
 * ```typescript
 * @Component({
 *   template: `
 *     <select [value]="currentLang$ | async" (change)="changeLanguage($event)">
 *       <option *ngFor="let lang of availableLangs$ | async" [value]="lang.value">
 *         {{lang.label}}
 *       </option>
 *     </select>
 *   `
 * })
 * export class LanguageSelector {
 *   currentLang$ = this.translateState.currentLang$;
 *   availableLangs$ = this.translateState.availableLangs$;
 *
 *   constructor(private translateState: PlatformTranslateStateStore) {}
 *
 *   changeLanguage(event: Event): void {
 *     const target = event.target as HTMLSelectElement;
 *     this.translateState.patchState({ currentLang: target.value });
 *   }
 * }
 * ```
 *
 * @example
 * **Restricting available languages:**
 * ```typescript
 * @Component({...})
 * export class AppComponent implements OnInit {
 *   constructor(private translateState: PlatformTranslateStateStore) {}
 *
 *   ngOnInit(): void {
 *     // Restrict to only English and Spanish
 *     this.translateState.patchState({
 *       restrictSupportLangs: ['en', 'es']
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * **Setting up default language:**
 * ```typescript
 * @Component({...})
 * export class AppComponent implements OnInit {
 *   constructor(private translateState: PlatformTranslateStateStore) {}
 *
 *   ngOnInit(): void {
 *     // Set default language based on user preferences
 *     const userPreferredLang = this.getUserPreferredLanguage();
 *     this.translateState.patchState({
 *       defaultLanguage: userPreferredLang || 'en'
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * **Observing language changes:**
 * ```typescript
 * @Component({...})
 * export class SomeComponent implements OnInit {
 *   constructor(private translateState: PlatformTranslateStateStore) {}
 *
 *   ngOnInit(): void {
 *     // React to current language changes
 *     this.translateState.currentLang$.subscribe(lang => {
 *       console.log('Language changed to:', lang);
 *       this.updateUIForLanguage(lang);
 *     });
 *
 *     // Get current or default language
 *     this.translateState.currentOrDefaultLang$.subscribe(lang => {
 *       this.initializeComponentForLanguage(lang);
 *     });
 *   }
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class PlatformTranslateStateStore extends ComponentStore<TranslateState> {
    /**
     * Observable of the currently active language code.
     *
     * @remarks
     * Emits the current language code (e.g., 'en', 'es') or null if no specific language is set.
     * Components can subscribe to this to react to language changes.
     *
     * @example
     * ```typescript
     * this.translateState.currentLang$.subscribe(lang => {
     *   console.log('Current language:', lang);
     * });
     * ```
     */
    public currentLang$ = this.select(state => state.currentLang);

    /**
     * Observable that emits the current language or falls back to the default language.
     *
     * @remarks
     * This is useful when you always need a valid language code and want to automatically
     * fall back to the default language when no current language is set.
     *
     * @example
     * ```typescript
     * this.translateState.currentOrDefaultLang$.subscribe(lang => {
     *   // lang is always a valid language code, never null
     *   this.loadTranslationsForLanguage(lang);
     * });
     * ```
     */
    public currentOrDefaultLang$ = this.select(state => state.currentLang ?? state.defaultLanguage);

    /**
     * Observable of the default fallback language code.
     *
     * @remarks
     * Emits changes to the default language setting. This language is used as fallback
     * when no current language is specified or when the current language becomes invalid.
     *
     * @example
     * ```typescript
     * this.translateState.defaultLanguage$.subscribe(defaultLang => {
     *   console.log('Default language is:', defaultLang);
     * });
     * ```
     */
    public defaultLanguage$ = this.select(state => state.defaultLanguage);

    /**
     * Observable of all available language options.
     *
     * @remarks
     * Emits the complete list of language options that users can choose from.
     * Each item contains language metadata including code, display name, and other properties.
     *
     * @example
     * ```typescript
     * this.translateState.availableLangs$.subscribe(languages => {
     *   this.populateLanguageDropdown(languages);
     * });
     * ```
     */
    public availableLangs$ = this.select(state => state.availableLangs);

    /**
     * Observable of restricted language codes.
     *
     * @remarks
     * Emits the list of language codes that are currently allowed/supported.
     * When this is set, only these languages will be available for selection,
     * even if more languages are defined in availableLangs.
     *
     * @example
     * ```typescript
     * this.translateState.restrictSupportLangs$.subscribe(restrictedLangs => {
     *   if (restrictedLangs?.length) {
     *     console.log('Only these languages are supported:', restrictedLangs);
     *   }
     * });
     * ```
     */
    public restrictSupportLangs$ = this.select(state => state.restrictSupportLangs);

    /**
     * Creates a new instance of PlatformTranslateStateStore.
     *
     * @param translateService - The platform translation service for synchronization
     *
     * @remarks
     * The constructor initializes the state with current values from the translation service
     * and sets up automatic synchronization between state changes and service updates.
     *
     * **Initialization Process:**
     * 1. Loads initial state from the translation service
     * 2. Sets up reactive subscriptions for state synchronization
     * 3. Configures automatic language validation
     *
     * **Synchronization Setup:**
     * The constructor establishes bidirectional synchronization:
     * - State changes automatically update the translation service
     * - Service changes can be reflected back to the state
     * - Language validation ensures consistency
     */
    constructor(private translateService: PlatformTranslateService) {
        super({
            defaultLanguage: translateService.defaultLanguage,
            currentLang: translateService.getCurrentLang(),
            availableLangs: translateService.getAvailableLangs(),
            restrictSupportLangs: translateService.getRestrictSupportLangs()
        });

        // Set up reactive synchronization between state and translation service
        // Using skip(1) to avoid triggering on initial subscription

        /**
         * Synchronize restriction changes with the translation service.
         * When restrictSupportLangs changes, update the service and validate current selections.
         */
        this.restrictSupportLangs$.pipe(skip(1)).subscribe(restrictSupportLangs => {
            this.translateService.setRestrictSupportLangs(restrictSupportLangs);
            this.autoFixValidLanguage(this.get().availableLangs, restrictSupportLangs);
        });

        /**
         * Synchronize default language changes with the translation service.
         * When defaultLanguage changes, update the service and validate current selections.
         */
        this.defaultLanguage$.pipe(skip(1)).subscribe(defaultLanguage => {
            this.translateService.setDefaultLang(defaultLanguage);
            // Use setTimeout to ensure state updates are processed before validation
            setTimeout(() => this.autoFixValidLanguage(this.get().availableLangs, this.get().restrictSupportLangs));
        });

        /**
         * Synchronize current language changes with the translation service.
         * When currentLang changes, update the service and validate the selection.
         */
        this.currentLang$.pipe(skip(1)).subscribe(currentLang => {
            if (currentLang != null) this.translateService.setCurrentLang(currentLang);
            // Use setTimeout to ensure state updates are processed before validation
            setTimeout(() => this.autoFixValidLanguage(this.get().availableLangs, this.get().restrictSupportLangs));
        });

        /**
         * Synchronize available languages changes with the translation service.
         * When availableLangs changes, update the service and validate current selections.
         */
        this.availableLangs$.pipe(skip(1)).subscribe(availableLangs => {
            this.translateService.setAvailableLangs(availableLangs);
            this.autoFixValidLanguage(availableLangs, this.get().restrictSupportLangs);
        });
    }

    /**
     * Automatically validates and fixes invalid language selections.
     *
     * @param availableLangs - The list of available language options
     * @param restrictSupportLangs - Optional array of restricted language codes
     *
     * @remarks
     * This method ensures that the current language and default language selections
     * are always valid based on the available languages and restriction settings.
     *
     * **Validation Rules:**
     * 1. If restrictions are set, both current and default languages must be in the restriction list
     * 2. Both current and default languages must exist in the available languages list
     * 3. If validation fails, the first valid option is automatically selected
     *
     * **Auto-Fix Behavior:**
     * - If default language is invalid, it's set to the first available/restricted language
     * - If current language is invalid, it's set to the first available/restricted language
     * - This ensures the application always has valid language settings
     *
     * @example
     * ```typescript
     * // This method is called automatically, but can be invoked manually if needed
     * this.autoFixValidLanguage(
     *   [{ value: 'en', label: 'English' }, { value: 'es', label: 'Spanish' }],
     *   ['en'] // Only English is allowed
     * );
     * // Result: If current language was 'es', it would be changed to 'en'
     * ```
     */
    private autoFixValidLanguage(availableLangs: PlatformLanguageItem[], restrictSupportLangs: string[] | null | undefined) {
        // Validate against restriction list if it exists
        if (restrictSupportLangs != null && restrictSupportLangs.length > 0) {
            // Fix default language if it's not in the restriction list
            if (!restrictSupportLangs.includes(this.get().defaultLanguage)) this.patchState({ defaultLanguage: restrictSupportLangs[0]! });

            // Fix current language if it's not in the restriction list
            if (this.get().currentLang != null && !restrictSupportLangs.includes(this.get().currentLang!))
                this.patchState({ currentLang: restrictSupportLangs[0]! });
        }

        // Validate against available languages list
        if (availableLangs.length > 0) {
            // Fix default language if it's not in the available languages
            if (!availableLangs.some(availableLang => availableLang.value == this.get().defaultLanguage))
                this.patchState({ defaultLanguage: availableLangs[0]!.value });

            // Fix current language if it's not in the available languages
            if (this.get().currentLang != null && !availableLangs.some(availableLang => availableLang.value == this.get().currentLang))
                this.patchState({ currentLang: availableLangs[0]!.value });
        }
    }
}
