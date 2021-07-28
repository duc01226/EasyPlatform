This folder will include implementation of PlatformCqrsEventHandler. 
These can handle any cqrs events, such as PlatformCqrsEntityEvent (Created/Updated/Deleted).
The handler could do anything. The most common is send message to event bus to notify PlatformCqrsEntityEvent.
