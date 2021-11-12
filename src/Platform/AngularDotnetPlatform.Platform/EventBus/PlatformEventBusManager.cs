using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using AngularDotnetPlatform.Platform.Application.EventBus.Producers;
using AngularDotnetPlatform.Platform.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain;
using AngularDotnetPlatform.Platform.Domain.Entities;
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
        /// Get all routing key pattern of all defined consumers
        /// </summary>
        List<PlatformEventBusMessageRoutingKey> AllDefinedEventBusConsumerRoutingKeys();

        /// <summary>
        /// Get routing keys for all defined message to be produced
        /// </summary>
        List<PlatformEventBusMessageRoutingKey> AllDefinedEventBusMessageRoutingKeys();
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
                    .Select(messageConsumerTypeAttribute => messageConsumerTypeAttribute))
                .GroupBy(p => p.ToRoutingKey())
                .Select(group => new PlatformEventBusConsumerAttribute(
                    group.Key.MessageGroup,
                    group.Key.ProducerContext,
                    group.Key.MessageType,
                    group.Key.MessageAction,
                    additionalCustomRoutingKeys: group.ToList().SelectMany(p => p.AdditionalCustomRoutingKeys).ToArray()))
                .ToList();
        }

        public List<PlatformEventBusMessageRoutingKey> AllDefinedEventBusConsumerRoutingKeys()
        {
            return AllDefinedEventBusConsumerAttributes().Select(p => p.ToRoutingKey()).Distinct().ToList();
        }

        public List<PlatformEventBusMessageRoutingKey> AllDefinedEventBusMessageRoutingKeys()
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
                    var commandResultType = commandType.GetInterfaces().First(p =>
                        p.IsGenericType && p.GetGenericTypeDefinition().IsAssignableTo(typeof(IPlatformCqrsCommand<>)));
                    var commandEventMessageType =
                        typeof(PlatformCqrsCommandEventBusMessage<,>).MakeGenericType(commandType, commandResultType.GenericTypeArguments[0]);
                    var commandEventMessage =
                        (IPlatformCqrsCommandEventBusMessage)Activator.CreateInstance(commandEventMessageType);
                    return commandEventMessage!.RoutingKey();
                })
                .ToList();

            return definedMessageRoutingKeys
                .Concat(allDefinedEntitiesEntityEventRoutingKeys)
                .Concat(allDefinedCommandsCommandEventRoutingKeys)
                .ToList();
        }
    }
}
