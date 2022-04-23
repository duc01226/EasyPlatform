import {
  IPlatformCommandDto,
  IPlatformResultDto,
  PlatformCommandDto,
  PlatformResultDto,
} from '@platform-example-web/platform-core';

import { ITextSnippetDataModel, TextSnippetDataModel } from '../data-models';

export interface ISaveTextSnippetCommandDto extends IPlatformCommandDto {
  data: ITextSnippetDataModel;
}

export class SaveTextSnippetCommandDto extends PlatformCommandDto implements ISaveTextSnippetCommandDto {
  public constructor(data?: Partial<ISaveTextSnippetCommandDto>) {
    super();
    this.data = data?.data ?? new TextSnippetDataModel();
  }
  public data: ITextSnippetDataModel;
}

export interface ISaveTextSnippetCommandResult extends IPlatformResultDto {
  savedData: ITextSnippetDataModel;
}

export class SaveTextSnippetCommandResult extends PlatformResultDto implements ISaveTextSnippetCommandResult {
  public constructor(data?: ISaveTextSnippetCommandResult) {
    super();
    this.savedData = new TextSnippetDataModel(data?.savedData);
  }
  public savedData: TextSnippetDataModel;
}
