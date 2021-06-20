using System.Threading.Tasks;
using NoCeiling.Duc.Interview.Test.Platform.Domain.UnitOfWork;

namespace NoCeiling.Duc.Interview.Test.Platform.Application
{
    public interface IPlatformApplicationDataSeeder
    {
        public Task SeedData();
    }

    public abstract class PlatformApplicationDataSeeder : IPlatformApplicationDataSeeder
    {
        private readonly IUnitOfWorkManager unitOfWorkManager;

        public PlatformApplicationDataSeeder(IUnitOfWorkManager unitOfWorkManager)
        {
            this.unitOfWorkManager = unitOfWorkManager;
        }

        public async Task SeedData()
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                await InternalSeedData();
                await uow.CompleteAsync();
            }
        }

        protected abstract Task InternalSeedData();
    }
}
