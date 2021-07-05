using System;

namespace NoCeiling.Duc.Interview.Test.Platform.Domain.Exceptions
{
    public class PlatformDomainException : Exception
    {
        public PlatformDomainException(string message) : base(message)
        {
        }
    }
}
