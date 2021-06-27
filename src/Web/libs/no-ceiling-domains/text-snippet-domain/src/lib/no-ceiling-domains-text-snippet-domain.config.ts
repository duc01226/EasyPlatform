import {
  INoCeilingPlatformDomainModuleConfig,
  NoCeilingPlatformDomainModuleConfig,
} from '@no-ceiling-duc-interview-testing-web/no-ceiling-platform-core';

export interface INoCeilingDomainsTextSnippetDomainModuleConfig extends INoCeilingPlatformDomainModuleConfig {
  textSnippetApiHost: string;
}

export class NoCeilingDomainsTextSnippetDomainModuleConfig
  extends NoCeilingPlatformDomainModuleConfig
  implements INoCeilingDomainsTextSnippetDomainModuleConfig {
  public constructor(data?: Partial<INoCeilingDomainsTextSnippetDomainModuleConfig>) {
    super(data);

    this.textSnippetApiHost = data?.textSnippetApiHost ?? '';
  }

  public textSnippetApiHost: string;
}
