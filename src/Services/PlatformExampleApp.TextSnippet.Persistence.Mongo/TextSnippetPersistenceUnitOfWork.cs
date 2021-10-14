using System;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.MongoDB.Domain.UnitOfWork;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo
{
    // If you want to implement or override your own custom uow, just define a uow implement
    // IPlatformMongoDbUnitOfWork or PlatformMongoDbUnitOfWork
    //internal class TextSnippetPersistenceUnitOfWork : PlatformMongoDbUnitOfWork<TextSnippetDbContext>
    //{
    //    public TextSnippetPersistenceUnitOfWork(TextSnippetDbContext dbContext) : base(dbContext)
    //    {
    //    }

    //    public new event EventHandler OnCompleted;
    //    public new event EventHandler<UnitOfWorkFailedArgs> OnFailed;

    //    public override Task CompleteAsync(CancellationToken cancellationToken = default)
    //    {
    //        if (Completed)
    //            throw new Exception("This unit of work is completed");

    //        try
    //        {
    //            Completed = true;

    //            // Some custom code for example log out when CompleteAsync

    //            OnCompleted?.Invoke(this, EventArgs.Empty);
    //        }
    //        catch (Exception e)
    //        {
    //            OnFailed?.Invoke(this, new UnitOfWorkFailedArgs(e));
    //            throw;
    //        }

    //        return Task.CompletedTask;
    //    }
    //}
}
