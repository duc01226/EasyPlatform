using System;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.MongoDB.Domain.UnitOfWork
{
    public interface IPlatformMongoDbUnitOfWork<TDbContext> : IUnitOfWork where TDbContext : IPlatformMongoDbContext<TDbContext>
    {
        public TDbContext DbContext { get; }
    }

    public abstract class PlatformMongoDbUnitOfWork<TDbContext> : IPlatformMongoDbUnitOfWork<TDbContext> where TDbContext : PlatformMongoDbContext<TDbContext>
    {
        public PlatformMongoDbUnitOfWork(TDbContext dbContext)
        {
            DbContext = dbContext;
        }

        public event EventHandler OnCompleted;
        public event EventHandler<UnitOfWorkFailedArgs> OnFailed;
        public bool Completed { get; private set; }
        public bool Disposed { get; private set; }
        public TDbContext DbContext { get; }

        public Task CompleteAsync()
        {
            if (Completed)
                throw new Exception("This unit of work is completed");

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
    }
}
