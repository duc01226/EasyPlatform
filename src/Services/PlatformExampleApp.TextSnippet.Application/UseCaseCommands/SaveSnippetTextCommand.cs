using System;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Configuration;
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

        // These two line to demo multi db support for one micro service
        private readonly ITextSnippetSqlRootRepository<TextSnippetEntity> sqlRepository;
        private readonly ITextSnippetMongoRootRepository<TextSnippetEntity> mongoRepository;
        private readonly IConfiguration configuration;

        public SaveSnippetTextCommandHandler(
            IUnitOfWorkManager unitOfWorkManager,
            ITextSnippetRootRepository<TextSnippetEntity> repository,
            IPlatformCqrs cqrs,
            ITextSnippetSqlRootRepository<TextSnippetEntity> sqlRepository,
            ITextSnippetMongoRootRepository<TextSnippetEntity> mongoRepository,
            IConfiguration configuration) : base(unitOfWorkManager, cqrs)
        {
            this.repository = repository;
            this.sqlRepository = sqlRepository;
            this.mongoRepository = mongoRepository;
            this.configuration = configuration;
        }

        protected override async Task<SaveSnippetTextCommandResult> HandleAsync(SaveSnippetTextCommand request, CancellationToken cancellationToken)
        {
            var savingData = request.Data.MapToEntity();

            EnsureValidationResultValid(savingData.Validate());

            TextSnippetEntity savedData;

            // Please note that we only do this for demo. In real use case it should be only one selected unit of work per command handler
            // Can archive this by override BeginUnitOfWork or implement PlatformCqrsCommandHandler<TCommand, TResult, TUnitOfWork>
            if (IsDemoUseMultiDb() && UnitOfWorkManager.Current<ITextSnippetMongoUnitOfWork>()?.IsActive() == true)
            {
                savedData = await mongoRepository.CreateOrUpdate(savingData, cancellationToken: cancellationToken);
            }
            else if (IsDemoUseMultiDb() && UnitOfWorkManager.Current<ITextSnippetSqlUnitOfWork>()?.IsActive() == true)
            {
                savedData = await sqlRepository.CreateOrUpdate(savingData, cancellationToken: cancellationToken);
            }
            else
            {
                savedData = await repository.CreateOrUpdate(savingData, cancellationToken: cancellationToken);
            }

            return new SaveSnippetTextCommandResult()
            {
                SavedData = new TextSnippetEntityDto(savedData)
            };
        }

        protected override async Task<SaveSnippetTextCommandResult> ExecuteHandleAsync(SaveSnippetTextCommand request, CancellationToken cancellationToken)
        {
            // Please note that we only do this for demo. In real use case it should be only one selected unit of work per command handler
            // Can archive this by override BeginUnitOfWork or implement PlatformCqrsCommandHandler<TCommand, TResult, TUnitOfWork>
            if (IsDemoUseMultiDb())
            {
                // Save data into both two db context
                await base.ExecuteHandleAsync(UnitOfWorkManager.Begin<ITextSnippetMongoUnitOfWork>(), request, cancellationToken);
                var result = await base.ExecuteHandleAsync(UnitOfWorkManager.Begin<ITextSnippetSqlUnitOfWork>(), request, cancellationToken);
                return result;
            }

            return await base.ExecuteHandleAsync(request, cancellationToken);
        }

        private bool IsDemoUseMultiDb()
        {
            return configuration.GetSection("DemoUseMultiDbForSaveSnippetTextCommand").Get<bool>();
        }
    }
}
