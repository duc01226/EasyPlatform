using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.Persistence
{
    public class PlatformDefaultUnitOfWorkManager : IUnitOfWorkManager
    {
        private readonly IServiceProvider serviceProvider;
        private readonly Dictionary<Type, IUnitOfWork> currentUnitOfWorks = new Dictionary<Type, IUnitOfWork>();

        private bool isDisposed;

        public PlatformDefaultUnitOfWorkManager(
            IServiceProvider serviceProvider)
        {
            this.serviceProvider = serviceProvider;
        }

        public IUnitOfWork Current()
        {
            return currentUnitOfWorks.Select(p => p.Value).LastOrDefault();
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
            return Begin<IUnitOfWork>();
        }

        public TUnitOfWork Begin<TUnitOfWork>() where TUnitOfWork : IUnitOfWork
        {
            var currentTUnitOfWork = Current<TUnitOfWork>();

            if (currentTUnitOfWork is { Completed: false, Disposed: false })
            {
                return currentTUnitOfWork;
            }

            if (currentTUnitOfWork is { Disposed: false })
            {
                currentTUnitOfWork.Dispose();
            }

            currentTUnitOfWork = serviceProvider.GetServices<TUnitOfWork>().Last();
            currentUnitOfWorks[typeof(TUnitOfWork)] = currentTUnitOfWork;

            return currentTUnitOfWork;
        }

        public TUnitOfWork Current<TUnitOfWork>() where TUnitOfWork : IUnitOfWork
        {
            return (TUnitOfWork)currentUnitOfWorks.Select(p => p.Value).LastOrDefault(p => p.GetType().IsAssignableTo(typeof(TUnitOfWork)));
        }

        public TUnitOfWork CurrentActive<TUnitOfWork>() where TUnitOfWork : IUnitOfWork
        {
            var current = Current<TUnitOfWork>();
            if (current == null || !current.IsActive())
            {
                throw new Exception(
                    $"Current active unit of work for type {typeof(TUnitOfWork).FullName} is missing.");
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
                foreach (var currentUnitOfWork in currentUnitOfWorks)
                {
                    currentUnitOfWork.Value.Dispose();
                }

                currentUnitOfWorks.Clear();
            }

            isDisposed = true;
        }
    }
}
