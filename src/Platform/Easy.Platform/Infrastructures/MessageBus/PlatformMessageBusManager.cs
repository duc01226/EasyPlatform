using System.Reflection;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Infrastructures.MessageBus;

public interface IPlatformMessageBusManager
{
    /// <summary>
    /// Get all routing key pattern of all defined consumers
    /// </summary>
    List<Type> AllDefinedMessageBusConsumerTypes();

    /// <summary>
    /// Get all attribute of all defined consumers
    /// </summary>
    List<PlatformMessageBusConsumerAttribute> AllDefinedMessageBusConsumerAttributes();

    /// <summary>
    /// Get all default routing key for defined <see cref="IPlatformMessageBusFreeFormatMessageConsumer{TMessage}"/> consumers
    /// </summary>
    List<PlatformBusMessageRoutingKey> AllDefaultFreeFormatMessageRoutingKeyForDefinedConsumers();

    /// <summary>
    /// Get all binding routing key of all defined consumers
    /// </summary>
    List<string> AllDefinedMessageBusConsumerBindingRoutingKeys();

    /// <summary>
    /// Get all assemblies for scanning event bus message/consumer
    /// </summary>
    List<Assembly> GetScanAssemblies();
}

public class PlatformMessageBusManager : IPlatformMessageBusManager
{
    private readonly IServiceProvider serviceProvider;

    public PlatformMessageBusManager(IServiceProvider serviceProvider)
    {
        this.serviceProvider = serviceProvider;
    }

    public List<Type> AllDefinedMessageBusConsumerTypes()
    {
        return GetScanAssemblies()
            .SelectMany(p => p.GetTypes())
            .Where(p => p.IsAssignableTo(typeof(IPlatformMessageBusBaseConsumer)) && p.IsClass && !p.IsAbstract)
            .Distinct()
            .ToList();
    }

    public List<PlatformMessageBusConsumerAttribute> AllDefinedMessageBusConsumerAttributes()
    {
        return AllDefinedMessageBusConsumerTypes()
            .SelectMany(
                messageConsumerType => messageConsumerType
                    .GetCustomAttributes(true)
                    .OfType<PlatformMessageBusConsumerAttribute>()
                    .Select(
                        messageConsumerTypeAttribute => new
                        {
                            MessageConsumerTypeAttribute = messageConsumerTypeAttribute,
                            ConsumerBindingRoutingKey = messageConsumerTypeAttribute.GetConsumerBindingRoutingKey()
                        }))
            .GroupBy(p => p.ConsumerBindingRoutingKey, p => p.MessageConsumerTypeAttribute)
            .Select(group => group.First())
            .ToList();
    }

    public List<PlatformBusMessageRoutingKey> AllDefaultFreeFormatMessageRoutingKeyForDefinedConsumers()
    {
        return AllDefinedMessageBusConsumerTypes()
            .Where(messageBusConsumerType => !messageBusConsumerType.GetCustomAttributes<PlatformMessageBusConsumerAttribute>().Any())
            .Select(
                messageBusConsumerType =>
                    messageBusConsumerType.FindMatchedGenericType(typeof(IPlatformMessageBusConsumer<>)) ??
                    messageBusConsumerType.FindMatchedGenericType(typeof(IPlatformMessageBusFreeFormatMessageConsumer<>)))
            .Select(PlatformBuildDefaultFreeFormatMessageRoutingKeyHelper.BuildForConsumer)
            .Distinct()
            .ToList();
    }

    public List<string> AllDefinedMessageBusConsumerBindingRoutingKeys()
    {
        return AllDefinedMessageBusConsumerAttributes()
            .Select(p => p.GetConsumerBindingRoutingKey())
            .Concat(AllDefaultFreeFormatMessageRoutingKeyForDefinedConsumers().Select(p => p.ToString()))
            .Distinct()
            .ToList();
    }

    public List<Assembly> GetScanAssemblies()
    {
        return serviceProvider.GetServices<PlatformModule>()
            .Where(p => !p.GetType().IsAssignableTo(typeof(PlatformInfrastructureModule)))
            .Select(p => p.Assembly)
            .ToList();
    }
}
