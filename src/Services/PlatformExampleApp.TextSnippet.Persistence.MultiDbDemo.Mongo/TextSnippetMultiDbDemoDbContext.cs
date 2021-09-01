using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.EfCore;
using AngularDotnetPlatform.Platform.MongoDB;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo
{
    public class TextSnippetMultiDbDemoDbContext : PlatformMongoDbContext<TextSnippetMultiDbDemoDbContext>
    {
        public TextSnippetMultiDbDemoDbContext(IOptions<TextSnippetMultiDbDemoMongoOptions> options, TextSnippetMultiDbDemoMongoClientContext client) : base(options, client)
        {
        }

        public IMongoCollection<MultiDbDemoEntity> MultiDbDemoEntityCollection => GetCollection<MultiDbDemoEntity>();

        public override async Task InternalEnsureIndexesAsync(bool recreate = false)
        {
            if (recreate)
            {
                await Task.WhenAll(
                    MultiDbDemoEntityCollection.Indexes.DropAllAsync());
            }

            await Task.WhenAll(
                MultiDbDemoEntityCollection.Indexes.CreateManyAsync(new List<CreateIndexModel<MultiDbDemoEntity>>()
                {
                    new CreateIndexModel<MultiDbDemoEntity>(Builders<MultiDbDemoEntity>.IndexKeys.Ascending(p => p.Name))
                }));
        }

        public override List<KeyValuePair<Type, string>> EntityTypeToCollectionNameMaps()
        {
            return new List<KeyValuePair<Type, string>>()
            {
                new KeyValuePair<Type, string>(typeof(MultiDbDemoEntity), "MultiDbDemoEntity")
            };
        }
    }
}
