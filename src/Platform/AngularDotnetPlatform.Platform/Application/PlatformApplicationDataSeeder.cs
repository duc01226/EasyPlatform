using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.Application
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
