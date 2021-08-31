using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.EventBus;
using AngularDotnetPlatform.Platform.EfCore;
using AngularDotnetPlatform.Platform.MongoDB.Migration;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace AngularDotnetPlatform.Platform.MongoDB
{
    public abstract class PlatformMongoDbContext<TDbContext> : IPlatformMongoDbContext<TDbContext>
        where TDbContext : PlatformMongoDbContext<TDbContext>
    {
        public static readonly string EnsureIndexesAsyncMigrationName = "EnsureIndexesAsync";

        public readonly IMongoDatabase Database;

        public PlatformMongoDbContext(IOptions<PlatformMongoOptions> options, IPlatformMongoClientContext client)
        {
            Database = client.MongoClient.GetDatabase(options.Value.Database);
        }

        public bool Disposed { get; private set; }
        public IMongoCollection<PlatformDataMigrationHistory> DataMigrationHistoryCollection => Database.GetCollection<PlatformDataMigrationHistory>(DataMigrationHistoryCollectionName);
        public IMongoCollection<PlatformInboxEventBusMessage> InboxEventBusMessageCollection => Database.GetCollection<PlatformInboxEventBusMessage>("InboxEventBusMessage");
        public virtual string DataMigrationHistoryCollectionName => "MigrationHistory";

        public List<PlatformMongoMigrationExecution<TDbContext>> MigrationExecutions()
        {
            var results = GetType().Assembly.GetTypes()
                .Where(p => p.IsAssignableTo(typeof(PlatformMongoMigrationExecution<TDbContext>)) && !p.IsAbstract)
                .Select(p => (PlatformMongoMigrationExecution<TDbContext>)Activator.CreateInstance(p))
                .Where(p => p != null)
                .ToList();
            return results;
        }

        public async Task EnsureIndexesAsync(bool recreate = false)
        {
            if (recreate || !IsEnsureIndexesExecuted())
            {
                await Task.WhenAll(
                    DataMigrationHistoryCollection.Indexes.DropAllAsync(),
                    InboxEventBusMessageCollection.Indexes.DropAllAsync());
            }

            if (recreate || !IsEnsureIndexesExecuted())
            {
                await Task.WhenAll(
                    DataMigrationHistoryCollection.Indexes.CreateManyAsync(new List<CreateIndexModel<PlatformDataMigrationHistory>>
                    {
                        new CreateIndexModel<PlatformDataMigrationHistory>(
                            Builders<PlatformDataMigrationHistory>.IndexKeys.Ascending(p => p.Name),
                            new CreateIndexOptions() {Unique = true})
                    }),
                    InboxEventBusMessageCollection.Indexes.CreateManyAsync(new List<CreateIndexModel<PlatformInboxEventBusMessage>>
                    {
                        new CreateIndexModel<PlatformInboxEventBusMessage>(Builders<PlatformInboxEventBusMessage>.IndexKeys.Ascending(p => p.RoutingKey)),
                        new CreateIndexModel<PlatformInboxEventBusMessage>(Builders<PlatformInboxEventBusMessage>.IndexKeys.Descending(p => p.ConsumerDate))
                    }));

                await InternalEnsureIndexesAsync(recreate: !IsEnsureIndexesExecuted() || recreate);
            }

            if (!IsEnsureIndexesExecuted())
            {
                await LogEnsureIndexesExecutedHistory();
            }
        }

        public abstract Task InternalEnsureIndexesAsync(bool recreate = false);

        public string GenerateId()
        {
            return new BsonObjectId(ObjectId.GenerateNewId()).ToString();
        }

        public void Initialize()
        {
            EnsureIndexesAsync().Wait();
            Migrate();
        }

        public void Migrate()
        {
            EnsureAllMigrationExecutionsHasUniqueName();
            GetNotExecutedMigrations().ForEach(migrationExecution =>
            {
                migrationExecution.Execute((TDbContext)this);
                DataMigrationHistoryCollection.InsertOne(new PlatformDataMigrationHistory(migrationExecution.Name));
            });
        }

        public virtual string GetCollectionName<TEntity>()
        {
            return typeof(TEntity).Name;
        }

        public IMongoCollection<TEntity> GetCollection<TEntity>()
        {
            return Database.GetCollection<TEntity>(GetCollectionName<TEntity>());
        }

        public Task<List<T>> ToListAsync<T>(IQueryable<T> query)
        {
            if (query is IMongoQueryable<T> mongoQuery)
            {
                return mongoQuery.ToListAsync();
            }

            throw new ArgumentException("Query couldn't be async");
        }

        public Task<T> FirstOrDefaultAsync<T>(IQueryable<T> query)
        {
            if (query is IMongoQueryable<T> mongoQuery)
            {
                return mongoQuery.FirstOrDefaultAsync();
            }

            throw new ArgumentException("Query couldn't be async");
        }

        public IQueryable<T> GetQueryable<T>(string dataSourceName)
        {
            return Database.GetCollection<T>(dataSourceName).AsQueryable();
        }

        public void RunCommand(string command)
        {
            Database.RunCommand<BsonDocument>(command);
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (Disposed)
            {
                return;
            }

            if (disposing)
            {
                // Dispose managed state (managed objects).
            }

            Disposed = true;
        }

        protected bool IsEnsureIndexesExecuted()
        {
            return DataMigrationHistoryCollection.AsQueryable().Any(p => p.Name == EnsureIndexesAsyncMigrationName);
        }

        private void EnsureAllMigrationExecutionsHasUniqueName()
        {
            var mongoMigrationExecutions = new Dictionary<string, PlatformMongoMigrationExecution<TDbContext>>();
            foreach (var mongoMigrationExecution in MigrationExecutions())
            {
                if (mongoMigrationExecutions.ContainsKey(mongoMigrationExecution.Name))
                {
                    throw new Exception($"Migration Execution Names is duplicated. Duplicated name: {mongoMigrationExecution.Name}");
                }

                mongoMigrationExecutions.Add(mongoMigrationExecution.Name, mongoMigrationExecution);
            }
        }

        private List<PlatformMongoMigrationExecution<TDbContext>> GetNotExecutedMigrations()
        {
            var executedMigrations = DataMigrationHistoryCollection.AsQueryable().ToList();
            var notExecutedMigrations = OrderedMigrationExecutions().FindAll(me => executedMigrations.All(em => em.Name != me.Name));
            return notExecutedMigrations;
        }

        private List<PlatformMongoMigrationExecution<TDbContext>> OrderedMigrationExecutions()
        {
            return MigrationExecutions().OrderBy(x => x.GetOrderByValue()).ToList();
        }

        private async Task LogEnsureIndexesExecutedHistory()
        {
            await DataMigrationHistoryCollection.InsertOneAsync(
                new PlatformDataMigrationHistory(EnsureIndexesAsyncMigrationName));
        }
    }
}
