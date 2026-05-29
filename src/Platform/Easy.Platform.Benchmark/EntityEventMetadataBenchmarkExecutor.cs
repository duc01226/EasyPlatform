using System.Text.Json.Serialization;
using BenchmarkDotNet.Attributes;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;

namespace Easy.Platform.Benchmark;

[MemoryDiagnoser(false)]
public class EntityEventMetadataBenchmarkExecutor
{
    private static readonly ManyPropertyEntity OriginalEntity = ManyPropertyEntity.Create("old");
    private static readonly ManyPropertyEntity UpdatedEntity = ManyPropertyEntity.Create("new");
    private static readonly PlatformCqrsEntityEvent<ManyPropertyEntity> EntityEvent = new(UpdatedEntity, PlatformCqrsEntityEventCrudAction.Updated)
    {
        ExistingOriginalEntityData = OriginalEntity
    };

    [Benchmark]
    public int AutoAddFieldUpdatedEvent_ManyProperties()
    {
        var entity = ManyPropertyEntity.Create("new");

        entity.AutoAddFieldUpdatedEvent(OriginalEntity);

        return entity.GetFieldUpdatedDomainEvents().Count;
    }

    [Benchmark]
    public int GetUpdatedFields_ManyProperties()
    {
        return EntityEvent.GetUpdatedFields().Count;
    }

    [TrackFieldUpdatedDomainEvent]
    public sealed class ManyPropertyEntity : Entity<ManyPropertyEntity, string>
    {
        [TrackFieldUpdatedDomainEvent]
        public string Tracked01 { get; set; } = string.Empty;

        [TrackFieldUpdatedDomainEvent]
        public string Tracked02 { get; set; } = string.Empty;

        [TrackFieldUpdatedDomainEvent]
        public string Tracked03 { get; set; } = string.Empty;

        [TrackFieldUpdatedDomainEvent]
        public string Tracked04 { get; set; } = string.Empty;

        [TrackFieldUpdatedDomainEvent]
        public string Tracked05 { get; set; } = string.Empty;

        [JsonIgnore]
        [TrackFieldUpdatedDomainEvent]
        public string IgnoredTracked { get; set; } = string.Empty;

        public string Untracked01 { get; set; } = string.Empty;
        public string Untracked02 { get; set; } = string.Empty;
        public string Untracked03 { get; set; } = string.Empty;
        public string Untracked04 { get; set; } = string.Empty;
        public string Untracked05 { get; set; } = string.Empty;
        public string Untracked06 { get; set; } = string.Empty;
        public string Untracked07 { get; set; } = string.Empty;
        public string Untracked08 { get; set; } = string.Empty;
        public string Untracked09 { get; set; } = string.Empty;
        public string Untracked10 { get; set; } = string.Empty;

        public static ManyPropertyEntity Create(string prefix)
        {
            return new ManyPropertyEntity
            {
                Id = "benchmark-entity",
                Tracked01 = $"{prefix}-tracked-01",
                Tracked02 = $"{prefix}-tracked-02",
                Tracked03 = $"{prefix}-tracked-03",
                Tracked04 = $"{prefix}-tracked-04",
                Tracked05 = $"{prefix}-tracked-05",
                IgnoredTracked = $"{prefix}-ignored-tracked",
                Untracked01 = $"{prefix}-untracked-01",
                Untracked02 = $"{prefix}-untracked-02",
                Untracked03 = $"{prefix}-untracked-03",
                Untracked04 = $"{prefix}-untracked-04",
                Untracked05 = $"{prefix}-untracked-05",
                Untracked06 = $"{prefix}-untracked-06",
                Untracked07 = $"{prefix}-untracked-07",
                Untracked08 = $"{prefix}-untracked-08",
                Untracked09 = $"{prefix}-untracked-09",
                Untracked10 = $"{prefix}-untracked-10"
            };
        }
    }
}
