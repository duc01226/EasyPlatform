using Easy.Platform.Persistence.DataMigration;
using MongoDB.Driver;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo.DemoMigrateDataCrossDb;

namespace PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo.DataMigrations;

internal class DemoMigrateDataCrossDb : PlatformDataMigrationExecutor<TextSnippetMultiDbDemoDbContext>
{
    private readonly DemoMigrateDataCrossDbContext demoMigrateDataCrossDbContext;

    public DemoMigrateDataCrossDb(DemoMigrateDataCrossDbContext demoMigrateDataCrossDbContext)
    {
        this.demoMigrateDataCrossDbContext = demoMigrateDataCrossDbContext;
    }

    public override string Name => GetType().Name;
    public override int Order => 0;

    /// <summary>
    /// This application data migration only valid until 2022/12/01
    /// </summary>
    public override DateTime? ExpiredAt => new DateTime(2022, 12, 1);

    public override void Execute(TextSnippetMultiDbDemoDbContext dbContext)
    {
        var demoApplicationMigrationEntity = demoMigrateDataCrossDbContext.GetQuery<TextSnippetEntity>()
            .FirstOrDefault(p => p.SnippetText == "DemoMigrateApplicationDataDbContext Entity");
        if (demoApplicationMigrationEntity != null)
        {
            dbContext.MultiDbDemoEntityCollection.DeleteOne(p => p.Id == demoApplicationMigrationEntity.Id);
            dbContext.MultiDbDemoEntityCollection.InsertOne(
                new MultiDbDemoEntity
                {
                    Id = demoApplicationMigrationEntity.Id,
                    Name =
                        $"DemoApplicationMigrationEntity.SnippetText: {demoApplicationMigrationEntity.SnippetText}"
                });
        }
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing)
            demoMigrateDataCrossDbContext.Dispose();
    }

    /// <summary>
    /// Demo code if the database schema is changed so that this application data migration is not valid anymore
    /// </summary>
    /// <returns></returns>
    public override bool IsObsolete()
    {
        return demoMigrateDataCrossDbContext.MigrationHistoryCollection.AsQueryable()
            .Any(p => p.Name == "StopDemoMigrateApplicationDataCrossDb");
    }
}
