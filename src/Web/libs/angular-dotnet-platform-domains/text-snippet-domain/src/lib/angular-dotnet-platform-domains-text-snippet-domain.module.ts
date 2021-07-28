import { ModuleWithProviders, NgModule, Type } from '@angular/core';
import {
  AngularDotnetPlatformPlatformDomainModule,
  PlatformRepositoryErrorEventHandler,
} from '@angular-dotnet-platform-example-web/angular-dotnet-platform-platform-core';

import { TextSnippetApi } from './Apis';
import { AngularDotnetPlatformDomainsTextSnippetDomainModuleConfig } from './angular-dotnet-platform-domains-text-snippet-domain.config';
import { TextSnippetRepository } from './Repositories';
import { TextSnippetRepositoryContext } from './text-snippet.repository-context';

type ForRootModules = AngularDotnetPlatformDomainsTextSnippetDomainModule | AngularDotnetPlatformPlatformDomainModule;
type ForChildModules = AngularDotnetPlatformDomainsTextSnippetDomainModule | AngularDotnetPlatformPlatformDomainModule;

@NgModule({
  imports: []
})
export class AngularDotnetPlatformDomainsTextSnippetDomainModule {
  public static forRoot(config: {
    moduleConfigFactory: () => AngularDotnetPlatformDomainsTextSnippetDomainModuleConfig;
    appRepositoryErrorEventHandlers?: Type<PlatformRepositoryErrorEventHandler>[];
  }): ModuleWithProviders<ForRootModules>[] {
    return [
      ...AngularDotnetPlatformPlatformDomainModule.forRoot({
        moduleConfig: {
          type: AngularDotnetPlatformDomainsTextSnippetDomainModuleConfig,
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
      ...AngularDotnetPlatformPlatformDomainModule.forChild({
        appModuleRepositoryContext: TextSnippetRepositoryContext,
        appModuleRepositories: [TextSnippetRepository],
        appModuleApis: [TextSnippetApi]
      })
    ];
  }
}
