using System;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.Exceptions;
using AngularDotnetPlatform.Platform.Common.Cqrs;
using AngularDotnetPlatform.Platform.Common.Timing;
using AngularDotnetPlatform.Platform.Common.Validators;

namespace AngularDotnetPlatform.Platform.Application.Cqrs
{
    public abstract class PlatformCqrsRequestApplicationHandler<TRequest> : PlatformCqrsRequestHandler<TRequest> where TRequest : IPlatformCqrsRequest
    {
        protected readonly IPlatformApplicationUserContextAccessor UserContext;

        public PlatformCqrsRequestApplicationHandler(IPlatformApplicationUserContextAccessor userContext)
        {
            UserContext = userContext;
        }

        public IPlatformApplicationUserContext CurrentUser => UserContext.Current;

        public void PopulateAuditInfo(TRequest request)
        {
            request.PopulateAuditInfo(
                handleAuditedTrackId: Guid.NewGuid(),
                handleAuditedDate: Clock.Now,
                handleAuditedByUserId: CurrentUser.GetUserId());
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

        protected void EnsureNotNull(object target, string errorMessage)
        {
            EnsureNotNull(target, errorMessage, p => new PlatformApplicationValidationException(p));
        }
    }
}
