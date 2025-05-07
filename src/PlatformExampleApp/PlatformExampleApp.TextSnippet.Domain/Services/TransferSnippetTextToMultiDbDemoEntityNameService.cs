#region

using Easy.Platform.Common.Cqrs;
using Easy.Platform.Domain.Services;
using Easy.Platform.Domain.UnitOfWork;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Events;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.TextSnippet.Domain.Services;

/// <summary>
/// Domain service is used to serve business logic operation related to many root domain entities,
/// the business logic term is understood by domain expert.
/// </summary>
public class TransferSnippetTextToMultiDbDemoEntityNameService : PlatformDomainService
{
    private readonly ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository;
    private readonly ITextSnippetRootRepository<TextSnippetEntity> textSnippetRepository;

    public TransferSnippetTextToMultiDbDemoEntityNameService(
        IPlatformCqrs cqrs,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        ITextSnippetRootRepository<TextSnippetEntity> textSnippetRepository,
        ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository) : base(cqrs, unitOfWorkManager)
    {
        this.textSnippetRepository = textSnippetRepository;
        this.multiDbDemoEntityRepository = multiDbDemoEntityRepository;
    }

    public async Task<TransferSnippetTextToMultiDbDemoEntityNameResult> Execute()
    {
        var firstFoundMultiDbDemoEntity = await multiDbDemoEntityRepository.FirstOrDefaultAsync();
        var firstFoundTextSnippet = await textSnippetRepository.FirstOrDefaultAsync();
        if (firstFoundMultiDbDemoEntity == null || firstFoundTextSnippet == null)
            return new TransferSnippetTextToMultiDbDemoEntityNameResult();

        var dispatchEvent = await DoTransferSnippetTextToMultiDbDemoEntityName(firstFoundTextSnippet, firstFoundMultiDbDemoEntity);

        await SendEvent(dispatchEvent);

        return new TransferSnippetTextToMultiDbDemoEntityNameResult
        {
            UpdatedMultiDbDemoEntity = firstFoundMultiDbDemoEntity,
            FirstFoundTextSnippet = firstFoundTextSnippet
        };
    }

    private async Task<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent> DoTransferSnippetTextToMultiDbDemoEntityName(
        TextSnippetEntity firstFoundTextSnippet,
        MultiDbDemoEntity firstFoundMultiDbDemoEntity)
    {
        var dispatchEvent = TransferSnippetTextToMultiDbDemoEntityNameDomainEvent.Create(
            firstFoundTextSnippet.SnippetText,
            firstFoundMultiDbDemoEntity.Clone());

        firstFoundTextSnippet.DemoDoSomeDomainEntityLogicAction_EncryptSnippetText();
        firstFoundMultiDbDemoEntity.Name = firstFoundTextSnippet.SnippetText;

        await textSnippetRepository.UpdateAsync(firstFoundTextSnippet);
        await multiDbDemoEntityRepository.UpdateAsync(firstFoundMultiDbDemoEntity);

        return dispatchEvent;
    }

    public class TransferSnippetTextToMultiDbDemoEntityNameResult
    {
        public MultiDbDemoEntity UpdatedMultiDbDemoEntity { get; set; }

        public TextSnippetEntity FirstFoundTextSnippet { get; set; }
    }
}
