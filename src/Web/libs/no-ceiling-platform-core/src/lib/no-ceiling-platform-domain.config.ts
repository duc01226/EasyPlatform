export interface INoCeilingPlatformDomainModuleConfig {
  isDevelopment: boolean;
}

export class NoCeilingPlatformDomainModuleConfig implements INoCeilingPlatformDomainModuleConfig {
  public constructor(data?: Partial<INoCeilingPlatformDomainModuleConfig>) {
    this.isDevelopment = data?.isDevelopment ?? true;
  }

  public isDevelopment: boolean;
}
