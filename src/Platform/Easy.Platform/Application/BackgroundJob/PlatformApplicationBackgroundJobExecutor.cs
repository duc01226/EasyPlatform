using System;
using System.Text.Json;
using System.Threading.Tasks;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.BackgroundJob;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.BackgroundJob
{
    public abstract class PlatformApplicationBackgroundJobExecutor : PlatformBackgroundJobExecutor
    {
        protected readonly IUnitOfWorkManager UnitOfWorkManager;
        protected readonly ILogger Logger;

        public PlatformApplicationBackgroundJobExecutor(
            IUnitOfWorkManager unitOfWorkManager,
            ILoggerFactory loggerFactory)
        {
            UnitOfWorkManager = unitOfWorkManager;
            Logger = loggerFactory.CreateLogger(GetType());
        }

        public override void Execute()
        {
            try
            {
                using (var uow = UnitOfWorkManager.Begin())
                {
                    ProcessAsync().Wait();
                    uow.CompleteAsync().Wait();
                }
            }
            catch (Exception e)
            {
                Logger.LogError(e, $"[BackgroundJob] Job {GetType().Name} execution was failed.");
                throw;
            }
        }

        public abstract Task ProcessAsync();
    }

    public abstract class PlatformApplicationBackgroundJobExecutor<TParam> : PlatformBackgroundJobExecutor<TParam>
        where TParam : class
    {
        protected readonly IUnitOfWorkManager UnitOfWorkManager;
        protected readonly ILogger Logger;

        public PlatformApplicationBackgroundJobExecutor(
            IUnitOfWorkManager unitOfWorkManager,
            ILoggerFactory loggerFactory)
        {
            UnitOfWorkManager = unitOfWorkManager;
            Logger = loggerFactory.CreateLogger(GetType());
        }

        public override void Execute(TParam param)
        {
            try
            {
                using (var uow = UnitOfWorkManager.Begin())
                {
                    ProcessAsync(param).Wait();
                    uow.CompleteAsync().Wait();
                }
            }
            catch (Exception e)
            {
                Logger.LogError(e, $"[BackgroundJob] Job {GetType().Name} execution with param {(param != null ? PlatformJsonSerializer.Serialize(param) : "null")} was failed.");
                throw;
            }
        }

        public abstract Task ProcessAsync(TParam param);
    }
}
