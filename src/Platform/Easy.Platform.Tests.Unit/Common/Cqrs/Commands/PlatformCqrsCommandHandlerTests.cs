using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Moq;

namespace Easy.Platform.Tests.Unit.Common.Cqrs.Commands;

/// <summary>
/// Unit tests for <see cref="PlatformCqrsCommandHandler{TCommand,TResult}"/>.
/// Tests the Handle pipeline: validation → execute → event publishing.
/// </summary>
public class PlatformCqrsCommandHandlerTests
    : PlatformCqrsCommandHandlerTestBase<
        PlatformCqrsCommandHandlerTests.TestCommandHandler,
        PlatformCqrsCommandHandlerTests.TestCommand,
        PlatformCqrsCommandResult>
{
    protected override TestCommand CreateValidCommand()
        => new() { Name = "valid-name" };

    // ── Handle Pipeline ──

    [Fact]
    public async Task Handle_WithValidCommand_ReturnsResult()
    {
        SetupNoEventHandlers();
        var command = CreateValidCommand();

        var result = await ExecuteAsync(command);

        result.Should().NotBeNull();
    }

    [Fact]
    public async Task Handle_WithInvalidCommand_ThrowsValidationException()
    {
        var invalidCommand = new TestCommand { Name = "" }; // empty = invalid

        await AssertValidationFailsAsync(invalidCommand, "Name is required");
    }

    // ── Event Publishing ──

    [Fact]
    public async Task Handle_WhenEventHandlersRegistered_PublishesEvent()
    {
        SetupEventHandlersRegistered();
        var command = CreateValidCommand();

        await ExecuteAsync(command);

        CqrsMock.Verify(
            x => x.SendEvent(It.IsAny<PlatformCqrsCommandEvent<TestCommand, PlatformCqrsCommandResult>>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_WhenNoEventHandlers_SkipsEventPublishing()
    {
        SetupNoEventHandlers();
        var command = CreateValidCommand();

        await ExecuteAsync(command);

        CqrsMock.Verify(
            x => x.SendEvent(It.IsAny<PlatformCqrsCommandEvent<TestCommand, PlatformCqrsCommandResult>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    // ── Cancellation ──

    [Fact]
    public async Task Handle_PassesCancellationToken()
    {
        SetupNoEventHandlers();
        var command = CreateValidCommand();
        using var cts = new CancellationTokenSource();

        var result = await ExecuteAsync(command, cts.Token);

        result.Should().NotBeNull();
    }

    // ── Test Doubles ──

    public class TestCommand : PlatformCqrsCommand<PlatformCqrsCommandResult>, IPlatformCqrsRequest
    {
        public string Name { get; set; } = string.Empty;

        public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        {
            return PlatformValidationResult.Validate<IPlatformCqrsRequest>(
                this,
                !string.IsNullOrEmpty(Name),
                (PlatformValidationError)"Name is required");
        }
    }

    public class TestCommandHandler : PlatformCqrsCommandHandler<TestCommand, PlatformCqrsCommandResult>
    {
        public TestCommandHandler(Lazy<IPlatformCqrs> cqrs, IPlatformRootServiceProvider rootServiceProvider)
            : base(cqrs, rootServiceProvider) { }

        protected override Task<PlatformCqrsCommandResult> HandleAsync(TestCommand request, CancellationToken cancellationToken)
        {
            return Task.FromResult(new PlatformCqrsCommandResult());
        }
    }
}
