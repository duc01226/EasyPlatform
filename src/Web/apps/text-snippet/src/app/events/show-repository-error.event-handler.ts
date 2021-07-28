import { Injectable } from '@angular/core';
import {
  PlatformEventHandler,
  PlatformRepositoryErrorEvent,
} from '@angular-dotnet-platform-example-web/angular-dotnet-platform-platform-core';

import { AppUiStateService } from '../app-ui-state-services';

@Injectable()
export class ShowRepositoryErrorEventHandler extends PlatformEventHandler<PlatformRepositoryErrorEvent> {
  public constructor(public uiState: AppUiStateService) {
    super();
  }

  public handle(event: PlatformRepositoryErrorEvent): void {
    if (!event.apiError.error.isApplicationError()) {
      this.uiState.updateUiStateData(current => {
        current.unexpectedError = event.apiError;
        return current;
      });
    }
  }
}
