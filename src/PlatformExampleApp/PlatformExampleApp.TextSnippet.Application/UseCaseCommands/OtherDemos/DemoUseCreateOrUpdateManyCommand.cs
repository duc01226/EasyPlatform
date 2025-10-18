using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseCommands.OtherDemos;

public sealed class DemoUseCreateOrUpdateManyCommand : PlatformCqrsCommand<DemoUseCreateOrUpdateManyCommandResult>
{
}

public sealed class DemoUseCreateOrUpdateManyCommandResult : PlatformCqrsCommandResult
{
}

internal sealed class DemoUseCreateOrUpdateManyCommandHandler
    : PlatformCqrsCommandApplicationHandler<DemoUseCreateOrUpdateManyCommand, DemoUseCreateOrUpdateManyCommandResult>
{
    private readonly ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository;

    public DemoUseCreateOrUpdateManyCommandHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        Lazy<IPlatformCqrs> cqrs,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository) : base(
        requestContextAccessor,
        unitOfWorkManager,
        cqrs,
        loggerFactory,
        serviceProvider)
    {
        this.textSnippetEntityRepository = textSnippetEntityRepository;
    }

    protected override async Task<DemoUseCreateOrUpdateManyCommandResult> HandleAsync(
        DemoUseCreateOrUpdateManyCommand request,
        CancellationToken cancellationToken)
    {
        await textSnippetEntityRepository.CreateOrUpdateManyAsync(
            Enumerable.Range(0, 100)
                .Select(
                    p =>
                    {
                        return new TextSnippetEntity
                        {
                            Id = Ulid.NewUlid().ToString(),
                            SnippetText = "SnippetText " + p,
                            FullText = "FullText " + p
                        };
                    })
                .ToList(),
            customCheckExistingPredicateBuilder: toUpsertEntity => p => p.SnippetText == toUpsertEntity.SnippetText,
            cancellationToken: cancellationToken);

        return new DemoUseCreateOrUpdateManyCommandResult();
    }
}
