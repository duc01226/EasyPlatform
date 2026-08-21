using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Easy.Platform.Tests.Unit.Domain.Repositories;

/// <summary>
/// Behavioral unit tests for <see cref="PlatformRepositoryResolver" />.
/// <para>
/// Source under test: <c>src/Platform/Easy.Platform/Domain/Repositories/PlatformRepositoryResolver.cs:11</c>.
/// The resolver is pure resolution logic behind an <see cref="IServiceProvider" /> seam, so a REAL
/// <see cref="ServiceCollection" />-built provider is used (no DI mocking); only the repository instances
/// themselves are Moq doubles.
/// </para>
/// <para>
/// Traceability: framework internals with no business Feature Spec, so test cases carry TECHNICAL-ONLY
/// ids <c>TC-PLATREPO-001..009</c> and <c>TC-PLATREPO-100</c>.
/// Every range this file uses must be listed here, and the WHOLE <c>Easy.Platform.Tests.Unit</c> project must be
/// checked before allocating a new one — an under-declared docstring is exactly how the previous holder of
/// <c>TC-PLATREPO-100</c> (then numbered 090) came to collide with <c>PlatformCacheRepositoryTests</c>.
/// </para>
/// </summary>
public class PlatformRepositoryResolverTests : PlatformUnitTestBase
{
    // TC-PLATREPO-001: App-specific 1-generic-param interface is preferred over the platform interface.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-001")]
    public void Resolve_WhenOneGenericParamAppInterfaceRegistered_PrefersAppInterfaceOverPlatformInterface()
    {
        var appRepo = Mock.Of<ITestAppRepositoryOneParam<TestEntity>>();
        var platformRepo = Mock.Of<IPlatformQueryableRepository<TestEntity, string>>();

        using var provider = BuildProvider(services =>
        {
            services.AddSingleton(appRepo);
            services.AddSingleton(platformRepo);
        });

        var resolver = new PlatformRepositoryResolver(provider, typeof(ITestAppRepositoryOneParam<>));

        var resolved = resolver.Resolve<TestEntity>();

        // Source: Resolve tries TryResolveFromTypeDefinition BEFORE the platform fallback.
        resolved.Should().BeSameAs(appRepo);
        resolved.Should().NotBeSameAs(platformRepo);
    }

    // TC-PLATREPO-002: App-specific 2-generic-param interface closes over (TEntity, TKey).
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-002")]
    public void Resolve_WhenTwoGenericParamAppInterfaceRegistered_ClosesOverEntityAndKeyAndPrefersIt()
    {
        var appRepo = Mock.Of<ITestAppRepositoryTwoParams<TestEntity, string>>();
        var platformRepo = Mock.Of<IPlatformQueryableRepository<TestEntity, string>>();

        using var provider = BuildProvider(services =>
        {
            services.AddSingleton(appRepo);
            services.AddSingleton(platformRepo);
        });

        var resolver = new PlatformRepositoryResolver(provider, typeof(ITestAppRepositoryTwoParams<,>));

        var resolved = resolver.Resolve<TestEntity, string>();

        resolved.Should().BeSameAs(appRepo);
    }

    // TC-PLATREPO-003: 3+ generic params is an UNSUPPORTED arity -> null -> platform fallback (real branch).
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-003")]
    public void Resolve_WhenAppInterfaceHasThreeGenericParams_FallsBackToPlatformInterface()
    {
        var appRepo = Mock.Of<ITestAppRepositoryThreeParams<TestEntity, string, int>>();
        var platformRepo = Mock.Of<IPlatformQueryableRepository<TestEntity, string>>();

        using var provider = BuildProvider(services =>
        {
            services.AddSingleton(appRepo);
            services.AddSingleton(platformRepo);
        });

        var resolver = new PlatformRepositoryResolver(provider, typeof(ITestAppRepositoryThreeParams<,,>));

        var resolved = resolver.Resolve<TestEntity>();

        // Source: genericParams.Length is neither 1 nor 2 -> returns null -> platform fallback wins.
        resolved.Should().BeSameAs(platformRepo);
        resolved.Should().NotBeSameAs(appRepo);
    }

    // TC-PLATREPO-004: MakeGenericType throwing on a violated constraint degrades to fallback, never propagates.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-004")]
    public void Resolve_WhenMakeGenericTypeViolatesConstraint_SwallowsAndFallsBackInsteadOfThrowing()
    {
        // TestEntity implements IEntity<string> but NOT IRootEntity<string>, so
        // typeof(ITestAppRootOnlyRepository<>).MakeGenericType(typeof(TestEntity)) throws ArgumentException.
        var makeGenericTypeAct = () => typeof(ITestAppRootOnlyRepository<>).MakeGenericType(typeof(TestEntity));

        makeGenericTypeAct.Should()
            .Throw<ArgumentException>("the deliberately violated constraint is the precondition of this test");

        var platformRepo = Mock.Of<IPlatformQueryableRepository<TestEntity, string>>();

        using var provider = BuildProvider(services => services.AddSingleton(platformRepo));

        var resolver = new PlatformRepositoryResolver(provider, typeof(ITestAppRootOnlyRepository<>));

        var resolved = resolver.Resolve<TestEntity>();

        // Source: the try/catch around MakeGenericType returns null -> platform fallback.
        resolved.Should().BeSameAs(platformRepo);
    }

    // TC-PLATREPO-005: Registered app-specific service that is NOT a platform queryable repository degrades to fallback.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-005")]
    public void Resolve_WhenAppInterfaceServiceIsNotAPlatformQueryableRepository_FallsBackToPlatformInterface()
    {
        var unrelated = Mock.Of<ITestUnrelatedRepository<TestEntity>>();
        var platformRepo = Mock.Of<IPlatformQueryableRepository<TestEntity, string>>();

        using var provider = BuildProvider(services =>
        {
            services.AddSingleton(unrelated);
            services.AddSingleton(platformRepo);
        });

        var resolver = new PlatformRepositoryResolver(provider, typeof(ITestUnrelatedRepository<>));

        var resolved = resolver.Resolve<TestEntity>();

        // Source: `service as IPlatformQueryableRepository<TEntity, TKey>` yields null -> fallback.
        resolved.Should().BeSameAs(platformRepo);
    }

    // TC-PLATREPO-006: Nothing registered -> InvalidOperationException naming the entity AND expected registration.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-006")]
    public void Resolve_WhenNothingRegistered_ThrowsInvalidOperationExceptionNamingEntityAndExpectedRegistration()
    {
        using var provider = BuildProvider(_ => { });

        var resolver = new PlatformRepositoryResolver(provider, typeof(ITestAppRepositoryOneParam<>));

        var act = () => resolver.Resolve<TestEntity>();

        var thrown = act.Should().Throw<InvalidOperationException>().Which;

        thrown.Message.Should().Contain(nameof(TestEntity));
        thrown.Message.Should().Contain("IPlatformQueryableRepository<TestEntity, String>");
        thrown.Message.Should().Contain("not registered");
    }

    // TC-PLATREPO-007: CanResolve mirrors the same preference order and never throws.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATREPO-007")]
    [InlineData(true, false, true)]
    [InlineData(false, true, true)]
    [InlineData(true, true, true)]
    [InlineData(false, false, false)]
    public void CanResolve_MirrorsResolvePreferenceOrder_WithoutThrowing(
        bool registerAppRepository,
        bool registerPlatformRepository,
        bool expectedCanResolve)
    {
        using var provider = BuildProvider(services =>
        {
            if (registerAppRepository) services.AddSingleton(Mock.Of<ITestAppRepositoryOneParam<TestEntity>>());
            if (registerPlatformRepository) services.AddSingleton(Mock.Of<IPlatformQueryableRepository<TestEntity, string>>());
        });

        var resolver = new PlatformRepositoryResolver(provider, typeof(ITestAppRepositoryOneParam<>));

        var canResolve = resolver.CanResolve<TestEntity>();

        canResolve.Should().Be(expectedCanResolve);
    }

    // TC-PLATREPO-008: A resolver with NO type definition ignores the app-specific registration entirely.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-008")]
    public void Resolve_WhenNoTypeDefinitionConfigured_IgnoresAppSpecificRegistrationAndThrows()
    {
        using var provider = BuildProvider(services => services.AddSingleton(Mock.Of<ITestAppRepositoryOneParam<TestEntity>>()));

        var typeUnawareResolver = new PlatformRepositoryResolver(provider);

        var act = () => typeUnawareResolver.Resolve<TestEntity>();

        act.Should().Throw<InvalidOperationException>();
        typeUnawareResolver.CanResolve<TestEntity>().Should().BeFalse();
    }

    // TC-PLATREPO-009: Resolve<TEntity>() is exactly Resolve<TEntity, string>() - the string-key shortcut.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-009")]
    public void ResolveSingleGenericOverload_ResolvesTheSameInstanceAsStringKeyedOverload()
    {
        var platformRepo = Mock.Of<IPlatformQueryableRepository<TestEntity, string>>();

        using var provider = BuildProvider(services => services.AddSingleton(platformRepo));

        var resolver = new PlatformRepositoryResolver(provider);

        resolver.Resolve<TestEntity>().Should().BeSameAs(resolver.Resolve<TestEntity, string>());
    }

    // TC-PLATREPO-100: The positive counterpart to TC-PLATREPO-004. That test proves the try/catch around
    // MakeGenericType swallows a CONSTRAINT VIOLATION; this proves it does not ALSO swallow a legitimate
    // resolution through the same constrained interface. Without this, the catch-all's widest failure surface
    // (a working resolution accidentally routed through the catch block) has no covering case.
    // Own id (100) rather than 001-009: that decade is full, and 070-079 is already claimed by the resolver factory
    // suite for the same collision-avoidance reason. It was first allocated 090, which PlatformCacheRepositoryTests
    // already owns as part of its 090-099 block — 100 is the first id free across the whole project for this prefix.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-100")]
    public void Resolve_WhenAppInterfaceConstraintIsSatisfied_ResolvesTheAppSpecificInterfaceInsteadOfSwallowingIt()
    {
        // TestRootEntity satisfies ITestAppRootOnlyRepository<TEntity>'s `IRootEntity<string>` constraint, so
        // MakeGenericType must succeed here - the opposite precondition of TC-PLATREPO-004.
        var makeGenericTypeAct = () => typeof(ITestAppRootOnlyRepository<>).MakeGenericType(typeof(TestRootEntity));

        makeGenericTypeAct.Should().NotThrow("TestRootEntity satisfies the IRootEntity<string> constraint that TC-PLATREPO-004 deliberately violates");

        var appRepo = Mock.Of<ITestAppRootOnlyRepository<TestRootEntity>>();
        var platformRepo = Mock.Of<IPlatformQueryableRepository<TestRootEntity, string>>();

        using var provider = BuildProvider(services =>
        {
            services.AddSingleton(appRepo);
            services.AddSingleton(platformRepo);
        });

        var resolver = new PlatformRepositoryResolver(provider, typeof(ITestAppRootOnlyRepository<>));

        var resolved = resolver.Resolve<TestRootEntity>();

        // If the catch block swallowed this legitimate resolution too, it would fall through to the platform
        // fallback instead - so asserting the APP-specific instance is what actually distinguishes the two.
        resolved.Should().BeSameAs(appRepo);
        resolved.Should().NotBeSameAs(platformRepo);
    }

    internal static ServiceProvider BuildProvider(Action<IServiceCollection> configure)
    {
        var services = new ServiceCollection();

        configure(services);

        return services.BuildServiceProvider();
    }

    /// <summary>Minimal entity used to close the repository generics. NOT a root entity - see TC-PLATREPO-004.</summary>
    public sealed class TestEntity : IEntity<string>
    {
        public string Id { get; set; } = string.Empty;

        public object GetId()
        {
            return Id;
        }
    }

    /// <summary>Root entity variant, proving the constrained interface CAN be closed over a valid argument.</summary>
    public sealed class TestRootEntity : IRootEntity<string>
    {
        public string Id { get; set; } = string.Empty;

        public object GetId()
        {
            return Id;
        }
    }

    /// <summary>App-specific repository interface with ONE generic parameter (TKey fixed to string).</summary>
    public interface ITestAppRepositoryOneParam<TEntity> : IPlatformQueryableRepository<TEntity, string>
        where TEntity : class, IEntity<string>, new();

    /// <summary>App-specific repository interface with TWO generic parameters.</summary>
    public interface ITestAppRepositoryTwoParams<TEntity, TKey> : IPlatformQueryableRepository<TEntity, TKey>
        where TEntity : class, IEntity<TKey>, new();

    /// <summary>App-specific repository interface with THREE generic parameters - unsupported arity.</summary>
    public interface ITestAppRepositoryThreeParams<TEntity, TKey, TExtra> : IPlatformQueryableRepository<TEntity, TKey>
        where TEntity : class, IEntity<TKey>, new();

    /// <summary>App-specific interface whose constraint REJECTS a non-root entity, forcing MakeGenericType to throw.</summary>
    public interface ITestAppRootOnlyRepository<TEntity> : IPlatformQueryableRepository<TEntity, string>
        where TEntity : class, IRootEntity<string>, new();

    /// <summary>Registered under the resolved closed type but NOT a platform queryable repository.</summary>
    public interface ITestUnrelatedRepository<TEntity>
        where TEntity : class, IEntity<string>, new();
}
