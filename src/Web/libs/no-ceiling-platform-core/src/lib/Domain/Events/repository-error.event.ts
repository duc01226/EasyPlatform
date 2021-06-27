import { PlatformApiServiceErrorResponse } from '../../ApiServices';
import { PlatformEvent } from '../../Events';

export class PlatformRepositoryErrorEvent extends PlatformEvent {
  public constructor(
    public repositoryRequestName: string,
    public repositoryRequestPayload: unknown,
    public apiError: PlatformApiServiceErrorResponse
  ) {
    super(repositoryRequestName);
  }
}
