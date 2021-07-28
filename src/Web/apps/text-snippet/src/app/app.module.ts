import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  AngularDotnetPlatformDomainsTextSnippetDomainModule,
  AngularDotnetPlatformDomainsTextSnippetDomainModuleConfig,
} from '@angular-dotnet-platform-example-web/angular-dotnet-platform-domains/text-snippet-domain';
import { AngularDotnetPlatformPlatformCoreModule } from '@angular-dotnet-platform-example-web/angular-dotnet-platform-platform-core';

import { environment } from '../environments/environment';
import { AppUiStateService } from './app-ui-state-services';
import { AppComponent } from './app.component';
import { AppModuleConfig } from './app.module.config';
import { ShowRepositoryErrorEventHandler } from './events';
import { AppTextSnippetDetailComponent } from './smart-components';

@NgModule({
  declarations: [AppComponent, AppTextSnippetDetailComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AngularDotnetPlatformPlatformCoreModule.forRoot({
      moduleConfig: {
        type: AppModuleConfig,
        configFactory: () => new AppModuleConfig({ isDevelopment: !environment.production })
      },
      appRootUiState: AppUiStateService
    }),
    AngularDotnetPlatformDomainsTextSnippetDomainModule.forRoot({
      moduleConfigFactory: () =>
        new AngularDotnetPlatformDomainsTextSnippetDomainModuleConfig({
          isDevelopment: !environment.production,
          textSnippetApiHost: environment.textSnippetApiHost
        }),
      appRepositoryErrorEventHandlers: [ShowRepositoryErrorEventHandler]
    }),

    MatTableModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,

    FlexLayoutModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
