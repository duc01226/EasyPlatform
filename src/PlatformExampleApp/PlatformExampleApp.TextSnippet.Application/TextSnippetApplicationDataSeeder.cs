using Easy.Platform.Application;
using Easy.Platform.Domain.UnitOfWork;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Application;

public class TextSnippetApplicationDataSeeder : PlatformApplicationDataSeeder
{
    private readonly ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository;
    private readonly ITextSnippetRootRepository<TextSnippetEntity> textSnippetRepository;

    public TextSnippetApplicationDataSeeder(
        IUnitOfWorkManager unitOfWorkManager,
        ITextSnippetRootRepository<TextSnippetEntity> textSnippetRepository,
        ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository) : base(unitOfWorkManager)
    {
        this.textSnippetRepository = textSnippetRepository;
        this.multiDbDemoEntityRepository = multiDbDemoEntityRepository;
    }

    protected override async Task InternalSeedData()
    {
        await SeedTextSnippet();

        await SeedMultiDbDemoEntity();
    }

    private async Task SeedMultiDbDemoEntity()
    {
        if (await textSnippetRepository.AnyAsync(p => p.SnippetText.StartsWith("Example")))
            return;

        for (var i = 0; i < 20; i++)
            await multiDbDemoEntityRepository.CreateOrUpdateAsync(
                new MultiDbDemoEntity
                {
                    Id = Guid.NewGuid(),
                    Name = $"Multi Db Demo Entity {i}"
                });
    }

    private async Task SeedTextSnippet()
    {
        var numberOfItemsGroupSeedTextSnippet = 20;

        if (await textSnippetRepository.CountAsync() >= numberOfItemsGroupSeedTextSnippet)
            return;

        for (var i = 0; i < numberOfItemsGroupSeedTextSnippet; i++)
        {
            await textSnippetRepository.CreateOrUpdateAsync(
                new TextSnippetEntity
                {
                    Id = Guid.NewGuid(),
                    SnippetText = $"Example Abc {i}",
                    FullText = $"This is full text of Example Abc {i} snippet text"
                },
                p => p.SnippetText == $"Example Abc {i}");
            await textSnippetRepository.CreateOrUpdateAsync(
                new TextSnippetEntity
                {
                    Id = Guid.NewGuid(),
                    SnippetText = $"Example Def {i}",
                    FullText = $"This is full text of Example Def {i} snippet text"
                },
                p => p.SnippetText == $"Example Def {i}");
            await textSnippetRepository.CreateOrUpdateAsync(
                new TextSnippetEntity
                {
                    Id = Guid.NewGuid(),
                    SnippetText = $"Example Ghi {i}",
                    FullText = $"This is full text of Example Ghi {i} snippet text"
                },
                p => p.SnippetText == $"Example Ghi {i}");
        }
    }
}
