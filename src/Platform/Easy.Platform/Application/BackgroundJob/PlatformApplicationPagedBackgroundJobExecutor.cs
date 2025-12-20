#region

using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.BackgroundJob;

public abstract class PlatformApplicationPagedBackgroundJobExecutor<TParam> : PlatformApplicationBackgroundJobExecutor<PlatformApplicationPagedBackgroundJobParam<TParam>>
    where TParam : class
{
    protected PlatformApplicationPagedBackgroundJobExecutor(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler) : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
    {
    }

    protected virtual int PageSize => 100;

    public override async Task ProcessAsync(PlatformApplicationPagedBackgroundJobParam<TParam> pagedParam)
    {
        if (pagedParam == null || (pagedParam.Skip == null && pagedParam.Take == null))
        {
            await ServiceProvider.ExecuteInjectScopedPagingAsync(
                maxItemCount: await MaxItemsCount(pagedParam),
                PageSize,
                ScheduleProcessPagedAsync,
                manuallyParams: [pagedParam?.Param]);
        }
        else
        {
            await ServiceProvider
                .ExecuteInjectScopedAsync(async (IPlatformUnitOfWorkManager newScopeUnitOfWorkManager, IServiceProvider serviceProvider) =>
                    {
                        using (var uow = newScopeUnitOfWorkManager.Begin(false))
                        {
                            await serviceProvider.ExecuteInjectAsync(
                                ProcessPagedAsync,
                                manuallyParams: [pagedParam.Skip, pagedParam.Take, pagedParam.Param]
                            );

                            await uow.CompleteAsync();
                        }
                    }
                );
        }
    }

    protected virtual async Task<string> ScheduleProcessPagedAsync(
        int skipCount,
        int pageSize,
        TParam param,
        IServiceProvider serviceProvider,
        IPlatformUnitOfWorkManager uowManager)
    {
        return await serviceProvider.GetRequiredService<IPlatformApplicationBackgroundJobScheduler>()
            .Schedule(
                jobExecutorType: GetType(),
                new PlatformApplicationPagedBackgroundJobParam<TParam> { Skip = skipCount, Take = pageSize, Param = param },
                DateTimeOffset.UtcNow);
    }

    protected abstract Task ProcessPagedAsync(
        int? skipCount,
        int? pageSize,
        TParam param,
        IServiceProvider serviceProvider,
        IPlatformUnitOfWorkManager uowManager);

    protected abstract Task<int> MaxItemsCount(PlatformApplicationPagedBackgroundJobParam<TParam> pagedParam);
}

public abstract class PlatformApplicationPagedBackgroundJobExecutor : PlatformApplicationPagedBackgroundJobExecutor<object?>
{
    protected PlatformApplicationPagedBackgroundJobExecutor(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler) : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
    {
    }
}

public class PlatformApplicationPagedBackgroundJobParam<TParam> where TParam : class
{
    public TParam Param { get; set; }

    public int? Skip { get; set; }
    public int? Take { get; set; }
}
