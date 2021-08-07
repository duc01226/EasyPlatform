using System;

namespace AngularDotnetPlatform.Platform.Cqrs
{
    public interface IPlatformCqrsRequest
    {
        public Guid? HandleAuditedTrackId { get; set; }

        public DateTime? HandleAuditedDate { get; set; }

        public string HandleAuditedByUserId { get; set; }
    }
}
