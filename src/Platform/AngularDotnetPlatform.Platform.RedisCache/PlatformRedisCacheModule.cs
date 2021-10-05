using System;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.Caching;
using AngularDotnetPlatform.Platform.DependencyInjection;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace AngularDotnetPlatform.Platform.RedisCache
{
    /// <summary>
    /// Add this module to use RedisCache as a PlatformDistributedCache via <see cref="PlatformCacheRepositoryType.Distributed"/>
    /// </summary>
    public abstract class PlatformRedisCacheModule : PlatformModule
    {
        public PlatformRedisCacheModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override IPlatformDistributedCacheRepository DistributedCacheRepositoryProvider(
            IServiceProvider serviceProvider,
            IConfiguration configuration)
        {
            return new PlatformRedisDistributedCacheRepository(
                serviceProvider,
                serviceProvider.GetService<IOptions<RedisCacheOptions>>(),
                serviceProvider.GetService<IPlatformApplicationSettingContext>());
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            serviceCollection.AddOptions();
            serviceCollection.Configure<RedisCacheOptions>(InternalRegisterSetupRedisCacheOptions);
            base.InternalRegister(serviceCollection);
        }

        protected abstract void SetupRedisCacheOptions(RedisCacheOptions options);

        private void InternalRegisterSetupRedisCacheOptions(RedisCacheOptions options)
        {
            SetupRedisCacheOptions(options);
        }
    }
}
