using Easy.Platform.Application;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Application.DataSeeders;

/// <summary>
/// Use command to seed data is also like real testing the command too
/// </summary>
public sealed class DemoSeedDataUseCommandSolutionDataSeeder : PlatformApplicationDataSeeder
{
    public DemoSeedDataUseCommandSolutionDataSeeder(
        IUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILoggerFactory loggerFactory,
        IPlatformRootServiceProvider rootServiceProvider) : base(unitOfWorkManager, serviceProvider, configuration, loggerFactory, rootServiceProvider)
    {
    }

    public override int DelaySeedingInBackgroundBySeconds => DefaultActiveDelaySeedingInBackgroundBySeconds;

    public override int SeedOrder => 2;

    protected override async Task InternalSeedData(bool isReplaceNewSeed = false)
    {
        await ServiceProvider.ExecuteInjectScopedAsync(SeedSnippetText, isReplaceNewSeed);
    }

    private static async Task SeedSnippetText(
        bool isReplaceNewSeed,
        IPlatformCqrs cqrs,
        IPlatformApplicationRequestContextAccessor userContextAccessor,
        ITextSnippetRepository<TextSnippetEntity> snippetRepository)
    {
        if (await snippetRepository.AnyAsync(p => p.SnippetText == "Dummy Seed SnippetText") && !isReplaceNewSeed) return;

        userContextAccessor.Current.SetUserId(Guid.NewGuid().ToString());
        userContextAccessor.Current.SetEmail("SeedUserEmail");

        await cqrs.SendCommand(
            new SaveSnippetTextCommand
            {
                Data = new TextSnippetEntityDto
                {
                    Id = Guid.Parse("671e5fff-2282-4d57-ac93-9dd4ea50985d"),
                    SnippetText = "Dummy Seed SnippetText",
                    FullText = "Dummy Seed FullText"
                },
                AutoCreateIfNotExisting = true
            });
    }
}
