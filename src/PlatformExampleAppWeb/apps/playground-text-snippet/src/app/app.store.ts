import { Injectable } from '@angular/core';
import { SearchTextSnippetQuery, TextSnippetApi, TextSnippetDataModel } from '@libs/apps-domains/text-snippet-domain';
import { PlatformVm, PlatformVmStore, distinctUntilObjectValuesChanged } from '@libs/platform-core';
import { Observable, of } from 'rxjs';

export class AppVm extends PlatformVm {
    public static readonly textSnippetItemsPageSize = 10;

    public constructor(data?: Partial<AppVm>) {
        super();
        this.searchText = data?.searchText ?? '';
        this.textSnippetItems = data?.textSnippetItems ? data?.textSnippetItems.map(x => new AppVm_TextSnippetItem(x)) : undefined;
        this.totalTextSnippetItems = data?.totalTextSnippetItems ?? 0;
        this.currentTextSnippetItemsPageNumber = data?.currentTextSnippetItemsPageNumber ?? 0;
        this.selectedSnippetTextId = data?.selectedSnippetTextId ?? undefined;
    }
    public searchText?: string;
    public textSnippetItems?: AppVm_TextSnippetItem[];
    public currentTextSnippetItemsPageNumber: number;
    public totalTextSnippetItems: number;
    public selectedSnippetTextId?: string | null;

    public textSnippetItemsPageSize(): number {
        return AppVm.textSnippetItemsPageSize;
    }

    public currentSearchTextSnippetQuery() {
        return new SearchTextSnippetQuery({
            maxResultCount: this.textSnippetItemsPageSize(),
            skipCount: this.currentTextSnippetItemsSkipCount(),
            searchText: this.searchText
        });
    }

    public currentTextSnippetItemsSkipCount(): number {
        return this.textSnippetItemsPageSize() * this.currentTextSnippetItemsPageNumber;
    }

    // Demo get/set using platform watch decorator
    // Shorthand execute a target function doing something directly if on change only do this logic
    // @Watch('pagedResultWatch')
    // public pagedResult?: PlatformPagedResultDto<LeaveType>;

    // // Full syntax execute a NORMAL FUNCTION
    // @Watch<PlatformPagedQueryDto, LeaveTypesState>((value, change, targetObj) => {
    //   targetObj.updatePageInfo();
    // })
    // public pagedQuery: PlatformPagedQueryDto = new PlatformPagedQueryDto();

    // public pagedResultWatch(
    //   value: PlatformPagedResultDto<LeaveType> | undefined,
    //   change: SimpleChange<PlatformPagedResultDto<LeaveType> | undefined>
    // ) {
    //   this.updatePageInfo();
    // }

    // Demo using validation object
    /**
* return Validation.validateNot(remainingLeave, remainingLeave.totalRemainingLeaveDays <= 0, {
                code: LeaveRequestDetailFormValidationKeys.notEnoughRemainingLeave,
                errorMsg:
                  'The number of remaining leaves is not sufficient for this leave type. Please try another one!'
              })
                .andNextValidate(remainingLeave =>
                  remainingLeave.validateEnoughAvailableRemainingLeaveDays(
                    this.vm.totalDays,
                    this.vm.fromDate,
                    LeaveRequestDetailFormValidationKeys.reachedMaximumTotalDays
                  )
                )
                .match({
                  valid: value => <ValidationErrors | null>null,
                  invalid: errorValidation =>
                    buildFormValidationErrors(errorValidation.error.code, errorValidation.error.errorMsg)
                });
*/
}

export class AppVm_TextSnippetItem {
    public constructor(data?: Partial<AppVm_TextSnippetItem>) {
        this.data = data?.data ?? new TextSnippetDataModel();
    }
    public data: TextSnippetDataModel;
}

@Injectable()
export class AppStore extends PlatformVmStore<AppVm> {
    public query$ = this.select(p => p.currentSearchTextSnippetQuery()).pipe(distinctUntilObjectValuesChanged());

    public constructor(private snippetTextApi: TextSnippetApi) {
        super(new AppVm());
    }

    public vmConstructor = (data?: Partial<AppVm>) => new AppVm(data);

    protected cachedStateKeyName = () => 'AppStore';

    protected beforeInitVm = () => {
        this.loadSnippetTextItems(this.query$);
    };

    public override initOrReloadVm = (isReload: boolean): Observable<unknown> => {
        this.loadSnippetTextItems(this.currentState().currentSearchTextSnippetQuery(), isReload);
        return of(null);
    };

    public loadSnippetTextItems = this.effectSimple((query: SearchTextSnippetQuery, isReloading?: boolean) => {
        return this.snippetTextApi
            .search(
                new SearchTextSnippetQuery({
                    maxResultCount: this.currentState().textSnippetItemsPageSize(),
                    skipCount: this.currentState().currentTextSnippetItemsSkipCount(),
                    searchText: this.currentState().searchText
                })
            )
            .pipe(
                this.tapResponse(data => {
                    this.updateState({
                        textSnippetItems: data.items.map(x => new AppVm_TextSnippetItem({ data: x })),
                        totalTextSnippetItems: data.totalCount
                    });
                })
            );
    }, 'loadSnippetTextItems');

    public changePage = this.effectSimple((pageIndex: number, isReloading?: boolean) => {
        if (pageIndex === this.currentState().currentTextSnippetItemsPageNumber) return;

        this.updateState({ currentTextSnippetItemsPageNumber: pageIndex });
    }, 'changePage');

    public changeSearchText = this.effectSimple((searchText: string, isReloading?: boolean) => {
        if (searchText === this.currentState().searchText) return;

        this.updateState({ searchText: searchText, currentTextSnippetItemsPageNumber: 0 });
    }, 'changeSearchText');
}
