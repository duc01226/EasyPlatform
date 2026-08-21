using System.Reflection;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.EfCore.Domain.Repositories;
using Easy.Platform.MongoDB.Domain.Repositories;
using Easy.Platform.Persistence.Domain;
using Easy.Platform.Tests.Unit.Base;
using Easy.Platform.Tests.Unit.TestInfrastructure;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Domain.Repositories;

/// <summary>
/// Type-level contract tests for the platform repository class hierarchy.
/// <para>
/// The repository base classes are abstract and require a live persistence stack (DbContext, UnitOfWork,
/// CQRS) to instantiate, so their unit-testable surface is their TYPE CONTRACT: base type, generic
/// constraints, implemented interfaces, abstractness, and the overrides the framework depends on.
/// </para>
/// <para>
/// Discovery is reflection-driven over the platform assemblies, each ANCHORED by one known type
/// (<see cref="PlatformRepository{TEntity,TPrimaryKey,TUow}" />, <see cref="PlatformEfCoreRepository{TEntity,TPrimaryKey,TDbContext}" />,
/// <see cref="PlatformMongoDbRepository{TEntity,TPrimaryKey,TDbContext}" />) so a rename breaks COMPILATION
/// rather than silently reducing the discovered set to zero. Future repository classes are covered automatically.
/// </para>
/// <para>Traceability: TECHNICAL-ONLY ids <c>TC-PLATREPO-050..059</c>.</para>
/// </summary>
public class PlatformRepositoryTypeContractTests : PlatformUnitTestBase
{
    /// <summary>Anchored assemblies. Each anchor type is referenced by <c>typeof</c> so a rename is a build error.</summary>
    private static readonly Assembly[] AnchoredPlatformAssemblies =
    [
        typeof(PlatformRepository<,,>).Assembly,
        typeof(PlatformEfCoreRepository<,,>).Assembly,
        typeof(PlatformMongoDbRepository<,,>).Assembly
    ];

    /// <summary>The concrete (non-abstract) framework repositories. Every OTHER discovered repository must be abstract.</summary>
    private static readonly Type[] ConcreteFrameworkRepositoryTypes =
    [
        typeof(PlatformDefaultEfCoreInboxBusMessageRepository<>),
        typeof(PlatformDefaultEfCoreOutboxBusMessageRepository<>),
        typeof(PlatformDefaultMongoDbInboxBusMessageRepository<>),
        typeof(PlatformDefaultMongoDbOutboxBusMessageRepository<>)
    ];

    public static TheoryData<Type> AllDiscoveredRepositoryTypes()
    {
        return ToTheoryData(DiscoverRepositoryTypes());
    }

    /// <summary>Open repository definitions that still expose a <c>TEntity</c> generic parameter.</summary>
    public static TheoryData<Type> OpenRepositoryTypesWithEntityParameter()
    {
        return ToTheoryData(DiscoverRepositoryTypes().Where(type => FindGenericParameter(type, "TEntity") != null));
    }

    /// <summary>Open repository definitions whose name marks them as aggregate-root repositories.</summary>
    public static TheoryData<Type> OpenRootRepositoryTypes()
    {
        return ToTheoryData(
            DiscoverRepositoryTypes()
                .Where(type => type.Name.Contains("RootRepository", StringComparison.Ordinal) && FindGenericParameter(type, "TEntity") != null));
    }

    public static TheoryData<Type, Type> ExpectedBaseTypeMap()
    {
        return new TheoryData<Type, Type>
        {
            { typeof(PlatformPersistenceRepository<,,,>), typeof(PlatformRepository<,,>) },
            { typeof(PlatformPersistenceRootRepository<,,,>), typeof(PlatformPersistenceRepository<,,,>) },
            { typeof(PlatformEfCoreRepository<,,>), typeof(PlatformPersistenceRepository<,,,>) },
            { typeof(PlatformEfCoreRootRepository<,,>), typeof(PlatformEfCoreRepository<,,>) },
            { typeof(PlatformMongoDbRepository<,,>), typeof(PlatformPersistenceRepository<,,,>) },
            { typeof(PlatformMongoDbRootRepository<,,>), typeof(PlatformMongoDbRepository<,,>) },
            { typeof(PlatformDefaultEfCoreInboxBusMessageRepository<>), typeof(PlatformEfCoreRootRepository<,,>) },
            { typeof(PlatformDefaultEfCoreOutboxBusMessageRepository<>), typeof(PlatformEfCoreRootRepository<,,>) },
            { typeof(PlatformDefaultMongoDbInboxBusMessageRepository<>), typeof(PlatformMongoDbRootRepository<,,>) },
            { typeof(PlatformDefaultMongoDbOutboxBusMessageRepository<>), typeof(PlatformMongoDbRootRepository<,,>) }
        };
    }

    public static TheoryData<Type, Type, Type> BusMessageRepositoryContractMap()
    {
        return new TheoryData<Type, Type, Type>
        {
            { typeof(PlatformDefaultEfCoreInboxBusMessageRepository<>), typeof(PlatformInboxBusMessage), typeof(IPlatformInboxBusMessageRepository) },
            { typeof(PlatformDefaultMongoDbInboxBusMessageRepository<>), typeof(PlatformInboxBusMessage), typeof(IPlatformInboxBusMessageRepository) },
            { typeof(PlatformDefaultEfCoreOutboxBusMessageRepository<>), typeof(PlatformOutboxBusMessage), typeof(IPlatformOutboxBusMessageRepository) },
            { typeof(PlatformDefaultMongoDbOutboxBusMessageRepository<>), typeof(PlatformOutboxBusMessage), typeof(IPlatformOutboxBusMessageRepository) }
        };
    }

    /// <summary>Just the repository types from <see cref="BusMessageRepositoryContractMap" />, for theories that
    /// only need the type under test and would otherwise consume the other two columns in dead assertions.</summary>
    public static TheoryData<Type> BusMessageRepositoryTypes()
    {
        return ToTheoryData(ConcreteFrameworkRepositoryTypes);
    }

    private static TheoryData<Type> ToTheoryData(IEnumerable<Type> types)
    {
        var data = new TheoryData<Type>();

        foreach (var type in types) data.Add(type);

        return data;
    }

    // TC-PLATREPO-050: Reflection discovery is anchored and non-empty, and contains every known repository class.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-050")]
    public void Discovery_FindsEveryKnownRepositoryClass_AndIsNeverSilentlyEmpty()
    {
        var discovered = DiscoverRepositoryTypes();

        discovered.Should().NotBeEmpty("an empty discovery would silently zero this file's coverage");

        discovered.Should()
            .Contain(
                [
                    typeof(PlatformRepository<,,>),
                    typeof(PlatformPersistenceRepository<,,,>),
                    typeof(PlatformPersistenceRootRepository<,,,>),
                    typeof(PlatformEfCoreRepository<,,>),
                    typeof(PlatformEfCoreRootRepository<,,>),
                    typeof(PlatformMongoDbRepository<,,>),
                    typeof(PlatformMongoDbRootRepository<,,>),
                    typeof(PlatformDefaultEfCoreInboxBusMessageRepository<>),
                    typeof(PlatformDefaultEfCoreOutboxBusMessageRepository<>),
                    typeof(PlatformDefaultMongoDbInboxBusMessageRepository<>),
                    typeof(PlatformDefaultMongoDbOutboxBusMessageRepository<>)
                ]);
    }

    // TC-PLATREPO-051: Every repository in the hierarchy is a platform QUERYABLE repository.
    // Scope note: C# has no way to un-inherit an interface, so once PlatformRepository<,,> (the hierarchy root,
    // itself part of the discovered set - see IsInPlatformRepositoryHierarchy below) implements
    // IPlatformQueryableRepository<,>, every derived type inherits it and cannot fail this assertion by
    // construction. The one mutant this theory can actually catch is removing the interface from the ROOT; the
    // remaining N-1 parameterized cases re-confirm inheritance rather than adding independent coverage.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATREPO-051")]
    [MemberData(nameof(AllDiscoveredRepositoryTypes), DisableDiscoveryEnumeration = true)]
    public void EveryRepositoryType_ImplementsPlatformQueryableRepositoryInterface(Type repositoryType)
    {
        var implementsQueryableRepository = repositoryType.GetInterfaces()
            .Where(i => i.IsGenericType)
            .Any(i => i.GetGenericTypeDefinition() == typeof(IPlatformQueryableRepository<,>));

        implementsQueryableRepository.Should()
            .BeTrue($"{repositoryType.Name} must expose the queryable repository contract the resolver relies on");
    }

    // TC-PLATREPO-052: The TEntity generic parameter is always `class, IEntity<TPrimaryKey>, new()`.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATREPO-052")]
    [MemberData(nameof(OpenRepositoryTypesWithEntityParameter), DisableDiscoveryEnumeration = true)]
    public void EveryOpenRepositoryType_ConstrainsEntityParameterToReferenceTypeWithParameterlessConstructor(Type repositoryType)
    {
        // Closed-entity repositories (inbox/outbox) bind TEntity concretely and are covered by TC-PLATREPO-058.
        var entityParameter = FindGenericParameter(repositoryType, "TEntity")!;

        var attributes = entityParameter.GenericParameterAttributes;

        attributes.Should().HaveFlag(GenericParameterAttributes.ReferenceTypeConstraint);
        attributes.Should().HaveFlag(GenericParameterAttributes.DefaultConstructorConstraint);

        var entityInterfaceConstraint = entityParameter.GetGenericParameterConstraints()
            .Where(c => c.IsGenericType)
            .FirstOrDefault(c => c.GetGenericTypeDefinition() == typeof(IEntity<>) || c.GetGenericTypeDefinition() == typeof(IRootEntity<>));

        entityInterfaceConstraint.Should().NotBeNull($"{repositoryType.Name} must constrain TEntity via IEntity<> or IRootEntity<>");

        // The doc'd contract is IEntity<TPrimaryKey> specifically, not IEntity<> closed over any type - so the
        // interface's own generic argument must be the repository's OWN TPrimaryKey parameter, not an unrelated
        // or mismatched key type.
        var primaryKeyParameter = FindGenericParameter(repositoryType, "TPrimaryKey");

        primaryKeyParameter.Should().NotBeNull($"{repositoryType.Name} must declare a TPrimaryKey generic parameter");
        entityInterfaceConstraint!.GetGenericArguments()[0].Should()
            .Be(primaryKeyParameter, $"{repositoryType.Name}'s entity constraint must close over its own TPrimaryKey, not an unrelated key type");
    }

    // TC-PLATREPO-053: A *RootRepository constrains TEntity to IRootEntity - aggregate-root-only writes.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATREPO-053")]
    [MemberData(nameof(OpenRootRepositoryTypes), DisableDiscoveryEnumeration = true)]
    public void EveryRootRepositoryType_ConstrainsEntityParameterToRootEntity(Type repositoryType)
    {
        var entityParameter = FindGenericParameter(repositoryType, "TEntity")!;

        entityParameter.GetGenericParameterConstraints()
            .Where(c => c.IsGenericType)
            .Select(c => c.GetGenericTypeDefinition())
            .Should()
            .Contain(typeof(IRootEntity<>), $"{repositoryType.Name} is a root repository");
    }

    // TC-PLATREPO-054: The inheritance chain is exactly the documented one - a re-parent breaks this test.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATREPO-054")]
    [MemberData(nameof(ExpectedBaseTypeMap), DisableDiscoveryEnumeration = true)]
    public void RepositoryType_HasExpectedImmediateBaseTypeDefinition(Type repositoryType, Type expectedBaseTypeDefinition)
    {
        var baseType = repositoryType.BaseType;

        baseType.Should().NotBeNull();

        var actualBaseDefinition = baseType!.IsGenericType ? baseType.GetGenericTypeDefinition() : baseType;

        actualBaseDefinition.Should().Be(expectedBaseTypeDefinition);
    }

    // TC-PLATREPO-055: PlatformRepository is the root of the hierarchy and derives from nothing but object.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-055")]
    public void PlatformRepository_IsTheRootOfTheHierarchyAndIsAbstract()
    {
        typeof(PlatformRepository<,,>).BaseType.Should().Be(typeof(object));
        typeof(PlatformRepository<,,>).IsAbstract.Should().BeTrue();
        typeof(PlatformRepository<,,>).GetGenericArguments().Should().HaveCount(3);
    }

    // TC-PLATREPO-056: Only the default bus-message repositories are concrete; every other base class is abstract.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATREPO-056")]
    [MemberData(nameof(AllDiscoveredRepositoryTypes), DisableDiscoveryEnumeration = true)]
    public void RepositoryType_IsAbstractUnlessItIsAKnownConcreteFrameworkRepository(Type repositoryType)
    {
        var expectedAbstract = !ConcreteFrameworkRepositoryTypes.Contains(repositoryType);

        repositoryType.IsAbstract.Should()
            .Be(expectedAbstract, $"{repositoryType.Name} concreteness must stay as designed");
    }

    // TC-PLATREPO-057: The TUow parameter is always a class constrained to IPlatformUnitOfWork.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-057")]
    public void PlatformRepository_ConstrainsUnitOfWorkParameterToPlatformUnitOfWork()
    {
        var uowParameter = FindGenericParameter(typeof(PlatformRepository<,,>), "TUow");

        uowParameter.Should().NotBeNull();
        uowParameter!.GenericParameterAttributes.Should().HaveFlag(GenericParameterAttributes.ReferenceTypeConstraint);
        uowParameter.GetGenericParameterConstraints().Should().Contain(typeof(IPlatformUnitOfWork));
    }

    // TC-PLATREPO-058: Bus-message repositories bind their message entity with a string key and the marker interface.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATREPO-058")]
    [MemberData(nameof(BusMessageRepositoryContractMap), DisableDiscoveryEnumeration = true)]
    public void BusMessageRepository_BindsItsMessageEntityWithStringKeyAndMarkerInterface(
        Type repositoryType,
        Type expectedMessageEntityType,
        Type expectedMarkerInterface)
    {
        repositoryType.GetInterfaces().Should().Contain(expectedMarkerInterface);

        var baseArguments = repositoryType.BaseType!.GetGenericArguments();

        baseArguments[0].Should().Be(expectedMessageEntityType);
        baseArguments[1].Should().Be(typeof(string));
    }

    // TC-PLATREPO-059: Bus-message repositories opt OUT of distributed tracing and of keeping the UoW alive.
    // Takes only the repository type: unlike TC-PLATREPO-058 it does not need the message-entity/marker-interface
    // columns, so it uses the type-only projection instead of asserting NotNull on two unused MemberData columns.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATREPO-059")]
    [MemberData(nameof(BusMessageRepositoryTypes), DisableDiscoveryEnumeration = true)]
    public void BusMessageRepository_DeclaresTracingAndUowRetentionOptOutOverrides(Type repositoryType)
    {
        var tracingProperty = repositoryType.GetProperty(
            "IsDistributedTracingEnabled",
            BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.DeclaredOnly);

        tracingProperty.Should()
            .NotBeNull(
                $"{repositoryType.Name} must override IsDistributedTracingEnabled - tracing the bus-message store would recursively trace the tracing pipeline");

        var keepUowMethod = repositoryType.GetMethod(
            "DoesNeedKeepUowForQueryOrEnumerableExecutionLater",
            BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.DeclaredOnly);

        keepUowMethod.Should()
            .NotBeNull($"{repositoryType.Name} must override DoesNeedKeepUowForQueryOrEnumerableExecutionLater to release the UoW");
    }

    private static List<Type> DiscoverRepositoryTypes()
    {
        return AnchoredPlatformAssemblies
            .Distinct()
            .SelectMany(PlatformAssemblyScanTestHelpers.GetLoadableTypes)
            .Where(type => type.IsClass && IsInPlatformRepositoryHierarchy(type))
            .OrderBy(type => type.FullName, StringComparer.Ordinal)
            .ToList();
    }

    private static bool IsInPlatformRepositoryHierarchy(Type type)
    {
        if (type == typeof(PlatformRepository<,,>)) return true;

        for (var current = type.BaseType; current != null; current = current.BaseType)
        {
            var currentDefinition = current.IsGenericType ? current.GetGenericTypeDefinition() : current;

            if (currentDefinition == typeof(PlatformRepository<,,>)) return true;
        }

        return false;
    }

    private static Type? FindGenericParameter(Type type, string parameterName)
    {
        return type.IsGenericTypeDefinition
            ? Array.Find(type.GetGenericArguments(), p => p.Name == parameterName)
            : null;
    }
}
