using System;

namespace AngularDotnetPlatform.Platform.Timing
{
    public interface IClockProvider
    {
        DateTime Now { get; }

        DateTimeKind Kind { get; }

        DateTime Normalize(DateTime dateTime);
    }
}
