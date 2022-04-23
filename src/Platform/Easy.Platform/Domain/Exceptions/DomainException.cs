using System;

namespace Easy.Platform.Domain.Exceptions
{
    public class PlatformDomainException : Exception
    {
        public PlatformDomainException(string message) : base(message)
        {
        }
    }
}
