using MongoDB.Bson;
using MongoDB.Driver;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo;

internal static class TextSnippetSearchIndexes
{
    private const string LEGACY_TEXT_INDEX_NAME = "SnippetText_text_FullText_text";
    private const string CREATOR_TEXT_INDEX_NAME = "CreatedByUserId_1_SnippetText_text_FullText_text";

    internal static CreateIndexModel<TextSnippetEntity> BuildCreatorTextIndex() => new(
        Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.CreatedByUserId).Text(p => p.SnippetText).Text(p => p.FullText),
        new CreateIndexOptions { Name = CREATOR_TEXT_INDEX_NAME });

    internal static async Task EnsureCreatorTextIndexAsync(IMongoCollection<TextSnippetEntity> collection, bool allowLegacyRebuild)
    {
        List<BsonDocument> indexes;
        try
        {
            indexes = await (await collection.Indexes.ListAsync()).ToListAsync();
        }
        catch (MongoCommandException exception) when (exception.Code == 26) // Fresh collection does not exist yet.
        {
            indexes = [];
        }

        var textIndex = indexes.SingleOrDefault(index => index.Contains("weights"));
        var textKeys = new BsonDocument { { "_fts", "text" }, { "_ftsx", 1 } };
        var creatorTextKeys = new BsonDocument { { nameof(TextSnippetEntity.CreatedByUserId), 1 }, { "_fts", "text" }, { "_ftsx", 1 } };
        if (textIndex != null && textIndex.GetValue("name", "") == CREATOR_TEXT_INDEX_NAME && HasExpectedTextDefinition(textIndex, creatorTextKeys))
            return;

        if (textIndex != null && (!allowLegacyRebuild ||
            textIndex.GetValue("name", "") != LEGACY_TEXT_INDEX_NAME || !HasExpectedTextDefinition(textIndex, textKeys)))
        {
            throw new InvalidOperationException(
                "TextSnippet requires a creator-prefixed text index. The existing index was preserved. " +
                "See EasyPlatform.README.md: stop all readers/writers and back up before enabling " +
                "MongoDB:RebuildCreatorTextSearchIndex for the known legacy index. Custom indexes require an explicit reviewed upgrade.");
        }

        // A compound text index cannot contain an array-valued prefix. Reject incompatible legacy data BEFORE dropping anything.
        var rawCollection = collection.Database.GetCollection<BsonDocument>(collection.CollectionNamespace.CollectionName);
        var invalidOwner = new BsonDocument("$expr", new BsonDocument("$not", new BsonArray
        {
            new BsonDocument("$in", new BsonArray
            {
                new BsonDocument("$type", "$" + nameof(TextSnippetEntity.CreatedByUserId)),
                new BsonArray { "string", "null", "missing" }
            })
        }));
        if (await rawCollection.Find(invalidOwner).Limit(1).AnyAsync())
            throw new InvalidOperationException("TextSnippet creator values must be scalar strings or null before the text-index upgrade. No index was dropped.");

        if (textIndex != null)
            await collection.Indexes.DropOneAsync(LEGACY_TEXT_INDEX_NAME);

        // If a build fails, startup fails. The next start retries creation without dropping a completed target index.
        await collection.Indexes.CreateOneAsync(BuildCreatorTextIndex());
    }

    private static bool HasExpectedTextDefinition(BsonDocument index, BsonDocument expectedKeys)
    {
        string[] knownOptions = ["v", "key", "name", "ns", "weights", "default_language", "language_override", "textIndexVersion"];
        if (index.Names.Any(name => !knownOptions.Contains(name)) || index["key"] != expectedKeys ||
            index.GetValue("default_language", "") != "english" || index.GetValue("language_override", "") != "language" ||
            index.GetValue("textIndexVersion", 0) != 3)
            return false;

        var weights = index["weights"].AsBsonDocument;
        return weights.ElementCount == 2 && weights.GetValue(nameof(TextSnippetEntity.SnippetText), 0) == 1 &&
            weights.GetValue(nameof(TextSnippetEntity.FullText), 0) == 1;
    }
}
