using System;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.BackgroundJob;
using AngularDotnetPlatform.Platform.BackgroundJob;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Timing;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Application.BackgroundJob
{
    [PlatformRecurringJob("* * * * *")]
    public class TestRecurringBackgroundJobExecutor : PlatformApplicationBackgroundJobExecutor
    {
        private readonly ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository;
        public TestRecurringBackgroundJobExecutor(
            IUnitOfWorkManager unitOfWorkManager,
            ILoggerFactory loggerFactory,
            ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository) : base(unitOfWorkManager, loggerFactory)
        {
            this.textSnippetEntityRepository = textSnippetEntityRepository;
        }

        public override async Task ProcessAsync()
        {
            await textSnippetEntityRepository.CreateOrUpdateAsync(new TextSnippetEntity()
            {
                Id = Guid.Parse("76e0f523-ee53-4124-b109-13dedaa4618d"),
                SnippetText = "TestRecurringBackgroundJob " + Clock.Now.ToShortTimeString(),
                FullText = "Test of recurring job upsert this entity"
            });
        }
    }
}
