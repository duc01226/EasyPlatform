export interface IAngularDotnetPlatformPlatformDomainModuleConfig {
  isDevelopment: boolean;
}

export class AngularDotnetPlatformPlatformDomainModuleConfig implements IAngularDotnetPlatformPlatformDomainModuleConfig {
  public constructor(data?: Partial<IAngularDotnetPlatformPlatformDomainModuleConfig>) {
    this.isDevelopment = data?.isDevelopment ?? true;
  }

  public isDevelopment: boolean;
}
