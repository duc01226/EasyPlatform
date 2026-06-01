# Order Submission Spec

The system persists each submission to MongoDB, then publishes an event to RabbitMQ.

Validation runs through the Angular reactive form before the request is accepted.

The read projection reads from MongoDB whenever a query arrives.

LEAK_IDENTIFIER: the command handler calls PlatformOrderRepository to write the record.

```gherkin
Feature: Submission events
  Scenario: queue receives the event
    Given a RabbitMQ queue is bound to the exchange
    When a submission is accepted
    Then the consumer processes the message
```
