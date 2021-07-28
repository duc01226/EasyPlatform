import { Inject, Injectable, Injector, Type } from '@angular/core';

import {
  PlatformEvent,
  PlatformEventManagerService,
  PlatformEventManagerServiceSubscriptionsMap,
} from './Abstracts/platform.event-manager-service';

@Injectable()
export class DefaultPlatformEventManagerService extends PlatformEventManagerService {
  public constructor(
    private injector: Injector,
    @Inject(PlatformEventManagerServiceSubscriptionsMap)
    private subscriptionsMaps: PlatformEventManagerServiceSubscriptionsMap[]
  ) {
    super();
    this.aggregatedSubscriptionsMap = this.buildAggregatedSubscriptionsMap();
  }

  private aggregatedSubscriptionsMap: PlatformEventManagerServiceSubscriptionsMap;

  public publish<TEvent extends PlatformEvent>(event: TEvent): void {
    const currentEventHandlerTypes = this.aggregatedSubscriptionsMap.get(<Type<PlatformEvent>>event.constructor) ?? [];
    currentEventHandlerTypes.forEach(currentEventHandlerType => {
      const currentEventHandlerInstance = this.injector.get(currentEventHandlerType);
      if (currentEventHandlerInstance == null) {
        throw new Error(`The event handler ${currentEventHandlerType.name} has not been registered.
          Please register it in providers.`);
      } else {
        currentEventHandlerInstance.handle(event);
      }
    });
  }

  private buildAggregatedSubscriptionsMap(): PlatformEventManagerServiceSubscriptionsMap {
    let finalResult = new PlatformEventManagerServiceSubscriptionsMap();

    this.subscriptionsMaps.forEach(subscriptionsMap => {
      subscriptionsMap.forEach((currentEventHandlerTypes, currentEventType) => {
        let existedEventTypeItemValues = finalResult.get(currentEventType);
        if (existedEventTypeItemValues != null) {
          let combinedEventHandlerTypes = existedEventTypeItemValues.concat(currentEventHandlerTypes);
          finalResult.set(currentEventType, combinedEventHandlerTypes);
        } else {
          finalResult.set(currentEventType, currentEventHandlerTypes);
        }
      });
    });

    return finalResult;
  }
}
