using System.Diagnostics.CodeAnalysis;
using Easy.Platform.Common.Extensions;

namespace Easy.Platform.Domain.UnitOfWork;

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
    /// Check that is there any currently latest active unit of work
    /// </summary>
    bool HasCurrentActive();

    /// <summary>
    /// Begin a new last registered unit of work.
    /// If current active unit of work existed, return it.
    /// </summary>
    /// <param name="suppressCurrentUow">When true, new uow will be created event if current uow existed. When false, use current active uow if possible. Default is true.</param>
    IUnitOfWork Begin(bool suppressCurrentUow = true);

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

public abstract class PlatformUnitOfWorkManager : IUnitOfWorkManager
{
    protected readonly List<IUnitOfWork> CurrentUnitOfWorks = new List<IUnitOfWork>();
    private bool isDisposed;

    public IUnitOfWork Current()
    {
        var latestUowItem = CurrentUnitOfWorks.LastOrDefault();

        if (latestUowItem != null && !latestUowItem.IsActive() && CurrentUnitOfWorks.Count >= 2)
        {
            CurrentUnitOfWorks.Pop();
            return Current();
        }

        return latestUowItem;
    }

    public IUnitOfWork CurrentActive()
    {
        var current = Current();

        if (current == null || !current.IsActive())
            throw new Exception(
                "Current active unit of work is missing.");

        return current;
    }

    public bool HasCurrentActive()
    {
        return Current() != null && Current().IsActive();
    }

    public IUnitOfWork Begin(bool suppressCurrentUow = true)
    {
        if (suppressCurrentUow)
        {
            CurrentUnitOfWorks.Add(NewUow());
            return Current();
        }

        var currentLastUnitOfWork = Current();

        if (currentLastUnitOfWork != null)
        {
            if (currentLastUnitOfWork.IsActive())
            {
                return currentLastUnitOfWork;
            }

            currentLastUnitOfWork = CurrentUnitOfWorks.Pop();
            if (!currentLastUnitOfWork.Disposed)
                currentLastUnitOfWork.Dispose();
        }

        CurrentUnitOfWorks.Add(NewUow());

        return CurrentUnitOfWorks.Last();
    }

    public TUnitOfWork CurrentInner<TUnitOfWork>() where TUnitOfWork : IUnitOfWork
    {
        return (TUnitOfWork)Current()
            ?.InnerUnitOfWorks
            .LastOrDefault(p => p.GetType().IsAssignableTo(typeof(TUnitOfWork)));
    }

    public TUnitOfWork CurrentInnerActive<TUnitOfWork>() where TUnitOfWork : IUnitOfWork
    {
        var current = CurrentInner<TUnitOfWork>();
        if (current == null || !current.IsActive())
            throw new Exception(
                $"Current active inner unit of work of type {typeof(TUnitOfWork).FullName} is missing. Should use {nameof(IUnitOfWorkManager)} to Begin a new UOW.");

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
            foreach (var currentUnitOfWork in CurrentUnitOfWorks)
                currentUnitOfWork.Dispose();

            CurrentUnitOfWorks.Clear();
        }

        isDisposed = true;
    }

    protected abstract IUnitOfWork NewUow();
}
