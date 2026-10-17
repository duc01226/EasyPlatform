using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Easy.Platform.RabbitMQ;

/// <summary>
/// Retains unreadable deliveries before acknowledging them. Each recovery operation owns its connection/channel;
/// ordinary publisher channels retain their existing behavior. Parking is at-least-once and requires manual replay.
/// </summary>
public class PlatformRabbitMqMalformedMessageRecovery : IDisposable
{
    public const string SourceQueueHeader = "platform-recovery-source-queue";
    public const string SourceExchangeHeader = "platform-recovery-source-exchange";
    public const string SourceRoutingKeyHeader = "platform-recovery-source-routing-key";
    public const string SourceExpirationHeader = "platform-recovery-source-expiration";
    public const string SourceUserIdHeader = "platform-recovery-source-user-id";
    public const string FailureTypeHeader = "platform-recovery-failure-type";

    private readonly PlatformRabbitMqOptions options;
    private readonly ILogger logger;
    private readonly SemaphoreSlim recoveryLock = new(1, 1);
    private readonly CancellationTokenSource shutdown = new();
    private readonly CancellationToken shutdownToken;
    private readonly RabbitMqPooledObjectPolicy connectionPolicy;
    private int disposed;

    public PlatformRabbitMqMalformedMessageRecovery(PlatformRabbitMqOptions options, ILogger logger)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(options.MalformedMessageQueueMaxMessageCount);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(options.MalformedMessageQueueMaxLengthBytes);
        if (!double.IsFinite(options.MalformedMessageRecoveryTimeoutSeconds) || options.MalformedMessageRecoveryTimeoutSeconds <= 0 ||
            options.MalformedMessageRecoveryTimeoutSeconds > 300)
            throw new ArgumentOutOfRangeException(nameof(options), "Malformed-message recovery timeout must be positive and at most 300 seconds.");

        this.options = options;
        this.logger = logger;
        shutdownToken = shutdown.Token;
        connectionPolicy = new RabbitMqPooledObjectPolicy(options);
    }

    public static string GetParkingQueueName(string sourceQueue)
    {
        return "[Platform]-malformed-" + Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(sourceQueue)));
    }

    public async Task RecoverAsync(
        string sourceQueue,
        IChannel originalChannel,
        BasicDeliverEventArgs delivery,
        Type failureType,
        CancellationToken cancellationToken)
    {
        var parkingQueue = GetParkingQueueName(sourceQueue);
        var confirmed = false;
        using var operation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, shutdownToken);
        operation.CancelAfter(TimeSpan.FromSeconds(options.MalformedMessageRecoveryTimeoutSeconds));

        try
        {
            await recoveryLock.WaitAsync(operation.Token);
            try
            {
                await using var connection = await CreateConnectionAsync(operation.Token);
                await using var publisher = await connection.CreateChannelAsync(
                    new CreateChannelOptions(publisherConfirmationsEnabled: true, publisherConfirmationTrackingEnabled: true),
                    operation.Token);

                await publisher.QueueDeclareAsync(
                    parkingQueue, durable: true, exclusive: false, autoDelete: false,
                    arguments: new Dictionary<string, object?>
                    {
                        ["x-max-length"] = options.MalformedMessageQueueMaxMessageCount,
                        ["x-max-length-bytes"] = options.MalformedMessageQueueMaxLengthBytes,
                        ["x-overflow"] = "reject-publish"
                    },
                    cancellationToken: operation.Token);

                var properties = new BasicProperties(delivery.BasicProperties)
                {
                    Persistent = true,
                    Expiration = null,
                    UserId = null,
                    Headers = delivery.BasicProperties.Headers == null
                        ? []
                        : new Dictionary<string, object?>(delivery.BasicProperties.Headers)
                };
                properties.Headers[SourceQueueHeader] = sourceQueue;
                properties.Headers[SourceExchangeHeader] = delivery.Exchange;
                properties.Headers[SourceRoutingKeyHeader] = delivery.RoutingKey;
                properties.Headers[FailureTypeHeader] = failureType.FullName ?? failureType.Name;
                if (delivery.BasicProperties.Expiration != null)
                    properties.Headers[SourceExpirationHeader] = delivery.BasicProperties.Expiration;
                if (delivery.BasicProperties.UserId != null)
                    properties.Headers[SourceUserIdHeader] = delivery.BasicProperties.UserId;

                // With both confirmation options enabled, this await observes broker nacks and mandatory returns.
                await publisher.BasicPublishAsync("", parkingQueue, mandatory: true, properties, delivery.Body, operation.Token);
                confirmed = true;
            }
            finally
            {
                recoveryLock.Release();
            }
        }
        catch (Exception ex)
        {
            // Exception text may contain payload data. Keep bytes in the broker and log only recovery coordinates/type.
            logger.LogError("Malformed delivery recovery failed. ParkingQueue:{ParkingQueue}. FailureType:{FailureType}. BodyBytes:{BodyBytes}",
                parkingQueue, ex.GetType().FullName, delivery.Body.Length);
        }

        if (confirmed)
        {
            try
            {
                using var acknowledge = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, shutdownToken);
                acknowledge.Token.ThrowIfCancellationRequested();
                await originalChannel.BasicAckAsync(delivery.DeliveryTag, multiple: false, acknowledge.Token);
                logger.LogWarning("Malformed delivery parked for manual recovery. ParkingQueue:{ParkingQueue}. BodyBytes:{BodyBytes}",
                    parkingQueue, delivery.Body.Length);
            }
            catch (Exception ex)
            {
                // The copy is durable; failed ACK leaves the original for redelivery (possibly a duplicate copy).
                logger.LogWarning("Parked delivery ACK failed. ParkingQueue:{ParkingQueue}. FailureType:{FailureType}",
                    parkingQueue, ex.GetType().FullName);
            }
            return;
        }

        try
        {
            using var requeue = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, shutdownToken);
            var delaySeconds = double.IsFinite(options.RequeueDelayTimeInSeconds)
                ? Math.Clamp(options.RequeueDelayTimeInSeconds, 1, 60)
                : 60;
            await WaitBeforeRequeueAsync(TimeSpan.FromSeconds(delaySeconds), requeue.Token);
            if (originalChannel.IsOpen)
                await originalChannel.BasicNackAsync(delivery.DeliveryTag, multiple: false, requeue: true, requeue.Token);
        }
        catch (Exception ex)
        {
            // Cancellation or a closed channel leaves the original unacknowledged for broker redelivery.
            logger.LogWarning("Malformed delivery remains unacknowledged. ParkingQueue:{ParkingQueue}. FailureType:{FailureType}",
                parkingQueue, ex.GetType().FullName);
        }
    }

    protected virtual Task<IConnection> CreateConnectionAsync(CancellationToken cancellationToken) => connectionPolicy.CreateAsync(cancellationToken);

    protected virtual Task WaitBeforeRequeueAsync(TimeSpan delay, CancellationToken cancellationToken) => Task.Delay(delay, cancellationToken);

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!disposing || Interlocked.Exchange(ref disposed, 1) != 0) return;
        shutdown.Cancel();
        shutdown.Dispose();
        // Pending operations release the async semaphore after cancellation; disposing it here would race that release.
    }
}
