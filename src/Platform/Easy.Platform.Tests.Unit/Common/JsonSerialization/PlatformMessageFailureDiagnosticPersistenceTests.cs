using System.Security.Cryptography;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using FluentAssertions;
using Moq;

namespace Easy.Platform.Tests.Unit.Common.JsonSerialization;

/// <summary>
/// Guards the PERSISTED failure columns — <c>PlatformInboxBusMessage.LastConsumeError</c> and
/// <c>PlatformOutboxBusMessage.LastSendError</c> — which are the diagnostic sink most easily overlooked because it
/// is a database column rather than a log. It is also the longest-lived: a stuck message's row survives log
/// rotation indefinitely and is surfaced by every support tool that lists failed messages.
/// <para />These call the persistence methods directly (hence their <c>internal</c> visibility) because the
/// behaviour under test is what gets STORED, which no log-capturing test can observe.
/// </summary>
/// <remarks>
/// <para>
/// ADJUDICATION — these tests previously asserted that the columns carry ONLY the exception type name, and were
/// re-authored when that policy was deliberately reversed. The reversal, and its reasoning, are recorded on
/// <c>PlatformDiagnosticJsonSerializer.SerializeException</c>: these two columns are the ONLY record of a failure
/// on the swallow/persist paths, and <c>PlatformInboxBusMessage.JsonMessage:43</c> already persists the entire
/// message body in the SAME ROW, so withholding the exception message protected nothing while making the failure
/// unfixable. Decided by the repository owner, not inferred.
/// </para>
/// <para>
/// The re-authoring is a STRENGTHENING, not a relaxation. Each test now uses FOUR distinct sentinels so that the
/// newly-expected disclosure cannot mask the boundaries that still hold. The single-sentinel fixture these tests
/// used before could not survive the policy change: with one value planted in the message, the inner exception and
/// <see cref="Exception.Data" /> alike, flipping the assertion to <c>Contain</c> would have passed trivially from
/// the message and silently stopped proving anything about the other two.
/// </para>
/// <para>
/// <c>NotContain(dataSentinel)</c> is the load-bearing assertion. It is the only thing proving
/// <see cref="Exception.Data" /> — the untyped bag any library may stuff — stays unread. Do not remove it.
/// </para>
/// </remarks>
public class PlatformMessageFailureDiagnosticPersistenceTests
{
    [Fact]
    public async Task InboxFailure_WhenExceptionContainsSecret_PersistsDebuggableExceptionDiagnostic()
    {
        var messageSentinel = CreateSentinel();
        var innerSentinel = CreateSentinel();
        var dataSentinel = CreateSentinel();
        var busBodySentinel = CreateSentinel();
        var exception = BuildSecretBearingException(messageSentinel, innerSentinel, dataSentinel);
        var message = new PlatformInboxBusMessage
        {
            ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Processing,
            RetriedProcessCount = 0,
            JsonMessage = busBodySentinel
        };
        var repository = new Mock<IPlatformInboxBusMessageRepository>();
        repository
            .Setup(repo => repo.SetAsync(It.IsAny<PlatformInboxBusMessage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PlatformInboxBusMessage savedMessage, CancellationToken _) => savedMessage);

        await PlatformInboxMessageBusConsumerHelper.UpdateExistingInboxFailedMessageAsync(
            exception,
            retryProcessFailedMessageInSecondsUnit: 1,
            consumerHasErrorAndShouldNeverRetry: false,
            CancellationToken.None,
            message,
            repository.Object);

        message.ConsumeStatus.Should().Be(PlatformInboxBusMessage.ConsumeStatuses.Failed);

        // Debuggable: what a developer needs to locate the defect.
        message.LastConsumeError.Should().Contain(nameof(InvalidOperationException), "the exception type is the entry point of any diagnosis");
        message.LastConsumeError.Should().Contain(messageSentinel, "the message is the ONLY record of this failure — the whole point of the enrichment");
        message.LastConsumeError.Should().Contain(nameof(ArgumentException), "the inner TYPE chain shows where the failure originated");
        message.LastConsumeError.Should().Contain(nameof(BuildSecretBearingException), "the stack trace must name the throwing method, or the column is still unactionable");

        // Bounded: the three things that are still deliberately withheld.
        message.LastConsumeError.Should().NotContain(dataSentinel, "Exception.Data is an untyped bag with high risk and near-zero debugging value — it is never read");
        message.LastConsumeError.Should().NotContain(innerSentinel, "inner exception MESSAGES are not emitted; only their type names are");
        message.LastConsumeError.Should().NotContain(busBodySentinel, "the bus message body must never be duplicated into the failure column");

        repository.Verify(
            repo => repo.SetAsync(message, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task OutboxFailure_WhenExceptionContainsSecret_PersistsDebuggableExceptionDiagnostic()
    {
        var messageSentinel = CreateSentinel();
        var innerSentinel = CreateSentinel();
        var dataSentinel = CreateSentinel();
        var busBodySentinel = CreateSentinel();
        var exception = BuildSecretBearingException(messageSentinel, innerSentinel, dataSentinel);
        var message = new PlatformOutboxBusMessage
        {
            SendStatus = PlatformOutboxBusMessage.SendStatuses.Processing,
            RetriedProcessCount = 0,
            JsonMessage = busBodySentinel
        };
        var repository = new Mock<IPlatformOutboxBusMessageRepository>();
        repository
            .Setup(repo => repo.SetAsync(It.IsAny<PlatformOutboxBusMessage>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((PlatformOutboxBusMessage savedMessage, CancellationToken _) => savedMessage);

        await PlatformOutboxMessageBusProducerHelper.UpdateExistingOutboxMessageFailedAsync(
            message,
            exception,
            retryProcessFailedMessageInSecondsUnit: 1,
            CancellationToken.None,
            repository.Object);

        message.SendStatus.Should().Be(PlatformOutboxBusMessage.SendStatuses.Failed);

        // Debuggable: what a developer needs to locate the defect.
        message.LastSendError.Should().Contain(nameof(InvalidOperationException), "the exception type is the entry point of any diagnosis");
        message.LastSendError.Should().Contain(messageSentinel, "the message is the ONLY record of this failure — the whole point of the enrichment");
        message.LastSendError.Should().Contain(nameof(ArgumentException), "the inner TYPE chain shows where the failure originated");
        message.LastSendError.Should().Contain(nameof(BuildSecretBearingException), "the stack trace must name the throwing method, or the column is still unactionable");

        // Bounded: the three things that are still deliberately withheld.
        message.LastSendError.Should().NotContain(dataSentinel, "Exception.Data is an untyped bag with high risk and near-zero debugging value — it is never read");
        message.LastSendError.Should().NotContain(innerSentinel, "inner exception MESSAGES are not emitted; only their type names are");
        message.LastSendError.Should().NotContain(busBodySentinel, "the bus message body must never be duplicated into the failure column");

        repository.Verify(
            repo => repo.SetAsync(message, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    /// <summary>
    /// Builds the exception under test with a DISTINCT sentinel per disclosure boundary, so no single assertion can
    /// stand in for another: <paramref name="messageSentinel" /> is expected to survive into the column,
    /// <paramref name="innerSentinel" /> and <paramref name="dataSentinel" /> are expected never to.
    /// <para />It is thrown and caught rather than merely constructed, because an unthrown exception has a
    /// <c>null</c> <see cref="Exception.StackTrace" /> — the stack-trace assertion would then pass vacuously against
    /// an omitted field instead of proving the frames are actually captured.
    /// </summary>
    private static InvalidOperationException BuildSecretBearingException(
        string messageSentinel,
        string innerSentinel,
        string dataSentinel)
    {
        try
        {
            var innerException = new ArgumentException(innerSentinel);
            var exception = new InvalidOperationException(messageSentinel, innerException);
            exception.Data["provider-response"] = dataSentinel;

            throw exception;
        }
        catch (InvalidOperationException thrownException)
        {
            return thrownException;
        }
    }

    private static string CreateSentinel()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    }
}
