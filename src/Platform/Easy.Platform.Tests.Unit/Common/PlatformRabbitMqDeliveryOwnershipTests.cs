using System.Text.RegularExpressions;
using Easy.Platform.Common.Utils;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common;

/// <summary>
/// Pins channel-lease and delivery-acknowledgement ownership at the RabbitMQ production call sites.
/// </summary>
public class PlatformRabbitMqDeliveryOwnershipTests
{
    private const string ProducerPath =
        "src/Platform/Easy.Platform.RabbitMQ/PlatformRabbitMqMessageBusProducer.cs";

    private const string InitializerPath =
        "src/Platform/Easy.Platform.RabbitMQ/PlatformRabbitMqProcessInitializerService.cs";

    /// <summary>TC-RMQ-OWN-001 / TC-RMQ-OWN-004 — one borrowed channel has one return owner.</summary>
    [Fact]
    public void ProducerPublishLease_ReturnsBorrowedChannelExactlyOnceFromFinally()
    {
        var source = ReadRepositoryFile(ProducerPath);
        var publishMethod = SliceBetween(
            source,
            "private async Task PublishMessageToQueue(",
            "// This help consumer can extract tracing information");

        Regex.Matches(publishMethod, @"ChannelPool\.Get\(\)").Count.Should().Be(1);
        Regex.Matches(publishMethod, @"ChannelPool\.Return\(channel\)").Count
            .Should()
            .Be(1, "a success-path return plus a finally return duplicates the same pooled channel");
        publishMethod.Should().MatchRegex(
            @"finally\s*\{\s*if \(channel != null\)\s*ChannelPool\.Return\(channel\);\s*\}",
            "success, publish failure, and cancellation must converge on the same return owner");
    }

    /// <summary>TC-RMQ-OWN-002 / TC-RMQ-OWN-004 — async ack/reject work is awaited by an async policy.</summary>
    [Fact]
    public void AckMessageRetry_UsesAsyncPolicyAndAwaitsBothDeliveryOperations()
    {
        var source = ReadRepositoryFile(InitializerPath);
        var ackMethod = SliceBetween(source, "public void AckMessage(", "private List<Type> GetCanProcessConsumerTypes(");

        ackMethod.Should().Contain("await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(");
        ackMethod.Should().NotContain("WaitRetryThrowFinalException(");
        Regex.Matches(ackMethod, @"await channel\.Basic(?:Ack|Reject)Async\(").Count
            .Should()
            .Be(2, "both acknowledgement branches must complete inside the observed retry task");
        ackMethod.Should().Contain("cancellationToken: currentStartProcessCancellationToken");
    }

    /// <summary>TC-RMQ-OWN-002 — the selected retry primitive observes a yielding async failure before retrying.</summary>
    [Fact]
    public async Task AsyncRetryPolicy_WhenFirstAsyncAttemptFails_WaitsAndRetriesBeforeReturning()
    {
        var attemptCount = 0;

        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                attemptCount++;
                await Task.Yield();

                if (attemptCount == 1)
                    throw new InvalidOperationException("synthetic first-attempt failure");
            },
            _ => TimeSpan.Zero,
            retryCount: 1);

        attemptCount.Should().Be(2, "the first asynchronous exception must be observed and retried");
    }

    /// <summary>TC-RMQ-OWN-003 — one failed delivery cannot nack earlier unrelated delivery tags.</summary>
    [Fact]
    public void RequeueFailure_NacksOnlyTheCurrentDeliveryTag()
    {
        var source = ReadRepositoryFile(InitializerPath);
        var requeueMethod = SliceBetween(source, "private bool ProcessRequeueMessage(", "private async Task ExecuteConsumer(");

        Regex.Matches(requeueMethod, @"BasicNackAsync\(").Count.Should().Be(1);
        requeueMethod.Should().Contain("multiple: false, requeue: true");
        Regex.IsMatch(
                requeueMethod,
                @"BasicNackAsync\([^;]*multiple:\s*true",
                RegexOptions.Singleline | RegexOptions.CultureInvariant)
            .Should()
            .BeFalse("no executable nack call may own a range of delivery tags");
    }

    private static string SliceBetween(string source, string startMarker, string endMarker)
    {
        var startIndex = source.IndexOf(startMarker, StringComparison.Ordinal);
        var endIndex = source.IndexOf(endMarker, startIndex, StringComparison.Ordinal);

        startIndex.Should().BeGreaterThanOrEqualTo(0, $"expected start marker '{startMarker}'");
        endIndex.Should().BeGreaterThan(startIndex, $"expected end marker '{endMarker}' after the start marker");

        return source[startIndex..endIndex];
    }

    private static string ReadRepositoryFile(string relativePath)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory != null)
        {
            var candidatePath = Path.Combine(directory.FullName, relativePath);

            if (File.Exists(candidatePath))
                return File.ReadAllText(candidatePath);

            directory = directory.Parent;
        }

        throw new FileNotFoundException($"Could not find repository file '{relativePath}'.");
    }
}
