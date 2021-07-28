using System;

namespace AngularDotnetPlatform.Platform.Domain.Exceptions
{
    public class PlatformDomainException : Exception
    {
        public PlatformDomainException(string message) : base(message)
        {
        }
    }
}
