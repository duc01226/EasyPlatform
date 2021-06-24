using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using NoCeiling.Duc.Interview.Test.Platform.Domain.UnitOfWork;

namespace NoCeiling.Duc.Interview.Test.Platform.MongoDB.Domain.UnitOfWork
{
    public abstract class PlatformMongoDbUnitOfWork<TDbContext> : IUnitOfWork where TDbContext : PlatformMongoDbContext<TDbContext>
    {
        private readonly TDbContext dbContext;

        public PlatformMongoDbUnitOfWork(TDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public bool Completed { get; private set; }
        public bool Disposed { get; private set; }

        public Task CompleteAsync()
        {
            Completed = true;
            return Task.CompletedTask;
        }

        public void Dispose()
        {
            // Dispose of unmanaged resources.
            Dispose(true);
            // Suppress finalization.
            GC.SuppressFinalize(this);
        }

        // Protected implementation of Dispose pattern.
        protected virtual void Dispose(bool disposing)
        {
            if (Disposed)
            {
                return;
            }

            if (disposing)
            {
                // Dispose managed state (managed objects).
                // context?.Dispose();
            }

            Disposed = true;
        }
    }
}
