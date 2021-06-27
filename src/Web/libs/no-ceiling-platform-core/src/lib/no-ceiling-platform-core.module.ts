import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule, Provider, Type } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { PlatformApiService } from './ApiServices';
import { PlatformAppUiStateService } from './AppUiStateServices';
import {
  DefaultPlatformAuthHttpRequestOptionsAppenderService,
  PlatformAuthHttpRequestOptionsAppenderService,
} from './AuthServices';
import {
  DefaultPlatformEventManagerService,
  PlatformEvent,
  PlatformEventHandler,
  PlatformEventManagerService,
  PlatformEventManagerServiceSubscriptionsMap,
} from './Events';
import { NoCeilingPlatformCoreModuleConfig } from './no-ceiling-platform-core.config';
import { PlatformHighlightSearchTextPipe, PlatformPipe } from './Pipes';

type ForRootModules = NoCeilingPlatformCoreModule | BrowserModule | BrowserAnimationsModule;
type ForChildModules = NoCeilingPlatformCoreModule;

@NgModule({
  declarations: [PlatformHighlightSearchTextPipe],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, PlatformHighlightSearchTextPipe]
})
export class NoCeilingPlatformCoreModule {
  public static forRoot<TAppUiStateData>(config: {
    moduleConfig: {
      type: Type<NoCeilingPlatformCoreModuleConfig>;
      configFactory: () => NoCeilingPlatformCoreModuleConfig;
    };
    eventManager?: Type<PlatformEventManagerService>;
    eventHandlerMaps?: [Type<PlatformEvent>, Type<PlatformEventHandler<PlatformEvent>>[]][];

    appRootUiState: Type<PlatformAppUiStateService<TAppUiStateData>>;
    apiServices?: Type<PlatformApiService>[];
    authHttpRequestOptionsAppender?: Type<PlatformAuthHttpRequestOptionsAppenderService>;
  }): ModuleWithProviders<ForRootModules>[] {
    return [
      {
        ngModule: NoCeilingPlatformCoreModule,
        providers: [
          { provide: config.moduleConfig.type, useFactory: () => config.moduleConfig.configFactory() },
          { provide: NoCeilingPlatformCoreModuleConfig, useExisting: config.moduleConfig.type },

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
            moduleState: config.appRootUiState
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
        ngModule: NoCeilingPlatformCoreModule,
        providers: [
          ...this.buildCanBeInRootOrChildProviders({
            apiServices: config.apiServices,
            authHttpRequestOptionsAppender: config.authHttpRequestOptionsAppender,
            moduleState: config.appModuleState
          })
        ]
      }
    ];
  }

  private static buildCanBeInRootOrChildProviders<TAppUiStateData>(config: {
    moduleState?: Type<PlatformAppUiStateService<TAppUiStateData>>;
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
      ...(config.moduleState != null ? [config.moduleState] : []),
      ...(config.pipes ?? [])
    ];
  }
}
