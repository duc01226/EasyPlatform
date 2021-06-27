import { Injectable } from '@angular/core';
import { PlatformAppUiStateService } from '@no-ceiling-duc-interview-testing-web/no-ceiling-platform-core';

import { AppModuleConfig } from '../app.module.config';
import { AppUiStateData } from './app-ui.state-data';

@Injectable()
export class AppUiStateService extends PlatformAppUiStateService<AppUiStateData> {
  public constructor(moduleConfig: AppModuleConfig) {
    super(moduleConfig);
  }

  protected initialUiState(): AppUiStateData {
    return new AppUiStateData();
  }
}
