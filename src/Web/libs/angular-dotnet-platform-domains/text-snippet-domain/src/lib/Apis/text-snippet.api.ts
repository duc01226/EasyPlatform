import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  AngularDotnetPlatformPlatformCoreModuleConfig,
  IPlatformPagedResultDto,
  PlatformApiService,
  PlatformAuthHttpRequestOptionsAppenderService,
  PlatformPagedResultDto,
} from '@angular-dotnet-platform-example-web/angular-dotnet-platform-platform-core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AngularDotnetPlatformDomainsTextSnippetDomainModuleConfig } from '../angular-dotnet-platform-domains-text-snippet-domain.config';
import { ITextSnippetDataModel, TextSnippetDataModel } from '../DataModels';
import {
  ISaveTextSnippetCommandResult,
  SaveTextSnippetCommandDto,
  SaveTextSnippetCommandResult,
  SearchTextSnippetQueryDto,
} from '../Dtos';

@Injectable()
export class TextSnippetApi extends PlatformApiService {
  public constructor(
    moduleConfig: AngularDotnetPlatformPlatformCoreModuleConfig,
    http: HttpClient,
    authHttpRequestOptionsAppender: PlatformAuthHttpRequestOptionsAppenderService,
    private domainModuleConfig: AngularDotnetPlatformDomainsTextSnippetDomainModuleConfig
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
