import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule, Provider, Type } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { PlatformApiService } from './api-services';
import { PlatformAppUiStateService } from './app-ui-state-services';
import {
  DefaultPlatformAuthHttpRequestOptionsAppenderService,
  PlatformAuthHttpRequestOptionsAppenderService,
} from './auth-services';
import {
  DefaultPlatformEventManagerService,
  PlatformEvent,
  PlatformEventHandler,
  PlatformEventManagerService,
  PlatformEventManagerServiceSubscriptionsMap,
} from './events';
import { PlatformHighlightSearchTextPipe, PlatformPipe } from './pipes';
import { PlatformCoreModuleConfig } from './platform-core.config';

type ForRootModules = PlatformCoreModule | BrowserModule | BrowserAnimationsModule;
type ForChildModules = PlatformCoreModule;

@NgModule({
  declarations: [PlatformHighlightSearchTextPipe],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, PlatformHighlightSearchTextPipe]
})
export class PlatformCoreModule {
  public static forRoot<TAppUiStateData>(config: {
    moduleConfig: {
      type: Type<PlatformCoreModuleConfig>;
      configFactory: () => PlatformCoreModuleConfig;
    };
    eventManager?: Type<PlatformEventManagerService>;
    eventHandlerMaps?: [Type<PlatformEvent>, Type<PlatformEventHandler<PlatformEvent>>[]][];

    appRootUiState: Type<PlatformAppUiStateService<TAppUiStateData>>;
    apiServices?: Type<PlatformApiService>[];
    authHttpRequestOptionsAppender?: Type<PlatformAuthHttpRequestOptionsAppenderService>;
  }): ModuleWithProviders<ForRootModules>[] {
    return [
      {
        ngModule: PlatformCoreModule,
        providers: [
          { provide: config.moduleConfig.type, useFactory: () => config.moduleConfig.configFactory() },
          { provide: PlatformCoreModuleConfig, useExisting: config.moduleConfig.type },

          {
            provide: PlatformEventManagerServiceSubscriptionsMap,
            useValue: new PlatformEventManagerServiceSubscriptionsMap(config.eventHandlerMaps ?? []),
            multi: true
          },
          DefaultPlatformEventManagerService,
          ...(config.eventManager != null ? [config.eventManager] : []),
          {
            provide: PlatformEventManagerService,
            useExisting: config.eventManager ?? DefaultPlatformEventManagerService
          },

          ...this.buildCanBeInRootOrChildProviders({
            apiServices: config.apiServices,
            authHttpRequestOptionsAppender: config.authHttpRequestOptionsAppender,
            moduleUiState: config.appRootUiState
          })
        ]
      },
      {
        ngModule: BrowserModule
      },
      {
        ngModule: BrowserAnimationsModule
      }
    ];
  }

  public static forChild(config: {
    appModuleState?: Type<PlatformAppUiStateService<unknown>>;
    apiServices?: Type<PlatformApiService>[];
    authHttpRequestOptionsAppender?: Type<PlatformAuthHttpRequestOptionsAppenderService>;
  }): ModuleWithProviders<ForChildModules>[] {
    return [
      {
        ngModule: PlatformCoreModule,
        providers: [
          ...this.buildCanBeInRootOrChildProviders({
            apiServices: config.apiServices,
            authHttpRequestOptionsAppender: config.authHttpRequestOptionsAppender,
            moduleUiState: config.appModuleState
          })
        ]
      }
    ];
  }

  private static buildCanBeInRootOrChildProviders<TAppUiStateData>(config: {
    moduleUiState?: Type<PlatformAppUiStateService<TAppUiStateData>>;
    apiServices?: Type<PlatformApiService>[];
    authHttpRequestOptionsAppender?: Type<PlatformAuthHttpRequestOptionsAppenderService>;
    pipes?: Type<PlatformPipe<unknown, unknown, unknown>>[];
  }): Provider[] {
    return [
      DefaultPlatformAuthHttpRequestOptionsAppenderService,
      ...(config.authHttpRequestOptionsAppender != null ? [config.authHttpRequestOptionsAppender] : []),
      {
        provide: PlatformAuthHttpRequestOptionsAppenderService,
        useExisting: config.authHttpRequestOptionsAppender ?? DefaultPlatformAuthHttpRequestOptionsAppenderService
      },
      ...(config.apiServices ?? []),
      ...(config.moduleUiState != null ? [config.moduleUiState] : []),
      ...(config.pipes ?? [])
    ];
  }
}
