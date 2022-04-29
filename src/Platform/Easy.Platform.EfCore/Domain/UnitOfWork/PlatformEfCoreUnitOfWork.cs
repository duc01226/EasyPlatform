using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.EntityFrameworkCore;

namespace Easy.Platform.EfCore.Domain.UnitOfWork
{
    public interface IPlatformEfCoreUnitOfWork<TDbContext> : IUnitOfWork where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        public TDbContext DbContext { get; }
    }

    public class PlatformEfCoreUnitOfWork<TDbContext> : PlatformUnitOfWork<TDbContext>, IPlatformEfCoreUnitOfWork<TDbContext> where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        public PlatformEfCoreUnitOfWork(TDbContext dbContext) : base(dbContext)
        {
        }

        public override async Task CompleteAsync(CancellationToken cancellationToken = default)
        {
            if (Completed)
                return;

            try
            {
                await Task.WhenAll(InnerUnitOfWorks.Where(p => p.IsActive()).Select(p => p.CompleteAsync(cancellationToken)));
                await SaveChangesAsync(cancellationToken);
                Completed = true;
                InvokeOnCompleted(this, EventArgs.Empty);
            }
            catch (DbUpdateConcurrencyException concurrencyException)
            {
                throw new PlatformRowVersionConflictDomainException(concurrencyException.Message, concurrencyException);
            }
            catch (Exception e)
            {
                InvokeOnFailed(this, new UnitOfWorkFailedArgs(e));
                throw;
            }
        }

        protected override async Task SaveChangesAsync(CancellationToken cancellationToken)
        {
            await DbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
