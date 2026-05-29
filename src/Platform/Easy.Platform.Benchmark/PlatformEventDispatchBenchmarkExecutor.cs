using BenchmarkDotNet.Attributes;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Validations;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace Easy.Platform.Benchmark;

[MemoryDiagnoser(false)]
public class PlatformEventDispatchBenchmarkExecutor
{
    private const int BulkEventCount = 100;

    private static readonly IPlatformRootServiceProvider NoHandlerRootServiceProvider = CreateRootServiceProvider();
    private static readonly IPlatformRootServiceProvider EntityOnlyRootServiceProvider = CreateRootServiceProvider(services =>
        services.AddTransient<IPlatformCqrsEventHandler<PlatformCqrsEntityEvent<BenchmarkEntity>>, BenchmarkEntityEventHandler>());
    private static readonly IPlatformRootServiceProvider BulkOnlyRootServiceProvider = CreateRootServiceProvider(services =>
        services.AddTransient<IPlatformCqrsEventHandler<PlatformCqrsBulkEntitiesEvent<BenchmarkEntity, string>>, BenchmarkBulkEntitiesEventHandler>());
    private static readonly BenchmarkEntityEventHandler SingleHandler = new(EntityOnlyRootServiceProvider);
    private static readonly BenchmarkEntityEventHandler MultiHandler = new(CreateRootServiceProvider(services =>
    {
        services.AddTransient<IPlatformCqrsEventHandler<PlatformCqrsEntityEvent<BenchmarkEntity>>, BenchmarkEntityEventHandler>();
        services.AddTransient<IPlatformCqrsEventHandler<PlatformCqrsEntityEvent<BenchmarkEntity>>, SecondBenchmarkEntityEventHandler>();
    }));
    private static readonly Dictionary<string, object> RequestContextValues = new()
    {
        ["UserId"] = "benchmark-user",
        ["CompanyId"] = "benchmark-company",
        ["CorrelationId"] = "benchmark-correlation",
        ["Locale"] = "en"
    };

    [Benchmark]
    public bool HandlerRegistrationMetadata_NoHandlers()
    {
        return PlatformCqrsEntityEvent.IsAnyKindsOfEventHandlerRegisteredForEntity<BenchmarkEntity, string>(NoHandlerRootServiceProvider);
    }

    [Benchmark]
    public bool HandlerRegistrationMetadata_EntityOnlyAndBulkOnly()
    {
        return PlatformCqrsEntityEvent.IsAnyEntityEventHandlerRegisteredForEntity<BenchmarkEntity>(EntityOnlyRootServiceProvider)
               && !PlatformCqrsEntityEvent.IsAnyBulkEntitiesEventHandlerRegisteredForEntity<BenchmarkEntity, string>(EntityOnlyRootServiceProvider)
               && !PlatformCqrsEntityEvent.IsAnyEntityEventHandlerRegisteredForEntity<BenchmarkEntity>(BulkOnlyRootServiceProvider)
               && PlatformCqrsEntityEvent.IsAnyBulkEntitiesEventHandlerRegisteredForEntity<BenchmarkEntity, string>(BulkOnlyRootServiceProvider);
    }

    [Benchmark]
    public bool BuildHandlerInstanceEvent_SingleHandlerNoClone()
    {
        var entityEvent = CreateEntityEvent();

        SingleHandler.NoNeedCloneNewEventInstanceForTheHandler = false;

        return ReferenceEquals(SingleHandler.BuildHandlerInstanceEvent(entityEvent), entityEvent);
    }

    [Benchmark]
    public PlatformCqrsEntityEvent<BenchmarkEntity> DeepClone_MultiHandlerEquivalentPayload()
    {
        MultiHandler.NoNeedCloneNewEventInstanceForTheHandler = false;

        return MultiHandler.BuildHandlerInstanceEvent(CreateEntityEvent());
    }

    [Benchmark]
    public int RequestContextSnapshot_ForManyEntityEvents()
    {
        var totalKeys = 0;

        for (var i = 0; i < BulkEventCount; i++)
        {
            var entityEvent = CreateEntityEvent(i);
            entityEvent.SetRequestContextValues(RequestContextValues);
            totalKeys += entityEvent.RequestContext.Count;
        }

        return totalKeys;
    }

    [Benchmark]
    public BenchmarkEntity OriginalEntityDeepClone_ForTrackedEntity()
    {
        return CreateEntity().DeepClone();
    }

    private static PlatformCqrsEntityEvent<BenchmarkEntity> CreateEntityEvent(int index = 0)
    {
        return new PlatformCqrsEntityEvent<BenchmarkEntity>(CreateEntity(index), PlatformCqrsEntityEventCrudAction.Updated)
        {
            ExistingOriginalEntityData = CreateEntity(index + 1000)
        };
    }

    private static BenchmarkEntity CreateEntity(int index = 0)
    {
        return new BenchmarkEntity
        {
            Id = $"benchmark-{index}",
            Name = $"Benchmark Entity {index}",
            Description = "Benchmark entity payload for platform event dispatch measurement.",
            Child = new BenchmarkEntity
            {
                Id = $"benchmark-{index}-child",
                Name = $"Benchmark Child {index}",
                Description = "Nested benchmark entity payload."
            },
            Children = Enumerable.Range(0, 10)
                .Select(childIndex => new BenchmarkEntity
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

    public class BenchmarkEntity : Entity<BenchmarkEntity, string>
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public BenchmarkEntity? Child { get; set; }
        public List<BenchmarkEntity> Children { get; set; } = [];

        public override PlatformValidationResult<BenchmarkEntity> Validate()
        {
            return PlatformValidationResult.Valid(this);
        }
    }

    public class BenchmarkEntityEventHandler(IPlatformRootServiceProvider rootServiceProvider)
        : PlatformCqrsEventHandler<PlatformCqrsEntityEvent<BenchmarkEntity>>(
            NullLoggerFactory.Instance,
            rootServiceProvider,
            rootServiceProvider.GetScopedRootServiceProvider())
    {
        public PlatformCqrsEntityEvent<BenchmarkEntity> BuildHandlerInstanceEvent(PlatformCqrsEntityEvent<BenchmarkEntity> @event)
        {
            return DoHandle_BuildHandlerInstanceEvent(@event);
        }

        public override Task Handle(object @event, CancellationToken cancellationToken)
        {
            return Handle((PlatformCqrsEntityEvent<BenchmarkEntity>)@event, cancellationToken);
        }

        public override Task<bool> HandleWhen(object @event)
        {
            return Task.FromResult(true);
        }

        public override Task<bool> HandleWhen(PlatformCqrsEntityEvent<BenchmarkEntity> @event)
        {
            return Task.FromResult(true);
        }

        protected override Task HandleAsync(PlatformCqrsEntityEvent<BenchmarkEntity> @event, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }

    public sealed class SecondBenchmarkEntityEventHandler(IPlatformRootServiceProvider rootServiceProvider)
        : BenchmarkEntityEventHandler(rootServiceProvider);

    public sealed class BenchmarkBulkEntitiesEventHandler(IPlatformRootServiceProvider rootServiceProvider)
        : PlatformCqrsEventHandler<PlatformCqrsBulkEntitiesEvent<BenchmarkEntity, string>>(
            NullLoggerFactory.Instance,
            rootServiceProvider,
            rootServiceProvider.GetScopedRootServiceProvider())
    {
        public override Task Handle(object @event, CancellationToken cancellationToken)
        {
            return Handle((PlatformCqrsBulkEntitiesEvent<BenchmarkEntity, string>)@event, cancellationToken);
        }

        public override Task<bool> HandleWhen(object @event)
        {
            return Task.FromResult(true);
        }

        public override Task<bool> HandleWhen(PlatformCqrsBulkEntitiesEvent<BenchmarkEntity, string> @event)
        {
            return Task.FromResult(true);
        }

        protected override Task HandleAsync(PlatformCqrsBulkEntitiesEvent<BenchmarkEntity, string> @event, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }
}
