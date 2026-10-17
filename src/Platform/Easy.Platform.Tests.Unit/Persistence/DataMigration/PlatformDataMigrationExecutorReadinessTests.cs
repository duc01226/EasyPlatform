using Easy.Platform.Application.Persistence;
using Easy.Platform.Common;
using Easy.Platform.Persistence.DataMigration;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Easy.Platform.Tests.Unit.Persistence.DataMigration;

/// <summary>
/// Protects selection of pending work: transient absence must neither retire a migration nor block ready successors.
/// Exercises the real selector with isolated history inputs, without running any one-time migration body.
/// </summary>
public sealed class PlatformDataMigrationExecutorReadinessTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("TechnicalSpec", "DataMigrationReadinessDefersWithoutRetiring")]
    public async Task Selection_OnlyIncludesReadyCandidates_WithoutExecutingOrChangingHistory(bool isReady)
    {
        using var fixture = new SelectionFixture();
        fixture.State.IsReady = isReady;

        var selected = await fixture.SelectAsync();

        selected.Select(migration => migration.Name).Should().Equal(
            isReady ? ["0001_Conditional", "0002_Foreground", "0003_Background"] : ["0002_Foreground", "0003_Background"]);
        fixture.State.ReadinessChecks.Should().Be(1);
        fixture.State.DeferredDisposals.Should().Be(isReady ? 0 : 1);
        fixture.AssertNoExecutionOrHistoryMutation();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("TechnicalSpec", "DataMigrationReadinessReevaluatesOnNextSelection")]
    public async Task Selection_RechecksPendingWorkAfterPrerequisitesArrive(bool hasPreviousFailure)
    {
        using var fixture = new SelectionFixture();
        fixture.State.IsReady = false;
        if (hasPreviousFailure)
            fixture.History.Add(new PlatformDataMigrationHistory("0001_Conditional") { Status = PlatformDataMigrationHistory.Statuses.SkipFailed });

        var deferred = await fixture.SelectAsync();
        fixture.State.IsReady = true;
        var ready = await fixture.SelectAsync();

        deferred.Should().NotContain(migration => migration.Name == "0001_Conditional");
        ready.Select(migration => migration.Name).Should().Equal("0001_Conditional", "0002_Foreground", "0003_Background");
        fixture.State.ReadinessChecks.Should().Be(2);
        fixture.History.Should().HaveCount(hasPreviousFailure ? 2 : 1);
        if (hasPreviousFailure)
            fixture.History.Single(row => row.Name == "0001_Conditional").Status.Should().Be(PlatformDataMigrationHistory.Statuses.SkipFailed);
        fixture.AssertNoExecutionOrHistoryMutation();
    }

    [Fact]
    [Trait("TechnicalSpec", "DataMigrationReadinessPreservesReadySuccessors")]
    public async Task Selection_ExcludesDeferredPredecessorsBeforeBuildingEitherExecutionCohort()
    {
        using var fixture = new SelectionFixture();
        fixture.State.IsReady = false;

        var selected = await fixture.SelectAsync();

        selected.Where(migration => !migration.AllowRunInBackgroundThread).Select(migration => migration.Name)
            .Should().Equal("0002_Foreground");
        selected.Where(migration => migration.AllowRunInBackgroundThread).Select(migration => migration.Name)
            .Should().Equal("0003_Background");
        fixture.AssertNoExecutionOrHistoryMutation();
    }

    [Fact]
    [Trait("TechnicalSpec", "DataMigrationReadinessDefaultsToLegacyEligibility")]
    public async Task Selection_KeepsMigrationsWithoutAReadinessOverrideInTheirExistingOrder()
    {
        using var fixture = new SelectionFixture();
        fixture.State.IsIgnored = true;
        fixture.State.ForegroundName = "0009_Foreground";
        fixture.State.BackgroundName = "0001_Background";

        var selected = await fixture.SelectAsync();

        selected.Select(migration => migration.Name).Should().Equal("0001_Background", "0009_Foreground");
        fixture.State.ReadinessChecks.Should().Be(0);
        fixture.AssertNoExecutionOrHistoryMutation();
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData(PlatformDataMigrationHistory.Statuses.Processed, false)]
    [InlineData(PlatformDataMigrationHistory.Statuses.Processing, false)]
    [InlineData(PlatformDataMigrationHistory.Statuses.New, true)]
    [InlineData(PlatformDataMigrationHistory.Statuses.Failed, true)]
    [InlineData(PlatformDataMigrationHistory.Statuses.SkipFailed, true)]
    [Trait("TechnicalSpec", "DataMigrationReadinessPreservesStaticFilters")]
    public async Task Selection_ChecksReadinessOnlyForHistoryEligibleWork(PlatformDataMigrationHistory.Statuses? status, bool shouldSelect)
    {
        using var fixture = new SelectionFixture();
        var row = new PlatformDataMigrationHistory("0001_Conditional") { Status = status, LastProcessingPingTime = DateTime.UtcNow };
        fixture.History.Add(row);

        var selected = await fixture.SelectAsync();

        selected.Any(migration => migration.Name == row.Name).Should().Be(shouldSelect);
        fixture.State.ReadinessChecks.Should().Be(shouldSelect ? 1 : 0);
        row.Status.Should().Be(status);
        fixture.AssertNoExecutionOrHistoryMutation();
    }

    [Fact]
    [Trait("TechnicalSpec", "DataMigrationReadinessPreservesStaticFilters")]
    public async Task Selection_StillRetriesAStaleProcessingLease()
    {
        using var fixture = new SelectionFixture();
        fixture.History.Add(new PlatformDataMigrationHistory("0001_Conditional")
        {
            Status = PlatformDataMigrationHistory.Statuses.Processing,
            LastProcessingPingTime = DateTime.UtcNow.AddDays(-1)
        });

        var selected = await fixture.SelectAsync();

        selected.Should().Contain(migration => migration.Name == "0001_Conditional");
        fixture.State.ReadinessChecks.Should().Be(1);
        fixture.AssertNoExecutionOrHistoryMutation();
    }

    [Theory]
    [InlineData("expired", false)]
    [InlineData("ignored", false)]
    [InlineData("created-after-cutoff", false)]
    [InlineData("created-on-cutoff", true)]
    [Trait("TechnicalSpec", "DataMigrationReadinessPreservesStaticFilters")]
    public async Task Selection_PreservesDateExpirationAndIgnoreRulesBeforeDependencyQueries(string condition, bool shouldSelect)
    {
        using var fixture = new SelectionFixture();
        fixture.State.IsIgnored = condition == "ignored";
        fixture.State.ExpirationDate = condition == "expired" ? DateTime.UtcNow.AddDays(-1) : null;
        fixture.State.Cutoff = condition switch
        {
            "created-after-cutoff" => SelectionFixture.InitializedDate.AddDays(-1),
            "created-on-cutoff" => SelectionFixture.InitializedDate,
            _ => null
        };

        var selected = await fixture.SelectAsync();

        selected.Any(migration => migration.Name == "0001_Conditional").Should().Be(shouldSelect);
        fixture.State.ReadinessChecks.Should().Be(shouldSelect ? 1 : 0);
        fixture.AssertNoExecutionOrHistoryMutation();
    }

    [Fact]
    [Trait("TechnicalSpec", "DataMigrationReadinessDoesNotSwallowDependencyFailure")]
    public async Task Selection_PropagatesDependencyFailureRatherThanTreatingItAsAbsence()
    {
        using var fixture = new SelectionFixture();
        var failure = new InvalidOperationException("readiness dependency unavailable");
        fixture.State.Failure = failure;

        var select = () => fixture.SelectAsync();

        (await select.Should().ThrowAsync<InvalidOperationException>()).Which.Should().BeSameAs(failure);
        fixture.AssertNoExecutionOrHistoryMutation();
    }

    [Fact]
    [Trait("TechnicalSpec", "DataMigrationReadinessAwaitsPredicate")]
    public async Task Selection_WaitsForTheActualAsyncPrerequisiteOutcome()
    {
        using var fixture = new SelectionFixture();
        fixture.State.ReadinessCompletion = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);

        var selection = fixture.SelectAsync();

        fixture.State.ReadinessChecks.Should().Be(1);
        selection.IsCompleted.Should().BeFalse("selection cannot build a chain before the prerequisite query completes");
        fixture.State.ReadinessCompletion.SetResult(false);
        var selected = await selection;
        selected.Should().NotContain(migration => migration.Name == "0001_Conditional");
        fixture.AssertNoExecutionOrHistoryMutation();
    }

    [Fact]
    [Trait("TechnicalSpec", "DataMigrationReadinessRetainsUniqueNameGuard")]
    public async Task Selection_RejectsDuplicateEligibleNamesBeforeReadinessCanHideThem()
    {
        using var fixture = new SelectionFixture();
        fixture.State.HasDuplicateName = true;
        fixture.State.IsReady = false;

        var select = () => fixture.SelectAsync();

        await select.Should().ThrowAsync<Exception>().WithMessage("*Names is duplicated*0002_Foreground*");
        fixture.State.ReadinessChecks.Should().Be(0);
        fixture.AssertNoExecutionOrHistoryMutation();
    }

    [Fact]
    [Trait("TechnicalSpec", "DataMigrationReadinessRetainsUniqueNameGuard")]
    public async Task Selection_AllowsAnEmptyReadySetWithoutRetiringDeferredWork()
    {
        using var fixture = new SelectionFixture();
        fixture.State.IsReady = false;
        fixture.State.AreSuccessorsIgnored = true;

        var selected = await fixture.SelectAsync();

        selected.Should().BeEmpty();
        fixture.State.ReadinessChecks.Should().Be(1);
        fixture.AssertNoExecutionOrHistoryMutation();
    }

    public interface IReadinessDbContext : IPlatformDbContext;

    public sealed class ReadinessState
    {
        public bool IsReady { get; set; } = true;
        public bool IsIgnored { get; set; }
        public bool AreSuccessorsIgnored { get; set; }
        public bool HasDuplicateName { get; set; }
        public string ForegroundName { get; set; } = "0002_Foreground";
        public string BackgroundName { get; set; } = "0003_Background";
        public DateTime? Cutoff { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public Exception? Failure { get; set; }
        public TaskCompletionSource<bool>? ReadinessCompletion { get; set; }
        public int ReadinessChecks { get; set; }
        public int BodyCalls { get; set; }
        public int DeferredDisposals { get; set; }
    }

    public abstract class TestMigration(IPlatformRootServiceProvider rootServiceProvider, ReadinessState state)
        : PlatformDataMigrationExecutor<IReadinessDbContext>(rootServiceProvider)
    {
        protected ReadinessState State { get; } = state;
        public override DateTime? OnlyForDbsCreatedBeforeDate => null;

        protected override Task InternalExecute(IReadinessDbContext dbContext)
        {
            State.BodyCalls++;
            return Task.CompletedTask;
        }
    }

    public sealed class ConditionalMigration(IPlatformRootServiceProvider rootServiceProvider, ReadinessState state)
        : TestMigration(rootServiceProvider, state)
    {
        public override string Name => State.HasDuplicateName ? "0002_Foreground" : "0001_Conditional";
        public override bool Ignored => State.IsIgnored;
        public override DateTime? OnlyForDbsCreatedBeforeDate => State.Cutoff;
        public override DateTime? ExpirationDate => State.ExpirationDate;

        protected override Task<bool> IsReadyToExecuteAsync()
        {
            State.ReadinessChecks++;
            if (State.Failure != null) throw State.Failure;
            return State.ReadinessCompletion?.Task ?? Task.FromResult(State.IsReady);
        }

        protected override void Dispose(bool disposing)
        {
            if (!Disposed) State.DeferredDisposals++;
            base.Dispose(disposing);
        }
    }

    public sealed class ForegroundMigration(IPlatformRootServiceProvider rootServiceProvider, ReadinessState state)
        : TestMigration(rootServiceProvider, state)
    {
        public override string Name => State.ForegroundName;
        public override bool Ignored => State.AreSuccessorsIgnored;
    }

    public sealed class BackgroundMigration(IPlatformRootServiceProvider rootServiceProvider, ReadinessState state)
        : TestMigration(rootServiceProvider, state)
    {
        public override string Name => State.BackgroundName;
        public override bool Ignored => State.AreSuccessorsIgnored;
        public override bool AllowRunInBackgroundThread => true;
    }

    private sealed class SelectionFixture : IDisposable
    {
        public static readonly DateTime InitializedDate = new(2020, 1, 2, 0, 0, 0, DateTimeKind.Utc);
        private readonly Mock<IReadinessDbContext> context = new(MockBehavior.Strict);
        private readonly ServiceProvider serviceProvider;

        public SelectionFixture()
        {
            History.Add(new PlatformDataMigrationHistory(PlatformDataMigrationHistory.DefaultDbInitializedMigrationHistoryName)
            {
                CreatedDate = InitializedDate,
                Status = PlatformDataMigrationHistory.Statuses.Processed
            });
            context.Setup(db => db.DataMigrationHistoryQuery()).Returns(() => History.AsQueryable());
            context.Setup(db => db.FirstAsync(It.IsAny<IQueryable<DateTime>>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((IQueryable<DateTime> query, CancellationToken _) => query.First());
            context.Setup(db => db.GetAllAsync(It.IsAny<IQueryable<string>>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((IQueryable<string> query, CancellationToken _) => query.ToList());
            serviceProvider = new ServiceCollection()
                .AddSingleton<IPlatformRootServiceProvider>(Mock.Of<IPlatformRootServiceProvider>())
                .AddSingleton(State)
                .BuildServiceProvider();
        }

        public ReadinessState State { get; } = new();
        public List<PlatformDataMigrationHistory> History { get; } = [];

        public Task<List<PlatformDataMigrationExecutor<IReadinessDbContext>>> SelectAsync() =>
            PlatformDataMigrationExecutor<IReadinessDbContext>.GetCanExecuteDataMigrationExecutors(
                typeof(PlatformDataMigrationExecutorReadinessTests).Assembly,
                serviceProvider,
                context.Object,
                PlatformDataMigrationHistory.DefaultDbInitializedMigrationHistoryName);

        public void AssertNoExecutionOrHistoryMutation()
        {
            State.BodyCalls.Should().Be(0);
            History[0].CreatedDate.Should().Be(InitializedDate);
            History[0].Status.Should().Be(PlatformDataMigrationHistory.Statuses.Processed);
            context.Verify(db => db.DataMigrationHistoryQuery(), Times.AtLeastOnce);
            context.Verify(db => db.FirstAsync(It.IsAny<IQueryable<DateTime>>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
            context.Verify(db => db.GetAllAsync(It.IsAny<IQueryable<string>>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
            context.VerifyNoOtherCalls();
        }

        public void Dispose() => serviceProvider.Dispose();
    }
}
