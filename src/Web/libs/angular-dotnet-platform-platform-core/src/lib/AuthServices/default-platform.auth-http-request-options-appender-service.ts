import { HttpClientOptions } from '../HttpServices';
import {
  PlatformAuthHttpRequestOptionsAppenderService,
} from './Abstracts/platform.auth-http-request-options-appender-service';

export class DefaultPlatformAuthHttpRequestOptionsAppenderService extends PlatformAuthHttpRequestOptionsAppenderService {
  public addAuthorization(options?: HttpClientOptions): HttpClientOptions {
    return options ?? {};
  }
}
