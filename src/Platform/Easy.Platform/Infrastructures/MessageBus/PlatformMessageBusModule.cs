using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Infrastructures.MessageBus;

/// <summary>
/// Base abstract class for platform message bus modules that provides core infrastructure for message-based communication.
/// This module serves as the foundation for implementing different message bus providers (e.g., RabbitMQ, Azure Service Bus)
/// and handles the registration of common message bus components including producers, consumers, scanners, and routing configurations.
///
/// <para><strong>Architecture Overview:</strong></para>
/// <para>• Extends <see cref="PlatformInfrastructureModule"/> to integrate with the platform's modular architecture</para>
/// <para>• Automatically scans and registers all message bus producers implementing <see cref="IPlatformMessageBusProducer"/></para>
/// <para>• Automatically scans and registers all message bus consumers implementing <see cref="IPlatformMessageBusConsumer"/></para>
/// <para>• Registers routing key message classes implementing <see cref="IPlatformSelfRoutingKeyBusMessage"/></para>
/// <para>• Provides configuration factory for message bus settings</para>
///
/// <para><strong>Registration Process:</strong></para>
/// <para>1. Scans specified assemblies for all producer implementations</para>
/// <para>2. Scans specified assemblies for all consumer implementations</para>
/// <para>3. Registers self-routing key message types for automatic routing</para>
/// <para>4. Registers the message bus scanner service for runtime discovery</para>
/// <para>5. Creates and registers the message bus configuration</para>
///
/// <para><strong>Usage in Concrete Implementations:</strong></para>
/// <para>Concrete message bus modules (e.g., <c>PlatformRabbitMqMessageBusModule</c>) extend this class to:</para>
/// <para>• Register provider-specific services (connection pools, exchange providers, etc.)</para>
/// <para>• Configure provider-specific options and settings</para>
/// <para>• Initialize hosted services for message processing</para>
///
/// <para><strong>Configuration Pattern:</strong></para>
/// <para>The module uses a factory pattern for configuration creation, allowing derived classes to customize:</para>
/// <para>• Performance monitoring settings</para>
/// <para>• Development vs. production configurations</para>
/// <para>• Provider-specific options</para>
///
/// <para><strong>Example Implementation:</strong></para>
/// <code>
/// public class MyCustomMessageBusModule : PlatformMessageBusModule
/// {
///     protected override void InternalRegister(IServiceCollection services)
///     {
///         base.InternalRegister(services); // Register common components
///         services.Register&lt;IMyCustomProvider, MyCustomProvider&gt;();
///     }
///
///     protected override PlatformMessageBusConfig MessageBusConfigFactory(IServiceProvider sp)
///     {
///         return new PlatformMessageBusConfig
///         {
///             EnableLogConsumerProcessTime = true,
///             LogSlowProcessWarningTimeMilliseconds = 5000
///         };
///     }
/// }
/// </code>
///
/// <para><strong>Integration with CQRS:</strong></para>
/// <para>This module seamlessly integrates with the platform's CQRS implementation by:</para>
/// <para>• Supporting automatic registration of entity event producers</para>
/// <para>• Enabling command and query event message producers</para>
/// <para>• Providing inbox/outbox pattern support for reliable message processing</para>
/// <para>• Supporting domain event propagation across service boundaries</para>
/// </summary>
public abstract class PlatformMessageBusModule : PlatformInfrastructureModule
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformMessageBusModule"/> class.
    /// Sets up the base infrastructure module with service provider and configuration dependencies
    /// that will be used for service registration and module initialization.
    /// </summary>
    /// <param name="serviceProvider">The service provider used for resolving dependencies during module setup</param>
    /// <param name="configuration">The configuration instance containing application and infrastructure settings</param>
    protected PlatformMessageBusModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    /// <summary>
    /// Registers core message bus infrastructure components with the dependency injection container.
    /// This method implements the template method pattern, allowing derived classes to extend registration
    /// while ensuring all common message bus components are properly registered.
    ///
    /// <para><strong>Registration Process:</strong></para>
    /// <para>1. <strong>Producer Registration:</strong> Scans assemblies for all classes implementing <see cref="IPlatformMessageBusProducer"/>
    /// and registers them for dependency injection. Producers are responsible for sending messages to the message bus.</para>
    ///
    /// <para>2. <strong>Consumer Registration:</strong> Scans assemblies for all classes implementing <see cref="IPlatformMessageBusConsumer"/>
    /// and registers them for dependency injection. Consumers handle incoming messages from the message bus.</para>
    ///
    /// <para>3. <strong>Routing Key Message Registration:</strong> Scans assemblies for message classes implementing
    /// <see cref="IPlatformSelfRoutingKeyBusMessage"/> which provide their own routing keys for message routing.</para>
    ///
    /// <para>4. <strong>Scanner Service:</strong> Registers <see cref="IPlatformMessageBusScanner"/> as a singleton service
    /// for runtime discovery and analysis of message bus components, routing keys, and consumer bindings.</para>
    ///
    /// <para>5. <strong>Configuration Factory:</strong> Registers the message bus configuration using the factory pattern,
    /// allowing customization of performance monitoring, logging, and provider-specific settings.</para>
    ///
    /// <para><strong>Assembly Scanning:</strong></para>
    /// <para>The registration process uses convention-based scanning via <see cref="GetAssembliesForServiceScanning()"/>
    /// to automatically discover and register components without manual configuration. This enables:</para>
    /// <para>• Automatic discovery of new producers and consumers</para>
    /// <para>• Consistent registration patterns across services</para>
    /// <para>• Reduced boilerplate configuration code</para>
    /// </summary>
    /// <param name="serviceCollection">The service collection to register components with</param>
    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        serviceCollection.RegisterAllSelfImplementationFromType<IPlatformMessageBusProducer>(GetAssembliesForServiceScanning());
        serviceCollection.RegisterAllSelfImplementationFromType<IPlatformMessageBusConsumer>(GetAssembliesForServiceScanning());
        serviceCollection.RegisterAllFromType<IPlatformSelfRoutingKeyBusMessage>(GetAssembliesForServiceScanning());
        serviceCollection.RegisterIfServiceNotExist<IPlatformMessageBusScanner, PlatformMessageBusScanner>(ServiceLifeTime.Singleton);
        serviceCollection.Register(typeof(PlatformMessageBusConfig), MessageBusConfigFactory, ServiceLifeTime.Singleton);
    }

    /// <summary>
    /// Creates and configures the message bus configuration for the platform.
    /// This factory method provides default configuration settings optimized for different environments
    /// and can be overridden by derived classes to provide custom configuration.
    ///
    /// <para><strong>Default Configuration Behavior:</strong></para>
    /// <para>• <strong>Development Environment:</strong> Disables performance logging for faster development cycles and reduced log noise</para>
    /// <para>• <strong>Production Environment:</strong> Enables performance logging to monitor consumer processing times and detect performance issues</para>
    ///
    /// <para><strong>Performance Monitoring:</strong></para>
    /// <para>When <see cref="PlatformMessageBusConfig.EnableLogConsumerProcessTime"/> is enabled:</para>
    /// <para>• Tracks execution time for each message consumer</para>
    /// <para>• Logs warnings when consumers exceed the configured slow process warning threshold</para>
    /// <para>• Provides insights into message processing bottlenecks</para>
    /// <para>• Helps identify consumers that may need optimization</para>
    ///
    /// <para><strong>Customization Example:</strong></para>
    /// <code>
    /// protected override PlatformMessageBusConfig MessageBusConfigFactory(IServiceProvider sp)
    /// {
    ///     return new PlatformMessageBusConfig
    ///     {
    ///         EnableLogConsumerProcessTime = true,
    ///         LogSlowProcessWarningTimeMilliseconds = 2000, // Custom threshold
    ///         MaxConcurrentProcessing = 10 // Custom concurrency limit
    ///     };
    /// }
    /// </code>
    /// </summary>
    /// <param name="sp">The service provider for resolving additional dependencies if needed for configuration</param>
    /// <returns>A configured <see cref="PlatformMessageBusConfig"/> instance with appropriate settings for the current environment</returns>
    protected virtual PlatformMessageBusConfig MessageBusConfigFactory(IServiceProvider sp)
    {
        return new PlatformMessageBusConfig { EnableLogConsumerProcessTime = !PlatformEnvironment.IsDevelopment };
    }
}
