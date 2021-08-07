import {
  SearchTextSnippetQueryDto,
  TextSnippetRepository,
} from '@angular-dotnet-platform-example-web/angular-dotnet-platform-domains/text-snippet-domain';
import {
  PlatformApiServiceErrorResponse,
  PlatformSmartComponent,
  Utils,
} from '@angular-dotnet-platform-example-web/angular-dotnet-platform-platform-core';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

import { AppUiStateData, AppUiStateService } from './app-ui-state-services';
import { AppTextSnippetItemViewModel, AppViewModel } from './app.view-model';

@Component({
  selector: 'angular-dotnet-platform-example-web-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class AppComponent
  extends PlatformSmartComponent<AppUiStateData, AppUiStateService, AppViewModel>
  implements OnInit {
  public constructor(
    changeDetector: ChangeDetectorRef,
    appUiState: AppUiStateService,
    private snippetTextRepo: TextSnippetRepository
  ) {
    super(changeDetector, appUiState);

    this.selectUiStateData(p => p.unexpectedError).subscribe(x => {
      this.updateVm(vm => {
        vm.unexpectedError = x;
      });
    });
  }

  public title = 'Text Snippet';
  public textSnippetsItemGridDisplayedColumns = ['SnippetText', 'FullText'];

  public ngOnInit(): void {
    super.ngOnInit();

    this.loadSnippetTextItems();
  }

  public loadSnippetTextItems(): void {
    this.unsubscribeSubscription('loadSnippetTextItems');

    this.updateVm(vm => {
      vm.loadingTextSnippetItems = true;
      vm.loadingTextSnippetItemsError = undefined;
    });
    let loadSnippetTextItemsSub = this.snippetTextRepo
      .search(
        new SearchTextSnippetQueryDto({
          maxResultCount: this.vm.textSnippetItemsPageSize(),
          skipCount: this.vm.currentTextSnippetItemsSkipCount(),
          searchText: this.vm.searchText
        })
      )
      .pipe(this.untilDestroyed())
      .subscribe(
        data => {
          this.updateVm(vm => {
            vm.textSnippetItems = data.items.map(x => new AppTextSnippetItemViewModel({ data: x }));
            vm.totalTextSnippetItems = data.totalCount;
            vm.loadingTextSnippetItems = false;
          });
        },
        (error: PlatformApiServiceErrorResponse) => {
          this.updateVm(vm => {
            vm.loadingTextSnippetItemsError = error.error;
            vm.loadingTextSnippetItems = false;
          });
        }
      );

    this.storeSubscription('loadSnippetTextItems', loadSnippetTextItemsSub);
  }

  public onSearchTextChange(newValue: string): void {
    this.unsubscribeSubscription('onSearchTextChange');

    let onSearchTextChangeDelay = Utils.delay(
      () => {
        if (this.vm.searchText == newValue) return;
        this.updateVm(vm => {
          vm.searchText = newValue;
          vm.currentTextSnippetItemsPageNumber = 0;
        });
        this.loadSnippetTextItems();
      },
      500,
      this.destroyed$
    );

    this.storeSubscription('onSearchTextChange', onSearchTextChangeDelay);
  }

  public onTextSnippetGridChangePage(e: PageEvent) {
    if (this.vm.currentTextSnippetItemsPageNumber == e.pageIndex) return;

    this.updateVm(vm => {
      vm.currentTextSnippetItemsPageNumber = e.pageIndex;
    });
    this.loadSnippetTextItems();
  }

  public toggleSelectTextSnippedGridRow(row: AppTextSnippetItemViewModel) {
    this.updateVm(vm => {
      vm.selectedSnippetTextId = vm.selectedSnippetTextId != row.data.id ? row.data.id : undefined;
    });
    this.appUiState.updateUiStateData(p => {
      p.selectedSnippetTextId = this.vm.selectedSnippetTextId;
      return p;
    });
  }

  public clearAppErrors(): void {
    this.appUiState.updateUiStateData(p => {
      p.unexpectedError = undefined;
      return p;
    });
  }

  protected initialVm(currentAppUiStateData: AppUiStateData): AppViewModel {
    return new AppViewModel();
  }
}
