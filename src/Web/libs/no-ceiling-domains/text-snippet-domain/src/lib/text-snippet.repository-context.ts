import { PlatformRepositoryContext } from '@no-ceiling-duc-interview-testing-web/no-ceiling-platform-core';
import { BehaviorSubject } from 'rxjs';

import { TextSnippetDataModel } from './DataModels';

export class TextSnippetRepositoryContext extends PlatformRepositoryContext {
  public textSnippetSubject: BehaviorSubject<Dictionary<TextSnippetDataModel>> = new BehaviorSubject({});
}
