import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  IPlatformPagedResultDto,
  NoCeilingPlatformCoreModuleConfig,
  PlatformApiService,
  PlatformAuthHttpRequestOptionsAppenderService,
  PlatformPagedResultDto,
} from '@no-ceiling-duc-interview-testing-web/no-ceiling-platform-core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ITextSnippetDataModel, TextSnippetDataModel } from '../DataModels';
import {
  ISaveTextSnippetCommandResult,
  SaveTextSnippetCommandDto,
  SaveTextSnippetCommandResult,
  SearchTextSnippetQueryDto,
} from '../Dtos';
import { NoCeilingDomainsTextSnippetDomainModuleConfig } from '../no-ceiling-domains-text-snippet-domain.config';

@Injectable()
export class TextSnippetApi extends PlatformApiService {
  public constructor(
    moduleConfig: NoCeilingPlatformCoreModuleConfig,
    http: HttpClient,
    authHttpRequestOptionsAppender: PlatformAuthHttpRequestOptionsAppenderService,
    private domainModuleConfig: NoCeilingDomainsTextSnippetDomainModuleConfig
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
