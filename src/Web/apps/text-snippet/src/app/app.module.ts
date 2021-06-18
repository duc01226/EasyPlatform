import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NoCeilingPlatformModule } from '@no-ceiling-duc-interview-testing-web/no-ceiling-platform';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, NoCeilingPlatformModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
