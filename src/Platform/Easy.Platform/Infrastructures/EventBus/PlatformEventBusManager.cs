using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using Easy.Platform.Common.Utils;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Infrastructures.EventBus
{
    public interface IPlatformEventBusManager
    {
        /// <summary>
        /// Get all routing key pattern of all defined consumers
        /// </summary>
        List<Type> AllDefinedEventBusConsumerTypes();

        /// <summary>
        /// Get all attribute of all defined consumers
        /// </summary>
        List<PlatformEventBusConsumerAttribute> AllDefinedEventBusConsumerAttributes();

        /// <summary>
        /// Get all default routing key for defined <see cref="IPlatformEventBusFreeFormatMessageConsumer{TMessage}"/> consumers
        /// </summary>
        List<PlatformEventBusMessageRoutingKey> AllDefaultFreeFormatMessageRoutingKeyForDefinedConsumers();

        /// <summary>
        /// Get all binding routing key of all defined consumers
        /// </summary>
        List<string> AllDefinedEventBusConsumerBindingRoutingKeys();

        ///// <summary>
        ///// Get routing keys for all defined message to be produced
        ///// </summary>
        //List<string> AllDefinedEventBusMessageRoutingKeys();
    }

    public class PlatformEventBusManager : IPlatformEventBusManager
    {
        private readonly IServiceProvider serviceProvider;

        public PlatformEventBusManager(IServiceProvider serviceProvider)
        {
            this.serviceProvider = serviceProvider;
        }

        public List<Type> AllDefinedEventBusConsumerTypes()
        {
            return GetScanAssemblies()
                .SelectMany(p => p.GetTypes())
                .Where(p => p.IsAssignableTo(typeof(IPlatformEventBusBaseConsumer)) && p.IsClass && !p.IsAbstract)
                .Distinct()
                .ToList();
        }

        public List<PlatformEventBusConsumerAttribute> AllDefinedEventBusConsumerAttributes()
        {
            return AllDefinedEventBusConsumerTypes()
                .SelectMany(messageConsumerType => messageConsumerType
                    .GetCustomAttributes(true)
                    .OfType<PlatformEventBusConsumerAttribute>()
                    .Select(messageConsumerTypeAttribute => new
                    {
                        MessageConsumerTypeAttribute = messageConsumerTypeAttribute,
                        ConsumerBindingRoutingKey = messageConsumerTypeAttribute.GetConsumerBindingRoutingKey()
                    }))
                .GroupBy(p => p.ConsumerBindingRoutingKey, p => p.MessageConsumerTypeAttribute)
                .Select(group => group.First())
                .ToList();
        }

        public List<PlatformEventBusMessageRoutingKey> AllDefaultFreeFormatMessageRoutingKeyForDefinedConsumers()
        {
            return AllDefinedEventBusConsumerTypes()
                .Where(p => !p.GetCustomAttributes<PlatformEventBusConsumerAttribute>().Any())
                .Select(p =>
                    Util.Types.FindMatchedGenericType(
                        givenType: p,
                        matchedToGenericTypeDefinition: typeof(IPlatformEventBusConsumer<>).GetGenericTypeDefinition()) ??
                    Util.Types.FindMatchedGenericType(
                        givenType: p,
                        matchedToGenericTypeDefinition: typeof(IPlatformEventBusFreeFormatMessageConsumer<>).GetGenericTypeDefinition()))
                .Select(freeFormatMessageConsumerType => PlatformDefaultFreeFormatMessageRoutingKeyBuilder.Build(
                    messageType: freeFormatMessageConsumerType.GetGenericArguments()[0]))
                .Distinct()
                .ToList();
        }

        public List<string> AllDefinedEventBusConsumerBindingRoutingKeys()
        {
            return AllDefinedEventBusConsumerAttributes()
                .Select(p => p.GetConsumerBindingRoutingKey())
                .Concat(AllDefaultFreeFormatMessageRoutingKeyForDefinedConsumers().Select(p => p.ToString()))
                .Distinct()
                .ToList();
        }

        protected virtual List<Assembly> GetScanAssemblies()
        {
            return serviceProvider.GetServices<PlatformModule>()
                .Where(p => !p.GetType().IsAssignableTo(typeof(PlatformInfrastructureModule)))
                .Select(p => p.Assembly)
                .ToList();
        }
    }
}
