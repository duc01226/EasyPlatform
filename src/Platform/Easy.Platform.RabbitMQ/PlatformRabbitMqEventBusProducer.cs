using System;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Exceptions;

namespace Easy.Platform.RabbitMQ;

public class PlatformRabbitMqMessageBusProducer : IPlatformMessageBusProducer
{
    protected readonly PlatformRabbitChannelPool ChannelPool;
    protected readonly IPlatformRabbitMqExchangeProvider ExchangeProvider;
    protected readonly ILogger Logger;
    protected readonly PlatformRabbitMqOptions Options;

    public PlatformRabbitMqMessageBusProducer(
        IPlatformRabbitMqExchangeProvider exchangeProvider,
        PlatformRabbitMqOptions options,
        ILoggerFactory loggerFactory,
        PlatformRabbitChannelPool channelPool)
    {
        ChannelPool = channelPool;
        ExchangeProvider = exchangeProvider;
        Options = options;
        Logger = loggerFactory.CreateLogger(GetType());
    }

    public async Task<TMessage> SendAsync<TMessage>(TMessage message, CancellationToken cancellationToken = default)
        where TMessage : class, IPlatformBusMessage, new()
    {
        return await SendAsync(message, message.RoutingKey().CombinedStringKey, cancellationToken);
    }

    public async Task<TMessage> SendAsync<TMessage>(
        TMessage message,
        string customRoutingKey,
        CancellationToken cancellationToken = default) where TMessage : class, IPlatformBusMessage, new()
    {
        try
        {
            var jsonMessage = SerializeMessage(message);

            await PublishMessageToQueueAsync(
                jsonMessage,
                customRoutingKey ?? message.RoutingKey(),
                cancellationToken);

            return message;
        }
        catch (Exception e)
        {
            throw new PlatformMessageBusException<TMessage>(message, e);
        }
    }

    public async Task<IPlatformBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
        string trackId,
        TMessagePayload payload,
        PlatformBusMessageIdentity identity,
        PlatformBusMessageRoutingKey routingKey,
        CancellationToken cancellationToken = default) where TMessagePayload : class, new()
    {
        var message = await SendAsync(
            PlatformBusMessage<TMessagePayload>.New(
                trackId: trackId,
                payload: payload,
                identity: identity,
                routingKey: routingKey),
            cancellationToken);

        return message;
    }

    public Task<TMessage> SendFreeFormatMessageAsync<TMessage>(
        TMessage message,
        CancellationToken cancellationToken = default) where TMessage : IPlatformBusFreeFormatMessage
    {
        return SendFreeFormatMessageAsync(
            message,
            PlatformBuildDefaultFreeFormatMessageRoutingKeyHelper.Build(message.GetType()),
            cancellationToken);
    }

    public async Task<TMessage> SendFreeFormatMessageAsync<TMessage>(
        TMessage message,
        string routingKey,
        CancellationToken cancellationToken = default) where TMessage : IPlatformBusFreeFormatMessage
    {
        try
        {
            var jsonMessage = SerializeMessage(message);

            await PublishMessageToQueueAsync(jsonMessage, routingKey, cancellationToken);

            return message;
        }
        catch (Exception e)
        {
            throw new PlatformMessageBusException<TMessage>(message, e);
        }
    }

    public async Task<TMessage> SendTrackableMessageAsync<TMessage>(
        TMessage message,
        string routingKey,
        CancellationToken cancellationToken = default) where TMessage : IPlatformBusTrackableMessage
    {
        try
        {
            var jsonMessage = SerializeMessage(message);

            await PublishMessageToQueueAsync(jsonMessage, routingKey, cancellationToken);

            return message;
        }
        catch (Exception e)
        {
            throw new PlatformMessageBusException<TMessage>(message, e);
        }
    }

    private static string SerializeMessage<TMessage>(TMessage message) where TMessage : IPlatformBusTrackableMessage
    {
        var jsonMessage = PlatformJsonSerializer.Serialize(message);
        return jsonMessage;
    }

    private async Task PublishMessageToQueueAsync(
        string message,
        string routingKey,
        CancellationToken cancellationToken = default)
    {
        await Task.Run(
            () =>
            {
                PublishMessageToQueue(message, routingKey);
            },
            cancellationToken);
    }

    private void PublishMessageToQueue(string message, string routingKey)
    {
        IModel channel = null;

        try
        {
            channel = ChannelPool.Get();
            channel.BasicPublish(
                ExchangeProvider.GetExchangeName(routingKey),
                routingKey,
                null,
                body: Encoding.UTF8.GetBytes(message));
            ChannelPool.Return(channel);
        }
        catch (AlreadyClosedException alreadyClosedException)
        {
            if (channel != null)
                ChannelPool.Return(channel);

            if (alreadyClosedException.ShutdownReason.ReplyCode == 404)
                Logger.LogWarning(
                    $"Tried to send a message with routing key {routingKey} from {GetType().FullName} " +
                    "but exchange is not found. May be there is no consumer registered to consume this message." +
                    "If in source code has consumers for this message, this could be unexpected errors");
            else
                throw;
        }
    }
}
