using Easy.Platform.Application.Context.UserContext;
using Easy.Platform.Application.Exceptions;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Timing;
using Easy.Platform.Common.Validators;

namespace Easy.Platform.Application.Cqrs;

public abstract class PlatformCqrsRequestApplicationHandler<TRequest> : PlatformCqrsRequestHandler<TRequest>
    where TRequest : IPlatformCqrsRequest
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
            handleAuditedByUserId: UserContext.Current.GetUserId());
    }

    protected void EnsureValidationResultValid(params PlatformValidationResult[] validateResults)
    {
        EnsureValid(validateResults, p => new PlatformApplicationValidationException(p));
    }

    protected void EnsureBusinessLogicValid(params PlatformValidationResult[] validateResults)
    {
        EnsureValid(validateResults, p => new PlatformApplicationException(p.ErrorsMsg()));
    }

    protected void EnsurePermissionLogicValid(params PlatformValidationResult[] validateResults)
    {
        EnsureValid(validateResults, p => new PlatformApplicationPermissionException(p.ErrorsMsg()));
    }

    protected void EnsureValidationResultValid<TValue>(params PlatformValidationResult<TValue>[] validateResults)
    {
        EnsureValid(validateResults, exceptionProviderIfNotValid: PlatformApplicationValidationException.Create);
    }

    protected void EnsureBusinessLogicValid<TValue>(params PlatformValidationResult<TValue>[] validateResults)
    {
        EnsureValid(validateResults, p => new PlatformApplicationException(p.ErrorsMsg()));
    }

    protected void EnsurePermissionLogicValid<TValue>(params PlatformValidationResult<TValue>[] validateResults)
    {
        EnsureValid(validateResults, p => new PlatformApplicationPermissionException(p.ErrorsMsg()));
    }

    protected void EnsureNotNull(object target, string errorMessage)
    {
        EnsureNotNull(target, errorMessage, p => new PlatformApplicationValidationException(p));
    }
}
