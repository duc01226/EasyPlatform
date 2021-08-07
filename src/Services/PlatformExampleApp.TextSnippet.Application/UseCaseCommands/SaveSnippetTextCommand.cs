using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using PlatformExampleApp.TextSnippet.Application.EntityDtos;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseCommands
{
    public class SaveSnippetTextCommand : PlatformCqrsCommand<SaveSnippetTextCommandResult>
    {
        public TextSnippetEntityDto Data { get; set; }
    }

    public class SaveSnippetTextCommandResult : PlatformCqrsCommandResult
    {
        public TextSnippetEntityDto SavedData { get; set; }
    }

    public class SaveSnippetTextCommandHandler : PlatformCqrsCommandHandler<SaveSnippetTextCommand, SaveSnippetTextCommandResult>
    {
        private readonly ITextSnippetRootRepository<TextSnippetEntity> repository;

        public SaveSnippetTextCommandHandler(
            IUnitOfWorkManager unitOfWorkManager,
            ITextSnippetRootRepository<TextSnippetEntity> repository,
            IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
            this.repository = repository;
        }

        public override string CommandEventRoutingKeyPrefix => ApplicationConstants.ApplicationName;

        protected override async Task<SaveSnippetTextCommandResult> HandleAsync(SaveSnippetTextCommand request, CancellationToken cancellationToken)
        {
            var savingData = request.Data.MapToEntity();

            EnsureValidationResultValid(savingData.Validate());

            var savedData = await repository.CreateOrUpdate(savingData, cancellationToken: cancellationToken);

            return new SaveSnippetTextCommandResult()
            {
                SavedData = new TextSnippetEntityDto(savedData)
            };
        }
    }
}
