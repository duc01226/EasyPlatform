using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.BackgroundJob;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Timing;
using AngularDotnetPlatform.Platform.Validators;
using Microsoft.Extensions.Configuration;
using PlatformExampleApp.TextSnippet.Application.EntityDtos;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseCommands
{
    public class SaveSnippetTextCommand : PlatformCqrsCommand<SaveSnippetTextCommandResult>
    {
        public TextSnippetEntityDto Data { get; set; }

        public override PlatformValidationResult Validate()
        {
            return PlatformValidationResult
                .ValidIf(Data != null, "Data must be not null.")
                .And(() => Data.MapToEntity().Validate());
        }
    }

    public class SaveSnippetTextCommandResult : PlatformCqrsCommandResult
    {
        public TextSnippetEntityDto SavedData { get; set; }
    }

    public class SaveSnippetTextCommandHandler : PlatformCqrsCommandHandler<SaveSnippetTextCommand, SaveSnippetTextCommandResult>
    {
        private readonly ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository;
        private readonly ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository;

        public SaveSnippetTextCommandHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformCqrs cqrs,
            ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository,
            ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository) : base(userContext, unitOfWorkManager, cqrs)
        {
            this.textSnippetEntityRepository = textSnippetEntityRepository;
            this.multiDbDemoEntityRepository = multiDbDemoEntityRepository;
        }

        protected override async Task<SaveSnippetTextCommandResult> HandleAsync(SaveSnippetTextCommand request, CancellationToken cancellationToken)
        {
            var savingData = request.Data.MapToEntity();

            EnsureBusinessLogicValid(
                savingData.ValidateSomeSpecificDomainLogic(),
                ValidateSomeThisCommandLogic());

            // Example to use validation result as a boolean to change program business flow
            if (ValidateSomeThisCommandLogicToChangeFlow() || savingData.ValidateSomeSpecificDomainLogic())
            {
                // Do Some business if ValidateSomeThisCommandLogicToChangeFlow
                // OR savingData.ValidateSomeSpecificDomainLogic
                // RETURN Valid validation result
            }
            else
            {
                // Do Some business if ValidateSomeThisCommandLogicToChangeFlow
                // AND savingData.ValidateSomeSpecificDomainLogic
                // RETURN InValid validation result
            }

            // This is not related to SaveSnippetText logic. This is just for demo multi db features in one application works
            await UpsertFirstExistedMultiDbDemoEntity(cancellationToken);

            var savedData = await textSnippetEntityRepository.CreateOrUpdate(savingData, cancellationToken: cancellationToken);

            return new SaveSnippetTextCommandResult()
            {
                SavedData = new TextSnippetEntityDto(savedData)
            };
        }

        private async Task UpsertFirstExistedMultiDbDemoEntity(CancellationToken cancellationToken)
        {
            var firstExistedMultiDbEntity =
                await multiDbDemoEntityRepository.FirstOrDefaultAsync(cancellationToken: cancellationToken) ??
                new MultiDbDemoEntity()
                {
                    Id = Guid.NewGuid(),
                    Name = "First Multi Db Demo Entity"
                };

            firstExistedMultiDbEntity.Name = $"First Multi Db Demo Entity Upserted on {Clock.Now.ToShortDateString()}";

            await multiDbDemoEntityRepository.CreateOrUpdate(firstExistedMultiDbEntity, cancellationToken: cancellationToken);
        }

        private PlatformValidationResult ValidateSomeThisCommandLogic()
        {
            return PlatformValidationResult.Valid()
                .And(validCondition: true, "Example Rule 1 violated error message")
                .And(validCondition: true, "Example Rule 2 violated error message");
        }

        private PlatformValidationResult ValidateSomeThisCommandLogicToChangeFlow()
        {
            return PlatformValidationResult.Valid()
                .And(validCondition: true, "Example Rule 1 violated error message")
                .And(validCondition: true, "Example Rule 2 violated error message");
        }
    }
}
