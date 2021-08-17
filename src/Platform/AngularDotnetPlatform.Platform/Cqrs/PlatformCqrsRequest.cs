using System;
using AngularDotnetPlatform.Platform.Application.Dtos;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs
{
    public interface IPlatformCqrsRequest : IPlatformDto
    {
        public Guid? HandleAuditedTrackId { get; set; }

        public DateTime? HandleAuditedDate { get; set; }

        public string HandleAuditedByUserId { get; set; }
    }
}
