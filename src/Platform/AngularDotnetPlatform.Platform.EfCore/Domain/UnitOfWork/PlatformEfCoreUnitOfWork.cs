using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.EfCore.Domain.UnitOfWork
{
    public interface IPlatformEfCoreUnitOfWork<TDbContext> : IUnitOfWork where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        public TDbContext DbContext { get; }
    }

    public abstract class PlatformEfCoreUnitOfWork<TDbContext> : IPlatformEfCoreUnitOfWork<TDbContext> where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        public PlatformEfCoreUnitOfWork(TDbContext dbContext)
        {
            DbContext = dbContext;
        }

        public event EventHandler OnCompleted;
        public event EventHandler<UnitOfWorkFailedArgs> OnFailed;
        public TDbContext DbContext { get; }

        public bool Completed { get; protected set; }
        public bool Disposed { get; protected set; }
        public List<IUnitOfWork> InnerUnitOfWorks { get; } = new List<IUnitOfWork>();

        public virtual async Task CompleteAsync(CancellationToken cancellationToken = default)
        {
            if (Completed)
                throw new Exception("This unit of work is completed");

            try
            {
                await SaveChangesAsync(cancellationToken);
                Completed = true;
                OnCompleted?.Invoke(this, EventArgs.Empty);
            }
            catch (Exception e)
            {
                OnFailed?.Invoke(this, new UnitOfWorkFailedArgs(e));
                throw;
            }
        }

        public bool IsActive()
        {
            return !Completed && !Disposed;
        }

        public void Dispose()
        {
            // Dispose of unmanaged resources.
            Dispose(true);
            // Suppress finalization.
            GC.SuppressFinalize(this);
        }

        // Protected implementation of Dispose pattern.
        protected virtual void Dispose(bool disposing)
        {
            if (Disposed)
            {
                return;
            }

            if (disposing)
            {
                // Dispose managed state (managed objects).
                DbContext?.Dispose();
            }

            Disposed = true;
        }

        protected virtual async Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            await DbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
