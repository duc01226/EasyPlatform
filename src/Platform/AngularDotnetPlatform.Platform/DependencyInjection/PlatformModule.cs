using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Dtos;
using AngularDotnetPlatform.Platform.Caching;
using AngularDotnetPlatform.Platform.Caching.BuiltInCacheRepositories;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Extensions;
using AngularDotnetPlatform.Platform.JsonSerialization;
using AngularDotnetPlatform.Platform.Validators;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

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

        protected virtual bool AutoRegisterCqrs => true;

        protected virtual bool AutoRegisterCaching => true;

        public void Register(IServiceCollection serviceCollection)
        {
            lock (RegisterLock)
            {
                if (Registered)
                    return;

                RegisterAllModuleDependencies(serviceCollection);
                RegisterDefaultLogs(serviceCollection);
                if (AutoRegisterCqrs)
                    RegisterCqrs(serviceCollection);
                if (AutoRegisterCaching)
                    RegisterCaching(serviceCollection);

                InternalRegister(serviceCollection);
                Registered = true;

                PlatformJsonSerializer.SetCurrentOptions(JsonSerializerCurrentOptions());
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
        protected virtual IPlatformDistributedCacheRepository DistributedCacheRepositoryProvider(IServiceProvider serviceProvider, IConfiguration configuration)
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

        /// <summary>
        /// Override this to setup value for <see cref="PlatformJsonSerializer.CurrentOptions"/>
        /// </summary>
        /// <returns></returns>
        protected virtual JsonSerializerOptions JsonSerializerCurrentOptions()
        {
            return PlatformJsonSerializer.DefaultOptions;
        }

        protected void EnsurePlatformImplementationValid()
        {
            EnsurePlatformDtosValid();
        }

        protected void EnsurePlatformDtosValid()
        {
            // Validate all IPlatformDto must have parameter less constructor so that it could be Deserialize from json string object.
            var missingParameterLessConstructorDtos = Assembly.GetTypes()
                .Where(p => p.IsAssignableTo(typeof(IPlatformDto)) && !p.IsAbstract && p.GetConstructor(Type.EmptyTypes) == null)
                .ToList();
            if (missingParameterLessConstructorDtos.Any())
            {
                throw new Exception(
                    $"Developer Error. " +
                    $"All implementation of IPlatformDto must have parameter less constructor. " +
                    $"Invalid Types: {string.Join(", ", missingParameterLessConstructorDtos.Select(p => p.FullName))}");
            }
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

        /// <summary>
        /// Override this method to config default PlatformCacheEntryOptions when save cache
        /// </summary>
        protected virtual PlatformCacheEntryOptions DefaultPlatformCacheEntryOptions(IServiceProvider serviceProvider)
        {
            return null;
        }

        private void RegisterDefaultLogs(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterIfServiceNotExist(typeof(ILoggerFactory), typeof(LoggerFactory), ServiceLifeTime.Transient);
        }

        private void RegisterCqrs(IServiceCollection serviceCollection)
        {
            serviceCollection.AddMediatR(Assembly);
            serviceCollection.Register(typeof(IPlatformCqrs), typeof(PlatformCqrs), ServiceLifeTime.Transient, replaceIfExist: true);
            CqrsPipelinesProvider().ForEach(p =>
            {
                PlatformValidationResult
                    .ValidIf(
                        p.IsGenericType && p.GetGenericTypeDefinition().IsAssignableToGenericType(typeof(PlatformCqrsPipelineMiddleware<,>)),
                        "Pipeline type must be GenericType and inherit from PlatformCqrsPipelineMiddleware<,>")
                    .EnsureValid(val => new Exception(val.ErrorsMsg()));

                serviceCollection.Register(typeof(IPipelineBehavior<,>), p, ServiceLifeTime.Transient);
            });
        }

        private void RegisterCaching(IServiceCollection serviceCollection)
        {
            serviceCollection.ReplaceTransient<IPlatformCacheRepositoryProvider, PlatformCacheRepositoryProvider>();
            serviceCollection.RegisterAllFromType<IPlatformContextCacheKeyProvider>(ServiceLifeTime.Transient, Assembly, replaceIfExist: true);

            serviceCollection.RegisterAllFromType<IPlatformCacheRepository>(ServiceLifeTime.Singleton, Assembly, replaceIfExist: true);
            serviceCollection.RegisterAllFromType(typeof(IPlatformCollectionCacheRepository<>), ServiceLifeTime.Transient, Assembly, replaceIfExist: true);

            RegisterDefaultPlatformCacheEntryOptions(serviceCollection);

            // Register built-in memory cache
            serviceCollection.RegisterAllForImplementation<PlatformMemoryCacheRepository>(ServiceLifeTime.Singleton);
            serviceCollection.RegisterAllForImplementation(typeof(PlatformCollectionMemoryCacheRepository<>), ServiceLifeTime.Transient);

            if (HasDistributedCacheProviderImplementation())
            {
                serviceCollection.RegisterAllForImplementation(
                    provider => DistributedCacheRepositoryProvider(provider, Configuration), ServiceLifeTime.Singleton, replaceIfExist: true);

                serviceCollection.RegisterAllForImplementation(typeof(PlatformCollectionDistributedCacheRepository<>), ServiceLifeTime.Transient);
            }
        }

        private void RegisterDefaultPlatformCacheEntryOptions(IServiceCollection serviceCollection)
        {
            if (DefaultPlatformCacheEntryOptions(ServiceProvider) != null)
            {
                serviceCollection.Register(
                    typeof(PlatformCacheEntryOptions),
                    DefaultPlatformCacheEntryOptions,
                    ServiceLifeTime.Transient,
                    replaceIfExist: true,
                    ServiceCollectionExtension.ReplaceServiceStrategy.ByService);
            }
        }

        private bool HasDistributedCacheProviderImplementation()
        {
            return DistributedCacheRepositoryProvider(ServiceProvider, Configuration) != null;
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
