using System;
using AngularDotnetPlatform.Platform.Application.Dtos;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs
{
    public interface IPlatformCqrsRequest : IPlatformDto
    {
        public Guid? HandleAuditedTrackId { get; }

        public DateTime? HandleAuditedDate { get; }

        public string HandleAuditedByUserId { get; }

        public void PopulateAuditInfo(
            Guid? handleAuditedTrackId,
            DateTime? handleAuditedDate,
            string handleAuditedByUserId);
    }
}
