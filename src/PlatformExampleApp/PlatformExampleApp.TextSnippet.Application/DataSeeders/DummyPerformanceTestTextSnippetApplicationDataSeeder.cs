#region

using Easy.Platform.Application;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.DataSeeders;

public sealed class DummyPerformanceTestTextSnippetApplicationDataSeeder : PlatformApplicationDataSeeder
{
    private readonly ITextSnippetRootRepository<TextSnippetEntity> textSnippetRepository;

    public DummyPerformanceTestTextSnippetApplicationDataSeeder(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILoggerFactory loggerFactory,
        IPlatformRootServiceProvider rootServiceProvider,
        ITextSnippetRootRepository<TextSnippetEntity> textSnippetRepository) : base(unitOfWorkManager, serviceProvider, configuration, loggerFactory, rootServiceProvider)
    {
        this.textSnippetRepository = textSnippetRepository;
    }

    public override int DelaySeedingInBackgroundBySeconds => DefaultActiveDelaySeedingInBackgroundBySeconds;

    protected override async Task InternalSeedData(bool isReplaceNewSeed = false)
    {
        if (Configuration.GetSection("SeedDummyPerformanceTest").Get<bool?>() == true)
            await SeedTextSnippet();
    }

    private async Task SeedTextSnippet()
    {
        var numberOfItemsGroupSeedTextSnippet = 10000;

        if (await textSnippetRepository.CountAsync() >= numberOfItemsGroupSeedTextSnippet)
            return;

#pragma warning disable EASY_PLATFORM_ANALYZERS_PERF002
        for (var i = 0; i < numberOfItemsGroupSeedTextSnippet; i++)
        {
            using (var uow = UnitOfWorkManager.Begin())
            {
                await textSnippetRepository.CreateOrUpdateAsync(
                    TextSnippetEntity.Create(id: Ulid.NewUlid().ToString(), snippetText: $"Dummy Abc {i}", fullText: $"This is full text of Dummy Abc {i} snippet text"),
                    customCheckExistingPredicate: p => p.SnippetText == $"Dummy Abc {i}");
                await textSnippetRepository.CreateOrUpdateAsync(
                    TextSnippetEntity.Create(id: Ulid.NewUlid().ToString(), snippetText: $"Dummy Def {i}", fullText: $"This is full text of Dummy Def {i} snippet text"),
                    customCheckExistingPredicate: p => p.SnippetText == $"Dummy Def {i}");
                await textSnippetRepository.CreateOrUpdateAsync(
                    TextSnippetEntity.Create(id: Ulid.NewUlid().ToString(), snippetText: $"Dummy Ghi {i}", fullText: $"This is full text of Dummy Ghi {i} snippet text"),
                    customCheckExistingPredicate: p => p.SnippetText == $"Dummy Ghi {i}");

                await uow.CompleteAsync();
            }
        }
#pragma warning restore EASY_PLATFORM_ANALYZERS_PERF002
    }
}
