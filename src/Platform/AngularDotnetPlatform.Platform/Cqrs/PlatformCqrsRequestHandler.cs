using System;

namespace AngularDotnetPlatform.Platform.Cqrs
{
    public class PlatformCqrsRequestHandler<TRequest> where TRequest : IPlatformCqrsRequest
    {
        public void PopulateAuditInfo(TRequest request)
        {
            request.HandleAuditedTrackId = Guid.NewGuid();
            request.HandleAuditedDate = new DateTime();
        }
    }
}
