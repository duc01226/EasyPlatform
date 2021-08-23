import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  SaveTextSnippetCommandDto,
  SearchTextSnippetQueryDto,
  TextSnippetRepository,
} from '@platform-example-web/apps-domains/text-snippet-domain';
import { PlatformApiServiceErrorResponse, PlatformSmartComponent, Utils } from '@platform-example-web/platform-core';

import { AppUiStateData, AppUiStateService } from '../../app-ui-state-services';
import { AppTextSnippetDetail } from './app-text-snippet-detail.view-model';

@Component({
  selector: 'platform-example-web-text-snippet-detail',
  templateUrl: './app-text-snippet-detail.component.html',
  styleUrls: ['./app-text-snippet-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class AppTextSnippetDetailComponent
  extends PlatformSmartComponent<AppUiStateData, AppUiStateService, AppTextSnippetDetail>
  implements OnInit {
  public constructor(
    changeDetector: ChangeDetectorRef,
    appUiState: AppUiStateService,
    private snippetTextRepo: TextSnippetRepository
  ) {
    super(changeDetector, appUiState);

    this.selectUiStateData(p => p.selectedSnippetTextId).subscribe(x => {
      this.updateVm(vm => {
        vm.toSaveTextSnippetId = x;
      });
      this.loadSelectedTextSnippetItem();
    });
  }

  public ngOnInit(): void {
    super.ngOnInit();

    this.loadSelectedTextSnippetItem();
  }

  public loadSelectedTextSnippetItem(): void {
    this.unsubscribeSubscription('loadSelectedTextSnippetItem');
    if (this.vm.toSaveTextSnippetId == null) return;

    this.updateVm(vm => {
      vm.loadingTextSnippet = true;
    });
    let loadSnippetTextItemSub = this.snippetTextRepo
      .search(
        new SearchTextSnippetQueryDto({
          searchId: this.vm.toSaveTextSnippetId,
          skipCount: 0,
          maxResultCount: 1
        })
      )
      .pipe(this.untilDestroyed())
      .subscribe(data => {
        this.updateVm(vm => {
          vm.toSaveTextSnippet = Utils.cloneDeep(data.items[0]);
          vm.loadingTextSnippet = false;
        });
      });

    this.storeSubscription('loadSelectedTextSnippetItem', loadSnippetTextItemSub);
  }

  public onSaveSelectedTextSnippetItem(): void {
    this.unsubscribeSubscription('onSaveSelectedTextSnippetItem');

    if (this.vm.savingTextSnippet || this.vm.toSaveTextSnippet == null) return;

    this.updateVm(vm => {
      vm.savingTextSnippet = true;
      vm.saveTextSnippetError = undefined;
    });
    if (this.appUiState.currentData().unexpectedError != null) {
      this.appUiState.updateUiStateData(x => {
        x.unexpectedError = undefined;
        return x;
      });
    }

    let saveSnippetTextItemSub = this.snippetTextRepo
      .save(new SaveTextSnippetCommandDto({ data: this.vm.toSaveTextSnippet }))
      .pipe(this.untilDestroyed())
      .subscribe(
        result => {
          this.updateVm(vm => {
            vm.toSaveTextSnippet = result.savedData;
            vm.savingTextSnippet = false;
            vm.toSaveTextSnippetId = result.savedData.id;
          });
          if (this.appUiState.currentData().selectedSnippetTextId != this.vm.toSaveTextSnippetId) {
            this.appUiState.updateUiStateData(x => {
              x.selectedSnippetTextId = this.vm.toSaveTextSnippetId;
              return x;
            });
          }
        },
        (error: PlatformApiServiceErrorResponse) => {
          this.updateVm(vm => {
            vm.saveTextSnippetError = error.error;
            vm.savingTextSnippet = false;
          });
        }
      );

    this.storeSubscription('onSaveSelectedTextSnippetItem', saveSnippetTextItemSub);
  }

  protected initialVm(currentAppUiStateData: AppUiStateData): AppTextSnippetDetail {
    return new AppTextSnippetDetail({ toSaveTextSnippetId: currentAppUiStateData.selectedSnippetTextId });
  }
}
