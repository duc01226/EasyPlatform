# EasyPlatform-Example

This is a sample .Net Core application, based on microservices architecture and Docker containers.

## Getting Started

Make sure you have [installed](https://docs.docker.com/docker-for-windows/install/) docker in your environment. After that, you can run the below commands from the **/src/** directory and get started with the `EasyPlatform-Example` immediately.

```powershell
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p EasyPlatform-Example build
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p EasyPlatform-Example up
```

Start infrastructure only

```powershell
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p EasyPlatform-Example build sql-data
docker-compose -f platform-example-app.docker-compose.yml -f platform-example-app.docker-compose.override.yml -p EasyPlatform-Example up sql-data
```

### Urls

- Api Server: [http://localhost:5001](http://localhost:5001)
- Client: [http://localhost:4001](http://localhost:4001)

## Backend Architecture overview

This is an example application using Microservice + DDD/CQRS patterns using MediatR, implementing domain events.
This is inspired by:

![alt](img/eShopOnContainers-architecture.png)

The example TextSnippet service use [Clean Architect](https://matthewrenze.com/presentations/clean-architecture/) patterns.
![alt](img/clean-architect.PNG)
It also use CQRS (Customized) pattern with MeidatR.
![alt](img/ServiceArchitect.PNG)
Project Dependencies Diagram
![alt](img/ProjectDependencies.PNG)

### Why am I doing this ?

Firstly, my top priority goal when develop software is product quality(user experiences, performance, less bugs) and team productivity(do more with less effort, be happy in working life, having time to do self learning).

To ensure that, I always focus on applying best practices, SOLID/OOP principle, clean code (code flow, functional programming), code reusing DRY(Don't repeat yourself). I also very interesting in DDD(Domain Driven Design) and Microservices.

The purpose is that I build some kind of a platform libraries to help developer can build and apply DDD + Microservice easily by reusing code for all micro-servicesin the project but still make it simple and clean.

We can start a single service applying this but still can do horizontal scale at anytime we need to when the domain getting bigger and bigger.

I also apply strictly DI with interface to follow the I(Inversion of control) in SOLID, which help us to upgrade, switch technical implementation easily.

I also modular (example: [TextSnippetApiAspNetCoreModule](src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api/TextSnippetApiAspNetCoreModule.cs)) for each project parts of a micro-service, which help doing register, config and init module, manage module dependencies as clean as possible.

### Features Implemented

- ✅ **EventBus/MessageBus Demo** - Complete implementation with RabbitMQ
    - Entity Event Producers/Consumers
    - Command Event Producers/Consumers
    - Domain Event Producers/Consumers
    - Free Format Messages (Event & Request patterns)
- ✅ **Inbox/Outbox Pattern** - Transactional message delivery
- ✅ **Recurring Jobs** - Hangfire-based background job demos
    - TestRecurringBackgroundJobExecutor
    - DemoPagedBackgroundJobExecutor
    - DemoBatchScrollingBackgroundJobExecutor
- ✅ **Multi-Database Support** - EF Core (SQL/PostgreSQL) and MongoDB persistence

### Future Enhancements

- Authentication (Identity) integration demo
- Third-party infrastructure demos (Email, Push Notifications)
- Full PWA implementation example

## Frontend Architecture overview

The purpose in the front-end is building platform to easily support code quality and productivity, easy to scale. Also it needs to support micro-frontend.

I also start to use [Nx workspace](https://nx.dev) to smooth the team development process.

Reactive Pattern, State Management (Ui/Data state, using Rxjs Observable), OnPush change detection, Presentation/Smart component, Api Service data caching.

Also for styling, I will use SCSS + BEM naming convention to follow OOP principle to help css clean and easy to manage and understand. ALL UI elements must have BEM classes (`block__element`) even without special styling. Modifiers use space-separated format: `block__element --modifier1 --modifier2` (e.g., `user-card__btn --primary --large`). Using Flex layout to help supporting UI for all screen size.

PWA (Progressive Web App using service worker) should be used too to enhance application performance and UX.

## References

[eShopOnContainers](https://github.com/dotnet-architecture/eShopOnContainers)
