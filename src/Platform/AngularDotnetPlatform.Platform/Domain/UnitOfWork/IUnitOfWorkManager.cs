using System;

namespace AngularDotnetPlatform.Platform.Domain.UnitOfWork
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
        /// Begin a new registered <see cref="TUnitOfWork"/> unit of work.
        /// If current active unit of work for <see cref="TUnitOfWork"/> type existed, return it.
        /// Use this to support multi unit of work for multi database
        /// </summary>
        TUnitOfWork Begin<TUnitOfWork>() where TUnitOfWork : IUnitOfWork;

        /// <summary>
        /// Gets last begun unit of work of type <see cref="TUnitOfWork"/> (or null if not exists).
        /// </summary>
        TUnitOfWork Current<TUnitOfWork>() where TUnitOfWork : IUnitOfWork;

        /// <summary>
        /// Gets currently latest active unit of work of type <see cref="TUnitOfWork"/>.
        /// <exception cref="Exception">Throw exception if there is not active unit of work.</exception>
        /// </summary>
        TUnitOfWork CurrentActive<TUnitOfWork>() where TUnitOfWork : IUnitOfWork;
    }
}
