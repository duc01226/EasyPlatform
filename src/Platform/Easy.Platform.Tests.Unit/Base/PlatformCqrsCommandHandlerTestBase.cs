using AutoFixture;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Validations.Exceptions;
using FluentAssertions;
using Moq;

namespace Easy.Platform.Tests.Unit.Base;

/// <summary>
/// Base class for testing <see cref="PlatformCqrsCommandHandler{TCommand,TResult}"/> subclasses.
/// Pre-wires Lazy{IPlatformCqrs} and IPlatformRootServiceProvider mocks.
/// Provides ExecuteAsync and validation failure assertion helpers.
/// </summary>
/// <typeparam name="THandler">The concrete command handler type.</typeparam>
/// <typeparam name="TCommand">The command type.</typeparam>
/// <typeparam name="TResult">The command result type.</typeparam>
public abstract class PlatformCqrsCommandHandlerTestBase<THandler, TCommand, TResult>
    : PlatformUnitTestBase<THandler>
    where THandler : PlatformCqrsCommandHandler<TCommand, TResult>
    where TCommand : PlatformCqrsCommand<TResult>, IPlatformCqrsRequest, new()
    where TResult : PlatformCqrsCommandResult, new()
{
    protected Mock<IPlatformCqrs> CqrsMock { get; private set; } = null!;
    protected Mock<IPlatformRootServiceProvider> RootServiceProviderMock { get; private set; } = null!;

    protected override void ConfigureFixture(AutoFixture.IFixture fixture)
    {
        base.ConfigureFixture(fixture);

        // Setup the Lazy<IPlatformCqrs> that command handlers require
        CqrsMock = new Mock<IPlatformCqrs>();
        RootServiceProviderMock = new Mock<IPlatformRootServiceProvider>();

        fixture.Inject(new Lazy<IPlatformCqrs>(() => CqrsMock.Object));
        fixture.Inject(RootServiceProviderMock.Object);
    }

    /// <summary>
    /// Override to create a valid command instance for testing the happy path.
    /// </summary>
    protected abstract TCommand CreateValidCommand();

    /// <summary>
    /// Execute the command handler and return the result.
    /// </summary>
    protected virtual Task<TResult> ExecuteAsync(TCommand command, CancellationToken ct = default)
        => Sut.Handle(command, ct);

    /// <summary>
    /// Assert that executing the command throws a <see cref="PlatformValidationException"/>.
    /// </summary>
    protected async Task AssertValidationFailsAsync(TCommand command, string? expectedErrorContains = null)
    {
        var act = () => ExecuteAsync(command);
        var exception = await act.Should().ThrowAsync<PlatformValidationException>();

        if (expectedErrorContains != null)
            exception.Which.Message.Should().Contain(expectedErrorContains);
    }

    /// <summary>
    /// Setup <see cref="RootServiceProviderMock"/> to report that event handlers are registered
    /// for the command event type, enabling event publishing in the handler pipeline.
    /// </summary>
    protected void SetupEventHandlersRegistered(int count = 1)
    {
        RootServiceProviderMock
            .Setup(x => x.ImplementationAssignableToServiceTypeRegisteredCount(It.IsAny<Type>()))
            .Returns(count);
    }

    /// <summary>
    /// Setup <see cref="RootServiceProviderMock"/> to report zero event handlers registered,
    /// skipping event publishing in the handler pipeline.
    /// </summary>
    protected void SetupNoEventHandlers()
    {
        RootServiceProviderMock
            .Setup(x => x.ImplementationAssignableToServiceTypeRegisteredCount(It.IsAny<Type>()))
            .Returns(0);
    }
}
