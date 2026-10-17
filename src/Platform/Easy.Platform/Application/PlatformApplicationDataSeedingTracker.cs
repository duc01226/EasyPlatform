using System.Collections.Concurrent;

namespace Easy.Platform.Application;

/// <summary>
/// Tracks delayed application-data seed work so a host that owns the application lifetime can wait for it to finish
/// before disposing its service provider. The tracker does not change when seeders start; it only makes already queued
/// work observable to lifecycle owners.
/// </summary>
public interface IPlatformApplicationDataSeedingTracker
{
    /// <summary>Registers one queued seed operation for lifecycle coordination.</summary>
    void Track(Task seedTask);

    /// <summary>Waits for every seed operation registered before this call to finish.</summary>
    Task WaitForCompletionAsync(CancellationToken cancellationToken = default);
}

public sealed class PlatformApplicationDataSeedingTracker : IPlatformApplicationDataSeedingTracker
{
    private readonly ConcurrentBag<Task> seedTasks = [];

    public void Track(Task seedTask)
    {
        ArgumentNullException.ThrowIfNull(seedTask);
        seedTasks.Add(seedTask);
    }

    public async Task WaitForCompletionAsync(CancellationToken cancellationToken = default)
    {
        var tasks = seedTasks.ToArray();

        if (tasks.Length == 0) return;

        await Task.WhenAll(tasks).WaitAsync(cancellationToken);
    }
}
