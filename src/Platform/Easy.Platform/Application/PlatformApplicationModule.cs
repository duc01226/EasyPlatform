using Easy.Platform.Application.Context;
using Easy.Platform.Application.Context.UserContext;
using Easy.Platform.Application.Context.UserContext.Default;
using Easy.Platform.Application.Domain;
using Easy.Platform.Application.Helpers;
using Easy.Platform.Application.MessageBus;
using Easy.Platform.Application.MessageBus.Consumers;
using Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.Abstract;
using Easy.Platform.Infrastructures.BackgroundJob;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;

namespace Easy.Platform.Application;

public abstract class PlatformApplicationModule : PlatformModule
{
    protected PlatformApplicationModule(
        IServiceProvider serviceProvider,
        IConfiguration configuration) : base(serviceProvider, configuration)
    {
    }

    /// <summary>
    /// Override this to true to auto register default caching module, which include default memory caching repository.
    /// <br></br>
    /// Don't need to auto register if you have register a caching module manually
    /// </summary>
    protected virtual bool AutoRegisterDefaultCaching => true;

    public async Task SeedData(IServiceScope serviceScope)
    {
        //if the db server is not initiated, SeedData could fail.
        //So that we do retry to ensure that SeedData action run successfully.
        await Policy.Handle<Exception>()
            .WaitAndRetryAsync(
                retryCount: 5,
                sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                onRetry: (
                    exception,
                    timeSpan,
                    retry,
                    ctx) =>
                {
                    Logger.LogWarning(
                        exception,
                        "Exception {ExceptionType} with message [{Message}] detected on attempt SeedData {retry}",
                        exception.GetType().Name,
                        exception.Message,
                        retry);
                })
            .ExecuteAndCaptureAsync(
                async () =>
                {
                    var dataSeeder = serviceScope.ServiceProvider.GetService<IPlatformApplicationDataSeeder>();
                    if (dataSeeder != null)
                        await dataSeeder.SeedData();
                });
    }

    public async Task ClearDistributedCache(
        PlatformApplicationAutoClearDistributedCacheOnInitOptions options,
        IServiceScope serviceScope)
    {
        //if the cache server is not initiated, ClearDistributedCache could fail.
        //So that we do retry to ensure that ClearDistributedCache action run successfully.
        await Policy.Handle<Exception>()
            .WaitAndRetryAsync(
                retryCount: 5,
                sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                onRetry: (
                    exception,
                    timeSpan,
                    retry,
                    ctx) =>
                {
                    Logger.LogWarning(
                        exception,
                        "Exception {ExceptionType} with message [{Message}] detected on attempt ClearDistributedCache {retry}",
                        exception.GetType().Name,
                        exception.Message,
                        retry);
                })
            .ExecuteAndCaptureAsync(
                async () =>
                {
                    var cacheProvider = serviceScope.ServiceProvider.GetService<IPlatformCacheRepositoryProvider>();
                    var distributedCacheRepository = cacheProvider?.TryGet(PlatformCacheRepositoryType.Distributed);
                    if (distributedCacheRepository != null)
                        await distributedCacheRepository.RemoveAsync(
                            p => options.AutoClearContexts.Contains(p.Context));
                });
    }

    /// <summary>
    /// Override this factory method to register default PlatformApplicationSettingContext if application do not
    /// have any implementation of IPlatformApplicationSettingContext in the Assembly to be registered.
    /// </summary>
    protected virtual PlatformApplicationSettingContext DefaultApplicationSettingContextFactory(
        IServiceProvider serviceProvider)
    {
        return new PlatformApplicationSettingContext
        {
            ApplicationName = Assembly.FullName,
            ApplicationAssembly = Assembly
        };
    }

    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);
        serviceCollection.RegisterAllFromType<IPlatformApplicationDataSeeder>(ServiceLifeTime.Scoped, Assembly);
        RegisterEventBus(serviceCollection);
        RegisterApplicationSettingContext(serviceCollection);
        RegisterDefaultApplicationUserContext(serviceCollection);
        RegisterPseudoApplicationUnitOfWork(serviceCollection);

        serviceCollection.RegisterAllFromType<IPlatformApplicationHelper>(
            ServiceLifeTime.Transient,
            typeof(PlatformApplicationModule).Assembly);
        serviceCollection.RegisterAllFromType<IPlatformApplicationHelper>(ServiceLifeTime.Transient, Assembly);

        serviceCollection.RegisterAllServicesFromType<IPlatformDbContext>(ServiceLifeTime.Scoped, Assembly);
        serviceCollection.RegisterAllFromType<IPlatformInfrastructureService>(ServiceLifeTime.Transient, Assembly);
        serviceCollection.RegisterAllFromType<IPlatformBackgroundJobExecutor>(ServiceLifeTime.Transient, Assembly);

        if (AutoRegisterDefaultCaching)
            RegisterRuntimeModuleDependencies<PlatformCachingModule>(serviceCollection);
    }

    protected override async Task InternalInit(IServiceScope serviceScope)
    {
        await base.InternalInit(serviceScope);

        if (AutoSeedDataOnInit())
            await SeedData(serviceScope);

        var autoClearDistributedCacheOnInitOptions = AutoClearDistributedCacheOnInitOptions(serviceScope);
        if (autoClearDistributedCacheOnInitOptions.EnableAutoClearDistributedCacheOnInit)
            await ClearDistributedCache(autoClearDistributedCacheOnInitOptions, serviceScope);
    }

    /// <summary>
    /// Default return value is false.
    /// Set this to true if need to auto seed data on application module init.
    /// Only do this when define application module depend on persistence module
    /// to ensure db initiated in persistence module init before application module init
    /// </summary>
    protected virtual bool AutoSeedDataOnInit()
    {
        return false;
    }

    protected virtual PlatformApplicationAutoClearDistributedCacheOnInitOptions
        AutoClearDistributedCacheOnInitOptions(IServiceScope serviceScope)
    {
        var applicationSettingContext =
            serviceScope.ServiceProvider.GetService<IPlatformApplicationSettingContext>();
        return new PlatformApplicationAutoClearDistributedCacheOnInitOptions
        {
            EnableAutoClearDistributedCacheOnInit = true,
            AutoClearContexts = new HashSet<string>
            {
                applicationSettingContext!.ApplicationName
            }
        };
    }

    protected virtual void RegisterInboxEventBusMessageCleanerHostedService(IServiceCollection serviceCollection)
    {
        if (!serviceCollection.Any(PlatformInboxBusMessageCleanerHostedService.MatchImplementation))
            serviceCollection.Register(
                typeof(IHostedService),
                typeof(PlatformDefaultInboxBusMessageCleanerHostedService),
                ServiceLifeTime.Singleton);
    }

    protected virtual void RegisterConsumeInboxEventBusMessageHostedService(IServiceCollection serviceCollection)
    {
        if (!serviceCollection.Any(PlatformConsumeInboxBusMessageHostedService.MatchImplementation))
            serviceCollection.Register(
                typeof(IHostedService),
                typeof(PlatformDefaultConsumeInboxBusMessageHostedService),
                ServiceLifeTime.Singleton);
    }

    protected virtual void RegisterOutboxEventBusMessageCleanerHostedService(IServiceCollection serviceCollection)
    {
        if (!serviceCollection.Any(PlatformOutboxBusMessageCleanerHostedService.MatchImplementation))
            serviceCollection.Register(
                typeof(IHostedService),
                typeof(PlatformDefaultOutboxBusMessageCleanerHostedService),
                ServiceLifeTime.Singleton);
    }

    protected virtual void RegisterSendOutboxEventBusMessageHostedService(IServiceCollection serviceCollection)
    {
        if (!serviceCollection.Any(PlatformSendOutboxBusMessageHostedService.MatchImplementation))
            serviceCollection.Register(
                typeof(IHostedService),
                typeof(PlatformDefaultSendOutboxBusMessageHostedService),
                ServiceLifeTime.Singleton);
    }

    private void RegisterPseudoApplicationUnitOfWork(IServiceCollection serviceCollection)
    {
        if (serviceCollection.All(p => p.ServiceType != typeof(IUnitOfWorkManager)))
            serviceCollection.Register<IUnitOfWorkManager, PlatformPseudoApplicationUnitOfWorkManager>(
                ServiceLifeTime.Scoped);
    }

    private void RegisterApplicationSettingContext(IServiceCollection serviceCollection)
    {
        serviceCollection.RegisterAllFromType<IPlatformApplicationSettingContext>(
            ServiceLifeTime.Transient,
            Assembly,
            replaceIfExist: true);

        // If there is no custom implemented class type of IPlatformApplicationSettingContext in application,
        // register default PlatformApplicationSettingContext from result of DefaultApplicationSettingContextFactory
        // WHY: To support custom IPlatformApplicationSettingContext if you want to or just use the default from DefaultApplicationSettingContextFactory
        if (serviceCollection.All(p => p.ServiceType != typeof(IPlatformApplicationSettingContext)))
            serviceCollection.Register(
                typeof(IPlatformApplicationSettingContext),
                DefaultApplicationSettingContextFactory);
    }

    private void RegisterDefaultApplicationUserContext(IServiceCollection serviceCollection)
    {
        if (serviceCollection.All(p => p.ServiceType != typeof(IPlatformApplicationUserContextAccessor)))
            serviceCollection.Register(
                typeof(IPlatformApplicationUserContextAccessor),
                typeof(PlatformDefaultApplicationUserContextAccessor),
                ServiceLifeTime.Singleton,
                replaceIfExist: true,
                DependencyInjectionExtension.ReplaceServiceStrategy.ByService);
    }

    private void RegisterEventBus(IServiceCollection serviceCollection)
    {
        serviceCollection.RegisterAllFromType(
            typeof(IPlatformCqrsEventBusMessageProducer<>),
            ServiceLifeTime.Transient,
            Assembly);
        serviceCollection.RegisterAllFromType(
            typeof(PlatformCqrsCommandEventBusMessageProducer<>),
            ServiceLifeTime.Transient,
            Assembly);
        serviceCollection.RegisterAllFromType(
            typeof(PlatformCqrsEntityEventBusMessageProducer<>),
            ServiceLifeTime.Transient,
            Assembly);
        serviceCollection.RegisterAllFromType(
            typeof(IPlatformMessageBusBaseConsumer),
            ServiceLifeTime.Transient,
            Assembly);
        serviceCollection.RegisterAllFromType(
            typeof(IPlatformApplicationMessageBusConsumer<>),
            ServiceLifeTime.Transient,
            Assembly);
        serviceCollection.RegisterAllFromType(
            typeof(IPlatformCqrsCommandEventBusMessageConsumer<>),
            ServiceLifeTime.Transient,
            Assembly);
        serviceCollection.RegisterAllFromType(
            typeof(IPlatformCqrsEntityEventBusMessageConsumer<>),
            ServiceLifeTime.Transient,
            Assembly);
        serviceCollection.Register<IPlatformApplicationBusMessageProducer, PlatformApplicationBusMessageProducer>(
            ServiceLifeTime.Transient);

        if (!serviceCollection.Any(p => p.ServiceType == typeof(IPlatformMessageBusManager)))
            serviceCollection.Register<IPlatformMessageBusManager, PlatformApplicationPseudoMessageBusManager>(
                ServiceLifeTime.Transient);

        RegisterInboxEventBusMessageCleanerHostedService(serviceCollection);
        RegisterConsumeInboxEventBusMessageHostedService(serviceCollection);
        if (!serviceCollection.Any(p => p.ServiceType == typeof(PlatformInboxConfig)))
            serviceCollection.Register<PlatformInboxConfig, PlatformInboxConfig>(ServiceLifeTime.Transient);

        RegisterOutboxEventBusMessageCleanerHostedService(serviceCollection);
        RegisterSendOutboxEventBusMessageHostedService(serviceCollection);
        if (!serviceCollection.Any(p => p.ServiceType == typeof(PlatformOutboxConfig)))
            serviceCollection.Register<PlatformOutboxConfig, PlatformOutboxConfig>(ServiceLifeTime.Transient);
    }
}

public class PlatformApplicationAutoClearDistributedCacheOnInitOptions
{
    private HashSet<string> autoClearContexts;
    public bool EnableAutoClearDistributedCacheOnInit { get; set; }

    public HashSet<string> AutoClearContexts
    {
        get => autoClearContexts;
        set => autoClearContexts = value?.Select(PlatformCacheKey.AutoFixKeyPartValue).ToHashSet();
    }
}
