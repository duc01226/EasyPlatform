import { IPlatformDataModel, PlatformDataModel } from '@angular-dotnet-platform-example-web/angular-dotnet-platform-platform-core';

export interface ITextSnippetDataModel extends IPlatformDataModel {
  snippetText: string;
  fullText: string;
}

export class TextSnippetDataModel extends PlatformDataModel implements ITextSnippetDataModel {
  public constructor(data?: Partial<ITextSnippetDataModel>) {
    super(data);
    this.snippetText = data?.snippetText ?? '';
    this.fullText = data?.fullText ?? '';
  }

  public snippetText: string;
  public fullText: string;
}
