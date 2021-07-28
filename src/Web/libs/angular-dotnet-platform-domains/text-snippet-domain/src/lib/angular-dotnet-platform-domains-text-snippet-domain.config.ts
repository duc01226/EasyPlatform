import {
  AngularDotnetPlatformPlatformDomainModuleConfig,
  IAngularDotnetPlatformPlatformDomainModuleConfig,
} from '@angular-dotnet-platform-example-web/angular-dotnet-platform-platform-core';

export interface IAngularDotnetPlatformDomainsTextSnippetDomainModuleConfig extends IAngularDotnetPlatformPlatformDomainModuleConfig {
  textSnippetApiHost: string;
}

export class AngularDotnetPlatformDomainsTextSnippetDomainModuleConfig
  extends AngularDotnetPlatformPlatformDomainModuleConfig
  implements IAngularDotnetPlatformDomainsTextSnippetDomainModuleConfig {
  public constructor(data?: Partial<IAngularDotnetPlatformDomainsTextSnippetDomainModuleConfig>) {
    super(data);

    this.textSnippetApiHost = data?.textSnippetApiHost ?? '';
  }

  public textSnippetApiHost: string;
}
