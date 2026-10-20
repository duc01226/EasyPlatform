import { Injectable } from '@angular/core';

import { Observable, of } from 'rxjs';

import { NavLoadingTestResult, TextSnippetApi } from '@libs/apps-domains/text-snippet-domain';
import { PlatformVm, PlatformVmStore } from '@libs/platform-core';

/**
 * ViewModel for navigation loading test component.
 * Holds the test result from the API.
 */
export class NavLoadingTestVm extends PlatformVm {
    public result?: NavLoadingTestResult;

    public constructor(data?: Partial<NavLoadingTestVm>) {
        super(data);
        Object.assign(this, data);
    }
}

/**
 * Store for navigation loading test component.
 * Manages state and API calls for testing navigation property loading.
 */
@Injectable()
export class NavLoadingTestStore extends PlatformVmStore<NavLoadingTestVm> {
    public constructor(private api: TextSnippetApi) {
        super(new NavLoadingTestVm());
    }

    public vmConstructor = (data?: Partial<NavLoadingTestVm>) => new NavLoadingTestVm(data);

    protected cachedStateKeyName = () => 'NavLoadingTestStore';

    protected beforeInitVm = () => {
        // No initialization needed
    };

    public override initOrReloadVm = (_isReload: boolean): Observable<unknown> => {
        return of(null);
    };

    /**
     * Run the navigation loading test.
     * Creates test data and verifies all navigation levels.
     */
    public runTest = this.effectSimple(() =>
        this.api.testNavigationLoading().pipe(
            this.observerLoadingErrorState('runTest'),
            this.tapResponse(result => this.updateState({ result }))
        )
    );

    /**
     * Clear the current test result.
     */
    public clearResult(): void {
        this.updateState({ result: undefined });
    }
}
