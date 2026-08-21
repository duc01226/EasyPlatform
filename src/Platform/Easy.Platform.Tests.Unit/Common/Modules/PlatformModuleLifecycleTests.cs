using Easy.Platform.Common;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Covers the <see cref="PlatformModule" /> lifecycle state machine — the registration and
/// initialization guarantees every module in the platform inherits.
/// <para>
/// These guarantees matter because module registration is NOT naturally idempotent: a module can be
/// reached more than once through the dependency graph (two parents depending on the same child),
/// and every service registration it performs would otherwise be duplicated. Duplicate singleton
/// registrations silently change which instance wins resolution, so the "register once" latch is a
/// correctness property, not an optimization.
/// </para>
/// </summary>
public class PlatformModuleLifecycleTests : PlatformModuleTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-001")]
    public void AreServicesRegistered_IsFalse_BeforeRegisterServicesIsCalled()
    {
        var (services, configuration) = NewHost();

        var module = CreateModule<LeafTestPlatformModule>(services, configuration);

        module.AreServicesRegistered.Should().BeFalse("a freshly constructed module has not registered anything yet");
        module.InitExecuted.Should().BeFalse("construction must not run initialization");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-001")]
    public void RegisterServices_SetsAreServicesRegistered_AndRunsInternalRegisterExactlyOnce()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<LeafTestPlatformModule>(services, configuration);

        module.RegisterServices(services);

        module.AreServicesRegistered.Should().BeTrue();
        module.InternalRegisterCallCount.Should().Be(1);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-001")]
    public void RegisterServices_IsIdempotent_RepeatedCallsDoNotRegisterAgain()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<LeafTestPlatformModule>(services, configuration);

        module.RegisterServices(services);
        var descriptorCountAfterFirstRegister = services.Count;

        module.RegisterServices(services);
        module.RegisterServices(services);

        module.InternalRegisterCallCount.Should().Be(
            1,
            "the AreServicesRegistered latch must short-circuit every call after the first — a module reachable "
            + "twice in the dependency graph would otherwise duplicate all of its service registrations");
        services.Count.Should().Be(
            descriptorCountAfterFirstRegister,
            "no additional service descriptors may be appended by repeat registration");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-001")]
    public void RegisterServices_CapturesTheServiceCollection_OnTheModule()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<LeafTestPlatformModule>(services, configuration);

        module.ServiceCollection.Should().BeNull("nothing is captured before registration");

        module.RegisterServices(services);

        module.ServiceCollection.Should().BeSameAs(
            services,
            "later lifecycle steps (initialization, per-assembly registration tracking) key off this exact instance");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-002")]
    public void RegisterServices_RegistersRootServiceProvider_ResolvableFromTheContainer()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<LeafTestPlatformModule>(services, configuration);

        module.RegisterServices(services);

        services.BuildServiceProvider()
            .GetService<IPlatformRootServiceProvider>()
            .Should()
            .NotBeNull("every module registers the platform root service provider so downstream code can reach the full container");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-002")]
    public void RegisterServices_RegistersDefaultLoggingServices()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<LeafTestPlatformModule>(services, configuration);

        module.RegisterServices(services);
        var serviceProvider = services.BuildServiceProvider();

        serviceProvider.GetService<Microsoft.Extensions.Logging.ILoggerFactory>().Should().NotBeNull();
        serviceProvider.GetService<Microsoft.Extensions.Logging.ILogger<PlatformModuleLifecycleTests>>().Should().NotBeNull();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-003")]
    public async Task InitializeAsync_SetsInitExecuted_AndIsFullyInitialized()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<LeafTestPlatformModule>(services, configuration);
        module.RegisterServices(services);

        module.IsFullyInitialized.Should().BeFalse("initialization has not run yet");

        await module.InitializeAsync();

        module.InitExecuted.Should().BeTrue();
        module.IsFullyInitialized.Should().BeTrue(
            "the base module defines full initialization as simply having executed init; "
            + "persistence modules narrow this by also requiring migration completion");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-003")]
    public async Task InitializeAsync_IsIdempotent_RepeatedCallsRemainInitialized()
    {
        // LeafTestPlatformModule counts REGISTER calls, not INIT calls — it does not expose whether
        // InternalInit actually ran once or three times, so the pre-fix version of this test could only
        // observe the (unconditionally true) InitExecuted flag and could not tell idempotent short-circuiting
        // apart from InternalInit silently re-running on every call. CountingInitTestPlatformModule counts the
        // real thing.
        var (services, configuration) = NewHost();
        var module = CreateModule<CountingInitTestPlatformModule>(services, configuration);
        module.RegisterServices(services);

        await module.InitializeAsync();
        await module.InitializeAsync();
        await module.InitializeAsync();

        module.InternalInitCallCount.Should().Be(
            1,
            "the InitExecuted latch short-circuits repeat initialization; a module reached twice through the "
            + "dependency graph must not re-run data seeding, migrations, or background-job scheduling");
        module.InitExecuted.Should().BeTrue();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-003")]
    public async Task InitializeAsync_ConcurrentCalls_InitializeExactlyOnce()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<CountingInitTestPlatformModule>(services, configuration);
        module.RegisterServices(services);

        // Modules are initialized in parallel within a priority tier (see InitializeDependentModulesAsync),
        // so concurrent entry is a REAL production sequence, not an artificial stress case. The release gate
        // below forces all 8 calls to enter InitializeAsync at (as close as possible to) the same instant,
        // instead of trickling in as the thread pool happens to schedule them: without it, thread-pool
        // saturation from the rest of this suite's ~1000+ concurrently running tests can serialise the 8
        // calls, in which case a BROKEN latch would still yield InternalInitCallCount == 1 by accident — the
        // test would then only ever fail correctly, never reliably catch a real regression.
        using var releaseGate = new ManualResetEventSlim(false);

        var concurrentInitializeCalls = Enumerable.Range(0, 8)
            .Select(_ => Task.Run(async () =>
            {
                releaseGate.Wait();
                await module.InitializeAsync();
            }))
            .ToArray();

        releaseGate.Set();
        await Task.WhenAll(concurrentInitializeCalls);

        module.InternalInitCallCount.Should().Be(
            1,
            "the initialization semaphore must serialize entry and the InitExecuted latch must reject the losers");
        module.InitExecuted.Should().BeTrue();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-004")]
    public void Dispose_IsSafeToCallRepeatedly()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<LeafTestPlatformModule>(services, configuration);
        module.RegisterServices(services);

        var repeatedDispose = () =>
        {
            module.Dispose();
            module.Dispose();
        };

        repeatedDispose.Should().NotThrow(
            "modules are registered as singletons and disposed by the container; a double dispose must not "
            + "throw ObjectDisposedException on the internal lifecycle semaphores");
    }
}
