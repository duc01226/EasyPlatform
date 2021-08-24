import { Injectable } from '@angular/core';
import {
  PlatformCoreModuleConfig,
  PlatformEventManagerService,
  PlatformPagedResultDto,
  PlatformRepository,
} from '@platform-example-web/platform-core';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { TextSnippetApi } from '../Apis';
import { TextSnippetRepositoryContext } from '../apps-text-snippet.repository-context';
import { TextSnippetDataModel } from '../DataModels';
import { SaveTextSnippetCommandDto, SaveTextSnippetCommandResult, SearchTextSnippetQueryDto } from '../dtos';

@Injectable()
export class TextSnippetRepository extends PlatformRepository<TextSnippetRepositoryContext> {
  public constructor(
    moduleconfig: PlatformCoreModuleConfig,
    context: TextSnippetRepositoryContext,
    eventManager: PlatformEventManagerService,
    private textSnippetApi: TextSnippetApi
  ) {
    super(moduleconfig, context, eventManager);
  }
  public search(query: SearchTextSnippetQueryDto): Observable<PlatformPagedResultDto<TextSnippetDataModel>> {
    return this.processUpsertData({
      repoDataSubject: this.context.textSnippetSubject,
      apiRequestFn: () => this.textSnippetApi.search(query),
      requestName: 'TextSnippet.Search',
      requestPayload: query,
      strategy: 'implicitReload',
      finalResultBuilder: (repoData, apiResult) => {
        apiResult.items = apiResult.items.map(item => repoData[<string>item.id]).filter(_ => _ != null);
        return apiResult;
      },
      modelDataExtracter: apiResult => apiResult.items,
      modelIdFn: x => x.id,
      initModelItemFn: x => new TextSnippetDataModel(x)
    });
  }

  public save(command: SaveTextSnippetCommandDto): Observable<SaveTextSnippetCommandResult> {
    return this.textSnippetApi.save(command).pipe(
      tap(() => this.processRefreshData({ requestName: 'TextSnippet.Search' })),
      catchError(error => this.catchApiError(error, 'TextSnippet.Save', command))
    );
  }
}
