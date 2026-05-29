using System.Linq.Expressions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.MongoDB.Extensions;
using FluentAssertions;
using Moq;

namespace Easy.Platform.Tests.Unit.MongoDB;

public class PlatformMongoDbNavigationLoadingExtensionsTests
{
    [Fact]
    public async Task LoadNavigationsAsync_BatchCollectionNavigation_UsesSingleGetByIdsAndPreservesParentOrder()
    {
        var parents = new List<ParentEntity>
        {
            new() { Id = "parent-1", ChildIds = ["child-2", "child-1", "missing", "child-2"] },
            new() { Id = "parent-2", ChildIds = ["child-3", "child-1"] },
            new() { Id = "parent-3", ChildIds = [] },
            new() { Id = "parent-4", ChildIds = null }
        };
        var children = new List<ChildEntity>
        {
            new() { Id = "child-1" },
            new() { Id = "child-2" },
            new() { Id = "child-3" }
        };
        var requestedIdBatches = new List<List<string>>();
        var repositoryMock = new Mock<IPlatformQueryableRepository<ChildEntity, string>>();
        repositoryMock
            .Setup(p => p.GetByIdsAsync(
                It.IsAny<List<string>>(),
                It.IsAny<CancellationToken>(),
                It.IsAny<Expression<Func<ChildEntity, object?>>[]>()))
            .ReturnsAsync((List<string> ids, CancellationToken _, Expression<Func<ChildEntity, object?>>[] _) =>
            {
                requestedIdBatches.Add(ids.ToList());
                return children.Where(p => ids.Contains(p.Id)).ToList();
            });

        var resolverMock = new Mock<IPlatformRepositoryResolver>();
        resolverMock
            .Setup(p => p.Resolve<ChildEntity, string>())
            .Returns(repositoryMock.Object);

        await parents.LoadNavigationsAsync<ParentEntity, string>([p => p.Children], resolverMock.Object);

        requestedIdBatches.Should().ContainSingle();
        requestedIdBatches[0].Should().Equal("child-2", "child-1", "missing", "child-3");
        parents[0].Children!.Select(p => p.Id).Should().Equal("child-2", "child-1", "child-2");
        parents[1].Children!.Select(p => p.Id).Should().Equal("child-3", "child-1");
        parents[2].Children.Should().BeEmpty();
        parents[3].Children.Should().BeEmpty();
    }

    [Fact]
    public void BatchCollectionNavigation_DoesNotFanOutDirectCollectionLoadsPerParent()
    {
        var source = ReadRepositoryFile("src/Platform/Easy.Platform.MongoDB/Extensions/PlatformMongoDbNavigationLoadingExtensions.cs");

        source.Should().Contain("LoadCollectionNavigationBatchTypedAsync<TEntity, TPrimaryKey>(entities, step, resolver, ct)");
        source.Should().NotContain("entities.ParallelAsync(entity => LoadCollectionNavigationTypedAsync<TEntity, TPrimaryKey>(entity, step, resolver, ct))");
    }

    public sealed class ParentEntity : Entity<ParentEntity, string>
    {
        public List<string>? ChildIds { get; set; }

        [PlatformNavigationProperty(nameof(ChildIds), Cardinality = PlatformNavigationCardinality.Collection)]
        public List<ChildEntity>? Children { get; set; }
    }

    public sealed class ChildEntity : Entity<ChildEntity, string>;

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
