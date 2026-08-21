using Easy.Platform.Domain.Repositories;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using static Easy.Platform.Tests.Unit.Domain.Repositories.PlatformRepositoryResolverTests;

namespace Easy.Platform.Tests.Unit.Domain.Repositories;

/// <summary>
/// Behavioral unit tests for <see cref="PlatformRepositoryResolverFactory" />.
/// <para>
/// Source under test: <c>src/Platform/Easy.Platform/Domain/Repositories/PlatformRepositoryResolverFactory.cs:7</c>.
/// The factory's whole contract is that <c>Create()</c> and <c>Create(Type)</c> produce resolvers that behave
/// DIFFERENTLY against the SAME service provider, so every test here is a differential test.
/// </para>
/// <para>
/// Traceability: TECHNICAL-ONLY ids <c>TC-PLATREPO-070..073</c> - the resolver-factory decade. The 001-009
/// resolver decade is full, so the factory gets its own decade rather than colliding with 010-019
/// (cache repository behavior).
/// </para>
/// </summary>
public class PlatformRepositoryResolverFactoryTests : PlatformUnitTestBase
{
    // TC-PLATREPO-070: Create() yields a type-UNAWARE resolver; Create(Type) yields a type-AWARE one.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-070")]
    public void Create_WithAndWithoutTypeDefinition_ProduceDifferentBehaviorAgainstTheSameProvider()
    {
        var appRepo = Mock.Of<ITestAppRepositoryOneParam<TestEntity>>();

        // ONLY the app-specific interface is registered - the platform interface is deliberately absent,
        // so the two resolvers must disagree.
        using var provider = BuildProvider(services => services.AddSingleton(appRepo));

        var factory = new PlatformRepositoryResolverFactory(provider);

        var typeUnawareResolver = factory.Create();
        var typeAwareResolver = factory.Create(typeof(ITestAppRepositoryOneParam<>));

        var typeUnawareAct = () => typeUnawareResolver.Resolve<TestEntity>();

        typeUnawareAct.Should().Throw<InvalidOperationException>("Create() has no type definition to prefer");
        typeAwareResolver.Resolve<TestEntity>().Should().BeSameAs(appRepo);
    }

    // TC-PLATREPO-071: CanResolve also diverges between the two factory products.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-071")]
    public void Create_WithAndWithoutTypeDefinition_ProduceDivergentCanResolveResults()
    {
        using var provider = BuildProvider(services => services.AddSingleton(Mock.Of<ITestAppRepositoryOneParam<TestEntity>>()));

        var factory = new PlatformRepositoryResolverFactory(provider);

        factory.Create().CanResolve<TestEntity>().Should().BeFalse();
        factory.Create(typeof(ITestAppRepositoryOneParam<>)).CanResolve<TestEntity>().Should().BeTrue();
    }

    // TC-PLATREPO-072: Each Create call yields a NEW resolver instance (no cached/shared resolver state).
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-072")]
    public void Create_CalledTwice_ReturnsDistinctResolverInstances()
    {
        using var provider = BuildProvider(_ => { });

        var factory = new PlatformRepositoryResolverFactory(provider);

        factory.Create().Should().NotBeSameAs(factory.Create());
        factory.Create(typeof(ITestAppRepositoryOneParam<>))
            .Should()
            .NotBeSameAs(factory.Create(typeof(ITestAppRepositoryOneParam<>)));
    }

    // TC-PLATREPO-073: Both factory products resolve the platform interface identically when only it is registered.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-073")]
    public void Create_BothProducts_ResolveThePlatformInterfaceIdenticallyWhenOnlyItIsRegistered()
    {
        var platformRepo = Mock.Of<IPlatformQueryableRepository<TestEntity, string>>();

        using var provider = BuildProvider(services => services.AddSingleton(platformRepo));

        var factory = new PlatformRepositoryResolverFactory(provider);

        factory.Create().Resolve<TestEntity>().Should().BeSameAs(platformRepo);
        factory.Create(typeof(ITestAppRepositoryOneParam<>)).Resolve<TestEntity>().Should().BeSameAs(platformRepo);
    }
}
