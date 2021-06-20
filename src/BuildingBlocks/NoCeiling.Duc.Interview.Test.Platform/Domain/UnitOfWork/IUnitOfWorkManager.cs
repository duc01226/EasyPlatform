namespace NoCeiling.Duc.Interview.Test.Platform.Domain.UnitOfWork
{
    /// <summary>
    /// Unit of work manager.
    /// Used to begin and control a unit of work.
    /// </summary>
    public interface IUnitOfWorkManager
    {
        /// <summary>
        /// Gets currently active unit of work (or null if not exists).
        /// </summary>
        IUnitOfWork Current { get; }

        /// <summary>
        /// Begin a new unit of work
        /// </summary>
        /// <returns></returns>
        IUnitOfWork Begin();
    }
}
