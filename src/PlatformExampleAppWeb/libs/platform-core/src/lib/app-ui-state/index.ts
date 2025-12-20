/**
 * @fileoverview App UI State Management
 *
 * This module provides reactive state management services for application-level UI concerns.
 * It includes stores and services for managing global UI state that needs to be shared
 * across multiple components and modules.
 *
 * **Key Features:**
 * - **Translation State Management**: Centralized language and translation state
 * - **Reactive Updates**: Observable-based state changes with automatic synchronization
 * - **Type Safety**: Strongly typed state interfaces and reactive selectors
 * - **Service Integration**: Seamless integration with platform translation services
 *
 * **Modules Included:**
 * - `PlatformTranslateStateStore`: NgRx ComponentStore for managing translation state
 * - `TranslateState`: Interface defining translation state structure
 *
 * @example
 * **Basic usage in application components:**
 * ```typescript
 * import { PlatformTranslateStateStore } from '@libs/platform-core';
 *
 * @Component({...})
 * export class MyComponent {
 *   constructor(private translateState: PlatformTranslateStateStore) {
 *     // Subscribe to language changes
 *     this.translateState.currentLang$.subscribe(lang => {
 *       console.log('Language changed to:', lang);
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * **Advanced state management:**
 * ```typescript
 * import { PlatformTranslateStateStore, TranslateState } from '@libs/platform-core';
 *
 * @Injectable()
 * export class LanguageService {
 *   constructor(private translateState: PlatformTranslateStateStore) {}
 *
 *   setApplicationLanguage(languageCode: string): void {
 *     this.translateState.patchState({ currentLang: languageCode });
 *   }
 *
 *   restrictToSupportedLanguages(supportedLangs: string[]): void {
 *     this.translateState.patchState({ restrictSupportLangs: supportedLangs });
 *   }
 * }
 * ```
 */

export * from './platform.translate.state-store';
