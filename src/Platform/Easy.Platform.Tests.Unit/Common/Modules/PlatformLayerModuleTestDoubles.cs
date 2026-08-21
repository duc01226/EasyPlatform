using Easy.Platform.Application;
using Easy.Platform.Domain;
using Easy.Platform.Infrastructures.BackgroundJob;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Infrastructures.FileStorage;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Concrete stand-ins for the abstract LAYER module bases (application, domain, persistence,
/// message bus, background job, file storage).
/// <para>
/// Each platform layer base is abstract so that a host service supplies the concrete configuration.
/// These doubles supply the smallest legal implementation of the abstract members and nothing else,
/// so that anything a test observes comes from the LAYER BASE under test rather than from the double.
/// </para>
/// </summary>
public class ConcreteTestApplicationModule : PlatformApplicationModule
{
    public ConcreteTestApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }
}

/// <summary>Derives from a non-abstract application module, to exercise the ancestor-assembly rule.</summary>
public class DerivedFromConcreteTestApplicationModule : ConcreteTestApplicationModule
{
    public DerivedFromConcreteTestApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }
}

public class ConcreteTestDomainModule : PlatformDomainModule
{
    public ConcreteTestDomainModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }
}

public class ConcreteTestMessageBusModule : PlatformMessageBusModule
{
    public ConcreteTestMessageBusModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }
}

public class ConcreteTestBackgroundJobModule : PlatformBackgroundJobModule
{
    public ConcreteTestBackgroundJobModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }
}

public class ConcreteTestCachingModule : PlatformCachingModule
{
    public ConcreteTestCachingModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }
}

/// <summary>
/// Derives DIRECTLY from the PRODUCTION <see cref="PlatformCachingModule" /> — the only concrete
/// (non-abstract), non-generic module class in the platform's own assemblies — rather than from a
/// same-assembly test double. Used by
/// <see cref="PlatformLayerModuleContractTests.NonApplicationModule_WalksAncestorAssemblies_UpToTheFirstAbstractBase" />
/// to prove the ancestor-assembly walk in <see cref="PlatformModule.GetAssembliesForServiceScanning" /> genuinely
/// crosses an assembly boundary (Easy.Platform.Tests.Unit -> Easy.Platform) — the real-world scenario the walk
/// exists for, one service's module deriving from another service's concrete module.
/// </summary>
public class DerivedFromProductionCachingModule : PlatformCachingModule
{
    public DerivedFromProductionCachingModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }
}

public class ConcreteTestFileStorageModule : PlatformFileStorageModule
{
    public ConcreteTestFileStorageModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    protected override PlatformFileStorageOptions FileStorageOptionsProvider(IServiceProvider serviceProvider) => new();
}

/// <summary>
/// Smallest legal persistence module. The migration hooks are recorded rather than executed, so tests can
/// observe WHETHER the lifecycle reached them without needing a database.
/// </summary>
public class ConcreteTestPersistenceModule : PlatformPersistenceModule
{
    public ConcreteTestPersistenceModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    public int MigrateDataCallCount { get; private set; }
    public int InitializeDatabaseCallCount { get; private set; }

    public override Task MigrateDataAsync(IServiceScope serviceScope)
    {
        MigrateDataCallCount++;
        return Task.CompletedTask;
    }

    public override Task InitializeDatabaseAsync(IServiceScope serviceScope)
    {
        InitializeDatabaseCallCount++;
        return Task.CompletedTask;
    }
}
