using System;
using System.Linq;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.Persistence.Domain
{
    public class PlatformDefaultPersistenceUnitOfWorkManager : IUnitOfWorkManager
    {
        private readonly IServiceProvider serviceProvider;

        private PlatformAggregatedPersistenceUnitOfWork currentAggregatedUnitOfWork;
        private bool isDisposed;

        public PlatformDefaultPersistenceUnitOfWorkManager(
            IServiceProvider serviceProvider)
        {
            this.serviceProvider = serviceProvider;
        }

        public IUnitOfWork Current()
        {
            return currentAggregatedUnitOfWork;
        }

        public IUnitOfWork CurrentActive()
        {
            var current = Current();
            if (current == null || !current.IsActive())
            {
                throw new Exception(
                    $"Current active unit of work is missing.");
            }

            return current;
        }

        public IUnitOfWork Begin()
        {
            var currentUnitOfWork = Current();

            if (currentUnitOfWork is { Completed: false, Disposed: false })
            {
                return currentUnitOfWork;
            }

            if (currentUnitOfWork is { Disposed: false })
            {
                currentUnitOfWork.Dispose();
            }

            currentUnitOfWork = new PlatformAggregatedPersistenceUnitOfWork(serviceProvider.GetServices<IUnitOfWork>().ToList());
            currentAggregatedUnitOfWork = (PlatformAggregatedPersistenceUnitOfWork)currentUnitOfWork;

            return currentUnitOfWork;
        }

        public TUnitOfWork CurrentInner<TUnitOfWork>() where TUnitOfWork : IUnitOfWork
        {
            return (TUnitOfWork)currentAggregatedUnitOfWork?.InnerUnitOfWorks
                .LastOrDefault(p => p.GetType().IsAssignableTo(typeof(TUnitOfWork)));
        }

        public TUnitOfWork CurrentInnerActive<TUnitOfWork>() where TUnitOfWork : IUnitOfWork
        {
            var current = CurrentInner<TUnitOfWork>();
            if (current == null || !current.IsActive())
            {
                throw new Exception(
                    $"Current active inner unit of work of type {typeof(TUnitOfWork).FullName} is missing. Should use {nameof(IUnitOfWorkManager)} to Begin a new UOW.");
            }

            return current;
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (isDisposed)
                return;

            if (disposing)
            {
                // free managed resources
                currentAggregatedUnitOfWork?.Dispose();
                currentAggregatedUnitOfWork = null;
            }

            isDisposed = true;
        }
    }
}
