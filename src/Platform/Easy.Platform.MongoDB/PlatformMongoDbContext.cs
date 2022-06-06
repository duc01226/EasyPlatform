using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Application.EventBus.OutboxPattern;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.MongoDB.Migration;
using Easy.Platform.Persistence;
using Easy.Platform.Persistence.DataMigration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace Easy.Platform.MongoDB
{
    public interface IPlatformMongoDbContext<TDbContext> : IPlatformDbContext
        where TDbContext : IPlatformMongoDbContext<TDbContext>
    {
        IMongoCollection<PlatformMongoMigrationHistory> MigrationHistoryCollection { get; }
        string DataMigrationHistoryCollectionName { get; }

        Task EnsureIndexesAsync(bool recreate = false);
        string GenerateId();
        void Migrate();
        string GetCollectionName<TEntity>();
        IMongoCollection<TEntity> GetCollection<TEntity>();
        IQueryable<T> GetQueryable<T>(string dataSourceName);
    }

    public abstract class PlatformMongoDbContext<TDbContext> : IPlatformMongoDbContext<TDbContext>
        where TDbContext : PlatformMongoDbContext<TDbContext>
    {
        public static readonly string EnsureIndexesMigrationName = "EnsureIndexesAsync";
        public static readonly string PlatformInboxEventBusMessageCollectionName = "InboxEventBusMessage";
        public static readonly string PlatformOutboxEventBusMessageCollectionName = "OutboxEventBusMessage";
        public static readonly string PlatformDataMigrationHistoryCollectionName = "MigrationHistory";

        public readonly IMongoDatabase Database;

        protected readonly Lazy<Dictionary<Type, string>> EntityTypeToCollectionNameDictionary;

        public PlatformMongoDbContext(IOptions<PlatformMongoOptions<TDbContext>> options, IPlatformMongoClient<TDbContext> client)
        {
            Database = client.MongoClient.GetDatabase(options.Value.Database);
            EntityTypeToCollectionNameDictionary = new Lazy<Dictionary<Type, string>>(() =>
            {
                var entityTypeToCollectionNameMaps = EntityTypeToCollectionNameMaps();
                return entityTypeToCollectionNameMaps != null ? new Dictionary<Type, string>(entityTypeToCollectionNameMaps) : null;
            });
        }

        public bool Disposed { get; private set; }
        public IMongoCollection<PlatformMongoMigrationHistory> MigrationHistoryCollection => Database.GetCollection<PlatformMongoMigrationHistory>(DataMigrationHistoryCollectionName);
        public IMongoCollection<PlatformInboxEventBusMessage> InboxEventBusMessageCollection => Database.GetCollection<PlatformInboxEventBusMessage>(GetCollectionName<PlatformInboxEventBusMessage>());
        public IMongoCollection<PlatformOutboxEventBusMessage> OutboxEventBusMessageCollection => Database.GetCollection<PlatformOutboxEventBusMessage>(GetCollectionName<PlatformOutboxEventBusMessage>());
        public IMongoCollection<PlatformDataMigrationHistory> ApplicationDataMigrationHistoryCollection => Database.GetCollection<PlatformDataMigrationHistory>(ApplicationDataMigrationHistoryCollectionName);
        public IQueryable<PlatformDataMigrationHistory> ApplicationDataMigrationHistoryQuery => ApplicationDataMigrationHistoryCollection.AsQueryable();
        public virtual string DataMigrationHistoryCollectionName => "MigrationHistory";
        public virtual string ApplicationDataMigrationHistoryCollectionName => "ApplicationDataMigrationHistory";

        public virtual async Task EnsureIndexesAsync(bool recreate = false)
        {
            await EnsureMigrationHistoryCollectionIndexesAsync(recreate);
            await EnsureApplicationDataMigrationHistoryCollectionIndexesAsync(recreate);
            await EnsureInboxEventBusMessageCollectionIndexesAsync(recreate);
            await EnsureOutboxEventBusMessageCollectionIndexesAsync(recreate);

            if (recreate || !IsEnsureIndexesExecuted())
            {
                await InternalEnsureIndexesAsync(recreate: !IsEnsureIndexesExecuted() || recreate);
            }

            if (!IsEnsureIndexesExecuted())
            {
                await SaveIndexesExecutedMigrationHistory();
            }
        }

        public virtual async Task EnsureMigrationHistoryCollectionIndexesAsync(bool recreate = false)
        {
            if (recreate || !IsEnsureIndexesExecuted())
            {
                await MigrationHistoryCollection.Indexes.DropAllAsync();
            }

            if (recreate || !IsEnsureIndexesExecuted())
            {
                await MigrationHistoryCollection.Indexes.CreateManyAsync(new List<CreateIndexModel<PlatformMongoMigrationHistory>>
                {
                    new CreateIndexModel<PlatformMongoMigrationHistory>(
                        Builders<PlatformMongoMigrationHistory>.IndexKeys.Ascending(p => p.Name),
                        new CreateIndexOptions() {Unique = true})
                });
            }
        }

        public virtual async Task EnsureApplicationDataMigrationHistoryCollectionIndexesAsync(bool recreate = false)
        {
            if (recreate || !IsEnsureIndexesExecuted())
            {
                await ApplicationDataMigrationHistoryCollection.Indexes.DropAllAsync();
            }

            if (recreate || !IsEnsureIndexesExecuted())
            {
                await ApplicationDataMigrationHistoryCollection.Indexes.CreateManyAsync(new List<CreateIndexModel<PlatformDataMigrationHistory>>
                {
                    new CreateIndexModel<PlatformDataMigrationHistory>(
                        Builders<PlatformDataMigrationHistory>.IndexKeys.Ascending(p => p.Name),
                        new CreateIndexOptions() {Unique = true})
                });
            }
        }

        public virtual async Task EnsureInboxEventBusMessageCollectionIndexesAsync(bool recreate = false)
        {
            if (recreate || !IsEnsureIndexesExecuted())
            {
                await InboxEventBusMessageCollection.Indexes.DropAllAsync();
            }

            if (recreate || !IsEnsureIndexesExecuted())
            {
                await InboxEventBusMessageCollection.Indexes.CreateManyAsync(new List<CreateIndexModel<PlatformInboxEventBusMessage>>
                {
                    new CreateIndexModel<PlatformInboxEventBusMessage>(Builders<PlatformInboxEventBusMessage>.IndexKeys.Ascending(p => p.RoutingKey)),
                    new CreateIndexModel<PlatformInboxEventBusMessage>(Builders<PlatformInboxEventBusMessage>.IndexKeys
                        .Ascending(p => p.ConsumeStatus)
                        .Ascending(p => p.LastConsumeDate)),
                    new CreateIndexModel<PlatformInboxEventBusMessage>(Builders<PlatformInboxEventBusMessage>.IndexKeys
                        .Ascending(p => p.ConsumeStatus)
                        .Ascending(p => p.CreatedDate)),
                    new CreateIndexModel<PlatformInboxEventBusMessage>(Builders<PlatformInboxEventBusMessage>.IndexKeys.Descending(p => p.LastConsumeDate)),
                    new CreateIndexModel<PlatformInboxEventBusMessage>(Builders<PlatformInboxEventBusMessage>.IndexKeys.Descending(p => p.CreatedDate))
                });
            }
        }

        public virtual async Task EnsureOutboxEventBusMessageCollectionIndexesAsync(bool recreate = false)
        {
            if (recreate || !IsEnsureIndexesExecuted())
            {
                await OutboxEventBusMessageCollection.Indexes.DropAllAsync();
            }

            if (recreate || !IsEnsureIndexesExecuted())
            {
                await OutboxEventBusMessageCollection.Indexes.CreateManyAsync(new List<CreateIndexModel<PlatformOutboxEventBusMessage>>
                {
                    new CreateIndexModel<PlatformOutboxEventBusMessage>(Builders<PlatformOutboxEventBusMessage>.IndexKeys.Ascending(p => p.RoutingKey)),
                    new CreateIndexModel<PlatformOutboxEventBusMessage>(Builders<PlatformOutboxEventBusMessage>.IndexKeys
                        .Ascending(p => p.SendStatus)
                        .Ascending(p => p.LastSendDate)),
                    new CreateIndexModel<PlatformOutboxEventBusMessage>(Builders<PlatformOutboxEventBusMessage>.IndexKeys
                        .Ascending(p => p.SendStatus)
                        .Ascending(p => p.CreatedDate)),
                    new CreateIndexModel<PlatformOutboxEventBusMessage>(Builders<PlatformOutboxEventBusMessage>.IndexKeys.Descending(p => p.LastSendDate)),
                    new CreateIndexModel<PlatformOutboxEventBusMessage>(Builders<PlatformOutboxEventBusMessage>.IndexKeys.Descending(p => p.CreatedDate))
                });
            }
        }

        public abstract Task InternalEnsureIndexesAsync(bool recreate = false);

        public string GenerateId()
        {
            return new BsonObjectId(ObjectId.GenerateNewId()).ToString();
        }

        public virtual void Initialize(IServiceProvider serviceProvider)
        {
            EnsureIndexesAsync().Wait();
            Migrate();
            MigrateApplicationDataAsync(serviceProvider).Wait();
        }

        public async Task<IEnumerable<T>> GetAllAsync<T>(IQueryable<T> query, CancellationToken cancellationToken = default)
        {
            if (query is IMongoQueryable<T> mongoQueryable)
                return await mongoQueryable.ToListAsync(cancellationToken);
            return query.ToList();
        }

        public async Task<T> FirstOrDefaultAsync<T>(IQueryable<T> query, CancellationToken cancellationToken = default)
        {
            if (query is IMongoQueryable<T> mongoQueryable)
                return await mongoQueryable.FirstOrDefaultAsync(cancellationToken);
            return query.FirstOrDefault();
        }

        public void Migrate()
        {
            EnsureAllMigrationExecutorsHasUniqueName();
            GetCanExecuteMigrationExecutors().ForEach(migrationExecutor =>
            {
                migrationExecutor.Execute((TDbContext)this);
                MigrationHistoryCollection.InsertOne(new PlatformMongoMigrationHistory(migrationExecutor.Name));
                SaveChangesAsync().Wait();
            });
        }

        public string GetCollectionName<TEntity>()
        {
            if (TryGetCollectionName<TEntity>(out var collectionName))
            {
                return collectionName;
            }

            if (TryGetPlatformEntityCollectionName<TEntity>() != null)
                return TryGetPlatformEntityCollectionName<TEntity>();

            throw new Exception($"Missing collection name mapping item for entity {typeof(TEntity).Name}. Please define it in return of {nameof(EntityTypeToCollectionNameMaps)} method.");
        }

        private static string TryGetPlatformEntityCollectionName<TEntity>()
        {
            if (typeof(TEntity).IsAssignableTo(typeof(PlatformInboxEventBusMessage)))
            {
                return PlatformInboxEventBusMessageCollectionName;
            }

            if (typeof(TEntity).IsAssignableTo(typeof(PlatformOutboxEventBusMessage)))
            {
                return PlatformOutboxEventBusMessageCollectionName;
            }

            if (typeof(TEntity).IsAssignableTo(typeof(PlatformMongoMigrationHistory)))
            {
                return PlatformDataMigrationHistoryCollectionName;
            }

            return null;
        }

        /// <summary>
        /// This is used for <see cref="TryGetCollectionName{TEntity}"/> to return the collection name for TEntity
        /// </summary>
        public virtual List<KeyValuePair<Type, string>> EntityTypeToCollectionNameMaps() { return null; }

        public IMongoCollection<TEntity> GetCollection<TEntity>()
        {
            return Database.GetCollection<TEntity>(GetCollectionName<TEntity>());
        }

        public IQueryable<T> GetQueryable<T>(string dataSourceName)
        {
            return Database.GetCollection<T>(dataSourceName).AsQueryable();
        }

        public Task SaveChangesAsync()
        {
            return Task.CompletedTask;
        }

        public IQueryable<TEntity> GetQuery<TEntity>() where TEntity : class, IEntity
        {
            return GetCollection<TEntity>().AsQueryable();
        }

        public Task MigrateApplicationDataAsync(IServiceProvider serviceProvider)
        {
            PlatformDataMigrationExecutor<TDbContext>.EnsureAllDataMigrationExecutorsHasUniqueName(GetType().Assembly, serviceProvider);
            PlatformDataMigrationExecutor<TDbContext>.GetCanExecuteDataMigrationExecutors(GetType().Assembly, serviceProvider, ApplicationDataMigrationHistoryQuery).ForEach(migrationExecution =>
            {
                if (!migrationExecution.IsObsolete())
                {
                    var logger = serviceProvider
                        .GetService<ILoggerFactory>()
                        .CreateLogger(migrationExecution.GetType());

                    logger.LogInformationIfEnabled($"Migration {migrationExecution.Name} started.");

                    migrationExecution.Execute((TDbContext)this);

                    ApplicationDataMigrationHistoryCollection.InsertOne(new PlatformDataMigrationHistory(migrationExecution.Name));

                    logger.LogInformationIfEnabled($"Migration {migrationExecution.Name} finished.");

                    SaveChangesAsync().Wait();
                }

                migrationExecution.Dispose();
            });

            return Task.CompletedTask;
        }

        public void RunCommand(string command)
        {
            Database.RunCommand<BsonDocument>(command);
        }

        public void Dispose()
        {
            if (Disposed)
            {
                return;
            }

            Dispose(true);
            GC.SuppressFinalize(this);

            Disposed = true;
        }

        protected virtual void Dispose(bool disposing)
        {
            if (disposing)
            {
                // Dispose managed state (managed objects).
            }
        }

        /// <summary>
        /// TryGetCollectionName for <see cref="GetCollectionName{TEntity}"/> to return the entity collection.
        /// Default will get from return of <see cref="EntityTypeToCollectionNameMaps"/>
        /// </summary>
        protected virtual bool TryGetCollectionName<TEntity>(out string collectionName)
        {
            if (EntityTypeToCollectionNameDictionary.Value == null || !EntityTypeToCollectionNameDictionary.Value.ContainsKey(typeof(TEntity)))
            {
                collectionName = TryGetPlatformEntityCollectionName<TEntity>() ?? typeof(TEntity).Name;
                return true;
            }

            return EntityTypeToCollectionNameDictionary.Value.TryGetValue(typeof(TEntity), out collectionName);
        }

        protected bool IsEnsureIndexesExecuted()
        {
            return MigrationHistoryCollection.AsQueryable().Any(p => p.Name == EnsureIndexesMigrationName);
        }

        private List<PlatformMongoMigrationExecutor<TDbContext>> ScanAllMigrationExecutors()
        {
            var results = GetType().Assembly.GetTypes()
                .Where(p => p.IsAssignableTo(typeof(PlatformMongoMigrationExecutor<TDbContext>)) && !p.IsAbstract)
                .Select(p => (PlatformMongoMigrationExecutor<TDbContext>)Activator.CreateInstance(p))
                .Where(p => p != null)
                .ToList();
            return results;
        }

        private void EnsureAllMigrationExecutorsHasUniqueName()
        {
            var mongoMigrationExecutionNames = new HashSet<string>();

            foreach (var mongoMigrationExecution in ScanAllMigrationExecutors())
            {
                if (mongoMigrationExecutionNames.Contains(mongoMigrationExecution.Name))
                {
                    throw new Exception($"Mongo Migration Executor Names is duplicated. Duplicated name: {mongoMigrationExecution.Name}");
                }

                mongoMigrationExecutionNames.Add(mongoMigrationExecution.Name);
            }
        }

        private List<PlatformMongoMigrationExecutor<TDbContext>> GetCanExecuteMigrationExecutors()
        {
            var executedMigrationNames = MigrationHistoryCollection.AsQueryable().Select(p => p.Name).ToHashSet();

            var notExecutedMigrations = ScanAllMigrationExecutors()
                .Where(p => !p.IsExpired())
                .OrderBy(x => x.GetOrderByValue())
                .ToList()
                .FindAll(me => !executedMigrationNames.Contains(me.Name));

            return notExecutedMigrations;
        }

        private async Task SaveIndexesExecutedMigrationHistory()
        {
            await MigrationHistoryCollection.InsertOneAsync(
                new PlatformMongoMigrationHistory(EnsureIndexesMigrationName));
        }
    }
}
