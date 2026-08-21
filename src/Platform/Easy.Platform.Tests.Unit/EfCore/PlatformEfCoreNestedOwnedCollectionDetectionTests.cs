using Easy.Platform.EfCore;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace Easy.Platform.Tests.Unit.EfCore;

/// <summary>
/// Guards <c>PlatformEfCoreDbContext.HasOwnedCollectionWithStoreGeneratedKey&lt;TEntity&gt;</c> — the predicate that
/// decides whether an upsert must load the stored row TRACKED instead of taking the cheaper no-tracking read.
///
/// <para><strong>What the predicate is for.</strong> An <c>OwnsMany</c> declared without an explicit <c>HasKey</c>
/// gets a store-generated SHADOW primary key. A detached graph carries no value for that key, so writing it through
/// <c>DbSet.Update</c> fails with <em>"The value of shadow key property '...' is unknown when attempting to save
/// changes"</em> and takes the whole unit of work down with it. Entity types that own such a collection must
/// therefore be merged onto a tracked instance; every other type keeps the no-tracking read.</para>
///
/// <para><strong>Why DEPTH is the thing under test.</strong> The original implementation scanned only the root's own
/// <see cref="Microsoft.EntityFrameworkCore.Metadata.IEntityType.GetNavigations" />. An <c>OwnsMany</c> nested inside
/// an <c>OwnsOne</c> is reachable only through the intermediate owned type, so it never appears there: the root-direct
/// scan answered "no shadow-keyed owned collection" for an entity that has one, the detached graph took the
/// no-tracking path, and the save failed on exactly the error the predicate exists to prevent. The recursion closes
/// that blind spot.</para>
///
/// <para><strong>Why this test builds a purpose-built model instead of using a service's schema.</strong> The
/// predicate is pure model inspection with no database access, so the honest scope is the platform itself. Proving it
/// through a consuming service's Postgres suite would couple a platform invariant to one service's schema, to Docker,
/// and to whichever entity happens to have the right shape this month — and would drift the moment that schema
/// changed. Each shape below is declared for this test alone and cannot drift.</para>
///
/// <para><strong>What this does NOT cover.</strong>
/// (1) It is not ENFORCED: the only pipeline step that runs <c>dotnet test</c> targets the E2E automation
/// project (<c>automation-systemtest-azure-pipelines.yml:45-52</c>), never this unit suite, so this guard fails
/// only for someone already running the suite locally. Wiring a CI test gate is tracked separately.
/// (2) It proves the DETECTION, not the tracked-merge write path the detection selects — that path is exercised by
/// the consuming services' integration suites.
/// (3) There is deliberately NO cyclic-owned-graph case. The recursion carries a visited-set termination guard, but EF
/// Core's ownership model is a TREE — an owned type's only navigation back out is to its owner, which the
/// owned-only filter already excludes — so a genuine owned cycle is a shape EF will not build. Asserting it would
/// mean fabricating a model EF rejects, which proves nothing about the guard. The visited set stays a cheap termination
/// safeguard, and the depth-3 case below is what actually demonstrates the walk terminates while descending.</para>
///
/// <para>Traceability: TECHNICAL-ONLY id <c>TC-PLATEFOWNED-001</c>.</para>
/// </summary>
public class PlatformEfCoreNestedOwnedCollectionDetectionTests : PlatformUnitTestBase
{
    /// <summary>
    /// THE regression case for the recursion: the shadow-keyed <c>OwnsMany</c> sits one level down, under an
    /// <c>OwnsOne</c>. A root-direct scan reports <c>false</c> here — that is the defect being guarded.
    /// </summary>
    [Fact]
    public void ShadowKeyedOwnedCollection_NestedUnderOwnsOne_IsDetected()
    {
        using var dbContext = CreateTestDbContext();

        dbContext
            .ProbeHasOwnedCollectionWithStoreGeneratedKey<NestedShadowKeyedRoot>()
            .Should()
            .BeTrue(
                "the OwnsMany under Detail has no explicit HasKey, so it carries a store-generated shadow primary key "
                + "and can only be written through a tracked instance — being reachable via an owned navigation rather "
                + "than directly off the root changes nothing about that");
    }

    /// <summary>
    /// The walk must keep descending past a single level, otherwise "any depth" is really "depth two".
    /// </summary>
    [Fact]
    public void ShadowKeyedOwnedCollection_NestedThreeLevelsDeep_IsDetected()
    {
        using var dbContext = CreateTestDbContext();

        dbContext
            .ProbeHasOwnedCollectionWithStoreGeneratedKey<DeepNestedShadowKeyedRoot>()
            .Should()
            .BeTrue("the shadow-keyed collection is reachable through two intermediate owned types, and the walk is "
                + "documented as searching the owned graph at ANY depth");
    }

    /// <summary>
    /// The pre-existing root-direct behaviour must survive the change. Without this, a recursion that accidentally
    /// skipped the root's own navigations would still look correct to every other case here.
    /// </summary>
    [Fact]
    public void ShadowKeyedOwnedCollection_DeclaredDirectlyOnTheRoot_IsStillDetected()
    {
        using var dbContext = CreateTestDbContext();

        dbContext
            .ProbeHasOwnedCollectionWithStoreGeneratedKey<RootDirectShadowKeyedRoot>()
            .Should()
            .BeTrue("this is the case the original non-recursive scan already handled; the recursion must extend that "
                + "behaviour, not replace it");
    }

    /// <summary>
    /// Discriminates the real predicate (SHADOW-keyed collection) from the blunt one (any nested collection). A
    /// recursion that dropped the shadow-key check would pass every positive case above and only fail here.
    /// </summary>
    [Fact]
    public void OwnedCollection_WithExplicitHasKey_IsNotDetected()
    {
        using var dbContext = CreateTestDbContext();

        dbContext
            .ProbeHasOwnedCollectionWithStoreGeneratedKey<ExplicitlyKeyedNestedRoot>()
            .Should()
            .BeFalse("an owned collection with an explicit HasKey carries a real key value while detached, so it needs "
                + "no tracked merge — flagging it would cost a no-tracking read for no correctness benefit");
    }

    /// <summary>
    /// Anti-over-reporting: owned types alone must not trip the predicate. If the recursion followed navigations it
    /// should not, or answered on ownership rather than on shadow-keyed COLLECTIONS, nearly every entity type in a
    /// real model would be dragged onto the tracked path.
    /// </summary>
    [Fact]
    public void OwnedReference_WithoutAnyOwnedCollection_IsNotDetected()
    {
        using var dbContext = CreateTestDbContext();

        dbContext
            .ProbeHasOwnedCollectionWithStoreGeneratedKey<NoOwnedCollectionRoot>()
            .Should()
            .BeFalse("this root owns a reference but no collection at any depth, so nothing about it needs a tracked "
                + "merge and it must keep the cheaper no-tracking read");
    }

    /// <summary>
    /// Anti-vacuity. Every assertion above reads the model through <c>Model.FindEntityType</c>, which returns
    /// <c>null</c> — and makes the predicate answer <c>false</c> — for a type the model does not contain. A silent
    /// model-building failure would therefore turn the three <c>BeTrue</c> cases red but leave the two
    /// <c>BeFalse</c> cases passing for entirely the wrong reason. This pins that the shapes under test really were
    /// built.
    /// </summary>
    [Fact]
    public void TestModel_MustActuallyContainEveryShapeUnderTest()
    {
        using var dbContext = CreateTestDbContext();

        var missingEntityTypes = new[]
            {
                typeof(NestedShadowKeyedRoot),
                typeof(DeepNestedShadowKeyedRoot),
                typeof(RootDirectShadowKeyedRoot),
                typeof(ExplicitlyKeyedNestedRoot),
                typeof(NoOwnedCollectionRoot)
            }
            .Where(entityClrType => dbContext.Model.FindEntityType(entityClrType) == null)
            .Select(entityClrType => entityClrType.Name)
            .ToList();

        missingEntityTypes
            .Should()
            .BeEmpty(
                "a shape missing from the model makes the predicate answer false for reasons that have nothing to do "
                + "with the behaviour under test, so the negative cases would pass vacuously");
    }

    private static NestedOwnedGraphTestDbContext CreateTestDbContext()
    {
        // A distinct database name per instance keeps the InMemory store isolated; the model itself is what matters
        // here and is rebuilt from OnModelCreating either way.
        var options = new DbContextOptionsBuilder<NestedOwnedGraphTestDbContext>()
            .UseInMemoryDatabase($"{nameof(NestedOwnedGraphTestDbContext)}_{Guid.NewGuid():N}")
            .Options;

        return new NestedOwnedGraphTestDbContext(options);
    }
}

/// <summary>
/// Minimal real <see cref="PlatformEfCoreDbContext{TDbContext}" /> whose ONLY job is to build the owned-graph shapes
/// under test and expose the protected predicate.
/// </summary>
/// <remarks>
/// <para>
/// <see cref="OnModelCreating" /> deliberately does NOT call <c>base</c>. The platform base scans the whole declaring
/// assembly for <c>IEntityTypeConfiguration</c> implementations and additionally registers the inbox/outbox/migration
/// history entities — in a test assembly that would pull unrelated shapes into the model and let an unrelated future
/// test change this one's answers. The model here is exactly the five shapes and nothing else.
/// </para>
/// </remarks>
internal sealed class NestedOwnedGraphTestDbContext(DbContextOptions<NestedOwnedGraphTestDbContext> options)
    : PlatformEfCoreDbContext<NestedOwnedGraphTestDbContext>(options)
{
    /// <summary>
    /// Exposes the protected predicate. The production entry point is protected because only the context's own write
    /// paths consult it; a test still has to reach it, and going through the real generic method keeps the cache key
    /// and the null-entity-type handling in scope rather than testing the recursive half in isolation.
    /// </summary>
    public bool ProbeHasOwnedCollectionWithStoreGeneratedKey<TEntity>()
        where TEntity : class
    {
        return HasOwnedCollectionWithStoreGeneratedKey<TEntity>();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Shadow-keyed owned collection ONE level down, under an owned reference — invisible to a root-direct scan.
        modelBuilder.Entity<NestedShadowKeyedRoot>(builder =>
            builder.OwnsOne(p => p.Detail, detailBuilder => detailBuilder.OwnsMany(p => p.Items)));

        // Same, THREE levels down, so "any depth" is not silently "depth two".
        modelBuilder.Entity<DeepNestedShadowKeyedRoot>(builder =>
            builder.OwnsOne(
                p => p.Level1,
                level1Builder => level1Builder.OwnsOne(p => p.Level2, level2Builder => level2Builder.OwnsMany(p => p.Items))));

        // The case the original non-recursive scan already caught — kept as a regression guard.
        modelBuilder.Entity<RootDirectShadowKeyedRoot>(builder => builder.OwnsMany(p => p.Items));

        // Nested owned COLLECTION, but explicitly keyed: a detached row carries its key, so no tracked merge is needed.
        modelBuilder.Entity<ExplicitlyKeyedNestedRoot>(builder =>
            builder.OwnsOne(
                p => p.Detail,
                detailBuilder => detailBuilder.OwnsMany(p => p.Items, itemBuilder => itemBuilder.HasKey(p => p.ItemKey))));

        // Owned reference only, no collection at any depth.
        modelBuilder.Entity<NoOwnedCollectionRoot>(builder => builder.OwnsOne(p => p.Detail));
    }
}

internal sealed class NestedShadowKeyedRoot
{
    public string Id { get; set; } = "";

    public NestedShadowKeyedDetail Detail { get; set; } = new();
}

internal sealed class NestedShadowKeyedDetail
{
    public string Label { get; set; } = "";

    public List<NestedShadowKeyedItem> Items { get; set; } = [];
}

internal sealed class NestedShadowKeyedItem
{
    public string Value { get; set; } = "";
}

internal sealed class DeepNestedShadowKeyedRoot
{
    public string Id { get; set; } = "";

    public DeepNestedLevel1 Level1 { get; set; } = new();
}

internal sealed class DeepNestedLevel1
{
    public string Label { get; set; } = "";

    public DeepNestedLevel2 Level2 { get; set; } = new();
}

internal sealed class DeepNestedLevel2
{
    public string Label { get; set; } = "";

    public List<DeepNestedItem> Items { get; set; } = [];
}

internal sealed class DeepNestedItem
{
    public string Value { get; set; } = "";
}

internal sealed class RootDirectShadowKeyedRoot
{
    public string Id { get; set; } = "";

    public List<RootDirectItem> Items { get; set; } = [];
}

internal sealed class RootDirectItem
{
    public string Value { get; set; } = "";
}

internal sealed class ExplicitlyKeyedNestedRoot
{
    public string Id { get; set; } = "";

    public ExplicitlyKeyedNestedDetail Detail { get; set; } = new();
}

internal sealed class ExplicitlyKeyedNestedDetail
{
    public string Label { get; set; } = "";

    public List<ExplicitlyKeyedItem> Items { get; set; } = [];
}

internal sealed class ExplicitlyKeyedItem
{
    public string ItemKey { get; set; } = "";

    public string Value { get; set; } = "";
}

internal sealed class NoOwnedCollectionRoot
{
    public string Id { get; set; } = "";

    public NoOwnedCollectionDetail Detail { get; set; } = new();
}

internal sealed class NoOwnedCollectionDetail
{
    public string Label { get; set; } = "";
}
