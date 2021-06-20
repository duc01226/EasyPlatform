using System;

namespace NoCeiling.Duc.Interview.Test.Platform.Timing
{
    public interface IClockProvider
    {
        DateTime Now { get; }

        DateTimeKind Kind { get; }

        DateTime Normalize(DateTime dateTime);
    }
}
