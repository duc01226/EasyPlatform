using System.Linq.Expressions;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Domain.Entities;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application.Persistence;

public class PlatformBulkUpsertMatchingHelperTests
{
    [Fact]
    public void BuildExistingEntitiesPredicate_IdOnly_MatchesById()
    {
        var entities = new List<IdOnlyEntity>
        {
            new() { Id = "id-1" },
            new() { Id = "id-2" }
        };

        var predicate = PlatformBulkUpsertMatchingHelper.BuildExistingEntitiesPredicate<IdOnlyEntity, string>(entities, null).Compile();

        predicate(new IdOnlyEntity { Id = "id-1" }).Should().BeTrue();
        predicate(new IdOnlyEntity { Id = "id-3" }).Should().BeFalse();
    }

    [Fact]
    public void MatchToExistingEntities_CompositeId_UsesUniqueCompositeIdLookup()
    {
        var toUpsertEntities = new List<CompositeEntity>
        {
            new() { Id = "incoming-1", CompanyId = "company-1", Code = "A" },
            new() { Id = "incoming-2", CompanyId = "company-1", Code = "B" },
            new() { Id = "incoming-3", CompanyId = "company-2", Code = "missing" }
        };
        var existingEntities = new List<CompositeEntity>
        {
            new() { Id = "existing-1", CompanyId = "company-1", Code = "A" },
            new() { Id = "duplicate-existing-1", CompanyId = "company-1", Code = "A" },
            new() { Id = "existing-2", CompanyId = "company-1", Code = "B" }
        };

        var matches = PlatformBulkUpsertMatchingHelper.MatchToExistingEntities<CompositeEntity, string>(toUpsertEntities, existingEntities, null);

        matches[0].MatchedExistingEntity!.Id.Should().Be("existing-1");
        matches[1].MatchedExistingEntity!.Id.Should().Be("existing-2");
        matches[2].MatchedExistingEntity.Should().BeNull();
    }

    [Fact]
    public void MatchToExistingEntities_CustomPredicate_BuildsPredicateOncePerInputEntity()
    {
        var builderCallCount = 0;
        var toUpsertEntities = new List<IdOnlyEntity>
        {
            new() { Id = "incoming-1", Code = "A" },
            new() { Id = "incoming-2", Code = "B" }
        };
        var existingEntities = new List<IdOnlyEntity>
        {
            new() { Id = "existing-1", Code = "not-match" },
            new() { Id = "existing-2", Code = "A" },
            new() { Id = "existing-3", Code = "B" }
        };

        var matches = PlatformBulkUpsertMatchingHelper.MatchToExistingEntities<IdOnlyEntity, string>(
            toUpsertEntities,
            existingEntities,
            toUpsertEntity =>
            {
                builderCallCount++;
                var code = toUpsertEntity.Code;
                return existingEntity => existingEntity.Code == code;
            });

        builderCallCount.Should().Be(toUpsertEntities.Count);
        matches.Select(p => p.MatchedExistingEntity?.Id).Should().Equal("existing-2", "existing-3");
    }

    [Fact]
    public void ProviderCreateOrUpdateMany_DelegatesMatchingAndDoesNotInlineRepeatedCompile()
    {
        var efContextSource = ReadRepositoryFile("src/Platform/Easy.Platform.EfCore/PlatformEfCoreDbContext.cs");
        var mongoContextSource = ReadRepositoryFile("src/Platform/Easy.Platform.MongoDB/PlatformMongoDbContext.cs");

        efContextSource.Should().Contain("PlatformBulkUpsertMatchingHelper.MatchToExistingEntities");
        mongoContextSource.Should().Contain("PlatformBulkUpsertMatchingHelper.MatchToExistingEntities");
        efContextSource.Should().NotContain(".Compile()(existingEntity)");
        mongoContextSource.Should().NotContain(".Compile()(existingEntity)");
    }

    public sealed class IdOnlyEntity : Entity<IdOnlyEntity, string>
    {
        public string Code { get; set; } = string.Empty;
    }

    public sealed class CompositeEntity : Entity<CompositeEntity, string>
    {
        public string CompanyId { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;

        public override string UniqueCompositeId()
        {
            return $"{CompanyId}|{Code}";
        }

        public override Expression<Func<CompositeEntity, bool>> FindByUniqueCompositeIdExpr()
        {
            var companyId = CompanyId;
            var code = Code;

            return p => p.CompanyId == companyId && p.Code == code;
        }
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
