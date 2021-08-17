using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs
{
    public abstract class PlatformCqrsRequestHandler<TRequest> where TRequest : IPlatformCqrsRequest
    {
        public void PopulateAuditInfo(TRequest request)
        {
            request.HandleAuditedTrackId = Guid.NewGuid();
            request.HandleAuditedDate = new DateTime();
        }
    }
}
