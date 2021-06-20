using System;
using Microsoft.Extensions.DependencyInjection;
using NoCeiling.Duc.Interview.Test.Platform.Domain.UnitOfWork;

namespace NoCeiling.Duc.Interview.Test.Platform.Persistence
{
    public class PlatformDefaultUnitOfWorkManager : IUnitOfWorkManager
    {
        private readonly IServiceProvider serviceProvider;

        public PlatformDefaultUnitOfWorkManager(
            IServiceProvider serviceProvider)
        {
            this.serviceProvider = serviceProvider;
        }

        public IUnitOfWork Current { get; private set; }

        public IUnitOfWork Begin()
        {
            if (Current is { Completed: false, Disposed: false })
            {
                return Current;
            }

            Current = serviceProvider.GetService<IUnitOfWork>();

            return Current;
        }
    }
}
