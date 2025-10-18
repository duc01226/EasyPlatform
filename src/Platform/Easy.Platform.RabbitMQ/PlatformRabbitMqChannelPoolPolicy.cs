#region

using Easy.Platform.RabbitMQ.Extensions;
using Microsoft.Extensions.ObjectPool;
using RabbitMQ.Client;

#endregion

namespace Easy.Platform.RabbitMQ;

public class PlatformRabbitMqChannelPoolPolicy : IPooledObjectPolicy<IChannel>, IDisposable
{
    public const int TryWaitGetConnectionSeconds = 60;

    private readonly PlatformRabbitMqOptions options;
    private bool disposed;
    private RabbitMqConnectionPool rabbitMqConnectionPool;

    public PlatformRabbitMqChannelPoolPolicy(
        int poolSize,
        PlatformRabbitMqOptions options)
    {
        PoolSize = poolSize;
        this.options = options;
        rabbitMqConnectionPool = new RabbitMqConnectionPool(options, poolSize);
    }

    public int PoolSize { get; }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    public IChannel Create()
    {
        var connection = rabbitMqConnectionPool.TryWaitGetConnection(TryWaitGetConnectionSeconds);

        try
        {
            var channel = connection.CreateChannelAsync().GetResult();

            // Config the prefectCount. "defines the max number of unacknowledged deliveries that are permitted on a channel" to limit messages to prevent rabbit mq down
            // Reference: https://www.rabbitmq.com/tutorials/tutorial-two-dotnet.html. Filter: BasicQos
            channel.BasicQosAsync(prefetchSize: 0, options.QueuePrefetchCount, false).Wait();

            return channel;
        }
        finally
        {
            rabbitMqConnectionPool.ReturnConnection(connection);
        }
    }

    public bool Return(IChannel obj)
    {
        if (obj.IsClosedPermanently(out var isDisposed))
        {
            if (!isDisposed) obj.Dispose();
            return false;
        }

        return true;
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!disposed)
        {
            // Release managed resources
            if (disposing)
            {
                rabbitMqConnectionPool?.Dispose();
                rabbitMqConnectionPool = default;
            }

            // Release unmanaged resources

            disposed = true;
        }
    }
}
