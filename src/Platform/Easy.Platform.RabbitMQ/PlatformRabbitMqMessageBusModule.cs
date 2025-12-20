using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.RabbitMQ;

/// <summary>
/// RabbitMQ-specific implementation of the platform message bus module that provides complete message processing infrastructure
/// using RabbitMQ as the underlying message broker. This module extends <see cref="PlatformMessageBusModule"/> to add
/// RabbitMQ-specific services, connection management, exchange configuration, and hosted services for reliable message processing.
///
/// <para><strong>Core Responsibilities:</strong></para>
/// <para>• <strong>Connection Management:</strong> Manages RabbitMQ connection pools for both producers and consumers</para>
/// <para>• <strong>Exchange Configuration:</strong> Provides exchange management and routing key handling</para>
/// <para>• <strong>Message Processing:</strong> Initializes and coordinates the RabbitMQ message processing pipeline</para>
/// <para>• <strong>Hosted Services:</strong> Registers background services for message processing, queue management, and monitoring</para>
/// <para>• <strong>Distributed Tracing:</strong> Configures tracing sources for message flow monitoring and debugging</para>
///
/// <para><strong>Architecture Integration:</strong></para>
/// <para>This module integrates with multiple platform subsystems:</para>
/// <para>• <strong>CQRS Events:</strong> Supports automatic entity event, command event, and domain event publishing</para>
/// <para>• <strong>Inbox/Outbox Patterns:</strong> Provides reliable message processing with transactional guarantees</para>
/// <para>• <strong>Request Context:</strong> Maintains request context across service boundaries for tracing and correlation</para>
/// <para>• <strong>Unit of Work:</strong> Integrates with transaction management for consistent data and message processing</para>
///
/// <para><strong>Service Registration Process:</strong></para>
/// <para>1. <strong>Base Registration:</strong> Calls base class to register common message bus components</para>
/// <para>2. <strong>Connection Pools:</strong> Registers singleton connection pools for producers and consumers</para>
/// <para>3. <strong>Exchange Provider:</strong> Registers the RabbitMQ exchange provider for routing configuration</para>
/// <para>4. <strong>Options Factory:</strong> Registers RabbitMQ-specific configuration options</para>
/// <para>5. <strong>Producer Service:</strong> Registers the RabbitMQ message bus producer implementation</para>
/// <para>6. <strong>Process Initializer:</strong> Registers the singleton process initializer service</para>
/// <para>7. <strong>Hosted Services:</strong> Registers the startup hosted service for automatic initialization</para>
///
/// <para><strong>Initialization Workflow:</strong></para>
/// <para>During module initialization, the following sequence occurs:</para>
/// <para>1. Base module initialization completes</para>
/// <para>2. RabbitMQ process initializer starts in background</para>
/// <para>3. Exchanges and queues are declared based on consumer configurations</para>
/// <para>4. Consumer channels are established and message listening begins</para>
/// <para>5. Inbox/Outbox pattern services start for reliable message processing</para>
///
/// <para><strong>Distributed Tracing Support:</strong></para>
/// <para>The module provides comprehensive tracing through:</para>
/// <para>• <strong>Producer Tracing:</strong> Tracks message publishing operations with correlation IDs</para>
/// <para>• <strong>Consumer Tracing:</strong> Monitors message processing times and completion status</para>
/// <para>• <strong>Process Initialization:</strong> Traces queue and exchange setup operations</para>
/// <para>• <strong>Cross-Service Correlation:</strong> Maintains trace context across service boundaries</para>
///
/// <para><strong>Example Usage in Service:</strong></para>
/// <code>
/// public class MyServiceRabbitMqModule : PlatformRabbitMqMessageBusModule
/// {
///     public MyServiceRabbitMqModule(IServiceProvider serviceProvider, IConfiguration configuration)
///         : base(serviceProvider, configuration) { }
///
///     protected override PlatformRabbitMqOptions RabbitMqOptionsFactory(IServiceProvider serviceProvider)
///     {
///         return Configuration.GetSection("RabbitMqOptions")
///             .Get&lt;PlatformRabbitMqOptions&gt;()
///             .With(options => options.ClientProvidedName = "MyService");
///     }
///
///     protected override PlatformMessageBusConfig MessageBusConfigFactory(IServiceProvider sp)
///     {
///         return new PlatformMessageBusConfig
///         {
///             EnableLogConsumerProcessTime = true,
///             LogSlowProcessWarningTimeMilliseconds = 3000,
///             MaxConcurrentProcessing = 20
///         };
///     }
/// }
/// </code>
///
/// <para><strong>Performance Considerations:</strong></para>
/// <para>• <strong>Connection Pooling:</strong> Uses separate connection pools for producers and consumers to optimize throughput</para>
/// <para>• <strong>Singleton Services:</strong> Critical services are registered as singletons to minimize resource overhead</para>
/// <para>• <strong>Background Processing:</strong> Process initialization runs in background to avoid blocking application startup</para>
/// <para>• <strong>Concurrent Processing:</strong> Supports configurable concurrent message processing limits</para>
///
/// <para><strong>Reliability Features:</strong></para>
/// <para>• <strong>Process Coordination:</strong> Ensures proper startup sequencing with dependency management</para>
/// <para>• <strong>Connection Recovery:</strong> Automatic connection recovery and retry mechanisms</para>
/// <para>• <strong>Message Acknowledgment:</strong> Proper message acknowledgment patterns for delivery guarantees</para>
/// <para>• <strong>Error Handling:</strong> Comprehensive error handling with retry and dead letter support</para>
/// </summary>
public abstract class PlatformRabbitMqMessageBusModule : PlatformMessageBusModule
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformRabbitMqMessageBusModule"/> class.
    /// Sets up the RabbitMQ-specific message bus module with the necessary service provider and configuration
    /// dependencies for RabbitMQ connection management and message processing.
    /// </summary>
    /// <param name="serviceProvider">The service provider used for resolving dependencies during module setup and service registration</param>
    /// <param name="configuration">The configuration instance containing RabbitMQ connection settings, exchange configurations, and module-specific options</param>
    protected PlatformRabbitMqMessageBusModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    /// <summary>
    /// Configures distributed tracing sources for comprehensive monitoring of RabbitMQ message processing operations.
    /// This method defines the tracing sources that will be used to instrument message publishing, consumption,
    /// and infrastructure operations for observability and debugging purposes.
    ///
    /// <para><strong>Tracing Sources:</strong></para>
    /// <para>• <strong>Message Bus Producer:</strong> Traces message publishing operations including routing, serialization, and delivery</para>
    /// <para>• <strong>Process Initializer:</strong> Traces infrastructure setup operations like exchange declaration, queue binding, and consumer startup</para>
    ///
    /// <para><strong>Observability Benefits:</strong></para>
    /// <para>• Enables end-to-end message flow tracking across services</para>
    /// <para>• Provides performance insights for message processing operations</para>
    /// <para>• Facilitates debugging of message routing and delivery issues</para>
    /// <para>• Supports correlation of messages with business operations</para>
    /// </summary>
    /// <returns>An array of activity source names for distributed tracing configuration</returns>
    public override string[] TracingSources()
    {
        return [IPlatformMessageBusProducer.ActivitySource.Name, PlatformRabbitMqProcessInitializerService.ActivitySource.Name];
    }

    /// <summary>
    /// Registers RabbitMQ-specific services and infrastructure components with the dependency injection container.
    /// This method extends the base message bus registration to add RabbitMQ connection management, exchange providers,
    /// message producers, and hosted services required for complete RabbitMQ message processing functionality.
    ///
    /// <para><strong>Registration Sequence:</strong></para>
    /// <para>1. <strong>Base Registration:</strong> Calls base class to register common message bus components (producers, consumers, scanners)</para>
    /// <para>2. <strong>Connection Pool Registration:</strong> Registers singleton connection pools for both producers and consumers</para>
    /// <para>3. <strong>Exchange Provider:</strong> Registers the RabbitMQ exchange provider for routing and topology management</para>
    /// <para>4. <strong>Options Factory:</strong> Registers RabbitMQ connection options using the factory pattern</para>
    /// <para>5. <strong>Producer Implementation:</strong> Registers the concrete RabbitMQ message bus producer</para>
    /// <para>6. <strong>Process Initializer:</strong> Registers the singleton service responsible for RabbitMQ infrastructure setup</para>
    /// <para>7. <strong>Hosted Services:</strong> Registers background services for automatic startup and lifecycle management</para>
    ///
    /// <para><strong>Connection Pool Strategy:</strong></para>
    /// <para>Separate connection pools are used for producers and consumers to optimize performance:</para>
    /// <para>• <strong>Producer Pool:</strong> Optimized for high-throughput message publishing with minimal latency</para>
    /// <para>• <strong>Consumer Pool:</strong> Optimized for long-lived connections with proper channel lifecycle management</para>
    ///
    /// <para><strong>Singleton Services Rationale:</strong></para>
    /// <para>Critical services are registered as singletons to ensure:</para>
    /// <para>• Efficient resource utilization with shared connections</para>
    /// <para>• Consistent configuration across the application</para>
    /// <para>• Proper coordination of infrastructure initialization</para>
    /// <para>• Centralized monitoring and management capabilities</para>
    /// </summary>
    /// <param name="serviceCollection">The service collection to register RabbitMQ-specific components with</param>
    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        // PlatformRabbitMqChannelPool hold rabbitmq connection which should be singleton
        serviceCollection.Register<PlatformProducerRabbitMqChannelPool>(ServiceLifeTime.Singleton);
        serviceCollection.Register<PlatformConsumerRabbitMqChannelPool>(ServiceLifeTime.Singleton);

        serviceCollection.Register<IPlatformRabbitMqExchangeProvider, PlatformRabbitMqExchangeProvider>(ServiceLifeTime.Singleton);
        serviceCollection.Register(RabbitMqOptionsFactory, ServiceLifeTime.Singleton);
        serviceCollection.Register<IPlatformMessageBusProducer, PlatformRabbitMqMessageBusProducer>();
        serviceCollection.Register<PlatformRabbitMqProcessInitializerService>(ServiceLifeTime.Singleton);
        serviceCollection.RegisterHostedService<PlatformRabbitMqStartProcessHostedService>();
    }

    /// <summary>
    /// Initializes the RabbitMQ message processing infrastructure in the background after module registration is complete.
    /// This method coordinates the startup sequence to ensure proper initialization order and avoid blocking the main
    /// application startup process while RabbitMQ infrastructure is being established.
    ///
    /// <para><strong>Initialization Strategy:</strong></para>
    /// <para>The initialization process is designed to be non-blocking and resilient:</para>
    /// <para>• Calls base initialization to complete common message bus setup</para>
    /// <para>• Starts the RabbitMQ process initializer in a background task</para>
    /// <para>• Allows the application to continue startup while infrastructure initializes</para>
    /// <para>• Provides proper error handling and logging for initialization failures</para>
    ///
    /// <para><strong>Background Process Benefits:</strong></para>
    /// <para>• <strong>Non-blocking Startup:</strong> Application startup is not delayed by RabbitMQ connection establishment</para>
    /// <para>• <strong>Fault Tolerance:</strong> Initialization failures don't prevent application startup</para>
    /// <para>• <strong>Retry Capability:</strong> Background process can implement retry logic for connection failures</para>
    /// <para>• <strong>Monitoring Support:</strong> Separate initialization process enables better monitoring and diagnostics</para>
    ///
    /// <para><strong>Coordination with Dependencies:</strong></para>
    /// <para>The initialization process coordinates with other platform components:</para>
    /// <para>• Waits for database connections to be established</para>
    /// <para>• Ensures configuration services are available</para>
    /// <para>• Verifies that dependent modules have completed initialization</para>
    /// <para>• Starts inbox/outbox pattern services after core infrastructure is ready</para>
    ///
    /// <para><strong>Error Handling:</strong></para>
    /// <para>Initialization errors are handled gracefully:</para>
    /// <para>• Connection failures are logged with appropriate detail</para>
    /// <para>• Retry mechanisms are employed for transient failures</para>
    /// <para>• Fatal errors are reported but don't crash the application</para>
    /// <para>• Health checks can monitor initialization status</para>
    /// </summary>
    /// <param name="serviceScope">The service scope providing access to registered services for initialization</param>
    /// <returns>A task representing the asynchronous initialization operation</returns>
    protected override async Task InternalInit(IServiceScope serviceScope)
    {
        await base.InternalInit(serviceScope);

        ServiceProvider.ExecuteInjectScopedInBackgroundAsync(
            () => ServiceProvider.GetRequiredService<PlatformRabbitMqProcessInitializerService>().StartProcess(CancellationToken.None)
        );
    }

    /// <summary>
    /// Factory method that creates and configures RabbitMQ-specific connection options for the message bus.
    /// This abstract method must be implemented by derived classes to provide connection settings, client identification,
    /// and RabbitMQ-specific configuration options tailored to each service's requirements.
    ///
    /// <para><strong>Configuration Responsibilities:</strong></para>
    /// <para>Implementing classes should configure:</para>
    /// <para>• <strong>Connection Settings:</strong> Host, port, virtual host, and authentication credentials</para>
    /// <para>• <strong>Client Identification:</strong> Unique client name for connection monitoring and debugging</para>
    /// <para>• <strong>Performance Tuning:</strong> Connection limits, heartbeat intervals, and timeout settings</para>
    /// <para>• <strong>Security Configuration:</strong> SSL/TLS settings and authentication mechanisms</para>
    /// <para>• <strong>High Availability:</strong> Multiple host configurations for clustering support</para>
    ///
    /// <para><strong>Common Configuration Pattern:</strong></para>
    /// <code>
    /// protected override PlatformRabbitMqOptions RabbitMqOptionsFactory(IServiceProvider serviceProvider)
    /// {
    ///     var appContext = serviceProvider.GetService&lt;IPlatformApplicationSettingContext&gt;();
    ///
    ///     return Configuration.GetSection("RabbitMqOptions")
    ///         .Get&lt;PlatformRabbitMqOptions&gt;()
    ///         .With(options =>
    ///         {
    ///             options.ClientProvidedName = appContext.ApplicationName;
    ///             options.MaxConcurrentProcessing = 50;
    ///             options.AutomaticRecoveryEnabled = true;
    ///         });
    /// }
    /// </code>
    ///
    /// <para><strong>Security Considerations:</strong></para>
    /// <para>• Use secure credential storage (Azure Key Vault, environment variables)</para>
    /// <para>• Configure appropriate user permissions and virtual host access</para>
    /// <para>• Enable SSL/TLS for production environments</para>
    /// <para>• Implement proper connection string validation</para>
    ///
    /// <para><strong>Environment-Specific Configuration:</strong></para>
    /// <para>• Development: Local RabbitMQ with simplified authentication</para>
    /// <para>• Testing: Isolated virtual hosts for test isolation</para>
    /// <para>• Production: Clustered setup with high availability and monitoring</para>
    /// </summary>
    /// <param name="serviceProvider">The service provider for resolving configuration dependencies and application context</param>
    /// <returns>A configured <see cref="PlatformRabbitMqOptions"/> instance with connection and performance settings</returns>
    protected abstract PlatformRabbitMqOptions RabbitMqOptionsFactory(IServiceProvider serviceProvider);
}
