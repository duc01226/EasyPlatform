using Easy.Platform.Common;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Persistence.Domain;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.Domain.UnitOfWork;

public class PlatformAggregatedPersistenceUnitOfWorkTests : PlatformUnitTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-MSG-SAFE-001")]
    public void EmptyAggregate_MustWaitForSaveBeforeSideEffects()
    {
        using var services = BuildProvider();
        using var uow = CreateAggregate(services);

        uow.IsPseudoTransactionUow().Should().BeFalse("lazy provider initialization does not permit pre-commit side effects");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-MSG-SAFE-001")]
    [InlineData(true)]
    [InlineData(false)]
    public void SingleProvider_PreservesItsTransactionCapability(bool isPseudo)
    {
        using var services = BuildProvider(firstIsPseudo: isPseudo);
        using var uow = CreateAggregate(services);
        uow.GetInnerUowOfType<IFirstProviderUow>();

        uow.IsPseudoTransactionUow().Should().Be(isPseudo);
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-MSG-SAFE-001")]
    [InlineData(true, true, true)]
    [InlineData(true, false, false)]
    [InlineData(false, true, false)]
    [InlineData(false, false, false)]
    public void MultipleProviders_AllowImmediateSideEffectsOnlyWhenEveryProviderIsPseudo(bool firstIsPseudo, bool secondIsPseudo, bool expected)
    {
        using var services = BuildProvider(firstIsPseudo, secondIsPseudo);
        using var uow = CreateAggregate(services);
        uow.GetInnerUowOfType<IFirstProviderUow>();
        uow.GetInnerUowOfType<ISecondProviderUow>();

        uow.IsPseudoTransactionUow().Should().Be(expected, "one transactional provider requires commit ordering for the aggregate");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-MSG-SAFE-001")]
    public void LazyProviderInitialization_ReevaluatesCommitOrderingAsProvidersJoin()
    {
        using var services = BuildProvider(firstIsPseudo: true, secondIsPseudo: false);
        using var uow = CreateAggregate(services);

        uow.IsPseudoTransactionUow().Should().BeFalse();
        uow.GetInnerUowOfType<IFirstProviderUow>();
        uow.IsPseudoTransactionUow().Should().BeTrue();
        uow.GetInnerUowOfType<ISecondProviderUow>();
        uow.IsPseudoTransactionUow().Should().BeFalse();
    }

    private static PlatformAggregatedPersistenceUnitOfWork CreateAggregate(IServiceProvider services)
        => new(Mock.Of<IPlatformRootServiceProvider>(), services, NullLoggerFactory.Instance);

    private static ServiceProvider BuildProvider(bool firstIsPseudo = true, bool secondIsPseudo = false)
    {
        var first = new Mock<IFirstProviderUow>();
        first.SetupGet(uow => uow.Id).Returns("first-provider");
        first.Setup(uow => uow.IsPseudoTransactionUow()).Returns(firstIsPseudo);
        var second = new Mock<ISecondProviderUow>();
        second.SetupGet(uow => uow.Id).Returns("second-provider");
        second.Setup(uow => uow.IsPseudoTransactionUow()).Returns(secondIsPseudo);

        return new ServiceCollection().AddSingleton(first.Object).AddSingleton(second.Object).BuildServiceProvider();
    }

    public interface IFirstProviderUow : IPlatformUnitOfWork;
    public interface ISecondProviderUow : IPlatformUnitOfWork;
}
