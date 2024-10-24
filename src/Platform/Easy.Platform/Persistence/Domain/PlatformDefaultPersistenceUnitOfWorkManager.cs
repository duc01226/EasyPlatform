using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Persistence.Domain;

public class PlatformDefaultPersistenceUnitOfWorkManager : PlatformUnitOfWorkManager
{
    public PlatformDefaultPersistenceUnitOfWorkManager(
        Lazy<IPlatformCqrs> cqrs,
        IPlatformRootServiceProvider rootServiceProvider,
        IServiceProvider serviceProvider) : base(cqrs, rootServiceProvider, serviceProvider)
    {
    }

    public override IPlatformUnitOfWork CreateNewUow(bool isUsingOnceTransientUow)
    {
        // Doing create scope because IUnitOfWork resolve with DbContext, and DbContext lifetime is usually scoped to support resolve db context
        // to use it directly in application layer in some project or cases without using repository.
        // But we still want to support Uow create new like transient, each uow associated with new db context
        // So that we can begin/destroy uow separately
        var newScope = ServiceProvider.CreateScope();

        var uow = new PlatformAggregatedPersistenceUnitOfWork(
                RootServiceProvider,
                newScope.ServiceProvider,
                newScope.ServiceProvider.GetService<ILoggerFactory>())
            .With(
                p =>
                {
                    p.AssociatedToDisposeWithServiceScope = newScope;
                    p.IsUsingOnceTransientUow = isUsingOnceTransientUow;
                    p.CreatedByUnitOfWorkManager = this;
                });

        if (isUsingOnceTransientUow)
        {
            FreeCreatedUnitOfWorks.TryAdd(uow.Id, uow);
            uow.OnUowCompletedActions.Add(
                () => Task.Run(
                    () =>
                    {
                        FreeCreatedUnitOfWorks.TryRemove(uow.Id, out _);
                        CompletedUows.TryAdd(uow.Id, uow);
                    }));
            uow.OnDisposedActions.Add(
                () => Task.Run(
                    () =>
                    {
                        FreeCreatedUnitOfWorks.TryRemove(uow.Id, out _);
                        CompletedUows.TryRemove(uow.Id, out _);
                    }));
        }

        return uow;
    }
}
