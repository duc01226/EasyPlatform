using System.Text.RegularExpressions;
using Easy.Platform.MongoDB.Services;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace Easy.Platform.Tests.Unit.MongoDB;

/// <summary>Native aggregation legality and caller-filter preservation; no broker/database connection is opened.</summary>
public class PlatformMongoFullTextSearchQueryTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("TechnicalSpec", "TC-MONGO-SEARCH-001")]
    public void Search_FilteredInput_CombinesTextInFirstMatchAndKeepsPrefixBranchScoped(bool includePrefix)
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        var search = new MongoDbPlatformFullTextSearchPersistenceService(services);
        var source = new MongoClient("mongodb://127.0.0.1:27017").GetDatabase("TranslationOnly")
            .GetCollection<SearchRow>("Rows").AsQueryable().Where(row => row.Owner == "reader").Where(row => row.Enabled);

        var result = search.Search(source, "needle", [row => row.Text], includeStartWithProps: includePrefix ? [row => row.Text] : null!);
        var translation = result.ToString()!;
        var pipeline = BsonSerializer.Deserialize<BsonArray>(translation[translation.IndexOf('[')..(translation.LastIndexOf(']') + 1)]);
        var firstMatch = pipeline[0]["$match"].AsBsonDocument;

        var clauses = ConjunctiveClauses(firstMatch).ToList();
        clauses.Should().ContainSingle(clause => clause.Contains("$text"), "text must be conjunctive in the first match, outside any OR/NOT");
        clauses.Single(clause => clause.Contains("Owner"))["Owner"].AsString.Should().Be("reader");
        clauses.Single(clause => clause.Contains("Enabled"))["Enabled"].AsBoolean.Should().BeTrue();
        clauses.Should().NotContain(clause => clause.Contains("$or"), "these caller restrictions must remain conjunctive with text");
        if (includePrefix)
        {
            var union = pipeline.Single(stage => stage.AsBsonDocument.Contains("$unionWith"))["$unionWith"];
            var prefixPipeline = union["pipeline"].AsBsonArray;
            var prefixClauses = prefixPipeline
                .Where(stage => stage.AsBsonDocument.Contains("$match"))
                .SelectMany(stage => ConjunctiveClauses(stage["$match"].AsBsonDocument)).ToList();
            prefixClauses.Single(clause => clause.Contains("Owner"))["Owner"].AsString.Should().Be("reader");
            prefixClauses.Single(clause => clause.Contains("Enabled"))["Enabled"].AsBoolean.Should().BeTrue();
            prefixClauses.Should().NotContain(clause => clause.Contains("$text"), "prefix-only hits must not require a text hit");
            var regexAlternatives = prefixClauses.Single(clause => clause.Contains("$or"))["$or"].AsBsonArray;
            regexAlternatives.Should().ContainSingle();
            var regex = regexAlternatives[0]["Text"].AsBsonRegularExpression;
            regex.Pattern.Should().Be("^(needle)");
            regex.Options.Should().Be("i");
            pipeline.Any(stage => stage.AsBsonDocument.Contains("$group")).Should().BeTrue("overlapping matches must not duplicate rows or totals");
        }
        else
            pipeline.Should().HaveCount(1);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-MONGO-SEARCH-001")]
    public void Search_BlankText_PreservesTheOriginalFilteredQuery()
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        var search = new MongoDbPlatformFullTextSearchPersistenceService(services);
        var source = new MongoClient("mongodb://127.0.0.1:27017").GetDatabase("TranslationOnly")
            .GetCollection<SearchRow>("Rows").AsQueryable().Where(row => row.Owner == "reader");

        search.Search(source, " ", [row => row.Text]).Should().BeSameAs(source);
    }

    [Theory]
    [InlineData("a.b", "axb")]
    [InlineData("(", "anything")]
    [InlineData("[x]", "x")]
    [InlineData("a+b", "aaab")]
    [InlineData("a*b", "b")]
    [InlineData("a?b", "b")]
    [InlineData("a|b", "b")]
    [InlineData("a{2}", "aa")]
    [InlineData("^word$", "word")]
    [InlineData(@"a\b", "a tail")]
    [Trait("TechnicalSpec", "TC-MONGO-SEARCH-003")]
    public void PrefixSearch_TreatsMetacharactersAsLiteralText(string prefix, string decoy)
    {
        var filter = MongoDbPlatformFullTextSearchPersistenceService.BuildStartsWithMongoFilterDefinition<SearchRow>(prefix, [row => row.Text]);
        var registry = BsonSerializer.SerializerRegistry;
        var document = filter.Render(new RenderArgs<SearchRow>(registry.GetSerializer<SearchRow>(), registry));
        var expression = document["$or"][0]["Text"].AsBsonRegularExpression;

        expression.Options.Should().Be("i");
        var regex = new Regex(expression.Pattern, RegexOptions.IgnoreCase);
        regex.IsMatch(prefix.ToUpperInvariant() + " tail").Should().BeTrue("literal prefixes remain case-insensitive");
        regex.IsMatch(decoy).Should().BeFalse("regular-expression syntax must not widen a literal prefix");
        regex.IsMatch("before " + prefix).Should().BeFalse("a prefix must remain anchored");
    }

    // Mongo combines fields implicitly with AND. Descend only through explicit AND, so a
    // required predicate hidden under OR/NOT cannot satisfy a conjunctive scope assertion.
    private static IEnumerable<BsonDocument> ConjunctiveClauses(BsonDocument filter)
    {
        foreach (var element in filter)
        {
            if (element.Name == "$and")
            {
                foreach (var clause in element.Value.AsBsonArray)
                {
                    foreach (var conjunct in ConjunctiveClauses(clause.AsBsonDocument))
                        yield return conjunct;
                }
            }
            else
                yield return new BsonDocument(element.Name, element.Value);
        }
    }

    public sealed class SearchRow
    {
        public string Owner { get; set; } = "";
        public bool Enabled { get; set; }
        public string Text { get; set; } = "";
    }
}
