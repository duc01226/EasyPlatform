using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

public class UtilTaskRunnerRetryTests : PlatformUnitTestBase
{
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
