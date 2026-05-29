using System.Text.Json.Serialization;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Domain.Events;

public class PlatformEntityEventFieldDiffTests
{
    [Fact]
    public void AutoAddFieldUpdatedEvent_WhenClassIsNotTracked_ShouldNotAddFieldEvents()
    {
        var original = new PropertyOnlyTrackedEntity { Id = "entity-1", Name = "old" };
        var current = new PropertyOnlyTrackedEntity { Id = "entity-1", Name = "new" };

        current.AutoAddFieldUpdatedEvent(original);

        current.GetFieldUpdatedDomainEvents().Should().BeEmpty();
    }

    [Fact]
    public void AutoAddFieldUpdatedEvent_WhenClassIsTracked_ShouldAddOnlyTrackedChangedNonSystemFields()
    {
        var original = TrackedFieldEntity.CreateOriginal();
        var current = TrackedFieldEntity.CreateChanged();

        current.AutoAddFieldUpdatedEvent(original);

        current.GetFieldUpdatedDomainEvents()
            .Select(@event => @event.FieldName)
            .Should()
            .BeEquivalentTo([nameof(TrackedFieldEntity.TrackedName)]);
    }

    [Fact]
    public void GetUpdatedFields_WhenOriginalDataExists_ShouldReturnAllChangedPublicNonJsonFields()
    {
        var original = TrackedFieldEntity.CreateOriginal();
        var current = TrackedFieldEntity.CreateChanged();

        var entityEvent = new PlatformCqrsEntityEvent<TrackedFieldEntity>(current, PlatformCqrsEntityEventCrudAction.Updated)
        {
            ExistingOriginalEntityData = original
        };

        var updatedFields = entityEvent.GetUpdatedFields();

        updatedFields
            .Select(field => field.FieldName)
            .Should()
            .BeEquivalentTo(
            [
                nameof(TrackedFieldEntity.TrackedName),
                nameof(TrackedFieldEntity.UntrackedName),
                nameof(TrackedFieldEntity.ConcurrencyUpdateToken),
                nameof(TrackedFieldEntity.LastUpdatedDate)
            ]);

        updatedFields.Should().Contain(field =>
            field.FieldName == nameof(TrackedFieldEntity.UntrackedName) &&
            field.OriginalValue != null &&
            field.OriginalValue.ToString() == "old-untracked" &&
            field.NewValue != null &&
            field.NewValue.ToString() == "new-untracked");
    }

    [TrackFieldUpdatedDomainEvent]
    private sealed class TrackedFieldEntity : Entity<TrackedFieldEntity, string>
    {
        [TrackFieldUpdatedDomainEvent]
        public string TrackedName { get; set; } = string.Empty;

        public string UntrackedName { get; set; } = string.Empty;

        [JsonIgnore]
        [TrackFieldUpdatedDomainEvent]
        public string JsonIgnoredTrackedName { get; set; } = string.Empty;

        [JsonIgnore]
        public string JsonIgnoredUntrackedName { get; set; } = string.Empty;

        [TrackFieldUpdatedDomainEvent]
        public string ConcurrencyUpdateToken { get; set; } = string.Empty;

        [TrackFieldUpdatedDomainEvent]
        public DateTime LastUpdatedDate { get; set; }

        public static TrackedFieldEntity CreateOriginal()
        {
            return new TrackedFieldEntity
            {
                Id = "entity-1",
                TrackedName = "old-tracked",
                UntrackedName = "old-untracked",
                JsonIgnoredTrackedName = "old-json-tracked",
                JsonIgnoredUntrackedName = "old-json-untracked",
                ConcurrencyUpdateToken = "old-token",
                LastUpdatedDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
        }

        public static TrackedFieldEntity CreateChanged()
        {
            return new TrackedFieldEntity
            {
                Id = "entity-1",
                TrackedName = "new-tracked",
                UntrackedName = "new-untracked",
                JsonIgnoredTrackedName = "new-json-tracked",
                JsonIgnoredUntrackedName = "new-json-untracked",
                ConcurrencyUpdateToken = "new-token",
                LastUpdatedDate = new DateTime(2026, 1, 2, 0, 0, 0, DateTimeKind.Utc)
            };
        }
    }

    private sealed class PropertyOnlyTrackedEntity : Entity<PropertyOnlyTrackedEntity, string>
    {
        [TrackFieldUpdatedDomainEvent]
        public string Name { get; set; } = string.Empty;
    }
}
