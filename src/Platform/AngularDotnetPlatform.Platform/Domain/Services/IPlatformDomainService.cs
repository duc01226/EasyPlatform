using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Cqrs;

namespace AngularDotnetPlatform.Platform.Domain.Services
{
    /// <summary>
    /// Helper class is used to serve business logic operation related to many root domain entities,
    /// the business logic term is understood by domain expert.
    /// </summary>
    public interface IPlatformDomainService
    {
    }

    public abstract class PlatformDomainService : IPlatformDomainService
    {
        public PlatformDomainService(
            IPlatformApplicationUserContextAccessor userContext,
            IPlatformCqrs cqrs)
        {
            UserContext = userContext;
            Cqrs = cqrs;
        }

        public IPlatformApplicationUserContextAccessor UserContext { get; }
        public IPlatformCqrs Cqrs { get; }
    }
}
