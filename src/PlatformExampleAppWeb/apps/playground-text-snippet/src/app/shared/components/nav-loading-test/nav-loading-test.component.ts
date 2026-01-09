import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PlatformCoreModule, PlatformVmStoreComponent } from '@libs/platform-core';

import { NavLoadingTestStore, NavLoadingTestVm } from './nav-loading-test.store';

/**
 * Component for testing navigation property loading.
 * Demonstrates PlatformNavigationPropertyAttribute works correctly
 * across MongoDB and EF Core persistence providers.
 */
@Component({
    selector: 'app-nav-loading-test',
    standalone: true,
    templateUrl: './nav-loading-test.component.html',
    styleUrls: ['./nav-loading-test.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        JsonPipe,
        DatePipe,
        PlatformCoreModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatCardModule,
        MatExpansionModule
    ],
    providers: [NavLoadingTestStore]
})
export class NavLoadingTestComponent extends PlatformVmStoreComponent<NavLoadingTestVm, NavLoadingTestStore> {
    public constructor(store: NavLoadingTestStore) {
        super(store);
    }

    /**
     * Run the navigation loading test.
     */
    public runTest(): void {
        this.store.runTest();
    }

    /**
     * Clear the current test result.
     */
    public clearResult(): void {
        this.store.clearResult();
    }
}
