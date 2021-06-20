using System;
using MediatR;
using NoCeiling.Duc.Interview.Test.Platform.Timing;

namespace NoCeiling.Duc.Interview.Test.Platform.Cqrs
{
    public abstract class PlatformCqrsCommand<TResult> : IRequest<TResult> where TResult : PlatformCqrsCommandResult
    {
        public Guid Id { get; } = Guid.NewGuid();

        public DateTime CreatedDate { get; } = Clock.Now;
    }
}
