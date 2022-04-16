using System;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Common.Cqrs;
using AngularDotnetPlatform.Platform.Common.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Common.Timing;
using AngularDotnetPlatform.Platform.Common.Validators;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
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

    public class SaveSnippetTextCommandHandler : PlatformCqrsCommandApplicationHandler<SaveSnippetTextCommand, SaveSnippetTextCommandResult>
    {
        private readonly ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository;
        private readonly ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository;
        // This only for demo define and use infrastructure services
        private readonly ISendMailService sendMailService;
        private readonly ILogger<SaveSnippetTextCommandHandler> logger;

        public SaveSnippetTextCommandHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformCqrs cqrs,
            ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository,
            ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository,
            ISendMailService sendMailService,
            ILogger<SaveSnippetTextCommandHandler> logger) : base(userContext, unitOfWorkManager, cqrs)
        {
            this.textSnippetEntityRepository = textSnippetEntityRepository;
            this.multiDbDemoEntityRepository = multiDbDemoEntityRepository;
            this.sendMailService = sendMailService;
            this.logger = logger;

            this.sendMailService.SendEmail("demo@email.com", "demo header", "demo content");
        }

        protected override async Task<SaveSnippetTextCommandResult> HandleAsync(SaveSnippetTextCommand request, CancellationToken cancellationToken)
        {
            // THIS IS NOT RELATED to SaveSnippetText logic. This is just for demo multi db features in one application works
            await UpsertFirstExistedMultiDbDemoEntity(cancellationToken);

            // THIS IS NOT RELATED to SaveSnippetText logic. This is just for demo validation<T> with value inside like Promise<T>, Task<T>
            Func<string, PlatformValidationResult<DateTime>> parseStringToDateFunc = stringValue =>
                DateTime.TryParse(stringValue, out var parseDateTime)
                    .Pipe(isParseSuccess => isParseSuccess
                        ? PlatformValidationResult<DateTime>.Valid(parseDateTime)
                        : PlatformValidationResult<DateTime>.Invalid(
                            errors: $"Value {stringValue} could not be parsed to Date"));
            var parsedDateValueResult = parseStringToDateFunc("some date string");
            if (parsedDateValueResult.IsValid)
            {
                logger.LogInformation($"Parsed \"some date string\" to {parsedDateValueResult.Value.ToLongDateString()}");
            }
            else
            {
                logger.LogError(parsedDateValueResult.ErrorsMsg());
            }
            // Demo others features use cases of Validation<T>
            // Return Validation of string of date only from another string. Process is: string => DateTime => Date only => DateOnly string
            var parsedDateOnlyValueResult = parsedDateValueResult
                .And(parsedDate => parsedDate < DateTime.UtcNow, "ParsedDate must in the past")
                .Map(parsedDate => parsedDate.Date.ToString(CultureInfo.InvariantCulture));


            // STEP 1: Build saving entity data from request
            var savingData = request.Data.MapToEntity();

            // STEP 2: Do validation and ensure that all logic is valid

            // Demo Permission Logic
            EnsurePermissionLogicValid(PlatformValidationResult.ValidIf(
                validCondition: new Random().Next(0, 10) % 2 == 0,
                "Demo User need to has some role or logic to save snippet text"));
            // Demo business logic
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
