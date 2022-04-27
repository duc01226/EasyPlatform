using Microsoft.Extensions.ObjectPool;
using RabbitMQ.Client;

namespace Easy.Platform.RabbitMQ
{
    /// <summary>
    /// Use ObjectBool to manage chanel because HostService is singleton, and we don't want re-init chanel is heavy and wasting time.
    /// We want to use pool when object is expensive to allocate/initialize
    /// References: https://docs.microsoft.com/en-us/aspnet/core/performance/objectpool?view=aspnetcore-5.0
    /// </summary>
    public class PlatformRabbitChannelPool : DefaultObjectPool<IModel>
    {
        public PlatformRabbitChannelPool(PlatformRabbitMqChannelPoolPolicy channelPoolPolicy) : base(channelPoolPolicy, maximumRetained: 1)
        {
        }

        protected PlatformRabbitChannelPool(IPooledObjectPolicy<IModel> policy) : base(policy)
        {
        }

        protected PlatformRabbitChannelPool(IPooledObjectPolicy<IModel> policy, int maximumRetained) : base(policy, maximumRetained)
        {
        }

        public override IModel Get()
        {
            var channelInPool = base.Get();

            if (channelInPool.IsClosed)
            {
                channelInPool.Dispose();

                var newChannel = Get();

                return newChannel;
            }

            return channelInPool;
        }

        public override void Return(IModel obj)
        {
            if (obj.IsClosed)
            {
                obj.Dispose();
            }
            else
            {
                base.Return(obj);
            }
        }
    }
}
