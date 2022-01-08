using System;
using AngularDotnetPlatform.Platform.Common.Dtos;

namespace AngularDotnetPlatform.Platform.Common.Cqrs
{
    public interface IPlatformCqrsRequest : IPlatformDto
    {
        public Guid? HandleAuditedTrackId { get; set; }

        public DateTime? HandleAuditedDate { get; set; }

        public string HandleAuditedByUserId { get; set; }

        public void PopulateAuditInfo(
            Guid? handleAuditedTrackId,
            DateTime? handleAuditedDate,
            string handleAuditedByUserId);
    }
}
