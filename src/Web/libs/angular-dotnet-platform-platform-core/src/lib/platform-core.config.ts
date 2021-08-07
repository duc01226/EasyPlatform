export interface IAngularDotnetPlatformPlatformCoreModuleConfig {
  isDevelopment: boolean;
  httpRequestTimeoutInSeconds: number;
  multiThemeConfig: IAngularDotnetPlatformPlatformMultiThemeModuleConfig;
  maxCacheRequestDataPerApiRequestName: number;
}

export class AngularDotnetPlatformPlatformCoreModuleConfig implements IAngularDotnetPlatformPlatformCoreModuleConfig {
  public static readonly defaultMaxCacheRequestDataPerApiRequestName: number = 1;

  public constructor(data?: Partial<IAngularDotnetPlatformPlatformCoreModuleConfig>) {
    this.isDevelopment = data?.isDevelopment ?? true;
    this.httpRequestTimeoutInSeconds = data?.httpRequestTimeoutInSeconds ?? 60;
    this.multiThemeConfig = data?.multiThemeConfig
      ? new AngularDotnetPlatformPlatformMultiThemeModuleConfig(data.multiThemeConfig)
      : new AngularDotnetPlatformPlatformMultiThemeModuleConfig();
    this.maxCacheRequestDataPerApiRequestName =
      data?.maxCacheRequestDataPerApiRequestName ??
      AngularDotnetPlatformPlatformCoreModuleConfig.defaultMaxCacheRequestDataPerApiRequestName;
  }

  public isDevelopment: boolean;
  public httpRequestTimeoutInSeconds: number;
  public multiThemeConfig: AngularDotnetPlatformPlatformMultiThemeModuleConfig;
  public maxCacheRequestDataPerApiRequestName: number;
}

export interface IAngularDotnetPlatformPlatformMultiThemeModuleConfig {
  isActivated: boolean;
  defaultThemeName: string;
  themeQueryParamName: string;
}

export class AngularDotnetPlatformPlatformMultiThemeModuleConfig
  implements IAngularDotnetPlatformPlatformMultiThemeModuleConfig {
  public constructor(data?: Partial<IAngularDotnetPlatformPlatformMultiThemeModuleConfig>) {
    this.isActivated = data?.isActivated ?? false;
    this.defaultThemeName = data?.defaultThemeName ?? 'default-theme';
    this.themeQueryParamName = data?.themeQueryParamName ?? 'theme';
  }

  public isActivated: boolean;
  public defaultThemeName: string;
  public themeQueryParamName: string;
}
