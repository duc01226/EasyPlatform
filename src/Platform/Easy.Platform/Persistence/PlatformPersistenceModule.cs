using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Persistence.DataMigration;
using Easy.Platform.Persistence.Domain;
using Easy.Platform.Persistence.Services.Abstract;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Persistence;

public abstract class PlatformPersistenceModule<TDbContext> : PlatformModule
    where TDbContext : class, IPlatformDbContext
{
    protected PlatformPersistenceModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
    {
    }

    protected virtual Func<IServiceProvider, TDbContext> DbContextProvider => null;

    protected abstract bool IsDevEnvironment();

    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        if (DbContextProvider != null)
            serviceCollection.RegisterAllForImplementation(typeof(TDbContext), DbContextProvider);
        else
            serviceCollection.RegisterAllForImplementation(typeof(TDbContext));
        serviceCollection.RegisterAllServicesFromType<IPlatformDbContext>(ServiceLifeTime.Scoped, Assembly);

        RegisterUnitOfWorkManager(serviceCollection);
        serviceCollection.RegisterAllFromType(typeof(IUnitOfWork), ServiceLifeTime.Transient, Assembly);
        RegisterRepositories(serviceCollection);

        RegisterInboxEventBusMessageRepository(serviceCollection);
        if (InboxConfigProvider(serviceCollection.BuildServiceProvider()) != null)
            serviceCollection.Register(
                serviceType: typeof(PlatformInboxConfig),
                InboxConfigProvider,
                ServiceLifeTime.Transient,
                replaceIfExist: true,
                DependencyInjectionExtension.ReplaceServiceStrategy.ByService);

        RegisterOutboxEventBusMessageRepository(serviceCollection);
        if (OutboxConfigProvider(serviceCollection.BuildServiceProvider()) != null)
            serviceCollection.Register(
                serviceType: typeof(PlatformOutboxConfig),
                OutboxConfigProvider,
                ServiceLifeTime.Transient,
                replaceIfExist: true,
                DependencyInjectionExtension.ReplaceServiceStrategy.ByService);

        serviceCollection.RegisterAllFromType<IPersistenceService>(ServiceLifeTime.Transient, Assembly);
        serviceCollection.RegisterAllFromType<IPlatformDataMigrationExecutor>(ServiceLifeTime.Transient, Assembly);
    }

    /// <summary>
    /// Override this function to limit the list of supported limited repository implementation for this persistence module
    /// </summary>
    /// <returns></returns>
    protected virtual List<Type> RegisterLimitedRepositoryImplementationTypes()
    {
        return null;
    }

    protected virtual void RegisterInboxEventBusMessageRepository(IServiceCollection serviceCollection)
    {
        if (EnableInboxEventBusMessageRepository())
            serviceCollection.RegisterAllFromType<IPlatformInboxBusMessageRepository>(ServiceLifeTime.Transient, Assembly);
    }

    protected virtual void RegisterOutboxEventBusMessageRepository(IServiceCollection serviceCollection)
    {
        if (EnableOutboxEventBusMessageRepository())
            serviceCollection.RegisterAllFromType<IPlatformOutboxBusMessageRepository>(ServiceLifeTime.Transient, Assembly);
    }

    protected virtual bool EnableInboxEventBusMessageRepository()
    {
        return false;
    }

    /// <summary>
    /// Support to custom the inbox config. Default return null
    /// </summary>
    protected virtual PlatformInboxConfig InboxConfigProvider(IServiceProvider serviceProvider)
    {
        return null;
    }

    protected virtual bool EnableOutboxEventBusMessageRepository()
    {
        return false;
    }

    /// <summary>
    /// Support to custom the outbox config. Default return null
    /// </summary>
    protected virtual PlatformOutboxConfig OutboxConfigProvider(IServiceProvider serviceProvider)
    {
        return null;
    }

    private void RegisterUnitOfWorkManager(IServiceCollection serviceCollection)
    {
        serviceCollection.Register<IUnitOfWorkManager, PlatformDefaultPersistenceUnitOfWorkManager>(ServiceLifeTime.Scoped);
        serviceCollection.RegisterAllFromType(
            typeof(IUnitOfWorkManager),
            ServiceLifeTime.Scoped,
            Assembly,
            replaceIfExist: true);
    }

    private void RegisterRepositories(IServiceCollection serviceCollection)
    {
        if (RegisterLimitedRepositoryImplementationTypes() != null)
            RegisterLimitedRepositoryImplementationTypes().ForEach(
                repositoryImplementationType => serviceCollection.RegisterAllForImplementation(repositoryImplementationType));
        else
            serviceCollection.RegisterAllFromType<IPlatformRepository>(ServiceLifeTime.Transient, Assembly);
    }
}
