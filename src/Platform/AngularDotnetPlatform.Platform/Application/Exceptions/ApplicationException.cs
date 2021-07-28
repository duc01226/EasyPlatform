using System;

namespace AngularDotnetPlatform.Platform.Application.Exceptions
{
    public class PlatformApplicationException : Exception
    {
        public PlatformApplicationException(string message) : base(message)
        {

        }
    }
}
