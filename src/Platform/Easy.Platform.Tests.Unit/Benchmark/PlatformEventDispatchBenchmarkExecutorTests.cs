using System.Reflection;
using Easy.Platform.Benchmark;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Domain.Events;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Benchmark;

public class PlatformEventDispatchBenchmarkExecutorTests
{
    [Fact]
    public void Program_UsesBenchmarkSwitcherSoCommandLineFilterIsHonored()
    {
        var source = ReadRepositoryFile("src/Platform/Easy.Platform.Benchmark/Program.cs");

        source.Should().Contain("BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args)");
        source.Should().NotContain("BenchmarkRunner.Run<");
    }

    [Fact]
    public void BenchmarkExecutor_DefinesExpectedBenchmarkCases()
    {
        var benchmarkMethodNames = typeof(PlatformEventDispatchBenchmarkExecutor)
            .GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly)
            .Where(method => method.GetCustomAttributes().Any(attribute => attribute.GetType().FullName == "BenchmarkDotNet.Attributes.BenchmarkAttribute"))
            .Select(method => method.Name)
            .ToList();

        benchmarkMethodNames.Should().BeEquivalentTo(
            [
                nameof(PlatformEventDispatchBenchmarkExecutor.HandlerRegistrationMetadata_NoHandlers),
                nameof(PlatformEventDispatchBenchmarkExecutor.HandlerRegistrationMetadata_EntityOnlyAndBulkOnly),
                nameof(PlatformEventDispatchBenchmarkExecutor.BuildHandlerInstanceEvent_SingleHandlerNoClone),
                nameof(PlatformEventDispatchBenchmarkExecutor.DeepClone_MultiHandlerEquivalentPayload),
                nameof(PlatformEventDispatchBenchmarkExecutor.RequestContextSnapshot_ForManyEntityEvents),
                nameof(PlatformEventDispatchBenchmarkExecutor.OriginalEntityDeepClone_ForTrackedEntity)
            ]);

        typeof(PlatformEventDispatchBenchmarkExecutor)
            .GetCustomAttributes()
            .Select(attribute => attribute.GetType().FullName)
            .Should()
            .Contain("BenchmarkDotNet.Attributes.MemoryDiagnoserAttribute");
    }

    [Fact]
    public void HandlerRegistrationMetadata_NoHandlers_WhenNoHandlerRegistered_ShouldReturnFalse()
    {
        var benchmark = new PlatformEventDispatchBenchmarkExecutor();

        benchmark.HandlerRegistrationMetadata_NoHandlers().Should().BeFalse();
    }

    [Fact]
    public void HandlerRegistrationMetadata_EntityOnlyAndBulkOnly_WhenHandlersRegisteredSeparately_ShouldReturnTrue()
    {
        var benchmark = new PlatformEventDispatchBenchmarkExecutor();

        benchmark.HandlerRegistrationMetadata_EntityOnlyAndBulkOnly().Should().BeTrue();
    }

    [Fact]
    public void BuildHandlerInstanceEvent_SingleHandlerNoClone_WhenOneHandlerRegistered_ShouldReturnOriginalEvent()
    {
        var benchmark = new PlatformEventDispatchBenchmarkExecutor();

        benchmark.BuildHandlerInstanceEvent_SingleHandlerNoClone().Should().BeTrue();
    }

    [Fact]
    public void DeepClone_MultiHandlerEquivalentPayload_WhenMultipleHandlersRegistered_ShouldPreservePayloadShape()
    {
        var benchmark = new PlatformEventDispatchBenchmarkExecutor();

        var result = benchmark.DeepClone_MultiHandlerEquivalentPayload();

        result.EntityData.Id.Should().Be("benchmark-0");
        result.EntityData.Name.Should().Be("Benchmark Entity 0");
        result.EntityData.Child.Should().NotBeNull();
        result.EntityData.Child!.Id.Should().Be("benchmark-0-child");
        result.EntityData.Child.Name.Should().Be("Benchmark Child 0");
        result.EntityData.Children.Should().HaveCount(10);
        result.EntityData.Children[0].Id.Should().Be("benchmark-0-child-0");
        result.EntityData.Children[0].Name.Should().Be("Benchmark Child 0-0");
        result.ExistingOriginalEntityData.Should().NotBeNull();
        result.ExistingOriginalEntityData!.Id.Should().Be("benchmark-1000");
    }

    [Fact]
    public void RequestContextSnapshot_ForManyEntityEvents_ShouldCopyAllExpectedContextKeys()
    {
        var benchmark = new PlatformEventDispatchBenchmarkExecutor();
        var requestContextValues = GetBenchmarkRequestContextValues();

        requestContextValues.Should().BeEquivalentTo(CreateRequestContextValues());
        benchmark.RequestContextSnapshot_ForManyEntityEvents().Should().Be(100 * requestContextValues.Count);
    }

    [Fact]
    public void OriginalEntityDeepClone_ForTrackedEntity_ShouldPreserveRepresentativeEntityPayload()
    {
        var benchmark = new PlatformEventDispatchBenchmarkExecutor();

        var result = benchmark.OriginalEntityDeepClone_ForTrackedEntity();

        result.Id.Should().Be("benchmark-0");
        result.Name.Should().Be("Benchmark Entity 0");
        result.Child.Should().NotBeNull();
        result.Child!.Id.Should().Be("benchmark-0-child");
        result.Child.Name.Should().Be("Benchmark Child 0");
        result.Children.Should().HaveCount(10);
        result.Children[0].Id.Should().Be("benchmark-0-child-0");
        result.Children[0].Name.Should().Be("Benchmark Child 0-0");
    }

    [Fact]
    public void BenchmarkEntityEventHandler_BuildHandlerInstanceEvent_WhenSingleHandlerRegistered_ShouldReturnSameEvent()
    {
        var rootServiceProvider = CreateRootServiceProvider(services =>
            services.AddTransient<
                IPlatformCqrsEventHandler<PlatformCqrsEntityEvent<PlatformEventDispatchBenchmarkExecutor.BenchmarkEntity>>,
                PlatformEventDispatchBenchmarkExecutor.BenchmarkEntityEventHandler>());
        var handler = new PlatformEventDispatchBenchmarkExecutor.BenchmarkEntityEventHandler(rootServiceProvider);
        var entityEvent = CreateEntityEvent();

        var result = handler.BuildHandlerInstanceEvent(entityEvent);

        result.Should().BeSameAs(entityEvent);
    }

    [Fact]
    public void BenchmarkEntityEventHandler_BuildHandlerInstanceEvent_WhenMultipleHandlersRegistered_ShouldCloneFirstHandlerEventAndSkipNextClone()
    {
        var rootServiceProvider = CreateMultiHandlerRootServiceProvider();
        var handler = new PlatformEventDispatchBenchmarkExecutor.BenchmarkEntityEventHandler(rootServiceProvider);
        var entityEvent = CreateEntityEvent();

        handler.NoNeedCloneNewEventInstanceForTheHandler.Should().BeFalse();

        var result = handler.BuildHandlerInstanceEvent(entityEvent);

        result.Should().NotBeSameAs(entityEvent);
        result.EntityData.Should().NotBeSameAs(entityEvent.EntityData);
        result.EntityData.Id.Should().Be(entityEvent.EntityData.Id);
        result.EntityData.Child.Should().NotBeSameAs(entityEvent.EntityData.Child);
        result.EntityData.Child!.Id.Should().Be(entityEvent.EntityData.Child!.Id);
        result.EntityData.Children[0].Should().NotBeSameAs(entityEvent.EntityData.Children[0]);
        result.EntityData.Children[0].Id.Should().Be(entityEvent.EntityData.Children[0].Id);
        result.ExistingOriginalEntityData.Should().NotBeSameAs(entityEvent.ExistingOriginalEntityData);
        result.ExistingOriginalEntityData!.Id.Should().Be(entityEvent.ExistingOriginalEntityData!.Id);
        AssertRequestContextCloned(result, entityEvent);
        handler.NoNeedCloneNewEventInstanceForTheHandler.Should().BeTrue();

        var nextEvent = CreateEntityEvent();
        var nextResult = handler.BuildHandlerInstanceEvent(nextEvent);

        nextResult.Should().BeSameAs(nextEvent);
    }

    [Fact]
    public void BenchmarkEntityEventHandler_BuildHandlerInstanceEvent_WhenSameUowIsForced_ShouldCloneEventAndRestoreTrackedEntityReferences()
    {
        var rootServiceProvider = CreateMultiHandlerRootServiceProvider();
        var handler = new PlatformEventDispatchBenchmarkExecutor.BenchmarkEntityEventHandler(rootServiceProvider);
        var entityEvent = CreateEntityEvent();

        entityEvent.SetForceRunHandlerInSameCurrentActiveUow<PlatformEventDispatchBenchmarkExecutor.BenchmarkEntityEventHandler>();

        var result = handler.BuildHandlerInstanceEvent(entityEvent);

        result.Should().NotBeSameAs(entityEvent);
        result.EntityData.Should().BeSameAs(entityEvent.EntityData);
        result.ExistingOriginalEntityData.Should().BeSameAs(entityEvent.ExistingOriginalEntityData);
        result.EntityData.Id.Should().Be(entityEvent.EntityData.Id);
        result.ExistingOriginalEntityData!.Id.Should().Be(entityEvent.ExistingOriginalEntityData!.Id);
        AssertRequestContextCloned(result, entityEvent);
        handler.NoNeedCloneNewEventInstanceForTheHandler.Should().BeTrue();
    }

    private static PlatformRootServiceProvider CreateMultiHandlerRootServiceProvider()
    {
        return CreateRootServiceProvider(services =>
        {
            services.AddTransient<
                IPlatformCqrsEventHandler<PlatformCqrsEntityEvent<PlatformEventDispatchBenchmarkExecutor.BenchmarkEntity>>,
                PlatformEventDispatchBenchmarkExecutor.BenchmarkEntityEventHandler>();
            services.AddTransient<
                IPlatformCqrsEventHandler<PlatformCqrsEntityEvent<PlatformEventDispatchBenchmarkExecutor.BenchmarkEntity>>,
                PlatformEventDispatchBenchmarkExecutor.SecondBenchmarkEntityEventHandler>();
        });
    }

    private static PlatformCqrsEntityEvent<PlatformEventDispatchBenchmarkExecutor.BenchmarkEntity> CreateEntityEvent()
    {
        var entityEvent = new PlatformCqrsEntityEvent<PlatformEventDispatchBenchmarkExecutor.BenchmarkEntity>(
            CreateEntity(),
            PlatformCqrsEntityEventCrudAction.Updated)
        {
            ExistingOriginalEntityData = CreateEntity(1000)
        };

        entityEvent.SetRequestContextValues(CreateRequestContextValues());

        return entityEvent;
    }

    private static Dictionary<string, object> CreateRequestContextValues()
    {
        return new Dictionary<string, object>
        {
            ["UserId"] = "benchmark-user",
            ["CompanyId"] = "benchmark-company",
            ["CorrelationId"] = "benchmark-correlation",
            ["Locale"] = "en"
        };
    }

    private static Dictionary<string, object> GetBenchmarkRequestContextValues()
    {
        var requestContextField = typeof(PlatformEventDispatchBenchmarkExecutor)
            .GetField("RequestContextValues", BindingFlags.Static | BindingFlags.NonPublic);

        requestContextField.Should().NotBeNull();
        return requestContextField!.GetValue(null).Should().BeOfType<Dictionary<string, object>>().Subject;
    }

    private static void AssertRequestContextCloned(
        PlatformCqrsEntityEvent<PlatformEventDispatchBenchmarkExecutor.BenchmarkEntity> result,
        PlatformCqrsEntityEvent<PlatformEventDispatchBenchmarkExecutor.BenchmarkEntity> original)
    {
        result.RequestContext.Should().NotBeSameAs(original.RequestContext);
        result.RequestContext.Should().BeEquivalentTo(original.RequestContext);
        result.RequestContext.Should().BeEquivalentTo(CreateRequestContextValues());
    }

    private static PlatformEventDispatchBenchmarkExecutor.BenchmarkEntity CreateEntity(int index = 0)
    {
        return new PlatformEventDispatchBenchmarkExecutor.BenchmarkEntity
        {
            Id = $"benchmark-{index}",
            Name = $"Benchmark Entity {index}",
            Description = "Benchmark entity payload for platform event dispatch measurement.",
            Child = new PlatformEventDispatchBenchmarkExecutor.BenchmarkEntity
            {
                Id = $"benchmark-{index}-child",
                Name = $"Benchmark Child {index}",
                Description = "Nested benchmark entity payload."
            },
            Children = Enumerable.Range(0, 10)
                .Select(childIndex => new PlatformEventDispatchBenchmarkExecutor.BenchmarkEntity
                {
                    Id = $"benchmark-{index}-child-{childIndex}",
                    Name = $"Benchmark Child {index}-{childIndex}",
                    Description = "Collection benchmark entity payload."
                })
                .ToList()
        };
    }

    private static PlatformRootServiceProvider CreateRootServiceProvider(Action<IServiceCollection>? configureServices = null)
    {
        var services = new ServiceCollection();
        configureServices?.Invoke(services);
        return new PlatformRootServiceProvider(services.BuildServiceProvider(), services);
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
