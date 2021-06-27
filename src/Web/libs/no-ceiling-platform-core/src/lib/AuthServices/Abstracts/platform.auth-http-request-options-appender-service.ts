import { HttpClientOptions } from '../../HttpServices';

export abstract class PlatformAuthHttpRequestOptionsAppenderService {
  public abstract addAuthorization(options?: HttpClientOptions): HttpClientOptions;
}
