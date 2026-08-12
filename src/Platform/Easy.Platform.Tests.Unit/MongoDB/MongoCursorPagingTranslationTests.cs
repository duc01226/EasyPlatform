using FluentAssertions;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;

namespace Easy.Platform.Tests.Unit.MongoDB;

/// <summary>
///     Proves the ONE expression <see cref="Easy.Platform.Common.Utils.Util.Pager" />'s cursor paging depends on actually
///     reaches the server as a range filter: <c>x.Key.CompareTo(cursor) &gt; 0</c>.
///     <para>
///         Why this needs its own test rather than trusting the pattern: <c>CompareTo</c> is a .NET method, not a query
///         operator. Every OTHER cursor-paging call site in this repository runs on EF Core, which proves nothing here —
///         the MongoDB LINQ3 provider has a separate, smaller set of translatable expressions, and an untranslatable one
///         throws at translation time. A cursor that silently stopped filtering server-side would still return CORRECT
///         rows while reading the whole collection per page, which is the failure class that hides longest.
///     </para>
///     <para>
///         Runs offline: <see cref="MongoClient" /> connects lazily and rendering a queryable to its pipeline needs no
///         server, so this is a unit test rather than an integration test and cannot be skipped by infrastructure being down.
///     </para>
/// </summary>
public class MongoCursorPagingTranslationTests
{
    private static IQueryable<CursorProbe> Probes()
    {
        // Never dialled: GetDatabase/GetCollection are lazy and rendering happens client-side.
        return new MongoClient("mongodb://127.0.0.1:27017")
            .GetDatabase("translation_probe")
            .GetCollection<CursorProbe>("probes")
            .AsQueryable();
    }

    [Fact]
    public void StringCompareToCursor_TranslatesToAServerSideGreaterThanRange()
    {
        var rendered = Probes()
            .Where(p => p.Status == "Pending")
            .Where(p => p.Id.CompareTo("01JABCDEF") > 0)
            .OrderBy(p => p.Id)
            .Take(10)
            .ToString();

        // Asserted as the EXACT stage, not as "contains $gt somewhere": a plain field range filter is index-usable,
        // whereas a $expr wrapping a computed comparison renders the index unusable while returning identical rows —
        // so a substring assertion would pass on the shape this test exists to reject.
        rendered.Should().Contain("""{ "$match" : { "_id" : { "$gt" : "01JABCDEF" } } }""");
        rendered.Should().NotContain("$expr");
        rendered.Should().Contain("""{ "$sort" : { "_id" : 1 } }""");
        rendered.Should().Contain("""{ "$limit" : 10 }""");
    }

    [Fact]
    public void StringCompareToCursor_RendersByteOrder_WhichIsWhyTheCursorKeyMustBeAscii()
    {
        // The trap this pins: `CompareTo` in C# means CULTURE-sensitive ordering, but it renders to a byte-order $gt and
        // the driver sets no collation, so the server never applies culture rules. For "a" vs "B" the two DISAGREE
        // (culture: "a" < "B"; byte: 'a'=0x61 > 'B'=0x42), so a cursor over a mixed-case free-text key would skip or
        // repeat rows. Ids (ULID/GUID/ObjectId) are ASCII and case-uniform, which is why they are the only safe key.
        string.Compare("a", "B", StringComparison.CurrentCulture).Should().BeNegative();
        string.CompareOrdinal("a", "B").Should().BePositive();

        var rendered = Probes().Where(p => p.CompanyId.CompareTo("B") > 0).ToString();

        // No $collation / culture hint anywhere — the server compares bytes, matching Util.Pager's ordinal guard.
        rendered.Should().Contain("""{ "$match" : { "CompanyId" : { "$gt" : "B" } } }""");
        rendered.Should().NotContain("collation");
    }

    [Fact]
    public void StringCompareToCursor_TranslatesTheSameWayWhenTheCursorIsAClosureVariable()
    {
        // The production shape: the cursor arrives as a captured local from the previous page, not a literal.
        var afterId = "01JABCDEF";

        var rendered = Probes()
            .Where(p => p.Status == "Pending")
            .Where(p => p.Id.CompareTo(afterId) > 0)
            .OrderBy(p => p.Id)
            .Take(10)
            .ToString();

        rendered.Should().Contain("$gt");
        rendered.Should().Contain("_id");
    }

    [Fact]
    public void StringCompareToCursor_OnANonIdField_AlsoTranslates()
    {
        // AutoDeleteNotificationBackgroundJobExecutor cursors on CompanyId, before a Distinct.
        var rendered = Probes()
            .Where(p => p.CompanyId.CompareTo("company-1") > 0)
            .Select(p => p.CompanyId)
            .Distinct()
            .OrderBy(id => id)
            .Take(10)
            .ToString();

        rendered.Should().Contain("$gt");
        rendered.Should().Contain("CompanyId");
        // The cursor must narrow the GROUP input, not just trim its output: $match has to precede $group.
        rendered!.IndexOf("$match", StringComparison.Ordinal).Should().BeLessThan(
            rendered.IndexOf("$group", StringComparison.Ordinal),
            "a cursor applied after the blocking $group would re-group the entire collection on every page");
    }

    private sealed class CursorProbe
    {
        [BsonId]
        public string Id { get; set; } = "";

        public string Status { get; set; } = "";

        public string CompanyId { get; set; } = "";
    }
}
