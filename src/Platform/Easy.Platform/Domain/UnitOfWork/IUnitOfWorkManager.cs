using System;
using System.Diagnostics.CodeAnalysis;

namespace Easy.Platform.Domain.UnitOfWork
{
    /// <summary>
    /// Unit of work manager.
    /// Used to begin and control a unit of work.
    /// </summary>
    public interface IUnitOfWorkManager : IDisposable
    {
        /// <summary>
        /// Gets last begun unit of work (or null if not exists).
        /// </summary>
        [return: MaybeNull]
        IUnitOfWork Current();

        /// <summary>
        /// Gets currently latest active unit of work.
        /// <exception cref="Exception">Throw exception if there is not active unit of work.</exception>
        /// </summary>
        IUnitOfWork CurrentActive();

        /// <summary>
        /// Begin a new last registered unit of work.
        /// If current active unit of work existed, return it.
        /// </summary>
        IUnitOfWork Begin();

        /// <summary>
        /// Gets last begun inner unit of work of type <see cref="TUnitOfWork"/> (or null if not exists).
        /// </summary>
        [return: MaybeNull]
        TUnitOfWork CurrentInner<TUnitOfWork>() where TUnitOfWork : IUnitOfWork;

        /// <summary>
        /// Gets currently latest active inner unit of work of type <see cref="TUnitOfWork"/>.
        /// <exception cref="Exception">Throw exception if there is not active unit of work.</exception>
        /// </summary>
        TUnitOfWork CurrentInnerActive<TUnitOfWork>() where TUnitOfWork : IUnitOfWork;
    }
}
