using Easy.Platform.Application;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.MongoDB;
using Easy.Platform.Persistence;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using PlatformExampleApp.TextSnippet.Application.Persistence;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo;

public sealed class TextSnippetDbContext : PlatformMongoDbContext<TextSnippetDbContext>, ITextSnippetDbContext
{
    public TextSnippetDbContext(
        IPlatformMongoDatabase<TextSnippetDbContext> database,
        ILoggerFactory loggerFactory,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        PlatformPersistenceConfiguration<TextSnippetDbContext> persistenceConfiguration,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformApplicationSettingContext applicationSettingContext) : base(
        database,
        loggerFactory,
        requestContextAccessor,
        persistenceConfiguration,
        rootServiceProvider,
        applicationSettingContext)
    {
    }

    public IMongoCollection<TextSnippetEntity> TextSnippetCollection => GetCollection<TextSnippetEntity>();

    public IMongoCollection<TextSnippetCategory> TextSnippetCategoryCollection => GetCollection<TextSnippetCategory>();

    public override async Task InternalEnsureIndexesAsync(bool recreate = false)
    {
        if (recreate)
            await Task.WhenAll(
                TextSnippetCollection.Indexes.DropAllAsync(),
                TextSnippetCategoryCollection.Indexes.DropAllAsync());

        await Task.WhenAll(
            TextSnippetCollection.Indexes.CreateManyAsync(
            [
                BuildCreatorSearchIndex(),
                new CreateIndexModel<TextSnippetEntity>(
                    Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.CreatedBy)),
                new CreateIndexModel<TextSnippetEntity>(
                    Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.CreatedDate)),
                new CreateIndexModel<TextSnippetEntity>(
                    Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.LastUpdatedBy)),
                new CreateIndexModel<TextSnippetEntity>(
                    Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.LastUpdatedDate)),
                new CreateIndexModel<TextSnippetEntity>(
                    Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.SnippetText)),
                new CreateIndexModel<TextSnippetEntity>(
                    Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.Address)),
                new CreateIndexModel<TextSnippetEntity>(
                    Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.Addresses)),
                new CreateIndexModel<TextSnippetEntity>(
                    Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.AddressStrings)),
                TextSnippetSearchIndexes.BuildCreatorTextIndex()
            ]),
            TextSnippetCategoryCollection.Indexes.CreateManyAsync(
            [
                new CreateIndexModel<TextSnippetCategory>(
                    Builders<TextSnippetCategory>.IndexKeys.Ascending(c => c.ParentCategoryId)),
                new CreateIndexModel<TextSnippetCategory>(
                    Builders<TextSnippetCategory>.IndexKeys.Ascending(c => c.Name)),
                new CreateIndexModel<TextSnippetCategory>(
                    Builders<TextSnippetCategory>.IndexKeys.Ascending(c => c.IsActive)),
                new CreateIndexModel<TextSnippetCategory>(
                    Builders<TextSnippetCategory>.IndexKeys.Ascending(c => c.SortOrder))
            ]));
    }

    // Shared by fresh initialization and the create-only upgrade for existing databases.
    internal static CreateIndexModel<TextSnippetEntity> BuildCreatorSearchIndex()
    {
        return new CreateIndexModel<TextSnippetEntity>(
            Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.CreatedByUserId).Descending(p => p.CreatedDate));
    }

    public override List<KeyValuePair<Type, string>> EntityTypeToCollectionNameMaps()
    {
        return
        [
            new KeyValuePair<Type, string>(typeof(TextSnippetEntity), "TextSnippetEntity"),
            new KeyValuePair<Type, string>(typeof(TextSnippetCategory), "TextSnippetCategory")
        ];
    }
}
