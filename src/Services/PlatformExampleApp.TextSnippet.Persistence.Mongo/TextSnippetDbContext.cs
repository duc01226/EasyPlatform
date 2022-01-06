using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.MongoDB;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo
{
    public class TextSnippetDbContext : PlatformMongoDbContext<TextSnippetDbContext>
    {
        public TextSnippetDbContext(IOptions<PlatformMongoOptions<TextSnippetDbContext>> options, IPlatformMongoClient<TextSnippetDbContext> client) : base(options, client)
        {
        }

        public IMongoCollection<TextSnippetEntity> TextSnippetCollection => GetCollection<TextSnippetEntity>();

        public override async Task InternalEnsureIndexesAsync(bool recreate = false)
        {
            if (recreate)
            {
                await Task.WhenAll(
                    TextSnippetCollection.Indexes.DropAllAsync());
            }

            await Task.WhenAll(
                TextSnippetCollection.Indexes.CreateManyAsync(new List<CreateIndexModel<TextSnippetEntity>>()
                {
                    new CreateIndexModel<TextSnippetEntity>(Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.CreatedBy)),
                    new CreateIndexModel<TextSnippetEntity>(Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.CreatedDate)),
                    new CreateIndexModel<TextSnippetEntity>(Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.LastUpdatedBy)),
                    new CreateIndexModel<TextSnippetEntity>(Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.LastUpdatedDate)),
                    new CreateIndexModel<TextSnippetEntity>(Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.SnippetText)),
                    new CreateIndexModel<TextSnippetEntity>(Builders<TextSnippetEntity>.IndexKeys.Text(p => p.SnippetText))
                }));
        }

        public override List<KeyValuePair<Type, string>> EntityTypeToCollectionNameMaps()
        {
            return new List<KeyValuePair<Type, string>>()
            {
                new KeyValuePair<Type, string>(typeof(TextSnippetEntity), "TextSnippetEntity")
            };
        }
    }
}
