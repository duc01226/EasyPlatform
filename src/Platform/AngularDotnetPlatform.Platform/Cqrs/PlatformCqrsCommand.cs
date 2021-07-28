using System;
using MediatR;
using AngularDotnetPlatform.Platform.Timing;

namespace AngularDotnetPlatform.Platform.Cqrs
{
    public abstract class PlatformCqrsCommand<TResult> : IRequest<TResult> where TResult : PlatformCqrsCommandResult
    {
        public Guid Id { get; } = Guid.NewGuid();

        public DateTime CreatedDate { get; } = Clock.Now;
    }
}
