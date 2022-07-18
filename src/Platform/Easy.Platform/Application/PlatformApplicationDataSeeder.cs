using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.Application
{
    public interface IPlatformApplicationDataSeeder
    {
        public Task SeedData();
    }

    public abstract class PlatformApplicationDataSeeder : IPlatformApplicationDataSeeder
    {
        protected readonly IUnitOfWorkManager UnitOfWorkManager;

        public PlatformApplicationDataSeeder(IUnitOfWorkManager unitOfWorkManager)
        {
            this.UnitOfWorkManager = unitOfWorkManager;
        }

        public virtual async Task SeedData()
        {
            using (var uow = UnitOfWorkManager.Begin())
            {
                await InternalSeedData();
                await uow.CompleteAsync();
            }
        }

        protected abstract Task InternalSeedData();
    }
}
