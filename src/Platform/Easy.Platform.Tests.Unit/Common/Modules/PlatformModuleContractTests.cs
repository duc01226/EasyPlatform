using System.Reflection;
using Easy.Platform.Application;
using Easy.Platform.AspNetCore;
using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Contract coverage for the public composition seams that let several application modules share one
/// ASP.NET Core host while retaining independent lifecycle and seeding ownership.
/// </summary>
public sealed class PlatformModuleContractTests : PlatformModuleTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-MOD-103")]
    public void AspNetCoreModules_RegisterOverlappingControllerAssemblies_OnlyOnce()
    {
        var (services, configuration) = NewHost();
        var firstModule = CreateModule<FirstControllerModule>(services, configuration);
        var secondModule = CreateModule<SecondControllerModule>(services, configuration);

        firstModule.RegisterServices(services);
        secondModule.RegisterServices(services);

        using var serviceProvider = services.BuildServiceProvider();
        var applicationPartManager = serviceProvider.GetRequiredService<ApplicationPartManager>();

        var assemblyParts = applicationPartManager.ApplicationParts.OfType<AssemblyPart>().ToList();

        assemblyParts.Count(part => part.Assembly == SharedControllerAssembly)
            .Should()
            .Be(1, "two module registration paths must converge on one application part for the same assembly");
        assemblyParts.Count(part => part.Assembly == AdditionalControllerAssembly)
            .Should()
            .Be(1, "a distinct explicitly selected controller assembly must still be exposed");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-MOD-104")]
    public void AspNetCoreModule_DefaultControllerDiscovery_UsesOnlyTheConcreteModuleAssembly()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<ConcreteTestAspNetCoreModule>(services, configuration);

        module.GetAssembliesForControllerDiscovery()
            .Should()
            .ContainSingle()
            .Which
            .Should()
            .BeSameAs(module.Assembly);

        module.GetAssembliesForControllerDiscovery()
            .Should()
            .NotContain(typeof(PlatformAspNetCoreModule).Assembly,
                "referenced platform assemblies are not controller-discovery opt-ins");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-LIFE-103")]
    public async Task InitializeAsync_WhenInternalInitializationFails_ReportsTypedStageAndDoesNotBecomeReady()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<FailingInitializationModule>(services, configuration);
        module.RegisterServices(services);

        var exception = await Assert.ThrowsAsync<PlatformModuleInitializationException>(() => module.InitializeAsync());

        exception.ModuleType.Should().Be(typeof(FailingInitializationModule));
        exception.Stage.Should().Be(PlatformModuleInitializationStage.InternalInitialization);
        exception.InnerException.Should().BeOfType<InvalidOperationException>();
        module.InitExecuted.Should().BeFalse("a failed initialization must not publish a ready state");
        module.IsFullyInitialized.Should().BeFalse("failed initialization must not appear fully initialized");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-108")]
    public async Task InitializeAsync_WhenCompositionValidationFails_ReportsTypedStageBeforeModuleBody()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<FailingCompositionValidationModule>(services, configuration);
        module.RegisterServices(services);

        var exception = await Assert.ThrowsAsync<PlatformModuleInitializationException>(() => module.InitializeAsync());

        exception.ModuleType.Should().Be(typeof(FailingCompositionValidationModule));
        exception.Stage.Should().Be(PlatformModuleInitializationStage.CompositionValidation);
        exception.InnerException.Should().BeOfType<PlatformModuleCompositionException>();
        module.InternalInitCalled.Should().BeFalse("composition failures must stop before the module body runs");
        module.InitExecuted.Should().BeFalse("composition failures must not publish a ready state");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-LIFE-104")]
    public async Task InitializeAsync_WhenCalledRepeatedly_RunsTheModuleBodyOnlyOnce()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<CountingInitTestPlatformModule>(services, configuration);
        module.RegisterServices(services);

        await module.InitializeAsync();
        await module.InitializeAsync();

        module.InternalInitCallCount.Should().Be(1, "repeated startup calls must not repeat module-owned initialization");
        module.InitExecuted.Should().BeTrue();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-LIFE-105")]
    public async Task RootSeeding_WhenRepeated_ExecutesOnlyEachModuleOwnersDeclaredSeeders()
    {
        FirstOwnedSeeder.Reset();
        SecondOwnedSeeder.Reset();

        var (services, configuration) = NewHost();
        var firstModule = CreateModule<FirstSeederApplicationModule>(services, configuration);
        var secondModule = CreateModule<SecondSeederApplicationModule>(services, configuration);

        services.AddSingleton(firstModule);
        services.AddSingleton(secondModule);
        firstModule.RegisterServices(services);
        secondModule.RegisterServices(services);

        using var serviceProvider = services.BuildServiceProvider();

        using (var firstModuleScope = serviceProvider.CreateScope())
            await firstModule.SeedData(firstModuleScope);

        FirstOwnedSeeder.CallCount.Should().Be(1, "the first module must execute its declared seeder");
        SecondOwnedSeeder.CallCount.Should().Be(0, "the first module must not execute its sibling's seeder");

        FirstOwnedSeeder.Reset();
        SecondOwnedSeeder.Reset();

        await PlatformApplicationModule.SeedDependentModulesDataAsync(
            [typeof(FirstSeederApplicationModule), typeof(SecondSeederApplicationModule)],
            serviceProvider);
        await PlatformApplicationModule.SeedDependentModulesDataAsync(
            [typeof(FirstSeederApplicationModule), typeof(SecondSeederApplicationModule)],
            serviceProvider);

        FirstOwnedSeeder.CallCount.Should().Be(2, "the first application lane owns and reruns only its own seeder");
        SecondOwnedSeeder.CallCount.Should().Be(2, "the second application lane owns and reruns only its own seeder");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-LIFE-106")]
    public async Task InitializeAsync_WhenAChildModuleFails_ReportsTheParentDependencyStageWrappingTheChildStage()
    {
        var (services, _) = NewHost();
        services.RegisterModule<ParentOfFailingChildModule>();

        var serviceProvider = services.BuildServiceProvider();
        var parentModule = serviceProvider.GetRequiredService<ParentOfFailingChildModule>();

        var exception = await Assert.ThrowsAsync<PlatformModuleInitializationException>(() => parentModule.InitializeAsync());

        exception.ModuleType.Should().Be(typeof(ParentOfFailingChildModule));
        exception.Stage.Should().Be(PlatformModuleInitializationStage.DependencyInitialization);

        var childException = exception.InnerException.Should().BeOfType<PlatformModuleInitializationException>(
            "the child's typed failure must stay in the chain so host startup logs name the originating module and stage").Which;
        childException.ModuleType.Should().Be(typeof(FailingChildInitializationModule));
        childException.Stage.Should().Be(PlatformModuleInitializationStage.InternalInitialization);
        childException.InnerException.Should().BeOfType<InvalidOperationException>();

        parentModule.InitExecuted.Should().BeFalse("a parent whose dependency failed must not publish a ready state");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-LIFE-107")]
    public async Task SeedData_WithDefaultScanOwnership_RunsOnlySeedersDeclaredInTheScanningAssemblies()
    {
        ScanOwnedSeeder.Reset();

        var (services, configuration) = NewHost();
        var foreignSeeder = new Mock<IPlatformApplicationDataSeeder>();
        services.AddSingleton<IPlatformApplicationDataSeedingTracker, PlatformApplicationDataSeedingTracker>();
        services.AddScoped<IPlatformApplicationDataSeeder, ScanOwnedSeeder>();
        // A Moq proxy lives in a dynamic assembly, so it is a registered seeder that no scanning assembly declares.
        services.AddScoped(_ => foreignSeeder.Object);

        var module = CreateModule<DefaultScanOwnershipApplicationModule>(services, configuration);

        using var serviceProvider = services.BuildServiceProvider();
        using (var scope = serviceProvider.CreateScope())
            await module.SeedData(scope);

        ScanOwnedSeeder.CallCount.Should().Be(1, "a seeder declared in the module's scanning assembly is owned by default");
        foreignSeeder.Verify(
            seeder => seeder.SeedData(It.IsAny<bool>()),
            Times.Never(),
            "a registered seeder outside every scanning assembly belongs to another module");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-LIFE-108")]
    public async Task SeedData_WithBackgroundDelay_RunsTheOwnedExternalSeederOnceThroughTheTracker()
    {
        BackgroundOwnedSeeder.Reset();
        BackgroundForeignSeeder.Reset();

        var (services, configuration) = NewHost();
        services.AddScoped<IPlatformApplicationDataSeeder, BackgroundForeignSeeder>();
        services.AddScoped<BackgroundForeignSeeder>();

        // RegisterServices registers the tracker and, because the owned seeder is outside the (empty) scanning
        // assemblies, registers it as an explicit external seeder.
        CreateModule<BackgroundSeederApplicationModule>(services, configuration).RegisterServices(services);

        // The background path resolves each seeder from the module's own provider, so the module under test must be
        // created from the final service collection.
        var module = CreateModule<BackgroundSeederApplicationModule>(services, configuration);
        var tracker = module.ServiceProvider.GetRequiredService<IPlatformApplicationDataSeedingTracker>();

        using (var scope = module.ServiceProvider.CreateScope())
            await module.SeedData(scope);

        await tracker.WaitForCompletionAsync();

        BackgroundOwnedSeeder.CallCount.Should().Be(1, "the owned background seeder must run exactly once after its delay");
        BackgroundForeignSeeder.CallCount.Should().Be(0, "a delayed seeder owned by another module must not run");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-LIFE-109")]
    public async Task SeedData_WithANonConcreteSeederType_FailsWithArgumentException()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<InvalidSeederTypeApplicationModule>(services, configuration);

        using var serviceProvider = services.BuildServiceProvider();
        using var scope = serviceProvider.CreateScope();

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => module.SeedData(scope));

        exception.Message.Should().Contain(typeof(IPlatformApplicationDataSeeder).FullName)
            .And.Contain("must be a concrete implementation");
    }

    private static readonly Assembly SharedControllerAssembly = typeof(PlatformModuleContractTests).Assembly;
    private static readonly Assembly AdditionalControllerAssembly = typeof(PlatformAspNetCoreModule).Assembly;

    private sealed class FirstControllerModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : TestAspNetCoreModule(serviceProvider, configuration)
    {
        public override List<Assembly> GetAssembliesForControllerDiscovery() => [SharedControllerAssembly];
    }

    private sealed class SecondControllerModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : TestAspNetCoreModule(serviceProvider, configuration)
    {
        public override List<Assembly> GetAssembliesForControllerDiscovery() =>
            [SharedControllerAssembly, AdditionalControllerAssembly];
    }

    private abstract class TestAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : PlatformAspNetCoreModule(serviceProvider, configuration)
    {
        public override List<Assembly> GetAssembliesForServiceScanning() => [];

        protected override string[] GetAllowCorsOrigins(IConfiguration configuration) => ["https://localhost"];
    }

    private sealed class FailingInitializationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : PlatformModule(serviceProvider, configuration)
    {
        protected override Task InternalInit(IServiceScope serviceScope) =>
            Task.FromException(new InvalidOperationException("contract-test-internal-initialization-failure"));
    }

    private sealed class FailingCompositionValidationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : PlatformModule(serviceProvider, configuration)
    {
        public bool InternalInitCalled { get; private set; }

        protected override void ValidateComposition() =>
            throw new PlatformModuleCompositionException(["composition-contract-test-failure"]);

        protected override Task InternalInit(IServiceScope serviceScope)
        {
            InternalInitCalled = true;
            return Task.CompletedTask;
        }
    }

    public sealed class FailingChildInitializationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : PlatformModule(serviceProvider, configuration)
    {
        protected override Task InternalInit(IServiceScope serviceScope) =>
            Task.FromException(new InvalidOperationException("contract-test-child-initialization-failure"));
    }

    public sealed class ParentOfFailingChildModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : PlatformModule(serviceProvider, configuration)
    {
        public override List<Func<IConfiguration, Type>> GetDependentModuleTypes() => [_ => typeof(FailingChildInitializationModule)];
    }

    private sealed class DefaultScanOwnershipApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : TestSeederApplicationModule(serviceProvider, configuration)
    {
        // Does NOT override GetApplicationDataSeederTypes: ownership comes from the default scan, exactly as it does
        // for existing service application modules.
        public override List<Assembly> GetAssembliesForServiceScanning() => [typeof(PlatformModuleContractTests).Assembly];
    }

    private sealed class BackgroundSeederApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : TestSeederApplicationModule(serviceProvider, configuration)
    {
        protected override IReadOnlyCollection<Type> GetApplicationDataSeederTypes() => [typeof(BackgroundOwnedSeeder)];
    }

    private sealed class InvalidSeederTypeApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : TestSeederApplicationModule(serviceProvider, configuration)
    {
        protected override IReadOnlyCollection<Type> GetApplicationDataSeederTypes() => [typeof(IPlatformApplicationDataSeeder)];
    }

    private sealed class FirstSeederApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : TestSeederApplicationModule(serviceProvider, configuration)
    {
        protected override IReadOnlyCollection<Type> GetApplicationDataSeederTypes() => [typeof(FirstOwnedSeeder)];
    }

    private sealed class SecondSeederApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : TestSeederApplicationModule(serviceProvider, configuration)
    {
        protected override IReadOnlyCollection<Type> GetApplicationDataSeederTypes() => [typeof(SecondOwnedSeeder)];
    }

    private abstract class TestSeederApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : PlatformApplicationModule(serviceProvider, configuration)
    {
        protected override bool EnableDefaultCachingModule => false;
        protected override bool EnableAutomaticDataSeedingOnInit => false;

        public override bool AutoClearMemoryEnabled => false;

        public override List<Assembly> GetAssembliesForServiceScanning() => [];
    }

    public sealed class FirstOwnedSeeder : IPlatformApplicationDataSeeder
    {
        private static int callCount;

        public static int CallCount => callCount;

        public int SeedOrder => 0;
        public int DelaySeedingInBackgroundBySeconds => 0;

        public static void Reset() => Interlocked.Exchange(ref callCount, 0);

        public Task SeedData(bool isReplaceNewSeedData = false)
        {
            Interlocked.Increment(ref callCount);
            return Task.CompletedTask;
        }
    }

    public sealed class ScanOwnedSeeder : CountingSeeder
    {
        public static int CallCount => GetCallCount(typeof(ScanOwnedSeeder));

        public static void Reset() => ResetCallCount(typeof(ScanOwnedSeeder));
    }

    public sealed class BackgroundOwnedSeeder : CountingSeeder
    {
        public static int CallCount => GetCallCount(typeof(BackgroundOwnedSeeder));

        public override int DelaySeedingInBackgroundBySeconds => 1;

        public static void Reset() => ResetCallCount(typeof(BackgroundOwnedSeeder));
    }

    public sealed class BackgroundForeignSeeder : CountingSeeder
    {
        public static int CallCount => GetCallCount(typeof(BackgroundForeignSeeder));

        public override int DelaySeedingInBackgroundBySeconds => 1;

        public static void Reset() => ResetCallCount(typeof(BackgroundForeignSeeder));
    }

    /// <summary>
    /// Counts executions per concrete seeder type. The count is static because the platform resolves seeders from
    /// DI scopes it creates itself; each test resets the counters it asserts. Non-generic on purpose, so one
    /// dictionary serves every derived type.
    /// </summary>
    public abstract class CountingSeeder : IPlatformApplicationDataSeeder
    {
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<Type, int> CallCountsBySeederType = new();

        public int SeedOrder => 0;
        public virtual int DelaySeedingInBackgroundBySeconds => 0;

        protected static int GetCallCount(Type seederType) => CallCountsBySeederType.GetValueOrDefault(seederType);

        protected static void ResetCallCount(Type seederType) => CallCountsBySeederType[seederType] = 0;

        public Task SeedData(bool isReplaceNewSeedData = false)
        {
            CallCountsBySeederType.AddOrUpdate(GetType(), 1, (_, count) => count + 1);
            return Task.CompletedTask;
        }
    }

    public sealed class SecondOwnedSeeder : IPlatformApplicationDataSeeder
    {
        private static int callCount;

        public static int CallCount => callCount;

        public int SeedOrder => 0;
        public int DelaySeedingInBackgroundBySeconds => 0;

        public static void Reset() => Interlocked.Exchange(ref callCount, 0);

        public Task SeedData(bool isReplaceNewSeedData = false)
        {
            Interlocked.Increment(ref callCount);
            return Task.CompletedTask;
        }
    }
}
