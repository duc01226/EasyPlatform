export class PlatformCoreModuleConfig {
    public DEFAULT_TIMEOUT_SECONDS = 3600 * 24;
    public static readonly defaultMaxCacheRequestDataPerApiRequestName: number = 1;
    public static readonly defaultApiGetCacheTimeToLiveSeconds = 3600 * 24;

    public constructor(data?: Partial<PlatformCoreModuleConfig>) {
        this.isDevelopment = data?.isDevelopment ?? false;
        this.disableMissingTranslationWarnings = data?.disableMissingTranslationWarnings ?? false;
        this.httpRequestTimeoutInSeconds = data?.httpRequestTimeoutInSeconds ?? this.DEFAULT_TIMEOUT_SECONDS;
        this.maxCacheRequestDataPerApiRequestName =
            data?.maxCacheRequestDataPerApiRequestName ?? PlatformCoreModuleConfig.defaultMaxCacheRequestDataPerApiRequestName;
    }

    public isDevelopment: boolean = false;
    public disableMissingTranslationWarnings: boolean = false;
    public httpRequestTimeoutInSeconds: number = this.DEFAULT_TIMEOUT_SECONDS;
    public maxCacheRequestDataPerApiRequestName: number = PlatformCoreModuleConfig.defaultMaxCacheRequestDataPerApiRequestName;
    public apiGetCacheTimeToLiveSeconds: number = PlatformCoreModuleConfig.defaultApiGetCacheTimeToLiveSeconds;
}
