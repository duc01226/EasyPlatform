using System;
using System.Collections.Generic;
using System.Linq;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Persistence.Domain
{
    public class PlatformDefaultPersistenceUnitOfWorkManager : PlatformUnitOfWorkManager
    {
        protected readonly IServiceProvider ServiceProvider;

        public PlatformDefaultPersistenceUnitOfWorkManager(
            IServiceProvider serviceProvider) : base()
        {
            this.ServiceProvider = serviceProvider;
        }

        protected override IUnitOfWork NewUow()
        {
            return new PlatformAggregatedPersistenceUnitOfWork(ServiceProvider.GetServices<IUnitOfWork>().ToList());
        }
    }
}
