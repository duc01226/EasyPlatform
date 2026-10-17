using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Tests.Unit.Base;
using Easy.Platform.Tests.Unit.TestInfrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Tests.Unit.Common.Utils;

public class UtilTaskRunnerRetryTests : PlatformUnitTestBase
{
    /// <summary>
    /// A FAILURE deadline, not a settle-wait: every assertion below is driven by a signal raised the moment the
    /// observed behaviour happens, so a correct implementation never spends this budget. It exists only so a broken
    /// implementation fails the test instead of hanging the run. Matches the 5s used by the sibling background-queue
    /// suite so the two do not drift apart.
    /// </summary>
    private static readonly TimeSpan BackgroundActionDeadline = TimeSpan.FromSeconds(5);

    [Theory]
    [InlineData(
        "src/Platform/Easy.Platform/Application/MessageBus/Consumers/PlatformApplicationBusMessageConsumer.cs",
        "retryCount: retryCount ?? RetryOnFailedTimes")]
    [InlineData(
        "src/Platform/Easy.Platform/Application/Cqrs/Events/PlatformCqrsEventApplicationHandler.cs",
        "retryCount: RetryOnFailedTimes")]
    public void PlatformApplicationRetryCallSites_ShouldRetryAnyNonValidationException(string relativePath, string expectedRetryCountArgument)
    {
        var source = ReadRepositoryFile(relativePath);

        source.Should().Contain("Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(");
        source.Should().Contain(expectedRetryCountArgument);
        source.Should().Contain("ignoreExceptionTypes: [typeof(IPlatformValidationException)]");
        source.Should().NotContain("WaitRetryThrowFinalExceptionAsync<PlatformDomainRowVersionConflictException>");
        source.Should().NotContain("using Easy.Platform.Domain.Exceptions;");
    }

    [Fact]
    public void DefaultResilientRetryCount_ShouldBeOne()
    {
        Util.TaskRunner.DefaultResilientRetryCount.Should().Be(1);
    }

    [Fact]
    public async Task WaitRetryThrowFinalExceptionAsync_WhenUsingDefaultRetry_ShouldRetryAnyExceptionOnce()
    {
        var attempts = 0;
        var retryAttempts = new List<int>();

        var act = () => Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            () =>
            {
                attempts++;
                return Task.FromException(new InvalidOperationException("Transient failure"));
            },
            sleepDurationProvider: _ => TimeSpan.Zero,
            onRetry: (_, _, currentRetry, _) => retryAttempts.Add(currentRetry));

        await act.Should().ThrowAsync<InvalidOperationException>();

        attempts.Should().Be(2);
        retryAttempts.Should().ContainSingle().Which.Should().Be(1);
    }

    [Fact]
    public async Task WaitRetryThrowFinalExceptionAsync_WhenValidationExceptionIsIgnored_ShouldNotRetry()
    {
        var attempts = 0;
        PlatformValidationResult validationResult = "Invalid";

        var act = () => Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            () =>
            {
                attempts++;
                return Task.FromException(new PlatformValidationException(validationResult));
            },
            retryCount: 5,
            sleepDurationProvider: _ => TimeSpan.Zero,
            ignoreExceptionTypes: [typeof(IPlatformValidationException)]);

        await act.Should().ThrowAsync<PlatformValidationException>();

        attempts.Should().Be(1);
    }

    /// <summary>
    /// Guards the branch <c>QueueIntervalAsyncActionInBackground</c> gained for <c>retryCount</c>: the retry must wrap
    /// EACH pass of the interval loop, so a transient throw on the immediate pass is absorbed instead of propagating
    /// out of <see cref="Util.TaskRunner.QueueIntervalAsyncAction" /> and cancelling every pass still scheduled.
    /// <para>
    /// Deterministic by construction, not by timing: attempt 2 raises the signal this test awaits, and the retry
    /// warning is emitted by <c>onRetry</c> strictly BEFORE attempt 2 runs, so both are already observable the instant
    /// the await returns. <c>retryDelayProvider</c> is supplied so the backoff is zero - the API's own injection point,
    /// which removes wall-clock time from the test without weakening what is asserted.
    /// </para>
    /// </summary>
    [Fact]
    public async Task QueueIntervalAsyncActionInBackground_WhenRetryCountProvided_ShouldReExecuteActionAfterFirstAttemptThrows()
    {
        var attempts = 0;
        var secondAttemptRan = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var logger = new RecordingLogger();

        Util.TaskRunner.QueueIntervalAsyncActionInBackground(
            // Interlocked: the pass runs on a background thread and the retry re-enters this delegate from a
            // continuation that is not guaranteed to be the same one.
            _ =>
            {
                if (Interlocked.Increment(ref attempts) == 1)
                    return Task.FromException(new InvalidOperationException("Transient failure"));

                secondAttemptRan.SetResult();
                return Task.CompletedTask;
            },
            intervalTimeInSeconds: 1,
            loggerFactory: () => logger,
            // Exactly one pass, so 2 invocations can only come from the retry - never from the interval loop.
            maximumIntervalExecutionCount: 1,
            executeOnceImmediately: true,
            retryCount: 1,
            retryDelayProvider: _ => TimeSpan.Zero);

        var completedTask = await Task.WhenAny(secondAttemptRan.Task, Task.Delay(BackgroundActionDeadline));

        completedTask.Should()
            .Be(
                secondAttemptRan.Task,
                "an opted-in retryCount must re-run the failed pass; without it the throw propagates and the pass is lost");
        Volatile.Read(ref attempts).Should().Be(2);
        logger.WarningCount.Should().Be(1, "an attempt that is about to be retried is not yet a failure, so it must not log at Error");
        logger.LastWarningFormatted.Should().Contain("attempt 1");
    }

    /// <summary>
    /// The other half of the same branch, and the one the four callers that pass no <c>retryCount</c> depend on: the
    /// default must stay no-retry. Without this, flipping <c>retryCount is null or &lt;= 0</c> to retry-by-default would
    /// change every existing caller silently and no test would notice.
    /// <para>
    /// Deterministic for the same reason: the terminal Error log is raised from the <c>catch</c> that runs only after
    /// the background loop has already exited, so at the instant the signal arrives no further invocation is possible
    /// and <c>attempts</c> can no longer move. Nothing here waits out a timeout to prove an absence.
    /// </para>
    /// </summary>
    [Fact]
    public async Task QueueIntervalAsyncActionInBackground_WhenRetryCountIsNotProvided_ShouldNotReExecuteActionAfterFirstAttemptThrows()
    {
        var attempts = 0;
        var errorLogged = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var logger = new RecordingLogger();

        Util.TaskRunner.QueueIntervalAsyncActionInBackground(
            _ =>
            {
                Interlocked.Increment(ref attempts);
                return Task.FromException(new InvalidOperationException("Transient failure"));
            },
            intervalTimeInSeconds: 0,
            loggerFactory: () => new SignalOnLevelLogger(logger, LogLevel.Error, errorLogged),
            // Two passes are scheduled: if the default ever started retrying, or the throw stopped propagating, this
            // action would be entered more than once.
            maximumIntervalExecutionCount: 2,
            executeOnceImmediately: true);

        var completedTask = await Task.WhenAny(errorLogged.Task, Task.Delay(BackgroundActionDeadline));

        completedTask.Should().Be(errorLogged.Task, "a pass that throws with no retryCount must surface as a terminal Error log");
        Volatile.Read(ref attempts).Should().Be(1, "the default path must not retry, and the propagated throw must cancel the remaining scheduled pass");
        logger.WarningCount.Should().Be(0, "no retry was requested, so no retry warning may be logged");
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

    /// <summary>
    /// Decorates <see cref="RecordingLogger" /> - which records but cannot wake an awaiter - so a fire-and-forget
    /// background path can be observed by the log line it emits rather than by waiting out a deadline.
    /// Composed rather than folded into the shared fake, because signalling is specific to tests of void,
    /// fire-and-forget APIs and every other consumer of the fake asserts on <c>Entries</c> after an awaited call.
    /// </summary>
    private sealed class SignalOnLevelLogger(RecordingLogger inner, LogLevel signalOn, TaskCompletionSource signal) : ILogger
    {
        public IDisposable BeginScope<TState>(TState state)
            where TState : notnull => inner.BeginScope(state);

        public bool IsEnabled(LogLevel logLevel) => inner.IsEnabled(logLevel);

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            inner.Log(logLevel, eventId, state, exception, formatter);

            if (logLevel == signalOn) signal.TrySetResult();
        }
    }
}
