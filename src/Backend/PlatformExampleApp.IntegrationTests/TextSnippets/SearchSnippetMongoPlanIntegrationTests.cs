using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Driver;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;

namespace PlatformExampleApp.IntegrationTests.TextSnippets;

[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "Query")]
public sealed class SearchSnippetMongoPlanIntegrationTests : TextSnippetIntegrationTestBase
{
    /// <summary>
    /// Technical access-path invariant: another reader's matching corpus must not expand this reader's text candidates.
    /// The DTO cannot set creators; this real-driver fixture also needs 1,024 deliberately identical foreign text tokens.
    /// Existing CQRS tests protect privacy/Union semantics; this guard measures actual Mongo execution work, not index names.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-MONGO-SEARCH-002")]
    public async Task PrivateTextSearch_WhenOtherReadersShareTerm_ShouldOnlyExamineCurrentReadersCandidates()
    {
        var owner = TextSnippetTestUserContextFactory.CreateUser(IntegrationTestHelper.UniqueName("PlanOwner"));
        var other = IntegrationTestHelper.UniqueName("PlanOther");
        var marker = IntegrationTestHelper.UniqueName("PlanNeedle").Replace("_", "");
        var ownId = IntegrationTestHelper.UniqueId();
        await ExecuteWithServicesAsync(async services =>
        {
            var context = services.GetRequiredService<TextSnippetDbContext>();
            var entities = Enumerable.Range(0, 1025).Select(index =>
            {
                var entity = TextSnippetEntity.Create(index == 0 ? ownId : IntegrationTestHelper.UniqueId(), $"{marker} {index}", marker);
                entity.CreatedByUserId = index == 0 ? owner.UserId : other;
                return entity;
            }).ToArray();
            await context.TextSnippetCollection.InsertManyAsync(entities);

            var explain = await context.TextSnippetCollection.Database.RunCommandAsync<BsonDocument>(new BsonDocument
            {
                { "explain", new BsonDocument
                    {
                        { "aggregate", context.TextSnippetCollection.CollectionNamespace.CollectionName },
                        { "pipeline", new BsonArray
                            {
                                new BsonDocument("$match", new BsonDocument
                                {
                                    { "$text", new BsonDocument("$search", marker) },
                                    { nameof(TextSnippetEntity.CreatedByUserId), owner.UserId }
                                }),
                                new BsonDocument("$count", "total")
                            }
                        },
                        { "cursor", new BsonDocument() }
                    }
                },
                { "verbosity", "executionStats" }
            });
            var stats = FindExecutionStats(explain).ToArray();
            stats.Should().NotBeEmpty("executionStats must be observed rather than inferred from an index declaration");
            stats.Max(stat => stat["totalKeysExamined"].ToInt64()).Should().BeLessThanOrEqualTo(4,
                "1,024 foreign matches must not be examined by a one-reader text search");
            stats.Max(stat => stat["totalDocsExamined"].ToInt64()).Should().BeLessThanOrEqualTo(4);
        });

        var result = await ExecuteQueryAsync(new SearchSnippetTextQuery { SearchText = marker }, owner);
        result.Items.Select(item => item.Id).Should().Equal(ownId);
        result.TotalCount.Should().Be(1);
    }

    private static IEnumerable<BsonDocument> FindExecutionStats(BsonValue value)
    {
        if (value is BsonDocument document)
        {
            if (document.Contains("totalKeysExamined") && document.Contains("totalDocsExamined"))
                yield return document;
            foreach (var child in document.Elements.SelectMany(element => FindExecutionStats(element.Value)))
                yield return child;
        }
        else if (value is BsonArray array)
        {
            foreach (var child in array.SelectMany(FindExecutionStats))
                yield return child;
        }
    }
}
