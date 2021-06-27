import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ModuleWithProviders, NgModule, Provider, Type } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PlatformApiService } from './ApiServices';
import {
  PlatformRepository,
  PlatformRepositoryContext,
  PlatformRepositoryErrorEvent,
  PlatformRepositoryErrorEventHandler,
} from './Domain';
import { PlatformEventManagerServiceSubscriptionsMap } from './Events';
import { NoCeilingPlatformDomainModuleConfig } from './no-ceiling-platform-domain.config';

type ForRootModules = NoCeilingPlatformDomainModule;
type ForChildModules = NoCeilingPlatformDomainModule;

@NgModule({
  imports: [],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule]
})
export class NoCeilingPlatformDomainModule {
  public static forRoot(config: {
    moduleConfig: {
      type: Type<NoCeilingPlatformDomainModuleConfig>;
      configFactory: () => NoCeilingPlatformDomainModuleConfig;
    };
    appRepositoryContext?: Type<PlatformRepositoryContext>;
    appRepositories?: Type<PlatformRepository<PlatformRepositoryContext>>[];
    appApis?: Type<PlatformApiService>[];
    appRepositoryErrorEventHandlers?: Type<PlatformRepositoryErrorEventHandler>[];
  }): ModuleWithProviders<ForRootModules>[] {
    return [
      {
        ngModule: NoCeilingPlatformDomainModule,
        providers: [
          { provide: config.moduleConfig.type, useFactory: () => config.moduleConfig.configFactory() },
          { provide: NoCeilingPlatformDomainModuleConfig, useExisting: config.moduleConfig.type },

          ...this.buildCanBeInRootOrChildProviders({
            repositoryContext: config.appRepositoryContext,
            repositories: config.appRepositories,
            apis: config.appApis,
            repositoryErrorEventHandlers: config.appRepositoryErrorEventHandlers
          })
        ]
      }
    ];
  }

  public static forChild(config: {
    appModuleRepositoryContext?: Type<PlatformRepositoryContext>;
    appModuleRepositories?: Type<PlatformRepository<PlatformRepositoryContext>>[];
    appModuleApis?: Type<PlatformApiService>[];
    appRepositoryErrorEventHandlers?: Type<PlatformRepositoryErrorEventHandler>[];
  }): ModuleWithProviders<ForChildModules>[] {
    return [
      {
        ngModule: NoCeilingPlatformDomainModule,
        providers: [
          ...this.buildCanBeInRootOrChildProviders({
            repositoryContext: config.appModuleRepositoryContext,
            repositories: config.appModuleRepositories,
            apis: config.appModuleApis,
            repositoryErrorEventHandlers: config.appRepositoryErrorEventHandlers
          })
        ]
      }
    ];
  }

  private static buildCanBeInRootOrChildProviders(config: {
    repositoryContext?: Type<PlatformRepositoryContext>;
    repositories?: Type<PlatformRepository<PlatformRepositoryContext>>[];
    apis?: Type<PlatformApiService>[];
    repositoryErrorEventHandlers?: Type<PlatformRepositoryErrorEventHandler>[];
  }): Provider[] {
    return [
      ...(config.repositoryContext ? [config.repositoryContext] : []),
      ...(config.repositories ? config.repositories : []),
      ...(config.apis ? config.apis : []),

      ...(config.repositoryErrorEventHandlers ?? []),
      {
        provide: PlatformEventManagerServiceSubscriptionsMap,
        useValue: new PlatformEventManagerServiceSubscriptionsMap(
          config.repositoryErrorEventHandlers
            ? [[PlatformRepositoryErrorEvent, config.repositoryErrorEventHandlers]]
            : []
        ),
        multi: true
      }
    ];
  }
}
