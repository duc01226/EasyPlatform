using System;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.Domain.UnitOfWork
{
    public interface IUnitOfWork : IDisposable
    {
        public bool Completed { get; }

        public bool Disposed { get; }

        /// <summary>
        /// Completes this unit of work.
        /// It saves all changes and commit transaction if exists.
        /// Each unit of work can only Complete once
        /// </summary>
        /// <returns>A task representing the asynchronous operation.</returns>
        Task CompleteAsync();
    }
}
