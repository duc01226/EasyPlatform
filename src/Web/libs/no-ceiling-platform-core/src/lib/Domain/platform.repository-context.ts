export abstract class PlatformRepositoryContext {
  public loadedRequestDataDic: Dictionary<unknown> = {};
  public loadedRequestRefreshFnDic: Dictionary<() => void> = {};
  public loadedRequestSubscriberCountDic: Dictionary<number> = {};
}
