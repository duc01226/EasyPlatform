using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Covers dependency-graph resolution across platform modules — how a module discovers the modules it
/// depends on, and how root-vs-child identity is decided.
/// <para>
/// Root identity is load-bearing: only a root module registers distributed tracing and runs performance
/// profiling setup. If a child were mistakenly treated as a root, the application would configure
/// OpenTelemetry more than once. The subtlety is that root-ness is not declared — it is DERIVED from
/// whether some other module claimed this one as a dependency, and that claim is stamped as a SIDE
/// EFFECT of walking the graph. These tests pin that ordering.
/// </para>
/// </summary>
public class PlatformModuleDependencyResolutionTests : PlatformModuleTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-010")]
    public void GetDependentModuleTypes_DefaultsToEmpty_ForAModuleThatDeclaresNoDependencies()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<LeafTestPlatformModule>(services, configuration);

        module.GetDependentModuleTypes().Should().BeEmpty();
        module.GetDependentModules(services).Should().BeEmpty();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-010")]
    public void GetDependentModules_ResolvesDirectlyDeclaredDependency()
    {
        var (services, _) = NewHost();
        services.RegisterModule<ParentTestPlatformModule>();

        var parent = services.BuildServiceProvider().GetRequiredService<ParentTestPlatformModule>();

        parent.GetDependentModules(services)
            .Select(dependentModule => dependentModule.GetType())
            .Should()
            .ContainSingle()
            .Which.Should()
            .Be(typeof(LeafTestPlatformModule));
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-011")]
    public void GetDependentModules_FlattensTransitiveDependencies_ByDefault()
    {
        var (services, _) = NewHost();
        services.RegisterModule<GrandParentTestPlatformModule>();

        var grandParent = services.BuildServiceProvider().GetRequiredService<GrandParentTestPlatformModule>();

        grandParent.GetDependentModules(services)
            .Select(dependentModule => dependentModule.GetType())
            .Should()
            .BeEquivalentTo(
                [typeof(LeafTestPlatformModule), typeof(ParentTestPlatformModule)],
                "the default flattens the whole transitive closure so initialization can order EVERY "
                + "ancestor's dependency, not just the immediate one");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-011")]
    public void GetDependentModules_ReturnsOnlyDirectDependencies_WhenDeepChildrenExcluded()
    {
        var (services, _) = NewHost();
        services.RegisterModule<GrandParentTestPlatformModule>();

        var grandParent = services.BuildServiceProvider().GetRequiredService<GrandParentTestPlatformModule>();

        grandParent.GetDependentModules(services, includeDeepChildModules: false)
            .Select(dependentModule => dependentModule.GetType())
            .Should()
            .BeEquivalentTo([typeof(ParentTestPlatformModule)]);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-012")]
    public void GetDependentModules_MarksEveryResolvedDependencyAsAChildModule()
    {
        var (services, _) = NewHost();
        services.RegisterModule<GrandParentTestPlatformModule>();
        var serviceProvider = services.BuildServiceProvider();

        var grandParent = serviceProvider.GetRequiredService<GrandParentTestPlatformModule>();
        var dependentModules = grandParent.GetDependentModules(services);

        dependentModules.Should().OnlyContain(dependentModule => dependentModule.IsChildModule);
        dependentModules.Should().OnlyContain(dependentModule => !dependentModule.IsRootModule);

        grandParent.IsChildModule.Should().BeFalse("nothing declared the grand-parent as its dependency");
        grandParent.IsRootModule.Should().BeTrue(
            "root-ness is the absence of a parent claim — and only the root configures distributed tracing");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-012")]
    public void IsRootModule_IsTheExactInverseOfIsChildModule()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<LeafTestPlatformModule>(services, configuration);

        // Property: for EVERY assignment of IsChildModule, IsRootModule must be its negation.
        // This is the whole definition of root-ness, so it is asserted across the full input domain
        // rather than at one convenient point.
        foreach (var isChildModule in new[] { false, true, false })
        {
            module.IsChildModule = isChildModule;

            module.IsRootModule.Should().Be(!isChildModule);
            IPlatformModule.CheckIsRootModule(module).Should().Be(!isChildModule);
        }
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-013")]
    public void RegisteringAModule_ThatDependsOnANonModuleType_IsRejected()
    {
        var (services, _) = NewHost();

        var registerInvalidModule = () => services.RegisterModule<InvalidDependencyTestPlatformModule>();

        registerInvalidModule.Should()
            .Throw<ArgumentException>(
                "a dependency that does not derive from PlatformModule can never be initialized by the "
                + "platform, so it must fail loudly at registration rather than silently at runtime")
            .WithMessage("*must be inherit from PlatformModule*");
    }
}
