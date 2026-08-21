using Easy.Platform.Application.BackgroundJob;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Tests.Unit.TestInfrastructure;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Easy.Platform.Tests.Unit.Infrastructures.BackgroundJob;

/// <summary>
/// Guards <see cref="PlatformApplicationPagedBackgroundJobExecutor{TParam}" /> — the fan-out job that turns one
/// "process everything" run into N independently-scheduled page jobs.
/// <para>
/// <b>Invariants guarded:</b>
/// (1) the branch decision — a param carrying Skip/Take is a PAGE run and must process that page directly, while a
/// missing/empty param is the MASTER run and must only schedule page jobs. Getting this backwards either processes
/// nothing or fans out infinitely;
/// (2) the page arithmetic — how many page jobs a given item count produces, including the exactly-one-full-page and
/// zero-item boundaries where an off-by-one silently drops or duplicates a page of records.
/// </para>
/// </summary>
public sealed class PlatformApplicationPagedBackgroundJobExecutorTests : IDisposable
{
    private readonly RecordingLoggerFactory loggerFactory = new();
    private readonly Mock<IPlatformApplicationBackgroundJobScheduler> scheduler = new();
    private readonly TestApplicationSettingContext settingContext = new();
    private readonly Mock<IPlatformUnitOfWork> unitOfWork = new();
    private readonly Mock<IPlatformUnitOfWorkManager> unitOfWorkManager = new();

    private readonly ServiceProvider serviceProvider;

    public PlatformApplicationPagedBackgroundJobExecutorTests()
    {
        unitOfWork.Setup(uow => uow.CompleteAsync(It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        unitOfWorkManager.Setup(manager => manager.Begin(It.IsAny<bool>())).Returns(unitOfWork.Object);
        unitOfWorkManager
            .Setup(manager => manager.ExecuteUowTask(It.IsAny<Func<Task>>(), It.IsAny<bool>()))
            .Returns<Func<Task>, bool>((taskFn, _) => taskFn());
        unitOfWorkManager.Setup(manager => manager.TryCurrentActiveUowSaveChangesAsync()).Returns(Task.CompletedTask);

        // Dead-setup fix: production's ScheduleProcessPagedAsync (PlatformApplicationPagedBackgroundJobExecutor.cs:61-65)
        // always calls the generic `Schedule<TJobExecutorParam>` with TJobExecutorParam bound to the PAGING ENVELOPE
        // `PlatformApplicationPagedBackgroundJobParam<PagedTestParam>`, never to `PagedTestParam` directly. Moq resolves
        // a lambda-based Setup to one specific closed generic method at the call site, so the previous
        // `It.IsAny<PagedTestParam>()` setup bound to `Schedule<PagedTestParam>` — a generic instantiation production
        // never invokes — and was never actually hit; every test still passed only because Moq auto-mocks unconfigured
        // Task<T>-returning calls as a completed task with a default(T) result. Binding the envelope type here makes the
        // setup real and gives every test a deterministic, non-null "scheduled-job-id" without needing its own override.
        scheduler
            .Setup(sched => sched.Schedule(It.IsAny<Type>(), It.IsAny<PlatformApplicationPagedBackgroundJobParam<PagedTestParam>>(), It.IsAny<DateTimeOffset>()))
            .ReturnsAsync("scheduled-job-id");

        serviceProvider = BackgroundJobTestHarness.BuildServiceProvider(
            settingContext,
            configure: services =>
            {
                services.AddSingleton(unitOfWorkManager.Object);
                services.AddSingleton(scheduler.Object);
            });
    }

    public void Dispose()
    {
        serviceProvider.Dispose();
    }

    // TC-PLATJOB-027: the default page size is 100 — the value every derived paged job inherits unless it opts out.
    //
    // Mutation-survivor fix: the original version of this test read `CreateJob().ExposedPageSize`, i.e. PagedTestJob's
    // OWN `PageSize => ConfiguredPageSize` override, whose field initializer is `= 100` — a double asserting its own
    // default, not production's. Changing `PlatformApplicationPagedBackgroundJobExecutor<TParam>.PageSize` (production
    // Application/BackgroundJob/PlatformApplicationPagedBackgroundJobExecutor.cs:23) from `=> 100` to any other value
    // would leave that assertion green. PlainPagedTestJob below overrides nothing, so it reads the production default.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-027")]
    public void PageSize_DefaultsTo100()
    {
        new PlainPagedTestJob(unitOfWorkManager.Object, loggerFactory, serviceProvider, scheduler.Object)
            .ExposedPageSize.Should().Be(100, "the base class' own default must be 100 unless a derived job opts out");
    }

    // TC-PLATJOB-028: a param carrying Skip/Take is a PAGE run — it processes that exact page and schedules nothing.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-028")]
    public void ProcessAsync_WithSkipAndTakeSupplied_ProcessesThatExactPageAndSchedulesNoFurtherJobs()
    {
        var job = CreateJob();
        var innerParam = new PagedTestParam { Payload = "TC-PLATJOB-028" };

        job.Execute(new PlatformApplicationPagedBackgroundJobParam<PagedTestParam> { Skip = 200, Take = 50, Param = innerParam });

        job.ProcessedPages.Should().ContainSingle();
        job.ProcessedPages[0].SkipCount.Should().Be(200);
        job.ProcessedPages[0].PageSize.Should().Be(50);
        job.ProcessedPages[0].Param.Should().BeSameAs(innerParam, "the caller's own parameter must survive the page hand-off unchanged");

        // Same-shape fix as the constructor Setup above (:42-49): production's ScheduleProcessPagedAsync
        // (PlatformApplicationPagedBackgroundJobExecutor.cs:61-65) always calls the generic `Schedule<TJobExecutorParam>`
        // with TJobExecutorParam bound to the PAGING ENVELOPE `PlatformApplicationPagedBackgroundJobParam<PagedTestParam>`,
        // never to `PagedTestParam` directly. Moq resolves a lambda-based Verify to one specific closed generic method at
        // the call site, so `It.IsAny<PagedTestParam>()` bound to `Schedule<PagedTestParam>` — an instantiation production
        // never invokes — making this `Times.Never` vacuously true no matter how many times the page branch actually
        // fanned out. Binding the envelope type here makes the assertion falsifiable again.
        scheduler.Verify(
            sched => sched.Schedule(It.IsAny<Type>(), It.IsAny<PlatformApplicationPagedBackgroundJobParam<PagedTestParam>>(), It.IsAny<DateTimeOffset>()),
            Times.Never,
            "a page run must never fan out again — that is what turns a paged job into an infinite scheduling loop");

        unitOfWork.Verify(uow => uow.CompleteAsync(It.IsAny<CancellationToken>()), Times.Once, "the page's own unit of work must be committed");
    }

    // TC-PLATJOB-028: page arithmetic across the boundaries where an off-by-one drops or duplicates a page.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATJOB-028")]
    [InlineData(0, 10, new[] { 0 })]
    [InlineData(10, 10, new[] { 0 })]
    [InlineData(11, 10, new[] { 0, 10 })]
    [InlineData(25, 10, new[] { 0, 10, 20 })]
    [InlineData(30, 10, new[] { 0, 10, 20 })]
    public void ProcessAsync_AsMasterRun_SchedulesOnePageJobPerPageWithTheExpectedSkipOffsets(int maxItemsCount, int pageSize, int[] expectedSkipOffsets)
    {
        var scheduledParams = new List<PlatformApplicationPagedBackgroundJobParam<PagedTestParam>>();
        scheduler
            .Setup(sched => sched.Schedule(It.IsAny<Type>(), It.IsAny<PlatformApplicationPagedBackgroundJobParam<PagedTestParam>>(), It.IsAny<DateTimeOffset>()))
            .Callback<Type, PlatformApplicationPagedBackgroundJobParam<PagedTestParam>, DateTimeOffset>((_, scheduledParam, _) => scheduledParams.Add(scheduledParam))
            .ReturnsAsync("scheduled-job-id");

        var job = CreateJob();
        job.ConfiguredPageSize = pageSize;
        job.ConfiguredMaxItemsCount = maxItemsCount;

        job.Execute(new PlatformApplicationPagedBackgroundJobParam<PagedTestParam>());

        job.ProcessedPages.Should().BeEmpty("the master run only schedules — it must not process records itself");

        scheduledParams.Select(scheduled => scheduled.Skip).Should().Equal(
            expectedSkipOffsets.Select(offset => (int?)offset),
            "each scheduled page job must cover a distinct, contiguous, non-overlapping slice");
        scheduledParams.Should().OnlyContain(scheduled => scheduled.Take == pageSize);

        // Zero items still produces ONE page job: the pager is a do/while (Util.Pager.cs:30-38), so the first page is
        // always dispatched before the count is consulted. Pinned deliberately — a future "skip the empty case"
        // optimisation changes observable scheduling behavior and must be a conscious decision, not a silent drift.
        scheduledParams.Should().NotBeEmpty();
    }

    // TC-PLATJOB-029: a null param is treated as the master run, exactly like an empty Skip/Take param.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-029")]
    public void ProcessAsync_WithNullParam_TakesTheSameMasterRunPathAsAnEmptyParam()
    {
        var job = CreateJob();
        job.ConfiguredPageSize = 10;
        job.ConfiguredMaxItemsCount = 25;

        job.Execute();

        job.ProcessedPages.Should().BeEmpty();
        scheduler.Verify(
            sched => sched.Schedule(It.IsAny<Type>(), It.IsAny<PlatformApplicationPagedBackgroundJobParam<PagedTestParam>>(), It.IsAny<DateTimeOffset>()),
            Times.Exactly(3),
            "a parameterless recurring trigger must fan out identically to an explicitly empty param");
        job.MaxItemsCountReceivedParams.Should().ContainSingle().Which.Should().BeNull(
            "the null param must be passed through to MaxItemsCount rather than substituted with an empty instance");
    }

    // TC-PLATJOB-029: the non-generic paged executor is the object?-parameterised one.
    //
    // Honesty note: both assertions below are compile-time-guaranteed by the class declaration
    // (`PlatformApplicationPagedBackgroundJobExecutor : PlatformApplicationPagedBackgroundJobExecutor<object?>`) —
    // this test catches no RUNTIME defect and needs editing the moment that declaration legitimately changes. Kept as
    // an explicit, discoverable trip-wire for that hierarchy rather than for its own sake.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-029")]
    public void NonGenericPagedExecutor_IsTheNullableObjectParameterisedExecutor()
    {
        typeof(PlatformApplicationPagedBackgroundJobExecutor)
            .Should().BeDerivedFrom<PlatformApplicationPagedBackgroundJobExecutor<object?>>();

        typeof(PlatformApplicationPagedBackgroundJobExecutor<object?>)
            .Should().BeDerivedFrom<PlatformApplicationBackgroundJobExecutor<PlatformApplicationPagedBackgroundJobParam<object?>>>(
                "the paged executor wraps the caller's param in a paging envelope");
    }

    private PagedTestJob CreateJob()
    {
        return new PagedTestJob(unitOfWorkManager.Object, loggerFactory, serviceProvider, scheduler.Object);
    }

    #region Test doubles

    internal sealed class PagedTestParam
    {
        public string Payload { get; init; } = string.Empty;
    }

    internal sealed record ProcessedPage(int? SkipCount, int? PageSize, PagedTestParam? Param);

    private sealed class PagedTestJob : PlatformApplicationPagedBackgroundJobExecutor<PagedTestParam>
    {
        public PagedTestJob(
            IPlatformUnitOfWorkManager unitOfWorkManager,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler)
            : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
        {
        }

        public int ConfiguredPageSize { get; set; } = 100;

        public int ConfiguredMaxItemsCount { get; set; }

        public List<ProcessedPage> ProcessedPages { get; } = [];

        public List<PlatformApplicationPagedBackgroundJobParam<PagedTestParam>?> MaxItemsCountReceivedParams { get; } = [];

        public int ExposedPageSize => PageSize;

        protected override int PageSize => ConfiguredPageSize;

        protected override Task ProcessPagedAsync(
            int? skipCount,
            int? pageSize,
            PagedTestParam param,
            IServiceProvider serviceProvider,
            IPlatformUnitOfWorkManager uowManager)
        {
            ProcessedPages.Add(new ProcessedPage(skipCount, pageSize, param));
            return Task.CompletedTask;
        }

        protected override Task<int> MaxItemsCount(PlatformApplicationPagedBackgroundJobParam<PagedTestParam> pagedParam)
        {
            MaxItemsCountReceivedParams.Add(pagedParam);
            return Task.FromResult(ConfiguredMaxItemsCount);
        }
    }

    /// <summary>
    /// Overrides NOTHING except the two members the base class declares <c>abstract</c> (so it compiles). Used only to
    /// read the base class' own default <see cref="PlatformApplicationPagedBackgroundJobExecutor{TParam}.PageSize" />
    /// rather than a double's overridden field — see <see cref="PageSize_DefaultsTo100" />.
    /// </summary>
    private sealed class PlainPagedTestJob : PlatformApplicationPagedBackgroundJobExecutor<PagedTestParam>
    {
        public PlainPagedTestJob(
            IPlatformUnitOfWorkManager unitOfWorkManager,
            ILoggerFactory loggerFactory,
            IServiceProvider serviceProvider,
            IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler)
            : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
        {
        }

        public int ExposedPageSize => PageSize;

        protected override Task ProcessPagedAsync(
            int? skipCount,
            int? pageSize,
            PagedTestParam param,
            IServiceProvider serviceProvider,
            IPlatformUnitOfWorkManager uowManager)
        {
            return Task.CompletedTask;
        }

        protected override Task<int> MaxItemsCount(PlatformApplicationPagedBackgroundJobParam<PagedTestParam> pagedParam)
        {
            return Task.FromResult(0);
        }
    }

    #endregion
}
