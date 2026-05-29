using FluentAssertions;

namespace Easy.Platform.Tests.Unit.EfCore;

public class PlatformEfCoreBulkUpdateExtensionsTests
{
    [Fact]
    public void EfNativeExtension_IsProviderSpecificAndKeepsCoreInterfaceProviderNeutral()
    {
        var coreInterfaceSource = ReadRepositoryFile("src/Platform/Easy.Platform/Application/Persistence/IPlatformDbContext.cs");
        var extensionSource = ReadRepositoryFile("src/Platform/Easy.Platform.EfCore/BulkUpdate/PlatformEfCoreBulkUpdateExtensions.cs");

        coreInterfaceSource.Should().NotContain("SetPropertyCalls");
        coreInterfaceSource.Should().NotContain("UpdateDefinition");
        extensionSource.Should().Contain("SetPropertyCalls<TEntity>");
        extensionSource.Should().Contain("UpdateManyNativeAsync");
    }

    [Fact]
    public void EfNativeExtension_UsesSmartGateAndDirectOnlyExecution()
    {
        var extensionSource = ReadRepositoryFile("src/Platform/Easy.Platform.EfCore/BulkUpdate/PlatformEfCoreBulkUpdateExtensions.cs");
        var contextSource = ReadRepositoryFile("src/Platform/Easy.Platform.EfCore/PlatformEfCoreDbContext.cs");

        extensionSource.Should().Contain("EnsureProviderNativeDirectUpdateSupported");
        extensionSource.Should().Contain("ExecuteProviderNativeDirectUpdateManyAsync");
        contextSource.Should().Contain("Provider-native bulk update cannot run direct");
        contextSource.Should().Contain("PlatformBulkUpdateDirectGate.CanDirectUpdate");
        contextSource.Should().Contain("PlatformCqrsEntityEvent.IsAnyKindsOfEventHandlerRegisteredForEntity");
        contextSource.Should().NotContain("new TEntity().HasTrackValueUpdatedDomainEventAttribute()");
        contextSource.Should().NotContain("has TrackFieldUpdatedDomainEventAttribute and requires old values");
        contextSource.Should().Contain("PreserveExistingSemantics");
        contextSource.Should().Contain("IRowVersionEntity");
    }

    [Fact]
    public void EfFallbackUpdateMany_UsesBoundedAdaptivePaging()
    {
        var contextSource = ReadRepositoryFile("src/Platform/Easy.Platform.EfCore/PlatformEfCoreDbContext.cs");

        contextSource.Should().Contain("ExecuteAdaptiveSkipPagingAsync");
        contextSource.Should().Contain("ExecutionManyPageSize");
        contextSource.Should().Contain("ChangeTracker.Clear()");
        contextSource.Should().NotContain("this.As<IPlatformDbContext>().UpdateManyAsync<TEntity, TPrimaryKey>");
    }

    private static string ReadRepositoryFile(string relativePath)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory != null)
        {
            var candidatePath = Path.Combine(directory.FullName, relativePath);
            if (File.Exists(candidatePath))
                return File.ReadAllText(candidatePath);

            directory = directory.Parent;
        }

        throw new FileNotFoundException($"Could not find repository file '{relativePath}'.");
    }
}
