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
        public override bool IsNoTransactionUow()
        {
            return true;
        }
    }
}
