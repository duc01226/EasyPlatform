#region

using System.Diagnostics;
using System.Reflection;
using Easy.Platform.Application.BackgroundJob;
using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Application.Cqrs.Queries;
using Easy.Platform.Application.Domain;
using Easy.Platform.Application.HostingBackgroundServices;
using Easy.Platform.Application.MessageBus;
using Easy.Platform.Application.MessageBus.Consumers;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Application.Services;
using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.HostingBackgroundServices;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.Abstract;
using Easy.Platform.Infrastructures.BackgroundJob;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application;

public interface IPlatformApplicationModule : IPlatformModule
{
    /// <summary>
    /// Asynchronously seeds data for the application module.
    /// This method is responsible for populating initial data required by the module.
    /// </summary>
    /// <param name="serviceScope">The service scope to resolve dependencies for data seeding.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    public Task SeedData(IServiceScope serviceScope);

    /// <summary>
    /// Asynchronously clears the distributed cache for the application module.
    /// This method is used to invalidate or remove cached data related to the module.
    /// </summary>
    /// <param name="options">The options for configuring the auto-clearing of the distributed cache.</param>
    /// <param name="serviceScope">The service scope to resolve dependencies for cache clearing.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous operation.</returns>
    public Task ClearDistributedCache(PlatformApplicationAutoClearDistributedCacheOnInitOptions options, IServiceScope serviceScope);
}

/// <summary>
/// Abstract base class for a platform application module.
/// Provides core functionalities for application modules, including dependency injection, initialization, and data seeding.
/// </summary>
public abstract class PlatformApplicationModule : PlatformModule, IPlatformApplicationModule
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformApplicationModule"/> class.
    /// </summary>
    /// <param name="serviceProvider">The service provider for dependency injection.</param>
    /// <param name="configuration">The configuration properties.</param>
    protected PlatformApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration)
    {
    }

    /// <summary>
    /// Gets a value indicating whether to automatically scan the assembly for CQRS handlers and register them.
    /// Default is true.
    /// </summary>
    protected override bool AutoScanAssemblyRegisterCqrs => true;

    /// <summary>
    /// Override this to true to auto register default caching module, which include default memory caching repository.
    /// <br></br>
    /// Don't need to auto register if you have register a caching module manually
    /// </summary>
    protected virtual bool AutoRegisterDefaultCaching => true;

    /// <summary>
    /// Default is True. Override this return to False if you need to seed data manually
    /// </summary>
    protected virtual bool AutoSeedApplicationDataOnInit => true;

    /// <summary>
    /// Set min thread pool then default to increase and fix some performance issues. Article:
    /// https://medium.com/@jaiadityarathore/dotnet-core-threadpool-bef2f5a37888
    /// https://github.com/StackExchange/StackExchange.Redis/issues/2332
    /// Default equal DefaultParallelIoTaskMaxConcurrent * DefaultNumberOfParallelIoTasksPerCpuRatio
    /// </summary>
    protected virtual int MinWorkerThreadPool =>
        Util.TaskRunner.DefaultParallelIoTaskMaxConcurrent * Util.TaskRunner.DefaultNumberOfParallelIoTasksPerCpuRatio;

    /// <inheritdoc cref="MinWorkerThreadPool"/>
    protected virtual int MinIoThreadPool => MinWorkerThreadPool;

    /// <summary>
    /// Gets a value indicating whether automatic memory clearing is enabled.
    /// When enabled, a background service will periodically clear memory to optimize performance.
    /// Default is true.
    /// </summary>
    public virtual bool AutoClearMemoryEnabled => true;

    /// <summary>
    /// Gets the interval time in seconds for the automatic memory clearing process.
    /// This value determines how often the memory clearing background service runs.
    /// Default is <see cref="PlatformAutoClearMemoryHostingBackgroundService.DefaultProcessTriggerIntervalTimeSeconds"/>.
    /// </summary>
    public virtual int AutoClearMemoryIntervalTimeSeconds => PlatformAutoClearMemoryHostingBackgroundService.DefaultProcessTriggerIntervalTimeSeconds;

    /// <summary>
    /// Seeds the application data into the database.
    /// </summary>
    /// <param name="serviceScope">The service scope which provides services for seeding data.</param>
    /// <remarks>
    /// This method will attempt to seed the data multiple times if the initial seeding fails,
    /// due to the possibility of the database server not being fully initialized.
    /// </remarks>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public async Task SeedData(IServiceScope serviceScope)
    {
        //if the db server is not initiated, SeedData could fail.
        //So that we do retry to ensure that SeedData action run successfully.
        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                await ExecuteDataSeeders(
                    serviceScope
                        .ServiceProvider.GetServices<IPlatformApplicationDataSeeder>()
                        .DistinctBy(p => p.GetType())
                        .Where(p => p.DelaySeedingInBackgroundBySeconds <= 0)
                        .GroupBy(p => p.SeedOrder)
                        .OrderBy(p => p.Key)
                        .ToList()
                );

                await ExecuteDataSeeders(
                    serviceScope
                        .ServiceProvider.GetServices<IPlatformApplicationDataSeeder>()
                        .DistinctBy(p => p.GetType())
                        .Where(p => p.DelaySeedingInBackgroundBySeconds > 0)
                        .GroupBy(p => p.SeedOrder)
                        .OrderBy(p => p.Key)
                        .ToList(),
                    inBackground: true
                );
            },
            retryAttempt => 10.Seconds(),
            10,
            onRetry: (exception, timeSpan, retry, ctx) =>
            {
                Logger.LogError(
                    exception.BeautifyStackTrace(),
                    "Exception {ExceptionType} detected on attempt SeedData {Retry}",
                    exception.GetType().Name,
                    retry
                );
            }
        );

        static async Task ExecuteDataSeederWithLog(IPlatformApplicationDataSeeder dataSeeder, ILogger logger)
        {
            logger.LogInformation("[SeedData] {DataSeeder} STARTED.", dataSeeder.GetType().Name);

            await dataSeeder.SeedData();

            logger.LogInformation("[SeedData] {DataSeeder} FINISHED.", dataSeeder.GetType().Name);
        }

        async Task ExecuteDataSeeders(List<IGrouping<int, IPlatformApplicationDataSeeder>> dataSeeders, bool inBackground = false)
        {
            if (inBackground)
            {
                Util.TaskRunner.QueueActionInBackground(
                    () => RunDataSeeders(dataSeeders, inNewScope: true),
                    loggerFactory: () => CreateLogger(LoggerFactory)
                );
            }
            else
                await RunDataSeeders(dataSeeders);
        }

        async Task RunDataSeeders(List<IGrouping<int, IPlatformApplicationDataSeeder>> dataSeederGroups, bool inNewScope = false)
        {
            await dataSeederGroups.ForEachAsync(async dataSeederGroup =>
            {
                await dataSeederGroup.ParallelAsync(async seeder =>
                {
                    if (seeder.DelaySeedingInBackgroundBySeconds > 0)
                    {
                        Logger.LogInformation(
                            "[SeedData] {Seeder} is SCHEDULED running in background after {DelaySeedingInBackgroundBySeconds} seconds.",
                            seeder.GetType().Name,
                            seeder.DelaySeedingInBackgroundBySeconds
                        );

                        await Task.Delay(seeder.DelaySeedingInBackgroundBySeconds.Seconds());
                    }

                    if (inNewScope)
                    {
                        using (var newScope = ServiceProvider.CreateTrackedScope())
                        {
                            var dataSeeder = newScope.ServiceProvider.GetService(seeder.GetType()).As<IPlatformApplicationDataSeeder>();

                            await ExecuteDataSeederWithLog(dataSeeder, Logger);
                        }
                    }
                    else
                        await ExecuteDataSeederWithLog(seeder, Logger);
                });
            });
        }
    }

    /// <summary>
    /// Clears the distributed cache based on the provided options and service scope.
    /// </summary>
    /// <param name="options">The options for auto clearing the distributed cache on initialization.</param>
    /// <param name="serviceScope">The service scope used to get the cache provider.</param>
    /// <remarks>
    /// If the cache server is not initiated, this method could fail. Therefore, it uses a retry mechanism to ensure successful execution.
    /// </remarks>
    /// <returns>A Task representing the asynchronous operation.</returns>
    public async Task ClearDistributedCache(PlatformApplicationAutoClearDistributedCacheOnInitOptions options, IServiceScope serviceScope)
    {
        //if the cache server is not initiated, ClearDistributedCache could fail.
        //So that we do retry to ensure that ClearDistributedCache action run successfully.
        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                var cacheProvider = serviceScope.ServiceProvider.GetService<IPlatformCacheRepositoryProvider>();
                if (cacheProvider == null)
                    return;

                await Enum.GetValues<PlatformCacheRepositoryType>()
                    .Where(p => p != PlatformCacheRepositoryType.Memory)
                    .ForEachAsync(async cacheRepositoryType =>
                    {
                        var cacheRepository = cacheProvider.TryGet(cacheRepositoryType);

                        if (cacheRepository != null)
                        {
                            await cacheRepository.RemoveByTagsAsync(
                                options.AutoClearContexts.SelectList(autoClearContext => PlatformCacheKey.BuildCacheKeyContextTag(autoClearContext))
                            );
                        }
                    });
            },
            retryAttempt => 10.Seconds(),
            10,
            onRetry: (exception, timeSpan, retry, ctx) =>
            {
                Logger.LogError(
                    exception.BeautifyStackTrace(),
                    "Exception {ExceptionType} detected on attempt ClearDistributedCache {Retry}",
                    exception.GetType().Name,
                    retry
                );
            }
        );
    }

    /// <summary>
    /// Returns a list of tracing sources used for distributed tracing.
    /// These sources are used to instrument the application for observability.
    /// </summary>
    /// <returns>An array of strings representing the tracing sources.</returns>
    public override string[] TracingSources()
    {
        return
        [
            IPlatformCqrsCommandApplicationHandler.ActivitySource.Name,
            IPlatformCqrsQueryApplicationHandler.ActivitySource.Name,
            IPlatformApplicationBackgroundJobExecutor.ActivitySource.Name,
            IPlatformDbContext.ActivitySource.Name
        ];
    }

    /// <summary>
    /// <inheritdoc cref="PlatformModule.GetServicesRegisterScanAssemblies" />  <br></br>
    /// For ApplicationModule, by default do not support scan parent application module
    /// </summary>
    public override List<Assembly> GetServicesRegisterScanAssemblies()
    {
        return [Assembly];
    }

    /// <summary>
    /// Support to custom the inbox config. Default return null
    /// </summary>
    protected virtual PlatformInboxConfig InboxConfigProvider(IServiceProvider serviceProvider)
    {
        return new PlatformInboxConfig();
    }

    /// <summary>
    /// Support to custom the outbox config. Default return null
    /// </summary>
    protected virtual PlatformOutboxConfig OutboxConfigProvider(IServiceProvider serviceProvider)
    {
        return new PlatformOutboxConfig();
    }

    /// <summary>
    /// Registers helper services from the specified assemblies into the service collection.
    /// Helpers are internal utility classes used within the module.
    /// </summary>
    /// <param name="serviceCollection">The service collection to add the helpers to.</param>
    protected override void RegisterHelpers(IServiceCollection serviceCollection)
    {
        serviceCollection.RegisterAllFromType<IPlatformHelper>(GetServicesRegisterScanAssemblies());
        serviceCollection.RegisterAllFromType<IPlatformHelper>(GetServicesRegisterScanAssemblies());
    }

    /// <summary>
    /// Executes the seed data method of all dependent application modules in the order of their initialization priority.
    /// </summary>
    /// <param name="moduleTypeDependencies">A list of types representing the dependencies of the application module.</param>
    /// <param name="serviceProvider">An instance of IServiceProvider to resolve dependencies.</param>
    /// <returns>A Task representing the asynchronous operation.</returns>
    public static async Task ExecuteDependencyApplicationModuleSeedData(List<Type> moduleTypeDependencies, IServiceProvider serviceProvider)
    {
        await moduleTypeDependencies
            .Where(moduleType => moduleType.IsAssignableTo(typeof(IPlatformApplicationModule)))
            .Select(moduleType => new
            {
                ModuleType = moduleType,
                serviceProvider.GetService(moduleType).As<IPlatformApplicationModule>().ExecuteInitPriority
            })
            .OrderByDescending(p => p.ExecuteInitPriority)
            .Select(p => p.ModuleType)
            .ForEachAsync(async moduleType =>
            {
                await serviceProvider.ExecuteScopedAsync(scope =>
                    scope.ServiceProvider.GetService(moduleType).As<IPlatformApplicationModule>().SeedData(scope)
                );
            });
    }

    /// <summary>
    /// Asynchronously executes the data seeding for the dependent application modules.
    /// This method orchestrates the seeding process for all modules this module depends on.
    /// </summary>
    public async Task ExecuteDependencyApplicationModuleSeedData()
    {
        await ExecuteDependencyApplicationModuleSeedData(
            ModuleTypeDependencies().Select(moduleTypeProvider => moduleTypeProvider(Configuration)).ToList(),
            ServiceProvider
        );
    }

    /// <summary>
    /// Override this factory method to register default PlatformApplicationSettingContext if application do not
    /// have any implementation of IPlatformApplicationSettingContext in the Assembly to be registered.
    /// </summary>
    protected virtual PlatformApplicationSettingContext DefaultApplicationSettingContextFactory(IServiceProvider serviceProvider)
    {
        return new PlatformApplicationSettingContext(serviceProvider) { ApplicationName = Assembly.GetName().Name, ApplicationAssembly = Assembly };
    }

    /// <summary>
    /// Registers the internal services of the module into the service collection.
    /// This method is called during the module's registration phase.
    /// </summary>
    /// <param name="serviceCollection">The service collection to add the services to.</param>
    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        serviceCollection.RegisterAllFromType<IPlatformApplicationDataSeeder>(GetServicesRegisterScanAssemblies(), ServiceLifeTime.Scoped);
        serviceCollection.RegisterAllSelfImplementationFromType<IPlatformCqrsEventApplicationHandler>(GetServicesRegisterScanAssemblies());
        RegisterMessageBus(serviceCollection);
        RegisterApplicationSettingContext(serviceCollection);
        RegisterDefaultApplicationRequestContext(serviceCollection);
        serviceCollection.RegisterIfServiceNotExist<IPlatformUnitOfWorkManager, PlatformPseudoApplicationUnitOfWorkManager>(ServiceLifeTime.Scoped);
        serviceCollection.RegisterAllFromType<IPlatformApplicationService>(GetServicesRegisterScanAssemblies());

        serviceCollection.RegisterAllFromType<IPlatformDbContext>(GetServicesRegisterScanAssemblies(), ServiceLifeTime.Scoped);
        serviceCollection.RegisterAllFromType<IPlatformInfrastructureService>(GetServicesRegisterScanAssemblies());
        serviceCollection.RegisterAllFromType<IPlatformBackgroundJobExecutor>(GetServicesRegisterScanAssemblies());

        if (AutoRegisterDefaultCaching)
            RegisterRuntimeModuleDependencies<PlatformCachingModule>(serviceCollection);

        GetServicesRegisterScanAssemblies()
            .ForEach(assembly => serviceCollection.RegisterHostedServicesFromType(assembly, typeof(PlatformHostingBackgroundService)));

        if (AutoClearMemoryEnabled)
        {
            serviceCollection.RegisterHostedService(sp => new PlatformAutoClearMemoryHostingBackgroundService(
                sp,
                sp.GetRequiredService<ILoggerFactory>(),
                AutoClearMemoryIntervalTimeSeconds
            ));
        }

        serviceCollection.Register<IPlatformApplicationBackgroundJobScheduler, PlatformApplicationBackgroundJobScheduler>();
        serviceCollection.Register<
            IPlatformBackgroundJobSchedulerCarryRequestContextService,
            PlatformApplicationBackgroundJobSchedulerCarryRequestContextService
        >(ServiceLifeTime.Scoped);
    }

    /// <summary>
    /// Initializes the module, performing tasks such as setting up thread pools, running migrations, and seeding data.
    /// This method is called during the application startup.
    /// </summary>
    /// <param name="serviceScope">The service scope to resolve dependencies for initialization.</param>
    protected override async Task InternalInit(IServiceScope serviceScope)
    {
        ThreadPool.SetMinThreads(MinWorkerThreadPool, MinIoThreadPool);

        await IPlatformPersistenceModule.ExecuteDependencyPersistenceModuleMigrateApplicationData(
            ModuleTypeDependencies().Select(moduleTypeProvider => moduleTypeProvider(Configuration)).ToList(),
            ServiceProvider
        );

        if (IsRootModule && AutoSeedApplicationDataOnInit)
            await ExecuteDependencyApplicationModuleSeedData();

        var autoClearDistributedCacheOnInitOptions = AutoClearDistributedCacheOnInitOptions(serviceScope);
        if (autoClearDistributedCacheOnInitOptions.EnableAutoClearDistributedCacheOnInit)
            await ClearDistributedCache(autoClearDistributedCacheOnInitOptions, serviceScope);

        if (AutoRegisterDefaultCaching)
            await serviceScope.ServiceProvider.GetRequiredService<PlatformCachingModule>().With(p => p.IsChildModule = true).Init(CurrentAppBuilder);
    }

    /// <summary>
    /// Gets the options for automatically clearing the distributed cache on initialization.
    /// </summary>
    /// <param name="serviceScope">The service scope.</param>
    /// <returns>A <see cref="PlatformApplicationAutoClearDistributedCacheOnInitOptions" /> object that represents the options for automatically clearing the distributed cache on initialization.</returns>
    protected virtual PlatformApplicationAutoClearDistributedCacheOnInitOptions AutoClearDistributedCacheOnInitOptions(IServiceScope serviceScope)
    {
        var applicationSettingContext = serviceScope.ServiceProvider.GetRequiredService<IPlatformApplicationSettingContext>();

        return new PlatformApplicationAutoClearDistributedCacheOnInitOptions
        {
            EnableAutoClearDistributedCacheOnInit = true,
            AutoClearContexts = [applicationSettingContext.ApplicationName]
        };
    }

    private void RegisterApplicationSettingContext(IServiceCollection serviceCollection)
    {
        serviceCollection.RegisterAllFromType<IPlatformApplicationSettingContext>(GetServicesRegisterScanAssemblies());

        // If there is no custom implemented class type of IPlatformApplicationSettingContext in application,
        // register default PlatformApplicationSettingContext from result of DefaultApplicationSettingContextFactory
        // WHY: To support custom IPlatformApplicationSettingContext if you want to or just use the default from DefaultApplicationSettingContextFactory
        if (serviceCollection.All(p => p.ServiceType != typeof(IPlatformApplicationSettingContext)))
            serviceCollection.Register<IPlatformApplicationSettingContext>(DefaultApplicationSettingContextFactory, ServiceLifeTime.Singleton);
    }

    private void RegisterDefaultApplicationRequestContext(
        IServiceCollection serviceCollection,
        PlatformDefaultApplicationRequestContextAccessor.ContextLifeTimeModes contextLifeTimeMode =
            PlatformDefaultApplicationRequestContextAccessor.ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow
    )
    {
        if (serviceCollection.All(p => p.ServiceType != typeof(IPlatformApplicationRequestContextAccessor)))
        {
            serviceCollection.Register(
                typeof(IPlatformApplicationRequestContextAccessor),
                sp => new PlatformDefaultApplicationRequestContextAccessor(sp, contextLifeTimeMode, sp.GetRequiredService<ILoggerFactory>()),
                ServiceLifeTime.Scoped,
                true,
                DependencyInjectionExtension.CheckRegisteredStrategy.ByService
            );
        }

        serviceCollection.Register(
            sp => new PlatformApplicationLazyLoadRequestContextAccessorRegisters(
                sp,
                sp.GetRequiredService<IPlatformApplicationRequestContextAccessor>(),
                LazyLoadRequestContextAccessorRegistersFactory()
            ),
            ServiceLifeTime.Scoped,
            true,
            DependencyInjectionExtension.CheckRegisteredStrategy.ByService
        );

        serviceCollection.Register(
            typeof(IPlatformApplicationRequestContext),
            sp => sp.GetRequiredService<IPlatformApplicationRequestContextAccessor>().Current
        );
    }

    /// <summary>
    /// Creates a dictionary of asynchronous factory functions that define lazy-loaded request context values for the application.
    /// This factory method enables applications to register expensive-to-compute context values that are only resolved when first accessed,
    /// providing performance optimization and dependency injection capabilities for request-scoped data.
    /// </summary>
    /// <returns>
    /// A dictionary where:
    /// - **Key**: The context key string (e.g., "CurrentEmployee", "CurrentUserOrganizations") used to identify and retrieve the context value
    /// - **Value**: An asynchronous factory function that takes <see cref="IServiceProvider"/> and <see cref="IPlatformApplicationRequestContextAccessor"/>
    ///   and returns a <see cref="Task{Object}"/>? containing the resolved context value
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Purpose and Architecture:</strong>
    /// This method is a core part of the Easy Platform's request context management system, allowing applications to define
    /// custom context values that are lazily computed and cached per request. The factory pattern ensures that expensive
    /// operations (like database queries for current user data) are deferred until actually needed and cached for the
    /// duration of the request.
    /// </para>
    ///
    /// <para>
    /// <strong>How It Works:</strong>
    /// </para>
    /// <list type="number">
    /// <item><description><strong>Registration Phase:</strong> During application startup, this method is called to register factory functions</description></item>
    /// <item><description><strong>Factory Storage:</strong> The returned dictionary is passed to <see cref="PlatformApplicationLazyLoadRequestContextAccessorRegisters"/></description></item>
    /// <item><description><strong>Lazy Resolution:</strong> When <c>RequestContext.CurrentEmployee()</c> or similar extension methods are called, the corresponding factory is executed</description></item>
    /// <item><description><strong>Caching:</strong> Results are cached in <c>AsyncLocal</c> storage for the duration of the request thread and its async continuations</description></item>
    /// <item><description><strong>Context Access:</strong> Values become available through extension methods like <c>RequestContext.CurrentEmployee()</c>, <c>RequestContext.CurrentUserOrganizations()</c></description></item>
    /// </list>
    ///
    /// <para>
    /// <strong>Implementation Pattern:</strong>
    /// </para>
    /// <code>
    /// protected override Dictionary&lt;string, Func&lt;IServiceProvider, IPlatformApplicationRequestContextAccessor, Task&lt;object?&gt;&gt;&gt;
    ///     LazyLoadRequestContextAccessorRegistersFactory()
    /// {
    ///     return new Dictionary&lt;string, Func&lt;IServiceProvider, IPlatformApplicationRequestContextAccessor, Task&lt;object?&gt;&gt;&gt;
    ///     {
    ///         {
    ///             BravoSuitesApplicationCustomRequestContextKeys.CurrentEmployeeKey,
    ///             GetCurrentEmployee
    ///         },
    ///         {
    ///             BravoSuitesApplicationCustomRequestContextKeys.CurrentUserOrganizationsKey,
    ///             GetCurrentUserOrganizations
    ///         }
    ///     };
    /// }
    ///
    /// private static async Task&lt;object?&gt; GetCurrentEmployee(IServiceProvider provider, IPlatformApplicationRequestContextAccessor accessor)
    /// {
    ///     return await provider.ExecuteInjectScopedAsync&lt;Employee&gt;(async (
    ///         IGrowthRootRepository&lt;Employee&gt; repository,
    ///         IPlatformCacheRepositoryProvider cacheRepositoryProvider) =&gt;
    ///     {
    ///         return await cacheRepositoryProvider.Get()
    ///             .CacheRequestAsync(
    ///                 () =&gt; repository.FirstOrDefaultAsync(
    ///                     predicate: Employee.UniqueExpr(accessor.Current.ProductScope(), accessor.Current.CurrentCompanyId(), accessor.Current.UserId()),
    ///                     CancellationToken.None,
    ///                     p =&gt; p.User,
    ///                     p =&gt; p.Departments,
    ///                     p =&gt; p.Manager!.User),
    ///                 ApplicationCustomRequestContextKeys.CurrentEmployeeCacheKey(
    ///                     accessor.Current.ProductScope(),
    ///                     accessor.Current.CurrentCompanyId(),
    ///                     accessor.Current.UserId()),
    ///                 (PlatformCacheEntryOptions?)null,
    ///                 tags: ApplicationCustomRequestContextKeys.CurrentEmployeeCacheTags(
    ///                     accessor.Current.ProductScope(),
    ///                     accessor.Current.CurrentCompanyId(),
    ///                     accessor.Current.UserId()));
    ///     });
    /// }
    /// </code>
    ///
    /// <para>
    /// <strong>Common Use Cases:</strong>
    /// </para>
    /// <list type="bullet">
    /// <item><description><strong>Current Employee:</strong> Loading the current user's employee record with departments, manager, and user information for authorization and business logic</description></item>
    /// <item><description><strong>User Organizations:</strong> Retrieving organizational units and permissions for the current user to implement role-based access control</description></item>
    /// <item><description><strong>Company-specific Data:</strong> Loading configuration, settings, or metadata specific to the user's current company context</description></item>
    /// <item><description><strong>Cached Expensive Calculations:</strong> Computing and caching complex business calculations that depend on user context</description></item>
    /// </list>
    ///
    /// <para>
    /// <strong>Usage in Application Code:</strong>
    /// Once registered, these context values can be accessed throughout the application using extension methods:
    /// </para>
    /// <code>
    /// // In query/command handlers, domain services, or other application components
    /// public async Task&lt;SomeResult&gt; HandleAsync(SomeQuery request, CancellationToken cancellationToken)
    /// {
    ///     var currentEmployee = await RequestContext.CurrentEmployee();
    ///     var userOrganizations = await RequestContext.CurrentUserOrganizations();
    ///
    ///     // Use the context data for business logic, authorization, etc.
    ///     if (currentEmployee.ManagerId == someGoal.CreatedBy)
    ///     {
    ///         // Manager can modify subordinate's goals
    ///     }
    /// }
    /// </code>
    ///
    /// <para>
    /// <strong>Performance Considerations:</strong>
    /// </para>
    /// <list type="bullet">
    /// <item><description><strong>Lazy Loading:</strong> Factories are only executed when the context value is first accessed, avoiding unnecessary computations</description></item>
    /// <item><description><strong>Request-scoped Caching:</strong> Results are cached per request, preventing duplicate database queries or expensive calculations</description></item>
    /// <item><description><strong>Memory Management:</strong> Context data is automatically cleaned up when the request completes through <c>AsyncLocal</c> mechanisms</description></item>
    /// <item><description><strong>Dependency Injection:</strong> Factories can resolve any registered services, enabling complex data loading scenarios</description></item>
    /// </list>
    ///
    /// <para>
    /// <strong>Integration with Caching:</strong>
    /// Factory implementations typically integrate with the platform's caching infrastructure using <c>IPlatformCacheRepositoryProvider</c>
    /// to provide multi-level caching (request-level + distributed cache) for frequently accessed context data.
    /// </para>
    ///
    /// <para>
    /// <strong>Thread Safety and Async Context:</strong>
    /// The lazy-load system uses <c>AsyncLocal&lt;T&gt;</c> to ensure context values flow correctly across async/await boundaries
    /// and are isolated per request thread, preventing data leakage between concurrent requests.
    /// </para>
    ///
    /// <para>
    /// <strong>Error Handling:</strong>
    /// Factory functions should handle exceptions gracefully, as failures during context loading can impact the entire request.
    /// Consider implementing fallback strategies or returning default values when context loading fails.
    /// </para>
    /// </remarks>
    /// <example>
    /// <para><strong>Complete Example - Growth Application Module:</strong></para>
    /// <code>
    /// public class GrowthApplicationModule : PlatformApplicationModule
    /// {
    ///     protected override Dictionary&lt;string, Func&lt;IServiceProvider, IPlatformApplicationRequestContextAccessor, Task&lt;object?&gt;&gt;&gt;
    ///         LazyLoadRequestContextAccessorRegistersFactory()
    ///     {
    ///         return new Dictionary&lt;string, Func&lt;IServiceProvider, IPlatformApplicationRequestContextAccessor, Task&lt;object?&gt;&gt;&gt;
    ///         {
    ///             {
    ///                 BravoSuitesApplicationCustomRequestContextKeys.CurrentEmployeeKey,
    ///                 GetCurrentEmployee
    ///             }
    ///         };
    ///     }
    ///
    ///     private static async Task&lt;object?&gt; GetCurrentEmployee(IServiceProvider provider, IPlatformApplicationRequestContextAccessor accessor)
    ///     {
    ///         return await provider.ExecuteInjectScopedAsync&lt;Employee&gt;(async (
    ///             IGrowthRootRepository&lt;Employee&gt; repository,
    ///             IPlatformCacheRepositoryProvider cacheRepositoryProvider) =&gt;
    ///         {
    ///             return await cacheRepositoryProvider.Get()
    ///                 .CacheRequestAsync(
    ///                     () =&gt; repository.FirstOrDefaultAsync(
    ///                         predicate: Employee.UniqueExpr(accessor.Current.ProductScope(), accessor.Current.CurrentCompanyId(), accessor.Current.UserId()),
    ///                         CancellationToken.None,
    ///                         p =&gt; p.User,
    ///                         p =&gt; p.Departments,
    ///                         p =&gt; p.Manager!.User),
    ///                     ApplicationCustomRequestContextKeys.CurrentEmployeeCacheKey(
    ///                         accessor.Current.ProductScope(),
    ///                         accessor.Current.CurrentCompanyId(),
    ///                         accessor.Current.UserId()),
    ///                     (PlatformCacheEntryOptions?)null,
    ///                     tags: ApplicationCustomRequestContextKeys.CurrentEmployeeCacheTags(
    ///                         accessor.Current.ProductScope(),
    ///                         accessor.Current.CurrentCompanyId(),
    ///                         accessor.Current.UserId()));
    ///         });
    ///     }
    /// }
    ///
    /// // Usage in application handlers
    /// public class DeleteGoalCommandHandler : PlatformCqrsCommandApplicationHandler&lt;DeleteGoalCommand, DeleteGoalCommandResult&gt;
    /// {
    ///     protected override async Task&lt;DeleteGoalCommandResult&gt; HandleAsync(DeleteGoalCommand request, CancellationToken cancellationToken)
    ///     {
    ///         var currentEmployee = await RequestContext.CurrentEmployee(); // Lazy-loaded from factory
    ///         var goal = await goalRepository.GetByIdAsync(request.Id, cancellationToken);
    ///
    ///         // Use currentEmployee for authorization
    ///         goal.EnsureCanUpdateGoalProgressMeasurementOrDeleted(currentEmployee, RequestContext);
    ///
    ///         await goalRepository.DeleteAsync(goal.Id, cancellationToken);
    ///         return new DeleteGoalCommandResult();
    ///     }
    /// }
    /// </code>
    /// </example>
    /// <seealso cref="PlatformApplicationLazyLoadRequestContextAccessorRegisters"/>
    /// <seealso cref="IPlatformApplicationRequestContextAccessor"/>
    /// <seealso cref="IPlatformApplicationRequestContext"/>
    protected virtual Dictionary<
        string,
        Func<IServiceProvider, IPlatformApplicationRequestContextAccessor, Task<object?>>
    > LazyLoadRequestContextAccessorRegistersFactory()
    {
        return [];
    }

    /// <summary>
    /// Registers the message bus services in the provided service collection.
    /// </summary>
    /// <param name="serviceCollection">The service collection to add the services to.</param>
    private void RegisterMessageBus(IServiceCollection serviceCollection)
    {
        serviceCollection.Register<IPlatformMessageBusScanner, PlatformApplicationMessageBusScanner>(ServiceLifeTime.Singleton);

        serviceCollection.Register<IPlatformApplicationBusMessageProducer, PlatformApplicationBusMessageProducer>();
        serviceCollection.RegisterAllSelfImplementationFromType(typeof(IPlatformCqrsEventBusMessageProducer<>), GetServicesRegisterScanAssemblies());
        serviceCollection.RegisterAllSelfImplementationFromType(
            typeof(PlatformCqrsCommandEventBusMessageProducer<>),
            GetServicesRegisterScanAssemblies()
        );
        serviceCollection.RegisterAllSelfImplementationFromType(
            typeof(PlatformCqrsEntityEventBusMessageProducer<,,>),
            GetServicesRegisterScanAssemblies()
        );

        serviceCollection.RegisterAllSelfImplementationFromType(typeof(IPlatformMessageBusConsumer), typeof(PlatformApplicationModule).Assembly);
        serviceCollection.RegisterAllSelfImplementationFromType(typeof(IPlatformMessageBusConsumer), GetServicesRegisterScanAssemblies());
        serviceCollection.RegisterAllSelfImplementationFromType(
            typeof(IPlatformApplicationMessageBusConsumer<>),
            GetServicesRegisterScanAssemblies()
        );

        serviceCollection.RegisterHostedService<PlatformInboxBusMessageCleanerHostedService>();
        serviceCollection.RegisterHostedService<PlatformConsumeInboxBusMessageHostedService>();
        serviceCollection.Register(
            typeof(PlatformInboxConfig),
            InboxConfigProvider,
            ServiceLifeTime.Singleton,
            true,
            DependencyInjectionExtension.CheckRegisteredStrategy.ByService
        );

        serviceCollection.RegisterHostedService<PlatformOutboxBusMessageCleanerHostedService>();
        serviceCollection.RegisterHostedService<PlatformSendOutboxBusMessageHostedService>();
        serviceCollection.Register(
            typeof(PlatformOutboxConfig),
            OutboxConfigProvider,
            ServiceLifeTime.Singleton,
            true,
            DependencyInjectionExtension.CheckRegisteredStrategy.ByService
        );
    }
}

/// <summary>
/// Provides options for configuring the automatic clearing of the distributed cache upon application initialization.
/// </summary>
public class PlatformApplicationAutoClearDistributedCacheOnInitOptions
{
    private HashSet<string> autoClearContexts;

    /// <summary>
    /// Gets or sets a value indicating whether to enable the automatic clearing of the distributed cache on initialization.
    /// When true, the cache will be cleared during the application startup process.
    /// </summary>
    public bool EnableAutoClearDistributedCacheOnInit { get; set; }

    /// <summary>
    /// Gets or sets the set of cache contexts to be cleared.
    /// These contexts identify specific areas of the cache to be cleared.
    /// The values are automatically formatted as valid cache key parts.
    /// </summary>
    public HashSet<string> AutoClearContexts
    {
        get => autoClearContexts;
        set => autoClearContexts = value?.Select(PlatformCacheKey.AutoFixKeyPartValue).ToHashSet();
    }
}
