using System.Collections.Concurrent;
using System.Diagnostics.Metrics;
using Easy.Platform.Common.Diagnostics;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Diagnostics;

public class PlatformMeterGaugeLifecycleTests
{
    [Fact]
    public void RegisterGaugesForPool_WhenSamePoolNameIsRegisteredAgain_ShouldObserveLatestCallbacks()
    {
        var poolName = $"test-pool-{Guid.NewGuid():N}";
        var measurements = new ConcurrentDictionary<string, int>();

        using var listener = new MeterListener();
        listener.InstrumentPublished = (instrument, meterListener) =>
        {
            if (instrument.Meter.Name == PlatformMeter.MeterName &&
                (instrument.Name == "easyplatform.bgqueue.permits.available" ||
                 instrument.Name == "easyplatform.bgqueue.permits.in_use" ||
                 instrument.Name == "easyplatform.bgqueue.queue_depth" ||
                 instrument.Name == "easyplatform.bgqueue.max_queue_depth"))
            {
                meterListener.EnableMeasurementEvents(instrument);
            }
        };
        listener.SetMeasurementEventCallback<int>(
            (instrument, measurement, tags, _) =>
            {
                if (HasPoolTag(tags, poolName))
                    measurements[instrument.Name] = measurement;
            });
        listener.Start();

        PlatformMeter.RegisterGaugesForPool(poolName, () => 1, () => 3, () => 2, () => 10);
        PlatformMeter.RegisterGaugesForPool(poolName, () => 4, () => 5, () => 6, () => 20);

        listener.RecordObservableInstruments();

        measurements["easyplatform.bgqueue.permits.available"].Should().Be(4);
        measurements["easyplatform.bgqueue.permits.in_use"].Should().Be(1);
        measurements["easyplatform.bgqueue.queue_depth"].Should().Be(6);
        measurements["easyplatform.bgqueue.max_queue_depth"].Should().Be(20);
    }

    private static bool HasPoolTag(ReadOnlySpan<KeyValuePair<string, object?>> tags, string poolName)
    {
        foreach (var tag in tags)
        {
            if (tag.Key == "pool" && tag.Value?.ToString() == poolName)
                return true;
        }

        return false;
    }
}
