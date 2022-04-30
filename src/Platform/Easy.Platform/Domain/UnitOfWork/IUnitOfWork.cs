using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Domain.Exceptions;

namespace Easy.Platform.Domain.UnitOfWork
{
    public interface IUnitOfWork : IDisposable
    {
        public event EventHandler OnCompleted;
        public event EventHandler<UnitOfWorkFailedArgs> OnFailed;

        public bool Completed { get; }

        public bool Disposed { get; }

        public List<IUnitOfWork> InnerUnitOfWorks { get; }

        public TInnerUow FindFirstInnerUowOfType<TInnerUow>() where TInnerUow : class, IUnitOfWork;

        /// <summary>
        /// Completes this unit of work.
        /// It saves all changes and commit transaction if exists.
        /// Each unit of work can only Complete once
        /// </summary>
        /// <returns>A task representing the asynchronous operation.</returns>
        Task CompleteAsync(CancellationToken cancellationToken = default);

        /// <summary>
        /// Return true if the current uow is not Completed and not Disposed
        /// </summary>
        /// <returns></returns>
        bool IsActive();
    }

    public class UnitOfWorkFailedArgs
    {
        public UnitOfWorkFailedArgs(Exception exception)
        {
            Exception = exception;
        }

        public Exception Exception { get; set; }
    }

    public abstract class PlatformUnitOfWork : IUnitOfWork
    {
        public PlatformUnitOfWork()
        {
        }

        public event EventHandler OnCompleted;
        public event EventHandler<UnitOfWorkFailedArgs> OnFailed;

        public bool Completed { get; protected set; }
        public bool Disposed { get; protected set; }
        public List<IUnitOfWork> InnerUnitOfWorks { get; protected set; } = new List<IUnitOfWork>();

        public TInnerUow FindFirstInnerUowOfType<TInnerUow>() where TInnerUow : class, IUnitOfWork
        {
            return UnitOfWorkHelper.FindFirstInnerUowOfType<TInnerUow>(InnerUnitOfWorks);
        }

        public virtual async Task CompleteAsync(CancellationToken cancellationToken = default)
        {
            if (Completed)
                return;

            try
            {
                await Task.WhenAll(InnerUnitOfWorks.Where(p => p.IsActive()).Select(p => p.CompleteAsync(cancellationToken)));
                await SaveChangesAsync(cancellationToken);
                Completed = true;
                InvokeOnCompleted(this, EventArgs.Empty);
            }
            catch (Exception e)
            {
                InvokeOnFailed(this, new UnitOfWorkFailedArgs(e));
                throw;
            }
        }

        public bool IsActive()
        {
            return !Completed && !Disposed;
        }

        public void Dispose()
        {
            if (IsActive())
                CompleteAsync().Wait();

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
            }

            Disposed = true;
        }

        protected virtual Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        protected void InvokeOnCompleted(object sender, EventArgs e)
        {
            OnCompleted?.Invoke(sender, e);
        }

        protected void InvokeOnFailed(object sender, UnitOfWorkFailedArgs e)
        {
            OnFailed?.Invoke(sender, e);
        }
    }

    public abstract class PlatformUnitOfWork<TDbContext> : PlatformUnitOfWork where TDbContext : IDisposable
    {
        public PlatformUnitOfWork(TDbContext dbContext)
        {
            DbContext = dbContext;
        }

        public TDbContext DbContext { get; }

        // Protected implementation of Dispose pattern.
        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);

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
