using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.Domain.Services
{
    /// <summary>
    /// Domain service is used to serve business logic operation related to many root domain entities,
    /// the business logic term is understood by domain expert.
    /// </summary>
    public interface IPlatformDomainService
    {
    }

    public abstract class BasePlatformDomainService : IPlatformDomainService
    {
        protected readonly IUnitOfWorkManager UnitOfWorkManager;
        protected readonly IPlatformCqrs Cqrs;

        public BasePlatformDomainService(
            IPlatformCqrs cqrs,
            IUnitOfWorkManager unitOfWorkManager)
        {
            UnitOfWorkManager = unitOfWorkManager;
            Cqrs = cqrs;
        }
    }
}
