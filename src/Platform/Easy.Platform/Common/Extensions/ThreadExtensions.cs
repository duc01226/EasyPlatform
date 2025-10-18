namespace Easy.Platform.Common.Extensions;

public static class ThreadExtensions
{
    /// <summary>
    /// Executes the specified action within a lock acquired from the provided SemaphoreSlim object.
    /// </summary>
    /// <param name="lockObj">The SemaphoreSlim object to acquire the lock from.</param>
    /// <param name="action">The action to be executed within the lock.</param>
    /// <remarks>
    /// This method will block the calling thread until the lock is acquired.
    /// The lock is always released before the method returns, even if the action delegate throws an exception.
    /// </remarks>
    public static void ExecuteLockAction(this SemaphoreSlim lockObj, Action action, CancellationToken cancellationToken)
    {
        try
        {
            lockObj.Wait(cancellationToken);

            action();
        }
        finally
        {
            lockObj.TryRelease();
        }
    }

    public static bool TryRelease(this SemaphoreSlim lockObj)
    {
        try
        {
            lockObj.Release();
            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }

    /// <summary>
    /// Executes the specified function within a lock acquired from the provided SemaphoreSlim object and returns the result.
    /// </summary>
    /// <param name="lockObj">The SemaphoreSlim object to acquire the lock from.</param>
    /// <param name="action">The function to be executed within the lock.</param>
    /// <returns>The result of the executed function.</returns>
    /// <remarks>
    /// This method will block the calling thread until the lock is acquired.
    /// The lock is always released before the method returns, even if the action delegate throws an exception.
    /// </remarks>
    public static T ExecuteLockAction<T>(this SemaphoreSlim lockObj, Func<T> action, CancellationToken cancellationToken)
    {
        try
        {
            lockObj.Wait(cancellationToken);

            return action();
        }
        finally
        {
            lockObj.TryRelease();
        }
    }

    /// <summary>
    /// Asynchronously executes the specified function within a lock acquired from the provided SemaphoreSlim object.
    /// </summary>
    /// <param name="lockObj">The SemaphoreSlim object to acquire the lock from.</param>
    /// <param name="action">The function to be executed within the lock.</param>
    /// <param name="cancellationToken">A CancellationToken to observe while waiting for the task to complete.</param>
    /// <param name="timeout">Wait lock timeout</param>
    /// <param name="isManuallyReleaseLockInAction">isManuallyReleaseLockInAction</param>
    /// <remarks>
    /// This method will asynchronously wait until the lock is acquired.
    /// The lock is always released before the method returns, even if the action delegate throws an exception.
    /// </remarks>
    public static async Task ExecuteLockActionAsync(
        this SemaphoreSlim lockObj,
        Func<Task> action,
        CancellationToken cancellationToken = default,
        TimeSpan? timeout = null,
        bool isManuallyReleaseLockInAction = false)
    {
        try
        {
            if (timeout == null)
                await lockObj.WaitAsync(cancellationToken);
            else
                await lockObj.WaitAsync(timeout.Value, cancellationToken);

            await action();
        }
        catch (Exception)
        {
            if (isManuallyReleaseLockInAction)
                lockObj.TryRelease();
            throw;
        }
        finally
        {
            if (!isManuallyReleaseLockInAction)
                lockObj.TryRelease();
        }
    }

    /// <summary>
    /// Asynchronously executes the specified function within a lock acquired from the provided SemaphoreSlim object.
    /// </summary>
    /// <param name="lockObj">The SemaphoreSlim object to acquire the lock from.</param>
    /// <param name="action">The function to be executed within the lock.</param>
    /// <param name="cancellationToken">A CancellationToken to observe while waiting for the task to complete.</param>
    /// <param name="timeout">Wait lock timeout</param>
    /// <param name="isManuallyReleaseLockInAction">isManuallyReleaseLockInAction</param>
    /// <remarks>
    /// This method will asynchronously wait until the lock is acquired.
    /// The lock is always released before the method returns, even if the action delegate throws an exception.
    /// </remarks>
    public static async Task ExecuteLockActionAsync(
        this SemaphoreSlim lockObj,
        Action action,
        CancellationToken cancellationToken = default,
        TimeSpan? timeout = null,
        bool isManuallyReleaseLockInAction = false)
    {
        try
        {
            if (timeout == null)
                await lockObj.WaitAsync(cancellationToken);
            else
                await lockObj.WaitAsync(timeout.Value, cancellationToken);

            await Task.Run(action, cancellationToken);
        }
        catch (Exception)
        {
            if (isManuallyReleaseLockInAction)
                lockObj.TryRelease();
            throw;
        }
        finally
        {
            if (!isManuallyReleaseLockInAction)
                lockObj.TryRelease();
        }
    }

    /// <summary>
    /// Asynchronously executes the specified function within a lock acquired from the provided SemaphoreSlim object and returns the result.
    /// </summary>
    /// <param name="lockObj">The SemaphoreSlim object to acquire the lock from.</param>
    /// <param name="action">The function to be executed within the lock.</param>
    /// <param name="cancellationToken">A CancellationToken to observe while waiting for the task to complete.</param>
    /// <param name="timeout">Wait lock timeout</param>
    /// <param name="isManuallyReleaseLockInAction">isManuallyReleaseLockInAction</param>
    /// <returns>The result of the executed function.</returns>
    /// <remarks>
    /// This method will asynchronously wait until the lock is acquired.
    /// The lock is always released before the method returns, even if the action delegate throws an exception.
    /// </remarks>
    public static async Task<T> ExecuteLockActionAsync<T>(
        this SemaphoreSlim lockObj,
        Func<Task<T>> action,
        CancellationToken cancellationToken = default,
        TimeSpan? timeout = null,
        bool isManuallyReleaseLockInAction = false)
    {
        try
        {
            if (timeout == null)
                await lockObj.WaitAsync(cancellationToken);
            else
                await lockObj.WaitAsync(timeout.Value, cancellationToken);

            var result = await action();

            return result;
        }
        catch (Exception)
        {
            if (isManuallyReleaseLockInAction)
                lockObj.TryRelease();
            throw;
        }
        finally
        {
            if (!isManuallyReleaseLockInAction)
                lockObj.TryRelease();
        }
    }

    /// <summary>
    /// Asynchronously executes the specified function within a lock acquired from the provided SemaphoreSlim object and returns the result.
    /// </summary>
    /// <param name="lockObj">The SemaphoreSlim object to acquire the lock from.</param>
    /// <param name="action">The function to be executed within the lock.</param>
    /// <param name="cancellationToken">A CancellationToken to observe while waiting for the task to complete.</param>
    /// <param name="timeout">Wait lock timeout</param>
    /// <param name="isManuallyReleaseLockInAction">isManuallyReleaseLockInAction</param>
    /// <returns>The result of the executed function.</returns>
    /// <remarks>
    /// This method will asynchronously wait until the lock is acquired.
    /// The lock is always released before the method returns, even if the action delegate throws an exception.
    /// </remarks>
    public static async Task<T> ExecuteLockActionAsync<T>(
        this SemaphoreSlim lockObj,
        Func<T> action,
        CancellationToken cancellationToken = default,
        TimeSpan? timeout = null,
        bool isManuallyReleaseLockInAction = false)
    {
        try
        {
            if (timeout == null)
                await lockObj.WaitAsync(cancellationToken);
            else
                await lockObj.WaitAsync(timeout.Value, cancellationToken);

            var result = await Task.Run(action, cancellationToken);

            return result;
        }
        catch (Exception)
        {
            if (isManuallyReleaseLockInAction)
                lockObj.TryRelease();
            throw;
        }
        finally
        {
            if (!isManuallyReleaseLockInAction)
                lockObj.TryRelease();
        }
    }
}
