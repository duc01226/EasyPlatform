import {
  IPlatformRepositoryPagedQuery,
  PlatformPagedQueryDto,
} from '@angular-dotnet-platform-example-web/angular-dotnet-platform-platform-core';

export interface ISearchTextSnippetQueryDto extends IPlatformRepositoryPagedQuery {
  searchText?: string;
  searchId?: string;
}

export class SearchTextSnippetQueryDto extends PlatformPagedQueryDto implements ISearchTextSnippetQueryDto {
  public constructor(data?: ISearchTextSnippetQueryDto) {
    super(data);
    this.searchText = data?.searchText;
    this.searchId = data?.searchId;
  }
  public searchText?: string;
  public searchId?: string;
}
