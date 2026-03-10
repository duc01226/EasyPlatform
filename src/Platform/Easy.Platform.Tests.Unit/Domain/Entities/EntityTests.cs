using System.Linq.Expressions;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Validations.Validators;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Domain.Entities;

/// <summary>
/// Unit tests for <see cref="Entity{TEntity,TPrimaryKey}"/> base class.
/// Covers: domain events, validation, identification expressions.
/// </summary>
public class EntityTests : PlatformEntityTestBase<EntityTests.TestEntity, string>
{
    protected override TestEntity CreateValidEntity()
        => new() { Id = "test-id-1", Name = "Test" };

    // ── Domain Events ──

    [Fact]
    public void AddDomainEvent_AddsEventToCollection()
    {
        var entity = CreateValidEntity();

        entity.AddDomainEvent(new TestDomainEvent { Data = "event-data" });

        AssertDomainEventCount(entity, 1);
        AssertHasDomainEvent<TestDomainEvent>(entity);
    }

    [Fact]
    public void AddDomainEvent_WithCustomName_UsesCustomName()
    {
        var entity = CreateValidEntity();

        entity.AddDomainEvent(new TestDomainEvent(), "CustomEventName");

        entity.GetDomainEvents().Should().Contain(e => e.Key == "CustomEventName");
    }

    [Fact]
    public void AddDomainEvent_WithoutCustomName_UsesTypeName()
    {
        var entity = CreateValidEntity();

        entity.AddDomainEvent(new TestDomainEvent());

        entity.GetDomainEvents().Should().Contain(e => e.Key == nameof(TestDomainEvent));
    }

    [Fact]
    public void AddDomainEvent_MultipleTimes_AccumulatesEvents()
    {
        var entity = CreateValidEntity();

        entity.AddDomainEvent(new TestDomainEvent { Data = "first" });
        entity.AddDomainEvent(new TestDomainEvent { Data = "second" });

        AssertDomainEventCount(entity, 2);
    }

    [Fact]
    public void GetDomainEvents_NewEntity_ReturnsEmpty()
    {
        var entity = CreateValidEntity();

        AssertNoDomainEvents(entity);
    }

    // ── FieldUpdatedDomainEvent ──

    [Fact]
    public void FieldUpdatedDomainEvent_Create_SetsAllProperties()
    {
        var domainEvent = ISupportDomainEventsEntity.FieldUpdatedDomainEvent.Create("Name", "old", "new");

        domainEvent.FieldName.Should().Be("Name");
        domainEvent.OriginalValue.Should().Be("old");
        domainEvent.NewValue.Should().Be("new");
    }

    [Fact]
    public void FieldUpdatedDomainEvent_Generic_Create_SetsTypedValues()
    {
        var domainEvent = ISupportDomainEventsEntity.FieldUpdatedDomainEvent<int>.Create("Age", 25, 30);

        domainEvent.FieldName.Should().Be("Age");
        domainEvent.OriginalValue.Should().Be(25);
        domainEvent.NewValue.Should().Be(30);
    }

    // ── Entity Validation ──

    [Fact]
    public void Validate_WithValidEntity_ReturnsValid()
    {
        var entity = CreateValidEntity();

        var result = entity.Validate();

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithInvalidEntity_ReturnsInvalid()
    {
        var entity = new TestEntity { Id = "test", Name = "" }; // Empty name is invalid

        var result = entity.Validate();

        result.IsValid.Should().BeFalse();
    }

    // ── IdentifyExpr ──

    [Fact]
    public void IdentifyExpr_SingleEntity_MatchesSelf()
    {
        var entity = CreateValidEntity();

        AssertIdentifyExprMatchesSelf(entity);
    }

    [Fact]
    public void IdentifyExpr_SingleEntity_DoesNotMatchOther()
    {
        var entity = CreateValidEntity();
        var other = new TestEntity { Id = "other-id", Name = "Other" };

        var expr = IEntity.IdentifyExpr(entity);
        var compiled = expr.Compile();

        compiled(other).Should().BeFalse();
    }

    [Fact]
    public void IdentifyExpr_MultipleEntities_MatchesAll()
    {
        var entities = new List<TestEntity>
        {
            new() { Id = "id-1", Name = "A" },
            new() { Id = "id-2", Name = "B" },
            new() { Id = "id-3", Name = "C" }
        };

        var expr = IEntity.IdentifyExpr<TestEntity>(entities);
        var compiled = expr.Compile();

        entities.ForEach(e => compiled(e).Should().BeTrue($"Entity {e.Id} should match"));
    }

    [Fact]
    public void IdentifyExpr_EmptyList_MatchesNothing()
    {
        var expr = IEntity.IdentifyExpr<TestEntity>([]);
        var compiled = expr.Compile();

        compiled(CreateValidEntity()).Should().BeFalse();
    }

    // ── FilterNotExistingItems ──

    [Fact]
    public void FilterNotExistingItems_ReturnsOnlyNew()
    {
        var existing = new List<TestEntity>
        {
            new() { Id = "id-1", Name = "A" },
            new() { Id = "id-2", Name = "B" }
        };

        var items = new List<TestEntity>
        {
            new() { Id = "id-1", Name = "A" }, // exists
            new() { Id = "id-3", Name = "C" }  // new
        };

        var newItems = IEntity.FilterNotExistingItems(items, existing);

        newItems.Should().HaveCount(1);
        newItems[0].Id.Should().Be("id-3");
    }

    // ── FindByUniqueCompositeIdExpr ──

    [Fact]
    public void FindByUniqueCompositeIdExpr_Default_ReturnsNull()
    {
        var entity = CreateValidEntity();

        entity.FindByUniqueCompositeIdExpr().Should().BeNull();
    }

    // ── Test Entity ──

    public class TestEntity : Entity<TestEntity, string>
    {
        public string Name { get; set; } = string.Empty;

        public override PlatformValidationResult<TestEntity> Validate()
        {
            return PlatformValidationResult.Validate(this, !string.IsNullOrEmpty(Name), (PlatformValidationError)"Name is required");
        }
    }

    public class TestDomainEvent : ISupportDomainEventsEntity.DomainEvent
    {
        public string Data { get; set; } = string.Empty;
    }
}
