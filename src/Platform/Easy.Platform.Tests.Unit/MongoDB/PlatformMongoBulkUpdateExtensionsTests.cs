using FluentAssertions;

namespace Easy.Platform.Tests.Unit.MongoDB;

public class PlatformMongoBulkUpdateExtensionsTests
{
    [Fact]
    public void MongoNativeExtension_IsProviderSpecificAndKeepsCoreInterfaceProviderNeutral()
    {
        var coreInterfaceSource = ReadRepositoryFile("src/Platform/Easy.Platform/Application/Persistence/IPlatformDbContext.cs");
        var extensionSource = ReadRepositoryFile("src/Platform/Easy.Platform.MongoDB/BulkUpdate/PlatformMongoBulkUpdateExtensions.cs");

        coreInterfaceSource.Should().NotContain("SetPropertyCalls");
        coreInterfaceSource.Should().NotContain("UpdateDefinition<TEntity>");
        extensionSource.Should().Contain("UpdateDefinition<TEntity>");
        extensionSource.Should().Contain("UpdateManyNativeAsync");
    }

    [Fact]
    public void MongoNativeExtension_UsesSmartGateAndDirectOnlyExecution()
    {
        var extensionSource = ReadRepositoryFile("src/Platform/Easy.Platform.MongoDB/BulkUpdate/PlatformMongoBulkUpdateExtensions.cs");
        var contextSource = ReadRepositoryFile("src/Platform/Easy.Platform.MongoDB/PlatformMongoDbContext.cs");

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
    public void MongoFallbackUpdateMany_UsesBoundedAdaptivePaging()
    {
        var contextSource = ReadRepositoryFile("src/Platform/Easy.Platform.MongoDB/PlatformMongoDbContext.cs");

        contextSource.Should().Contain("ExecuteAdaptiveSkipPagingAsync");
        contextSource.Should().Contain("ExecutionManyPageSize");
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
