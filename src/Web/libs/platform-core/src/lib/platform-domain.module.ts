import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ModuleWithProviders, NgModule, Provider, Type } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PlatformApiService } from './api-services';
import {
  PlatformRepository,
  PlatformRepositoryContext,
  PlatformRepositoryErrorEvent,
  PlatformRepositoryErrorEventHandler,
} from './domain';
import { PlatformEventManagerServiceSubscriptionsMap } from './events';
import { PlatformDomainModuleConfig } from './platform-domain.config';

type ForRootModules = PlatformDomainModule;
type ForChildModules = PlatformDomainModule;

@NgModule({
  imports: [],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule]
})
export class PlatformDomainModule {
  public static forRoot(config: {
    moduleConfig: {
      type: Type<PlatformDomainModuleConfig>;
      configFactory: () => PlatformDomainModuleConfig;
    };
    appRepositoryContext?: Type<PlatformRepositoryContext>;
    appRepositories?: Type<PlatformRepository<PlatformRepositoryContext>>[];
    appApis?: Type<PlatformApiService>[];
    appRepositoryErrorEventHandlers?: Type<PlatformRepositoryErrorEventHandler>[];
  }): ModuleWithProviders<ForRootModules>[] {
    return [
      {
        ngModule: PlatformDomainModule,
        providers: [
          { provide: config.moduleConfig.type, useFactory: () => config.moduleConfig.configFactory() },
          { provide: PlatformDomainModuleConfig, useExisting: config.moduleConfig.type },

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
        ngModule: PlatformDomainModule,
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
