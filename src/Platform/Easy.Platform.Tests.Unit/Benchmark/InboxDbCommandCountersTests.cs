using Easy.Platform.Benchmark.Inbox;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Benchmark;

public class InboxDbCommandCountersTests
{
    [Fact]
    public void CountCurrentCommands_WhenStageScopeIsActive_ShouldCountByProviderStageAndKind()
    {
        var counters = new InboxDbCommandCounters();

        using (counters.StartStage("create"))
        {
            InboxDbCommandCounters.CountCurrentEfCommand("reader");
            InboxDbCommandCounters.CountCurrentEfCommand("reader");
            InboxDbCommandCounters.CountCurrentMongoCommand("find");
        }

        counters.CountFor("ef", "create", "reader").Should().Be(2);
        counters.CountFor("mongo", "create", "command", "find").Should().Be(1);
        counters.Snapshot().Should().HaveCount(2);
    }

    [Fact]
    public void CountCurrentCommands_WhenNoStageScopeIsActive_ShouldIgnoreCommands()
    {
        var counters = new InboxDbCommandCounters();

        InboxDbCommandCounters.CountCurrentEfCommand("reader");
        InboxDbCommandCounters.CountCurrentMongoCommand("find");

        counters.Snapshot().Should().BeEmpty();
    }

    [Fact]
    public void StartStage_WhenNested_ShouldRestorePreviousStageOnDispose()
    {
        var counters = new InboxDbCommandCounters();

        using (counters.StartStage("outer"))
        {
            InboxDbCommandCounters.CountCurrentEfCommand("reader");

            using (counters.StartStage("inner"))
            {
                InboxDbCommandCounters.CountCurrentEfCommand("non_query");
            }

            InboxDbCommandCounters.CountCurrentEfCommand("scalar");
        }

        counters.CountFor("ef", "outer", "reader").Should().Be(1);
        counters.CountFor("ef", "inner", "non_query").Should().Be(1);
        counters.CountFor("ef", "outer", "scalar").Should().Be(1);
    }

    [Fact]
    public void PersistenceProjects_ExposeCommandCountingHooksForBenchmarks()
    {
        var efModuleSource = ReadRepositoryFile("src/Platform/Easy.Platform.EfCore/PlatformEfCorePersistenceModule.cs");
        var mongoOptionsSource = ReadRepositoryFile("src/Platform/Easy.Platform.MongoDB/PlatformMongoOptions.cs");
        var mongoClientSource = ReadRepositoryFile("src/Platform/Easy.Platform.MongoDB/PlatformMongoClient.cs");

        efModuleSource.Should().Contain("AddDbContextPool<TDbContext>(");
        efModuleSource.Should().Contain("(sp, o) => ConfigureDbContextOptionsBuilder(sp, o)");
        efModuleSource.Should().Contain("builder.AddInterceptors(interceptors)");
        efModuleSource.Should().NotContain("ConfigureDbContextOptionsBuilder(serviceCollection.BuildServiceProvider()");
        mongoOptionsSource.Should().Contain("Action<ClusterBuilder> ClusterConfigurator");
        mongoClientSource.Should().Contain("clientSettings.ClusterConfigurator = options.Value.ClusterConfigurator");
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
