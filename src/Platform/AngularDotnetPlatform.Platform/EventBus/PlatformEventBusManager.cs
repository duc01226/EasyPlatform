using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using AngularDotnetPlatform.Platform.Application.EventBus.Producers;
using AngularDotnetPlatform.Platform.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Utils;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.EventBus
{
    public interface IPlatformEventBusManager
    {
        List<Assembly> EventBusScanAssemblies { get; }

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
        List<PlatformEventBusMessageRoutingKey> AllDefaultRoutingKeyForDefinedFreeFormatMessageConsumers();

        /// <summary>
        /// Get routing keys for all defined message to be produced
        /// </summary>
        List<string> AllDefinedEventBusMessageRoutingKeys();
    }

    public class PlatformEventBusManager : IPlatformEventBusManager
    {
        private readonly IPlatformEventBusAssemblyManager assemblyManager;
        private readonly IServiceProvider serviceProvider;

        public PlatformEventBusManager(IPlatformEventBusAssemblyManager assemblyManager, IServiceProvider serviceProvider)
        {
            this.assemblyManager = assemblyManager;
            this.serviceProvider = serviceProvider;
        }

        public List<Assembly> EventBusScanAssemblies => assemblyManager.EventBusScanAssemblies;

        public List<Type> AllDefinedEventBusConsumerTypes()
        {
            return EventBusScanAssemblies.SelectMany(p => p.GetTypes())
                .Where(p => p.IsAssignableTo(typeof(IPlatformEventBusConsumer)) && p.IsClass && !p.IsAbstract)
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

        public List<PlatformEventBusMessageRoutingKey> AllDefaultRoutingKeyForDefinedFreeFormatMessageConsumers()
        {
            return AllDefinedEventBusConsumerTypes()
                .Where(p => !p.GetCustomAttributes<PlatformEventBusConsumerAttribute>().Any())
                .Select(p => Util.Types.FindMatchedGenericType(
                    givenType: p,
                    matchedToGenericTypeDefinition: typeof(IPlatformEventBusFreeFormatMessageConsumer<>).GetGenericTypeDefinition()))
                .Select(freeFormatMessageConsumerType => PlatformDefaultFreeFormatMessageRoutingKeyBuilder.Build(
                    messageType: freeFormatMessageConsumerType.GetGenericArguments()[0]))
                .Distinct()
                .ToList();
        }

        public List<string> AllDefinedEventBusMessageRoutingKeys()
        {
            var definedMessageRoutingKeys = serviceProvider.GetServices<IPlatformEventBusMessage>()
                .Select(p => p.RoutingKey())
                .ToList();

            var allDefinedEntitiesEntityEventRoutingKeys = serviceProvider.GetService<IPlatformDomainAssemblyProvider>()!.Assembly
                .GetTypes()
                .Where(p => p.IsAssignableTo(typeof(IEntity)) && p.IsClass && !p.IsAbstract && !p.IsGenericType)
                .Select(entityType =>
                {
                    var entityEventMessageType =
                        typeof(PlatformCqrsEntityEventBusMessage<>).MakeGenericType(entityType);
                    var entityEventMessage =
                        (IPlatformCqrsEntityEventBusMessage)Activator.CreateInstance(entityEventMessageType);
                    return entityEventMessage!.RoutingKey();
                })
                .ToList();

            var allDefinedCommandsCommandEventRoutingKeys = EventBusScanAssemblies.SelectMany(p => p.GetTypes())
                .Where(p => p.IsAssignableTo(typeof(IPlatformCqrsCommand)) && p.IsClass && !p.IsAbstract && !p.IsGenericType)
                .Select(commandType =>
                {
                    var commandEventBusMessageType =
                        typeof(PlatformCqrsCommandEventBusMessage<>).MakeGenericType(commandType);
                    var commandEventBusMessage =
                        (IPlatformCqrsCommandEventBusMessage)Activator.CreateInstance(commandEventBusMessageType);
                    return commandEventBusMessage!.RoutingKey();
                })
                .ToList();

            return definedMessageRoutingKeys
                .Concat(allDefinedEntitiesEntityEventRoutingKeys)
                .Concat(allDefinedCommandsCommandEventRoutingKeys)
                .Select(p => p.CombinedStringKey)
                .ToList();
        }
    }
}
