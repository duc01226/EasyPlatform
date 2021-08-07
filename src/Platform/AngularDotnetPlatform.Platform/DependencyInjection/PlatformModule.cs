using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Caching;
using AngularDotnetPlatform.Platform.Caching.MemoryCache;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Extensions;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.DependencyInjection
{
    public abstract class PlatformModule
    {
        protected readonly object RegisterLock = new object();
        protected readonly object InitLock = new object();

        public PlatformModule(IServiceProvider serviceProvider)
        {
            ServiceProvider = serviceProvider;
        }

        public IServiceProvider ServiceProvider { get; }

        public Assembly Assembly => GetType().Assembly;

        public bool Registered { get; protected set; }

        public bool Initiated { get; protected set; }

        public void Register(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            lock (RegisterLock)
            {
                if (Registered)
                    return;

                RegisterAllModuleDependencies(serviceCollection, configuration);
                RegisterCqrs(serviceCollection, configuration);
                RegisterCaching(serviceCollection, configuration);
                InternalRegister(serviceCollection, configuration);
                Registered = true;
            }
        }

        public void Init()
        {
            lock (InitLock)
            {
                if (Initiated)
                    return;

                InitAllModuleDependencies();

                using (var scope = ServiceProvider.CreateScope())
                {
                    InternalInit(scope).Wait();
                }

                Initiated = true;
            }
        }

        protected virtual void InternalRegister(IServiceCollection serviceCollection, IConfiguration configuration) { }

        protected virtual Task InternalInit(IServiceScope serviceScope)
        {
            return Task.CompletedTask;
        }

        /// <summary>
        /// Define list of any modules that this module depend on. The type must be assigned to <see cref="PlatformModule"/>.
        /// Example from a XXXServiceAspNetCoreModule could depend on XXXPlatformApplicationModule and XXXPlatformPersistenceModule.
        /// Example code : return new { typeof(XXXPlatformApplicationModule), typeof(XXXPlatformPersistenceModule) };
        /// </summary>
        protected virtual List<Type> GetModuleDependencies()
        {
            return new List<Type>();
        }

        /// <summary>
        /// Override this function provider to register IPlatformDistributedCache. Default return null;
        /// </summary>
        protected virtual IPlatformDistributedCache DistributedCacheProvider(IServiceProvider serviceProvider, IConfiguration configuration)
        {
            return null;
        }

        /// <summary>
        /// Override this function provider to register <see cref="PlatformCqrsPipelineMiddleware{TRequest,TResponse}"/>.
        /// Default is a empty list. The PlatformCqrsPipelineMiddleware is executed in same orders of the return list.
        /// </summary>
        /// <summary>
        /// Define list of <see cref="PlatformCqrsPipelineMiddleware{TRequest,TResponse}"/> to register. The type must be assigned to <see cref="PlatformCqrsPipelineMiddleware{TRequest,TResponse}"/>.
        /// Default is a empty list. The PlatformCqrsPipelineMiddleware is executed in same orders of the return list.
        /// <br/>
        /// Example that before any command/query is handled, XXXCqrsPipelineMiddleware then YYYCqrsPipelineMiddleware need to capture it first, then:
        /// Example code : return new { typeof(XXXCqrsPipelineMiddleware), typeof(YYYCqrsPipelineMiddleware) };
        /// </summary>
        protected virtual List<Type> CqrsPipelinesProvider()
        {
            return new List<Type>();
        }

        protected void InitAllModuleDependencies()
        {
            GetModuleDependencies().ForEach(p =>
            {
                var dependModule = ServiceProvider.GetService(p);
                if (dependModule == null)
                    throw new Exception($"Module {GetType().Name} depend on {p.Name} but Module {p.Name} is not registered");
                if (dependModule is PlatformModule typedPlatformModule)
                {
                    typedPlatformModule.Init();
                }
                else
                {
                    throw new Exception(
                        $"Module {GetType().Name} depend on {p.Name} but Module {p.Name} is not inherit from PlatformModule");
                }
            });
        }

        private void RegisterCqrs(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            serviceCollection.AddMediatR(Assembly);
            CqrsPipelinesProvider().ForEach(p => serviceCollection.Register(typeof(IPipelineBehavior<,>), p, ServiceLifeTime.Transient));
        }

        private void RegisterCaching(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            serviceCollection.ReplaceTransient<IPlatformCacheProvider, PlatformCacheProvider>();
            serviceCollection.RegisterAllFromImplementation<PlatformMemoryCache>(ServiceLifeTime.Singleton, replaceIfExist: true);
            if (HasDistributedCacheProviderImplementation(configuration))
            {
                serviceCollection.RegisterAllFromImplementation(
                    provider => DistributedCacheProvider(provider, configuration), ServiceLifeTime.Singleton, replaceIfExist: true);
            }
        }

        private bool HasDistributedCacheProviderImplementation(IConfiguration configuration)
        {
            return DistributedCacheProvider(ServiceProvider, configuration) != null;
        }

        private void RegisterAllModuleDependencies(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            GetModuleDependencies().ForEach(p => serviceCollection.RegisterModule(configuration, p));
        }
    }
}
