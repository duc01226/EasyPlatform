using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.Application.Domain
{
    internal class PlatformPseudoApplicationUnitOfWorkManager : PlatformUnitOfWorkManager
    {
        protected override IUnitOfWork NewUow()
        {
            return new PlatformPseudoApplicationUnitOfWork();
        }
    }

    internal class PlatformPseudoApplicationUnitOfWork : PlatformUnitOfWork
    {
    }
}
