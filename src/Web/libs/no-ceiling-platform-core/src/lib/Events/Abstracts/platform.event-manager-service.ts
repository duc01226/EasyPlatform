import { Injectable, Type } from '@angular/core';

export abstract class PlatformEventManagerService {
  public abstract publish<TEvent extends PlatformEvent>(event: TEvent): void;
}

export abstract class PlatformEvent {
  public constructor(public name: string) {}
}

export abstract class PlatformEventHandler<TEvent extends PlatformEvent> {
  public abstract handle(event: TEvent): void;
}

@Injectable()
export class PlatformEventManagerServiceSubscriptionsMap extends Map<
  Type<PlatformEvent>,
  Type<PlatformEventHandler<PlatformEvent>>[]
> {}
