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
using PlatformExampleApp.TextSnippet.Application.Infrastructures;
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
        // This only for demo define and use infrastructure services
        private readonly ISendMailService sendMailService;

        public SaveSnippetTextCommandHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformCqrs cqrs,
            ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository,
            ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository,
            ISendMailService sendMailService) : base(userContext, unitOfWorkManager, cqrs)
        {
            this.textSnippetEntityRepository = textSnippetEntityRepository;
            this.multiDbDemoEntityRepository = multiDbDemoEntityRepository;
            this.sendMailService = sendMailService;

            this.sendMailService.SendEmail("demo@email.com", "demo header", "demo content");
        }

        protected override async Task<SaveSnippetTextCommandResult> HandleAsync(SaveSnippetTextCommand request, CancellationToken cancellationToken)
        {
            // THIS IS NOT RELATED to SaveSnippetText logic. This is just for demo multi db features in one application works
            await UpsertFirstExistedMultiDbDemoEntity(cancellationToken);

            // STEP 1: Build saving entity data from request
            var savingData = request.Data.MapToEntity();

            // STEP 2: Do validation and ensure that all logic is valid
            EnsureBusinessLogicValid(
                savingData.ValidateSomeSpecificDomainLogic(),
                ValidateSomeThisCommandLogic());

            // THIS IS NOT RELATED, JUST SOME ADDITIONAL DEMO FOR SOME VALIDATIONS USE CASES
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

            // STEP 3: Saving data in to repository
            var savedData = await textSnippetEntityRepository.CreateOrUpdateAsync(savingData, cancellationToken: cancellationToken);

            // STEP 4: Build and return result
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

            await multiDbDemoEntityRepository.CreateOrUpdateAsync(firstExistedMultiDbEntity, cancellationToken: cancellationToken);
        }

        private PlatformValidationResult ValidateSomeThisCommandLogic()
        {
            return PlatformValidationResult.Valid()
                .And(validCondition: () => true, "Example Rule 1 violated error message")
                .And(validCondition: () => true, "Example Rule 2 violated error message");
        }

        private PlatformValidationResult ValidateSomeThisCommandLogicToChangeFlow()
        {
            return PlatformValidationResult.Valid()
                .And(validCondition: () => true, "Example Rule 1 violated error message")
                .And(validCondition: () => true, "Example Rule 2 violated error message");
        }
    }
}
