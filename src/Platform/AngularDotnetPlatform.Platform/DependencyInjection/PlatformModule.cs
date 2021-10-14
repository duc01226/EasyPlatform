using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Dtos;
using AngularDotnetPlatform.Platform.BackgroundJob;
using AngularDotnetPlatform.Platform.Caching;
using AngularDotnetPlatform.Platform.Caching.BuiltInCacheRepositories;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Extensions;
using AngularDotnetPlatform.Platform.JsonSerialization;
using AngularDotnetPlatform.Platform.Validators;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;

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

        protected virtual bool AutoRegisterCaching => false;

        protected virtual bool AutoRegisterBackgroundJob => false;

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
                if (AutoRegisterBackgroundJob)
                    RegisterBackgroundJob(serviceCollection);

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

        protected async Task StartBackgroundJobProcessing(IServiceScope serviceScope)
        {
            var backgroundJobProcessingService = serviceScope.ServiceProvider.GetService<IPlatformBackgroundJobProcessingService>();

            if (backgroundJobProcessingService?.Started() == true)
                await backgroundJobProcessingService?.Stop();

            if (backgroundJobProcessingService?.Started() == false)
            {
                var applicationLifetime = serviceScope.ServiceProvider.GetService<IHostApplicationLifetime>();
                var retryCount = 10;

                await Policy.Handle<Exception>()
                    .WaitAndRetryAsync(
                        retryCount: retryCount,
                        sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                        onRetry: (exception, timeSpan, retry, ctx) =>
                        {
                            var logger = serviceScope.ServiceProvider.GetService<ILogger>();

                            logger.LogWarning(exception,
                                "[StartBackgroundJobProcessing] Exception {ExceptionType} with message {Message} detected on attempt StartBackgroundJobProcessing {retry} of {retries}",
                                exception.GetType().Name,
                                exception.Message,
                                retry,
                                retryCount);
                        })
                    .ExecuteAndThrowFinalExceptionAsync(async () =>
                    {
                        await backgroundJobProcessingService.Start();
                        applicationLifetime?.ApplicationStopping.Register(() =>
                        {
                            backgroundJobProcessingService.Stop().Wait();
                        });
                    });
            }
        }

        protected Task ReplaceAllRecurringBackgroundJobs(IServiceScope serviceScope)
        {
            var scheduler = serviceScope.ServiceProvider.GetService<IPlatformBackgroundJobScheduler>();
            if (scheduler != null)
            {
                var allCurrentRecurringJobExecutors = serviceScope.ServiceProvider
                    .GetServices<IPlatformBackgroundJobExecutor>()
                    .Where(p => !string.IsNullOrEmpty(PlatformRecurringJobAttribute.GetCronExpressionInfo(p.GetType())))
                    .ToList();

                scheduler.ReplaceAllRecurringBackgroundJobs(allCurrentRecurringJobExecutors);
            }

            return Task.CompletedTask;
        }

        protected virtual void RegisterBackgroundJob(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterAllFromType<IPlatformBackgroundJobExecutor>(
                ServiceLifeTime.Transient,
                Assembly,
                replaceIfExist: true);
        }

        private void RegisterDefaultLogs(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterIfServiceNotExist(typeof(ILoggerFactory), typeof(LoggerFactory), ServiceLifeTime.Transient);
            serviceCollection.RegisterIfServiceNotExist(typeof(ILogger<>), typeof(Logger<>), ServiceLifeTime.Transient);
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
            else if (!serviceCollection.Any(p => p.ServiceType == typeof(PlatformCacheEntryOptions)))
            {
                serviceCollection.Register(
                    typeof(PlatformCacheEntryOptions),
                    typeof(PlatformCacheEntryOptions),
                    ServiceLifeTime.Transient);
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
