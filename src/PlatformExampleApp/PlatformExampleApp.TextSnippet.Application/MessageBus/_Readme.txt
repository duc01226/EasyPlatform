FreeFormatMessage naming convention rule:

For Event Message (Producer is LEADER):
[ProducerServiceName][EventNameXXXSomethingHappened (Verb-ed)]EventBusMessage
Example: AccountUserCreatedEventBusMessage (Account is service name. UserCreated is event name. EventBusMessage is suffix)

For Request Message (Receiver is LEADER):
[ReceiverServiceName][Verb Do something XXXX]RequestBusMessage
Example: EmailSendEmailRequestBusMessage (Email is service name. SendEmail is request name. RequestBusMessage is suffix)
Example: AccountCreateUserRequestBusMessage (Account is service name. CreateUser is request name. RequestBusMessage is suffix)

HOW EVENT PRODUCER WORKS:
It's actually an cqrs event handler. It listen the event, handling event by send the suitable bus message based on that cqrs event.
