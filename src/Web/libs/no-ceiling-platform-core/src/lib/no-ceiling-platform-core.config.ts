export interface INoCeilingPlatformCoreModuleConfig {
  isDevelopment: boolean;
  httpRequestTimeoutInSeconds: number;
  multiThemeConfig: INoCeilingPlatformMultiThemeModuleConfig;
  maxNumberOfCacheItemPerApiRequest: number;
}

export class NoCeilingPlatformCoreModuleConfig implements INoCeilingPlatformCoreModuleConfig {
  public constructor(data?: Partial<INoCeilingPlatformCoreModuleConfig>) {
    this.isDevelopment = data?.isDevelopment ?? true;
    this.httpRequestTimeoutInSeconds = data?.httpRequestTimeoutInSeconds ?? 60;
    this.multiThemeConfig = data?.multiThemeConfig
      ? new NoCeilingPlatformMultiThemeModuleConfig(data.multiThemeConfig)
      : new NoCeilingPlatformMultiThemeModuleConfig();
    this.maxNumberOfCacheItemPerApiRequest = data?.maxNumberOfCacheItemPerApiRequest ?? 10;
  }

  public isDevelopment: boolean;
  public httpRequestTimeoutInSeconds: number;
  public multiThemeConfig: NoCeilingPlatformMultiThemeModuleConfig;
  public maxNumberOfCacheItemPerApiRequest: number;
}

export interface INoCeilingPlatformMultiThemeModuleConfig {
  isActivated: boolean;
  defaultThemeName: string;
  themeQueryParamName: string;
}

export class NoCeilingPlatformMultiThemeModuleConfig implements INoCeilingPlatformMultiThemeModuleConfig {
  public constructor(data?: Partial<INoCeilingPlatformMultiThemeModuleConfig>) {
    this.isActivated = data?.isActivated ?? false;
    this.defaultThemeName = data?.defaultThemeName ?? 'default-theme';
    this.themeQueryParamName = data?.themeQueryParamName ?? 'theme';
  }

  public isActivated: boolean;
  public defaultThemeName: string;
  public themeQueryParamName: string;
}
