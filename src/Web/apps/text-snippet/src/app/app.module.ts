import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  NoCeilingDomainsTextSnippetDomainModule,
  NoCeilingDomainsTextSnippetDomainModuleConfig,
} from '@no-ceiling-duc-interview-testing-web/no-ceiling-domains/text-snippet-domain';
import { NoCeilingPlatformCoreModule } from '@no-ceiling-duc-interview-testing-web/no-ceiling-platform-core';

import { environment } from '../environments/environment';
import { AppUiStateService } from './app-ui-state-services';
import { AppComponent } from './app.component';
import { AppModuleConfig } from './app.module.config';
import { AppTextSnippetDetailComponent } from './smart-components';

@NgModule({
  declarations: [AppComponent, AppTextSnippetDetailComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    NoCeilingPlatformCoreModule.forRoot({
      moduleConfig: {
        type: AppModuleConfig,
        configFactory: () => new AppModuleConfig({ isDevelopment: !environment.production })
      },
      appRootUiState: AppUiStateService
    }),
    NoCeilingDomainsTextSnippetDomainModule.forRoot({
      moduleConfigFactory: () =>
        new NoCeilingDomainsTextSnippetDomainModuleConfig({
          isDevelopment: !environment.production,
          textSnippetApiHost: environment.textSnippetApiHost
        })
    }),

    MatTableModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatButtonModule,

    FlexLayoutModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
