using Hangfire;
using Hangfire.Client;
using Hangfire.Common;
using Hangfire.Server;
using Hangfire.States;
using Hangfire.Storage;

namespace Easy.Platform.HangfireBackgroundJob;

public interface IPlatformHangfireBackgroundJobContext
{
    JobStorage Storage { get; }

    IJobFilterProvider FilterProvider { get; }

    JobActivator JobActivator { get; }

    PlatformHangfireUseMongoStorageOptions? MongoStorageOptions { get; }

    IBackgroundJobClient CreateBackgroundJobClient();

    RecurringJobManager CreateRecurringJobManager();

    BackgroundJobServer CreateBackgroundJobServer(BackgroundJobServerOptions options);
}

public sealed class PlatformHangfireBackgroundJobContext : IPlatformHangfireBackgroundJobContext
{
    public PlatformHangfireBackgroundJobContext(
        JobStorage storage,
        IJobFilterProvider filterProvider,
        JobActivator jobActivator,
        PlatformHangfireUseMongoStorageOptions? mongoStorageOptions = null)
    {
        Storage = storage;
        FilterProvider = filterProvider;
        JobActivator = jobActivator;
        MongoStorageOptions = mongoStorageOptions;
    }

    public JobStorage Storage { get; }

    public IJobFilterProvider FilterProvider { get; }

    public JobActivator JobActivator { get; }

    public PlatformHangfireUseMongoStorageOptions? MongoStorageOptions { get; }

    public IBackgroundJobClient CreateBackgroundJobClient()
    {
        return new BackgroundJobClient(Storage, FilterProvider);
    }

    public RecurringJobManager CreateRecurringJobManager()
    {
        return new RecurringJobManager(Storage, FilterProvider);
    }

    public BackgroundJobServer CreateBackgroundJobServer(BackgroundJobServerOptions options)
    {
        return new BackgroundJobServer(
            options,
            Storage,
            [],
            FilterProvider,
            JobActivator,
            new BackgroundJobFactory(FilterProvider),
            new BackgroundJobPerformer(FilterProvider, JobActivator),
            new BackgroundJobStateChanger(FilterProvider));
    }
}

internal sealed class PlatformHangfireFixedJobFilterProvider : IJobFilterProvider
{
    private readonly JobFilter[] filters;

    public PlatformHangfireFixedJobFilterProvider(IEnumerable<JobFilter> filters)
    {
        this.filters = filters.ToArray();
    }

    public IEnumerable<JobFilter> GetFilters(Job job)
    {
        return filters;
    }
}
