import { PlatformRepositoryContext } from '@angular-dotnet-platform-example-web/angular-dotnet-platform-platform-core';
import { BehaviorSubject } from 'rxjs';

import { TextSnippetDataModel } from './DataModels';

export class TextSnippetRepositoryContext extends PlatformRepositoryContext {
  public textSnippetSubject: BehaviorSubject<Dictionary<TextSnippetDataModel>> = new BehaviorSubject({});
}
