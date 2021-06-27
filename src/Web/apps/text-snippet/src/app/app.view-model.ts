import {
  ITextSnippetDataModel,
  TextSnippetDataModel,
} from '@no-ceiling-duc-interview-testing-web/no-ceiling-domains/text-snippet-domain';
import {
  PlatformApiServiceErrorInfo,
  PlatformViewModel,
} from '@no-ceiling-duc-interview-testing-web/no-ceiling-platform-core';

export interface IAppViewModel {
  searchText?: string;
  textSnippetItems?: IAppTextSnippetItemViewModel[];
  selectedSnippetTextId?: string;
  totalTextSnippetItems: number;
  currentTextSnippetItemsPageNumber: number;
  loadingTextSnippetItems: boolean;
  loadingTextSnippetItemsError?: PlatformApiServiceErrorInfo;
}

export class AppViewModel extends PlatformViewModel implements IAppViewModel {
  public static readonly textSnippetItemsPageSize = 10;

  public constructor(data?: Partial<IAppViewModel>) {
    super();
    this.searchText = data?.searchText ?? '';
    this.textSnippetItems = data?.textSnippetItems
      ? data?.textSnippetItems.map(x => new AppTextSnippetItemViewModel(x))
      : undefined;
    this.totalTextSnippetItems = data?.totalTextSnippetItems ?? 0;
    this.currentTextSnippetItemsPageNumber = data?.currentTextSnippetItemsPageNumber ?? 0;
    this.selectedSnippetTextId = data?.selectedSnippetTextId ?? undefined;
    this.loadingTextSnippetItems = data?.loadingTextSnippetItems ?? false;
    this.loadingTextSnippetItemsError = data?.loadingTextSnippetItemsError;
  }
  public searchText?: string;
  public textSnippetItems?: AppTextSnippetItemViewModel[];
  public currentTextSnippetItemsPageNumber: number;
  public totalTextSnippetItems: number;
  public selectedSnippetTextId?: string;
  public loadingTextSnippetItems: boolean;
  public loadingTextSnippetItemsError?: PlatformApiServiceErrorInfo;

  public textSnippetItemsPageSize(): number {
    return AppViewModel.textSnippetItemsPageSize;
  }

  public currentTextSnippetItemsSkipCount(): number {
    return this.textSnippetItemsPageSize() * this.currentTextSnippetItemsPageNumber;
  }
}

export interface IAppTextSnippetItemViewModel {
  data: ITextSnippetDataModel;
}
export class AppTextSnippetItemViewModel {
  public constructor(data?: Partial<IAppTextSnippetItemViewModel>) {
    this.data = data?.data ?? new TextSnippetDataModel();
  }
  public data: TextSnippetDataModel;
}
