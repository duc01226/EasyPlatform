using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.Application.Domain
{
    internal class PlatformPseudoApplicationUnitOfWorkManager : IUnitOfWorkManager
    {
        private IUnitOfWork currentUnitOfWork;
        private bool isDisposed;

        public PlatformPseudoApplicationUnitOfWorkManager()
        {
        }

        public IUnitOfWork Current()
        {
            return currentUnitOfWork;
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
            if (currentUnitOfWork is { Completed: false, Disposed: false })
            {
                return currentUnitOfWork;
            }

            if (currentUnitOfWork is { Disposed: false })
            {
                currentUnitOfWork.Dispose();
            }

            currentUnitOfWork = new PlatformPseudoApplicationUnitOfWork();

            return currentUnitOfWork;
        }

        public TUnitOfWork CurrentInner<TUnitOfWork>() where TUnitOfWork : IUnitOfWork
        {
            return (TUnitOfWork)currentUnitOfWork;
        }

        public TUnitOfWork CurrentInnerActive<TUnitOfWork>() where TUnitOfWork : IUnitOfWork
        {
            var current = CurrentInner<TUnitOfWork>();
            if (current == null || !current.IsActive())
            {
                throw new Exception(
                    $"Current active inner unit of work is missing.");
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
                currentUnitOfWork?.Dispose();
                currentUnitOfWork = null;
            }

            isDisposed = true;
        }
    }

    internal class PlatformPseudoApplicationUnitOfWork : IUnitOfWork
    {
        public event EventHandler OnCompleted;
        public event EventHandler<UnitOfWorkFailedArgs> OnFailed;
        public bool Completed { get; private set; }
        public bool Disposed { get; private set; }
        public List<IUnitOfWork> InnerUnitOfWorks { get; } = new List<IUnitOfWork>();

        public Task CompleteAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                Completed = true;
                OnCompleted?.Invoke(this, EventArgs.Empty);
            }
            catch (Exception e)
            {
                OnFailed?.Invoke(this, new UnitOfWorkFailedArgs(e));
                throw;
            }

            return Task.CompletedTask;
        }

        public bool IsActive()
        {
            return !Disposed && !Completed;
        }

        public void Dispose()
        {
            Disposed = true;
        }
    }
}
