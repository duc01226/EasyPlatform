using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Easy.Platform.Domain.UnitOfWork
{
    public interface IUnitOfWork : IDisposable
    {
        public event EventHandler OnCompleted;
        public event EventHandler<UnitOfWorkFailedArgs> OnFailed;

        public bool Completed { get; }

        public bool Disposed { get; }

        public List<IUnitOfWork> InnerUnitOfWorks { get; }

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
}
