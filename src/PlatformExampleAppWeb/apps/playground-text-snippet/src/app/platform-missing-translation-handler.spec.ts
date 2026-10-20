import { MissingTranslationHandlerParams, TranslateService } from '@ngx-translate/core';
import { PlatformCoreModuleConfig, PlatformDefaultMissingTranslationHandler } from '@libs/platform-core';

describe('Missing translation fallback preserves readable parameterized English', () => {
    const handler: PlatformDefaultMissingTranslationHandler = new PlatformDefaultMissingTranslationHandler(new PlatformCoreModuleConfig());

    function fallback(key: string, interpolateParams?: object): string {
        const params: MissingTranslationHandlerParams = { key, interpolateParams, translateService: {} as TranslateService };
        return handler.handle(params);
    }

    it('substitutes every supplied value, including zero, false and empty strings', () => {
        expect(fallback('{name}: {count} / {enabled} / {empty}', { name: 'Tasks', count: 0, enabled: false, empty: '' })).toBe('Tasks: 0 / false / ');
    });

    it('retains unresolved placeholders rather than rendering null or undefined', () => {
        expect(fallback('{known} {missing} {nil} {unset}', { known: 'Ready', nil: null, unset: undefined })).toBe('Ready {missing} {nil} {unset}');
    });

    it('preserves unparameterized keys and keys without supplied parameters', () => {
        expect(fallback('Ready')).toBe('Ready');
        expect(fallback('Hello {name}')).toBe('Hello {name}');
    });

    it('supports repeated, whitespace-delimited and literal dotted parameter names', () => {
        expect(fallback('{ name } + {name} = {item.count}', { name: 'A', 'item.count': 2 })).toBe('A + A = 2');
    });
});
