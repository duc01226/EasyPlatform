import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  IPlatformPagedResultDto,
  PlatformApiService,
  PlatformAuthHttpRequestOptionsAppenderService,
  PlatformCoreModuleConfig,
  PlatformPagedResultDto,
} from '@platform-example-web/platform-core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AppsTextSnippetDomainModuleConfig } from '../apps-text-snippet-domain.config';
import { ITextSnippetDataModel, TextSnippetDataModel } from '../data-models';
import {
  ISaveTextSnippetCommandResult,
  SaveTextSnippetCommandDto,
  SaveTextSnippetCommandResult,
  SearchTextSnippetQueryDto,
} from '../dtos';

@Injectable()
export class TextSnippetApi extends PlatformApiService {
  public constructor(
    moduleConfig: PlatformCoreModuleConfig,
    http: HttpClient,
    authHttpRequestOptionsAppender: PlatformAuthHttpRequestOptionsAppenderService,
    private domainModuleConfig: AppsTextSnippetDomainModuleConfig
  ) {
    super(moduleConfig, http, authHttpRequestOptionsAppender);
  }
  protected get apiUrl(): string {
    return `${this.domainModuleConfig.textSnippetApiHost}/api/TextSnippet`;
  }

  public search(query: SearchTextSnippetQueryDto): Observable<PlatformPagedResultDto<TextSnippetDataModel>> {
    return this.get<IPlatformPagedResultDto<ITextSnippetDataModel>>('/search', query).pipe(
      map(_ => {
        _.items = _.items.map(item => new TextSnippetDataModel(item));
        return new PlatformPagedResultDto(_);
      })
    );
  }

  public save(command: SaveTextSnippetCommandDto): Observable<SaveTextSnippetCommandResult> {
    return this.post<ISaveTextSnippetCommandResult>('/save', command).pipe(
      map(_ => new SaveTextSnippetCommandResult(_))
    );
  }
}
