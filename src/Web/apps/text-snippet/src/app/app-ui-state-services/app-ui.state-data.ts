export interface IAppUiStateData {
  selectedSnippetTextId?: string;
}
export class AppUiStateData implements IAppUiStateData {
  public constructor(data?: Partial<IAppUiStateData>) {
    this.selectedSnippetTextId = data?.selectedSnippetTextId;
  }
  public selectedSnippetTextId?: string;
}
