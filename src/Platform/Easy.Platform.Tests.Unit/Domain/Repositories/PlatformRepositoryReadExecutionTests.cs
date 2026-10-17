using System.Linq.Expressions;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Persistence;
using Easy.Platform.Persistence.Domain;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Easy.Platform.Tests.Unit.Domain.Repositories;

/// <summary>
/// Technical read-execution contracts, TC-PLATREPO-110..116. Exercise the actual shared base methods;
/// provider queries are substituted only at the abstract provider boundary. A read must execute once,
/// preserve its failure/cancellation and release only an acquired lock. No business Feature Spec applies.
/// </summary>
public class PlatformRepositoryReadExecutionTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(3)]
    [Trait("TechnicalSpec", "TC-PLATREPO-110")]
    public async Task CountRawQuery_DelegatesSameFilteredQueryAndTokenToProviderOnce(int count)
    {
        using var provider = BuildProvider();
        var repository = CreateRepository(provider);
        using var cancellation = new CancellationTokenSource();
        var query = Enumerable.Range(0, count + 2).Select(index => new ReadEntity { Id = index.ToString() })
            .AsQueryable().Where(entity => entity.Id != "0" && entity.Id != "1");
        var facade = RawCountCall(query, cancellation.Token);
        var entries = 0;
        // A broken self-dispatch fails safely instead of terminating the test process with StackOverflow.
        repository.Setup(facade)
            .Callback(() =>
            {
                if (++entries > 1) throw new InvalidOperationException("Raw count recursively dispatched to itself.");
            }).CallBase();
        repository.Setup(instance => instance.CountAsync<ReadEntity>(query, cancellation.Token))
            .ReturnsAsync(() => query.Count());

        var result = await facade.Compile()(repository.Object);

        result.Should().Be(count);
        entries.Should().Be(1);
        repository.Verify(instance => instance.CountAsync<ReadEntity>(query, cancellation.Token), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-110")]
    public async Task CountRawQuery_PreservesProviderCancellation()
    {
        using var provider = BuildProvider();
        var repository = CreateRepository(provider);
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();
        var query = Array.Empty<ReadEntity>().AsQueryable();
        var facade = RawCountCall(query, cancellation.Token);
        var entries = 0;
        repository.Setup(facade)
            .Callback(() =>
            {
                if (++entries > 1) throw new InvalidOperationException("Recursive count.");
            }).CallBase();
        repository.Setup(instance => instance.CountAsync<ReadEntity>(query, cancellation.Token))
            .Returns(() => Task.FromCanceled<int>(cancellation.Token));

        var action = () => facade.Compile()(repository.Object);
        var failure = await action.Should().ThrowAsync<OperationCanceledException>();

        failure.Which.CancellationToken.Should().Be(cancellation.Token);
        entries.Should().Be(1);
        repository.Verify(instance => instance.CountAsync<ReadEntity>(query, cancellation.Token), Times.Once);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-111")]
    public async Task NonparallelRead_AcquiresExecutesAndReleasesOnce()
    {
        using var provider = BuildProvider();
        var repository = CreateRepository(provider).Object;
        var uow = CreateUow();
        var calls = 0;

        var result = await repository.ReadAsync(uow.Object, _ => Task.FromResult(++calls));

        result.Should().Be(1);
        calls.Should().Be(1);
        uow.Verify(instance => instance.LockAsync(), Times.Once);
        uow.Verify(instance => instance.ReleaseLock(), Times.Once);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("TechnicalSpec", "TC-PLATREPO-112")]
    public async Task FailedRead_PreservesOriginalFailureWithoutReplayingAndReleasesLock(bool canceled)
    {
        using var provider = BuildProvider();
        var repository = CreateRepository(provider).Object;
        var uow = CreateUow();
        using var cancellation = new CancellationTokenSource();
        await cancellation.CancelAsync();
        Exception expected = canceled ? new OperationCanceledException(cancellation.Token) : new InvalidOperationException("Provider failed.");
        var calls = 0;

        var action = () => repository.ReadAsync<int>(uow.Object, _ =>
        {
            calls++;
            return Task.FromException<int>(expected);
        });
        var failure = await action.Should().ThrowAsync<Exception>();

        failure.Which.Should().BeSameAs(expected);
        calls.Should().Be(1, "an implicit unlocked retry can duplicate work and hides the first failure");
        uow.Verify(instance => instance.ReleaseLock(), Times.Once);
        (await repository.ReadAsync(uow.Object, _ => Task.FromResult(42))).Should().Be(42);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-113")]
    public async Task FailedAcquisition_DoesNotExecuteOrReleaseAnUnownedLock()
    {
        using var provider = BuildProvider();
        var repository = CreateRepository(provider).Object;
        var uow = CreateUow();
        var expected = new InvalidOperationException("Lock unavailable.");
        uow.Setup(instance => instance.LockAsync()).ThrowsAsync(expected);
        var calls = 0;

        var action = () => repository.ReadAsync(uow.Object, _ => Task.FromResult(++calls));
        var failure = await action.Should().ThrowAsync<InvalidOperationException>();

        failure.Which.Should().BeSameAs(expected);
        calls.Should().Be(0);
        uow.Verify(instance => instance.ReleaseLock(), Times.Never);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-114")]
    public async Task ConcurrentNonparallelReads_RemainSerializedAfterFirstReaderFails()
    {
        using var provider = BuildProvider();
        var repository = CreateRepository(provider).Object;
        var uow = CreateUow();
        using var semaphore = new SemaphoreSlim(1, 1);
        var firstEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var finishFirst = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var secondWaiting = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var acquisitionCount = 0;
        var firstCalls = 0;
        var secondCalls = 0;
        uow.Setup(instance => instance.LockAsync()).Returns(() =>
        {
            if (Interlocked.Increment(ref acquisitionCount) == 2) secondWaiting.SetResult();
            return semaphore.WaitAsync();
        });
        uow.Setup(instance => instance.ReleaseLock()).Callback(() => semaphore.Release());
        var expected = new InvalidOperationException("First reader failed.");
        var first = repository.ReadAsync<int>(uow.Object, async _ =>
        {
            firstCalls++;
            firstEntered.TrySetResult();
            await finishFirst.Task;
            throw expected;
        });
        await firstEntered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var second = repository.ReadAsync(uow.Object, _ => Task.FromResult(++secondCalls));
        await secondWaiting.Task.WaitAsync(TimeSpan.FromSeconds(5));
        secondCalls.Should().Be(0, "the second read cannot execute while the first holds the UOW");
        finishFirst.SetResult();

        var action = () => first;
        (await action.Should().ThrowAsync<InvalidOperationException>()).Which.Should().BeSameAs(expected);
        (await second.WaitAsync(TimeSpan.FromSeconds(5))).Should().Be(1);
        firstCalls.Should().Be(1);
        semaphore.CurrentCount.Should().Be(1);
        uow.Verify(instance => instance.ReleaseLock(), Times.Exactly(2));
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-115")]
    public async Task ParallelProvider_BypassesLockAndExecutesOnce()
    {
        using var provider = BuildProvider();
        var repository = CreateRepository(provider).Object;
        repository.SupportsParallelExecution = true;
        var uow = CreateUow();
        var calls = 0;

        (await repository.ReadAsync(uow.Object, _ => Task.FromResult(++calls))).Should().Be(1);

        uow.Verify(instance => instance.LockAsync(), Times.Never);
        uow.Verify(instance => instance.ReleaseLock(), Times.Never);
    }

    private static Expression<Func<ReadRepository, Task<int>>> RawCountCall(IQueryable<ReadEntity> query, CancellationToken token)
    {
        // On the concrete repository C# infers the generic provider overload even without type arguments.
        // Resolve the public nongeneric facade explicitly so this guard actually enters its base body.
        var method = typeof(ReadRepository).GetMethods().Single(candidate => candidate.Name == nameof(ReadRepository.CountAsync) &&
            !candidate.IsGenericMethod && candidate.GetParameters().Length == 2 &&
            candidate.GetParameters()[0].ParameterType == typeof(IQueryable<ReadEntity>));
        var instance = Expression.Parameter(typeof(ReadRepository));
        return Expression.Lambda<Func<ReadRepository, Task<int>>>(Expression.Call(instance, method,
            Expression.Constant(query, typeof(IQueryable<ReadEntity>)), Expression.Constant(token)), instance);
    }

    private static ServiceProvider BuildProvider()
    {
        var services = new ServiceCollection();
        services.AddSingleton(new Lazy<IPlatformCqrs>(() => Mock.Of<IPlatformCqrs>()));
        services.AddSingleton(Mock.Of<IPlatformRootServiceProvider>());
        services.AddSingleton(new PlatformPersistenceConfiguration<IPlatformDbContext>());
        return services.BuildServiceProvider();
    }

    private static Mock<ReadRepository> CreateRepository(IServiceProvider provider) => new(provider) { CallBase = true };

    private static Mock<IPlatformPersistenceUnitOfWork<IPlatformDbContext>> CreateUow()
    {
        var uow = new Mock<IPlatformPersistenceUnitOfWork<IPlatformDbContext>>();
        uow.Setup(instance => instance.UowOfType<IPlatformPersistenceUnitOfWork<IPlatformDbContext>>()).Returns(uow.Object);
        uow.Setup(instance => instance.LockAsync()).Returns(Task.CompletedTask);
        return uow;
    }

    public abstract class ReadRepository(IServiceProvider provider)
        : PlatformPersistenceRepository<ReadEntity, string, IPlatformPersistenceUnitOfWork<IPlatformDbContext>, IPlatformDbContext>(provider)
    {
        public bool SupportsParallelExecution { get; set; }
        protected override bool DoesSupportParallelExecution() => SupportsParallelExecution;
        public Task<TResult> ReadAsync<TResult>(IPlatformUnitOfWork uow, Func<IPlatformUnitOfWork, Task<TResult>> action)
            => ExecuteUowReadQueryThreadSafe(uow, action);
    }

    public sealed class ReadEntity : IEntity<string>
    {
        public string Id { get; set; } = string.Empty;
        public object GetId() => Id;
    }
}
