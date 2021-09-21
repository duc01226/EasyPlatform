using System;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.Exceptions;
using AngularDotnetPlatform.Platform.Timing;
using AngularDotnetPlatform.Platform.Validators;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs
{
    public abstract class PlatformCqrsRequestHandler<TRequest> where TRequest : IPlatformCqrsRequest
    {
        protected readonly IPlatformApplicationUserContextAccessor UserContext;

        public PlatformCqrsRequestHandler(IPlatformApplicationUserContextAccessor userContext)
        {
            this.UserContext = userContext;
        }

        public IPlatformApplicationUserContext CurrentUser => UserContext.Current;

        public void PopulateAuditInfo(TRequest request)
        {
            request.PopulateAuditInfo(
                handleAuditedTrackId: Guid.NewGuid(),
                handleAuditedDate: Clock.Now,
                handleAuditedByUserId: UserContext.Current.GetUserId());
        }

        protected void EnsureValidationResultValid(params PlatformValidationResult[] validateResults)
        {
            var finalValidationResult = PlatformValidationResult.HarvestErrors(validateResults);
            finalValidationResult.EnsureValid(p => new PlatformApplicationValidationException(p));
        }

        protected void EnsureBusinessLogicValid(params PlatformValidationResult[] validateResults)
        {
            var finalValidationResult = PlatformValidationResult.HarvestErrors(validateResults);
            finalValidationResult.EnsureValid(p => new PlatformApplicationException(p.ErrorsMsg()));
        }
    }
}
