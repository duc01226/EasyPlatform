import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';

import { PlatformCoreModule, PlatformHighlightSearchTextPipe, PlatformVmStoreComponent } from '@libs/platform-core';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';

import { TaskItemDataModel } from '@libs/apps-domains/text-snippet-domain';

import { AppStore, AppVm, AppVm_TextSnippetItem } from './app.store';
import { AppTextSnippetDetailComponent } from './shared/components/app-text-snippet-detail';
import { TaskDetailComponent } from './shared/components/task-detail';
import { TaskListComponent } from './shared/components/task-list';

@Component({
    selector: 'platform-example-web-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TranslateModule,
        PlatformCoreModule,

        MatTableModule,
        MatInputModule,
        MatFormFieldModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatTabsModule,

        AppTextSnippetDetailComponent,
        PlatformHighlightSearchTextPipe,
        TaskListComponent,
        TaskDetailComponent
    ],
    providers: []
})
export class AppComponent extends PlatformVmStoreComponent<AppVm, AppStore> {
    public title = 'Platform Example App';
    public textSnippetsItemGridDisplayedColumns = ['SnippetText', 'FullText'];

    // Task management state
    public selectedTask = signal<TaskItemDataModel | null>(null);
    public showTaskDetail = signal<boolean>(false);

    public constructor(store: AppStore) {
        super(store);
    }

    public onSearchTextChange(newValue: string): void {
        this.store.changeSearchText(newValue);
    }

    public onTextSnippetGridChangePage(e: PageEvent) {
        this.store.changePage(e.pageIndex);
    }

    public loadSnippetTextItems() {
        this.store.loadSnippetTextItems(this.vm()!.currentSearchTextSnippetQuery());
    }

    public toggleSelectTextSnippedGridRow(row: AppVm_TextSnippetItem) {
        this.updateVm({
            selectedSnippetTextId: this.currentVm().selectedSnippetTextId != row.data.id ? row.data.id : undefined
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // TASK MANAGEMENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════

    public onTaskSelected(task: TaskItemDataModel): void {
        this.selectedTask.set(task);
        this.showTaskDetail.set(true);
    }

    public onCreateTask(): void {
        this.selectedTask.set(null);
        this.showTaskDetail.set(true);
    }

    public onTaskSaved(task: TaskItemDataModel): void {
        this.selectedTask.set(task);
        // TaskListComponent will auto-reload via its store
    }

    public onTaskDetailCancelled(): void {
        this.showTaskDetail.set(false);
        this.selectedTask.set(null);
    }

    public onTaskRestored(task: TaskItemDataModel): void {
        this.selectedTask.set(task);
    }
}
