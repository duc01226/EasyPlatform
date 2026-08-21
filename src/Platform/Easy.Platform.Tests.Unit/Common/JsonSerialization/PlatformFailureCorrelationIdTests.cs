using System.Text.RegularExpressions;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Tests.Unit.TestInfrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace Easy.Platform.Tests.Unit.Common.JsonSerialization;

/// <summary>
/// Guards the correlation identifiers that answer "WHICH record failed?" on the sinks that swallow or only persist
/// their exception. A stack trace locates the failure in the CODE; without an id the failure still cannot be
/// reproduced, because nothing says which event or which queued message produced it.
/// </summary>
/// <remarks>
/// <para>
/// The identifiers are opaque surrogate keys (a <c>Ulid</c>, a row id), so unlike the message and stack trace added
/// alongside them they carry no disclosure cost at all.
/// </para>
/// <para>
/// <b>Why a source-shape test sits next to the behavioural ones — and what it does NOT claim.</b> Serilog itself
/// tolerates a template whose <c>{Token}</c> count disagrees with its argument count, rendering a literal
/// <c>{InboxMessageId}</c> or shifting every later value onto the wrong name. In THIS repository that failure mode
/// is not silent: <b>CA2017 is enabled at error severity and fails the build</b> on a count mismatch (verified by
/// injecting one). So raw count parity is the compiler's job, and these tests do not exist to duplicate it.
/// </para>
/// <para>
/// What the compiler cannot see is what these assertions add: that the correlation token is actually PRESENT, and
/// that the NUMBER of failure-path log sites has not drifted. The latter earned its keep immediately — it caught a
/// second outbox failure log (the entry-path sibling of the catch-path one) that the plan never listed and the
/// implementation had missed. The count assertion is the finding mechanism; parity is retained only as a cheap
/// invariant that keeps this file honest if CA2017 is ever relaxed.
/// </para>
/// <para>
/// The inbox/outbox templates are asserted over source text rather than by rendering because they sit behind a
/// service-provider-driven retry pipeline that is disproportionately expensive to drive; the event-handler template
/// IS rendered, since it is reachable directly. Source-shape assertion is the technique
/// <c>PlatformDiagnosticSinkSourceShapeTests</c> already uses for this family of files.
/// </para>
/// </remarks>
public class PlatformFailureCorrelationIdTests
{
    private const string InboxHelperPath =
        "Application/MessageBus/InboxPattern/PlatformInboxMessageBusConsumerHelper.cs";

    private const string OutboxHelperPath =
        "Application/MessageBus/OutboxPattern/PlatformOutboxMessageBusProducerHelper.cs";

    private const string EventHandlerPath = "Common/Cqrs/Events/PlatformCqrsEventHandler.cs";

    /// <summary>TC-EXCDIAG-012 — the swallowed-event log renders the event's real id, not a literal token.</summary>
    [Fact]
    public void EventHandlerLogError_WhenEventHasId_RendersThatIdIntoTheLog()
    {
        var (handler, loggerFactory) = CreateHandler();
        var @event = new CorrelationTestEvent();

        handler.LogError(@event, new InvalidOperationException("boom"), loggerFactory);

        var formatted = loggerFactory.Logger.Entries.Should().ContainSingle().Subject.Formatted;

        formatted.Should().Contain(
            @event.Id,
            "without the id, a swallowed failure names the handler but not the record that triggered it");
        formatted.Should().NotContain(
            "{EventId}",
            "a literal token means the argument list and the template drifted — Serilog will not report this");
    }

    /// <summary>
    /// TC-EXCDIAG-013 — an event whose id is unreadable degrades to a placeholder and never throws. This runs inside
    /// a <c>catch</c> block, so an exception escaping here would replace the very failure being logged.
    /// </summary>
    [Fact]
    public void EventHandlerLogError_WhenEventIdThrows_LogsPlaceholderWithoutThrowing()
    {
        var (handler, loggerFactory) = CreateHandler();

        var act = () => handler.LogError(
            new ThrowingIdTestEvent(),
            new InvalidOperationException("boom"),
            loggerFactory);

        act.Should().NotThrow("the correlation id must never become the reason a failure goes unrecorded");

        var formatted = loggerFactory.Logger.Entries.Should().ContainSingle().Subject.Formatted;

        formatted.Should().Contain("unknown");
        formatted.Should().Contain(
            nameof(InvalidOperationException),
            "degrading the id must not cost the rest of the diagnostic");
    }

    /// <summary>
    /// TC-EXCDIAG-014 / TC-EXCDIAG-015 — every failure-path log template in the inbox and outbox helpers supplies
    /// exactly as many arguments as it declares tokens, and the correlation-id token is present.
    /// </summary>
    [Theory]
    [InlineData(InboxHelperPath, "UpdateExistingInboxFailedMessageAsync.", "InboxMessageId", 2)]
    [InlineData(OutboxHelperPath, "UpdateExistingOutboxMessageFailedAsync.", "OutboxMessageId", 2)]
    public void FailurePathLogTemplates_DeclareExactlyAsManyTokensAsArgumentsSupplied(
        string relativePath,
        string templatePrefix,
        string expectedIdToken,
        int expectedCallCount)
    {
        var calls = ExtractLogErrorCalls(ReadPlatformSource(relativePath))
            .Where(call => call.Template.StartsWith(templatePrefix, StringComparison.Ordinal))
            .ToList();

        calls.Should().HaveCount(
            expectedCallCount,
            "a drift in the number of failure-path log sites means a sink was added or removed unnoticed");

        foreach (var call in calls)
        {
            call.Tokens.Should().Contain(
                expectedIdToken,
                "the persisted-row failure log is the only record that says WHICH message failed");
            call.Tokens.Should().HaveCount(
                call.ArgumentCount,
                $"template '{call.Template}' declares {call.Tokens.Count} tokens but supplies {call.ArgumentCount} "
                + "arguments — Serilog renders this silently wrong");
        }
    }

    /// <summary>TC-EXCDIAG-012b — the same parity guarantee for the event-handler template, which has the most arguments.</summary>
    [Fact]
    public void EventHandlerLogTemplate_DeclaresExactlyAsManyTokensAsArgumentsSupplied()
    {
        var call = ExtractLogErrorCalls(ReadPlatformSource(EventHandlerPath))
            .Single(candidate => candidate.Template.StartsWith("[PlatformCqrsEventHandler]", StringComparison.Ordinal));

        call.Tokens.Should().Contain("EventId");
        call.Tokens.Should().HaveCount(call.ArgumentCount);
    }

    /// <summary>
    /// Extracts each <c>LogError(template, args...)</c> call: its template, the tokens the template declares, and how
    /// many arguments follow it. Arguments are counted by splitting on top-level commas so that nested calls such as
    /// <c>Format(a, b)</c> count as one argument rather than two.
    /// </summary>
    private static List<LogErrorCall> ExtractLogErrorCalls(string source)
    {
        var calls = new List<LogErrorCall>();

        foreach (System.Text.RegularExpressions.Match match in Regex.Matches(
            source,
            @"\.LogError\(\s*""(?<template>(?:[^""\\]|\\.)*)""",
            RegexOptions.Singleline))
        {
            var template = Regex.Unescape(match.Groups["template"].Value);
            var argumentsStart = match.Index + match.Length;
            var argumentSection = ReadBalancedArgumentSection(source, argumentsStart);

            calls.Add(new LogErrorCall(
                template,
                Regex.Matches(template, @"\{@?(?<name>\w+)\}").Select(token => token.Groups["name"].Value).ToList(),
                CountTopLevelArguments(argumentSection)));
        }

        return calls;
    }

    /// <summary>Reads from just past the template literal to the closing parenthesis of the <c>LogError</c> call.</summary>
    private static string ReadBalancedArgumentSection(string source, int startIndex)
    {
        var depth = 1;
        var index = startIndex;

        while (index < source.Length && depth > 0)
        {
            if (source[index] == '(') depth++;
            else if (source[index] == ')') depth--;
            else if (source[index] == '"') index = SkipStringLiteral(source, index);

            index++;
        }

        return source[startIndex..Math.Max(startIndex, index - 1)];
    }

    private static int SkipStringLiteral(string source, int quoteIndex)
    {
        var index = quoteIndex + 1;
        while (index < source.Length && source[index] != '"')
        {
            if (source[index] == '\\') index++;
            index++;
        }

        return index;
    }

    /// <summary>
    /// Counts the arguments that FOLLOW the template. The section handed in begins at the comma separating the
    /// template from the first argument, so that leading comma is stripped before counting — otherwise every call
    /// reports one argument too many and the parity check silently inverts into a false alarm.
    /// </summary>
    private static int CountTopLevelArguments(string argumentSection)
    {
        argumentSection = argumentSection.TrimStart();
        if (argumentSection.StartsWith(',')) argumentSection = argumentSection[1..];
        if (string.IsNullOrWhiteSpace(argumentSection)) return 0;

        var depth = 0;
        var arguments = 1;

        for (var index = 0; index < argumentSection.Length; index++)
        {
            var character = argumentSection[index];
            if (character is '(' or '[' or '<') depth++;
            else if (character is ')' or ']' or '>') depth--;
            else if (character == '"') index = SkipStringLiteral(argumentSection, index);
            else if (character == ',' && depth == 0) arguments++;
        }

        return arguments;
    }

    /// <summary>
    /// Resolves a platform source file from the test binary's location. Walking up to the repository root keeps the
    /// test independent of where the suite is executed from.
    /// </summary>
    private static string ReadPlatformSource(string relativePath)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory != null && !Directory.Exists(Path.Combine(directory.FullName, "Easy.Platform")))
        {
            directory = directory.Parent;
        }

        directory.Should().NotBeNull("the source-shape assertions require the Easy.Platform source tree");
        var fullPath = Path.Combine(directory!.FullName, "Easy.Platform", relativePath.Replace('/', Path.DirectorySeparatorChar));
        File.Exists(fullPath).Should().BeTrue($"expected platform source at '{fullPath}'");

        return File.ReadAllText(fullPath);
    }

    private static (CorrelationTestEventHandler Handler, RecordingLoggerFactory LoggerFactory) CreateHandler()
    {
        var loggerFactory = new RecordingLoggerFactory();
        var handler = new CorrelationTestEventHandler(
            loggerFactory,
            new Mock<IPlatformRootServiceProvider>().Object,
            new Mock<IServiceProvider>().Object);

        return (handler, loggerFactory);
    }

    private sealed record LogErrorCall(string Template, List<string> Tokens, int ArgumentCount);

    private sealed class CorrelationTestEvent : PlatformCqrsEvent
    {
        public override string EventType => "TestEventType";

        public override string EventName => "TestEventName";

        public override string EventAction => "TestEventAction";
    }

    /// <summary>An event whose computed <c>Id</c> throws — reachable because <c>EventAction</c> is caller-overridable.</summary>
    private sealed class ThrowingIdTestEvent : PlatformCqrsEvent
    {
        public override string EventType => "TestEventType";

        public override string EventName => "TestEventName";

        public override string EventAction => throw new InvalidOperationException("hostile EventAction must not escape");
    }

    private sealed class CorrelationTestEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformRootServiceProvider rootServiceProvider,
        IServiceProvider serviceProvider)
        : PlatformCqrsEventHandler<PlatformCqrsEvent>(loggerFactory, rootServiceProvider, serviceProvider)
    {
        public override Task Handle(object @event, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        public override Task<bool> HandleWhen(object @event)
        {
            return Task.FromResult(true);
        }

        public override Task<bool> HandleWhen(PlatformCqrsEvent @event)
        {
            return Task.FromResult(true);
        }

        protected override Task HandleAsync(PlatformCqrsEvent @event, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }
}
