using Easy.Platform.MongoDB.Migration;
using MongoDB.Driver;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo.Migrations;

/// <summary>
/// Existing databases skip initial index creation once its sentinel exists. Add the private search
/// access path without rebuilding indexes or changing stored documents; repeated creation is idempotent.
/// </summary>
internal sealed class EnsureCreatorSearchIndexForMongo : PlatformMongoMigrationExecutor<TextSnippetDbContext>
{
    public override string Name => "20261017000000_EnsureCreatorSearchIndexForMongo";

    protected override async Task InternalExecute(TextSnippetDbContext dbContext)
    {
        await dbContext.TextSnippetCollection.Indexes.CreateOneAsync(TextSnippetDbContext.BuildCreatorSearchIndex());
    }
}
