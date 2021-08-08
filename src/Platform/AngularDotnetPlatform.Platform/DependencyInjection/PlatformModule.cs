using System;
using System.Collections.Generic;
using System.Linq;
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

        public PlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        {
            ServiceProvider = serviceProvider;
            Configuration = configuration;
        }

        public IServiceProvider ServiceProvider { get; }
        public IConfiguration Configuration { get; }

        public Assembly Assembly => GetType().Assembly;

        public bool Registered { get; protected set; }

        public bool Initiated { get; protected set; }

        public void Register(IServiceCollection serviceCollection)
        {
            lock (RegisterLock)
            {
                if (Registered)
                    return;

                RegisterAllModuleDependencies(serviceCollection);
                RegisterCqrs(serviceCollection);
                RegisterCaching(serviceCollection);
                InternalRegister(serviceCollection);
                Registered = true;
            }
        }

        public void Init()
        {
            lock (InitLock)
            {
                if (Initiated)
                    return;

                EnsurePlatformImplementationValid();
                InitAllModuleDependencies();

                using (var scope = ServiceProvider.CreateScope())
                {
                    InternalInit(scope).Wait();
                }

                Initiated = true;
            }
        }

        protected void EnsurePlatformImplementationValid()
        {
            EnsurePlatformCqrsRequestsValid();
        }

        protected void EnsurePlatformCqrsRequestsValid()
        {
            // Validate all PlatformCqrsRequest must have parameter less constructor so that it could be Deserialize from json string object.
            var missingParametersConstructorCqrsRequests = Assembly.GetTypes()
                .Where(p => p.IsAssignableTo(typeof(IPlatformCqrsRequest)) && !p.IsAbstract &&
                            p.GetConstructor(Type.EmptyTypes) == null)
                .ToList();
            if (missingParametersConstructorCqrsRequests.Any())
            {
                throw new Exception(
                    $"Developer Error. " +
                    $"All implementation of IPlatformCqrsRequest must have parameterless constructor. " +
                    $"Invalid Types: {string.Join(", ", missingParametersConstructorCqrsRequests.Select(p => p.FullName))}");
            }
        }

        protected virtual void InternalRegister(IServiceCollection serviceCollection) { }

        protected virtual Task InternalInit(IServiceScope serviceScope)
        {
            return Task.CompletedTask;
        }

        /// <summary>
        /// Define list of any modules that this module depend on. The type must be assigned to <see cref="PlatformModule"/>.
        /// Example from a XXXServiceAspNetCoreModule could depend on XXXPlatformApplicationModule and XXXPlatformPersistenceModule.
        /// Example code : return new { config => typeof(XXXPlatformApplicationModule), config => typeof(XXXPlatformPersistenceModule) };
        /// </summary>
        protected virtual List<Func<IConfiguration, Type>> GetModuleDependencies()
        {
            return new List<Func<IConfiguration, Type>>();
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
            GetModuleDependencies().Select(moduleTypeProvider => moduleTypeProvider(Configuration)).ToList().ForEach(moduleType =>
            {
                var dependModule = ServiceProvider.GetService(moduleType);
                if (dependModule == null)
                    throw new Exception($"Module {GetType().Name} depend on {moduleType.Name} but Module {moduleType.Name} is not registered");
                if (dependModule is PlatformModule typedPlatformModule)
                {
                    typedPlatformModule.Init();
                }
                else
                {
                    throw new Exception(
                        $"Module {GetType().Name} depend on {moduleType.Name} but Module {moduleType.Name} is not inherit from PlatformModule");
                }
            });
        }

        private void RegisterCqrs(IServiceCollection serviceCollection)
        {
            serviceCollection.AddMediatR(Assembly);
            CqrsPipelinesProvider().ForEach(p => serviceCollection.Register(typeof(IPipelineBehavior<,>), p, ServiceLifeTime.Transient));
        }

        private void RegisterCaching(IServiceCollection serviceCollection)
        {
            serviceCollection.ReplaceTransient<IPlatformCacheProvider, PlatformCacheProvider>();
            serviceCollection.RegisterAllFromImplementation<PlatformMemoryCache>(ServiceLifeTime.Singleton, replaceIfExist: true);
            if (HasDistributedCacheProviderImplementation())
            {
                serviceCollection.RegisterAllFromImplementation(
                    provider => DistributedCacheProvider(provider, Configuration), ServiceLifeTime.Singleton, replaceIfExist: true);
            }
        }

        private bool HasDistributedCacheProviderImplementation()
        {
            return DistributedCacheProvider(ServiceProvider, Configuration) != null;
        }

        private void RegisterAllModuleDependencies(IServiceCollection serviceCollection)
        {
            GetModuleDependencies()
                .Select(moduleTypeProvider => moduleTypeProvider(Configuration))
                .ToList()
                .ForEach(moduleType => serviceCollection.RegisterModule(Configuration, moduleType));
        }
    }
}
