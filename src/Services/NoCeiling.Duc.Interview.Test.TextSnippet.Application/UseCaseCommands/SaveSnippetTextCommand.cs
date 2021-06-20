using System.Threading;
using System.Threading.Tasks;
using NoCeiling.Duc.Interview.Test.Platform.Cqrs;
using NoCeiling.Duc.Interview.Test.Platform.Domain.UnitOfWork;
using NoCeiling.Duc.Interview.Test.TextSnippet.Application.EntityDtos;
using NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Entities;
using NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Repositories;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Application.UseCaseCommands
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
        private readonly ITextSnippetRepository<TextSnippetEntity> repository;

        public SaveSnippetTextCommandHandler(
            IUnitOfWorkManager unitOfWorkManager,
            ITextSnippetRepository<TextSnippetEntity> repository) : base(unitOfWorkManager)
        {
            this.repository = repository;
        }

        protected override async Task<SaveSnippetTextCommandResult> HandleAsync(SaveSnippetTextCommand request, CancellationToken cancellationToken)
        {
            var savingData = request.Data.MapToEntity();

            EnsureValidationResultValid(savingData.Validate());

            var savedData = await repository.CreateOrUpdate(savingData);

            return new SaveSnippetTextCommandResult()
            {
                SavedData = new TextSnippetEntityDto(savedData)
            };
        }
    }
}
