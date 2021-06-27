import { ModuleWithProviders, NgModule, Type } from '@angular/core';
import {
  NoCeilingPlatformDomainModule,
  PlatformRepositoryErrorEventHandler,
} from '@no-ceiling-duc-interview-testing-web/no-ceiling-platform-core';

import { TextSnippetApi } from './Apis';
import { NoCeilingDomainsTextSnippetDomainModuleConfig } from './no-ceiling-domains-text-snippet-domain.config';
import { TextSnippetRepository } from './Repositories';
import { TextSnippetRepositoryContext } from './text-snippet.repository-context';

type ForRootModules = NoCeilingDomainsTextSnippetDomainModule | NoCeilingPlatformDomainModule;
type ForChildModules = NoCeilingDomainsTextSnippetDomainModule | NoCeilingPlatformDomainModule;

@NgModule({
  imports: []
})
export class NoCeilingDomainsTextSnippetDomainModule {
  public static forRoot(config: {
    moduleConfigFactory: () => NoCeilingDomainsTextSnippetDomainModuleConfig;
    appRepositoryErrorEventHandlers?: Type<PlatformRepositoryErrorEventHandler>[];
  }): ModuleWithProviders<ForRootModules>[] {
    return [
      ...NoCeilingPlatformDomainModule.forRoot({
        moduleConfig: {
          type: NoCeilingDomainsTextSnippetDomainModuleConfig,
          configFactory: () => config.moduleConfigFactory()
        },
        appRepositoryContext: TextSnippetRepositoryContext,
        appRepositories: [TextSnippetRepository],
        appApis: [TextSnippetApi],
        appRepositoryErrorEventHandlers: config.appRepositoryErrorEventHandlers
      })
    ];
  }

  public static forChild(): ModuleWithProviders<ForChildModules>[] {
    return [
      ...NoCeilingPlatformDomainModule.forChild({
        appModuleRepositoryContext: TextSnippetRepositoryContext,
        appModuleRepositories: [TextSnippetRepository],
        appModuleApis: [TextSnippetApi]
      })
    ];
  }
}
