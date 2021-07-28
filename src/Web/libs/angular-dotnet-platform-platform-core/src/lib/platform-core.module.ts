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
import { PlatformHighlightSearchTextPipe, PlatformPipe } from './Pipes';
import { AngularDotnetPlatformPlatformCoreModuleConfig } from './platform-core.config';

type ForRootModules = AngularDotnetPlatformPlatformCoreModule | BrowserModule | BrowserAnimationsModule;
type ForChildModules = AngularDotnetPlatformPlatformCoreModule;

@NgModule({
  declarations: [PlatformHighlightSearchTextPipe],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, PlatformHighlightSearchTextPipe]
})
export class AngularDotnetPlatformPlatformCoreModule {
  public static forRoot<TAppUiStateData>(config: {
    moduleConfig: {
      type: Type<AngularDotnetPlatformPlatformCoreModuleConfig>;
      configFactory: () => AngularDotnetPlatformPlatformCoreModuleConfig;
    };
    eventManager?: Type<PlatformEventManagerService>;
    eventHandlerMaps?: [Type<PlatformEvent>, Type<PlatformEventHandler<PlatformEvent>>[]][];

    appRootUiState: Type<PlatformAppUiStateService<TAppUiStateData>>;
    apiServices?: Type<PlatformApiService>[];
    authHttpRequestOptionsAppender?: Type<PlatformAuthHttpRequestOptionsAppenderService>;
  }): ModuleWithProviders<ForRootModules>[] {
    return [
      {
        ngModule: AngularDotnetPlatformPlatformCoreModule,
        providers: [
          { provide: config.moduleConfig.type, useFactory: () => config.moduleConfig.configFactory() },
          { provide: AngularDotnetPlatformPlatformCoreModuleConfig, useExisting: config.moduleConfig.type },

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
        ngModule: AngularDotnetPlatformPlatformCoreModule,
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
