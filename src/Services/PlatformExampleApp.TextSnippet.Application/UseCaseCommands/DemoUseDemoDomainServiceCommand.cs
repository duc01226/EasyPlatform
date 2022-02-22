using System;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Common.Cqrs;
using AngularDotnetPlatform.Platform.Common.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using PlatformExampleApp.TextSnippet.Domain.Services;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseCommands
{
    public class DemoUseDemoDomainServiceCommand : PlatformCqrsCommand<DemoUseDemoDomainServiceCommandResult>
    {
    }

    public class DemoUseDemoDomainServiceCommandResult : PlatformCqrsCommandResult
    {
        public DemoDomainService.TransferSnippetTextToMultiDbDemoEntityNameResult TransferSnippetTextToMultiDbDemoEntityNameResult { get; set; }
    }

    public class DemoUseDemoDomainServiceCommandHandler :
        PlatformCqrsCommandApplicationHandler<DemoUseDemoDomainServiceCommand, DemoUseDemoDomainServiceCommandResult>
    {
        // Demo use demoDomainService
        private readonly DemoDomainService demoDomainService;

        public DemoUseDemoDomainServiceCommandHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformCqrs cqrs,
            DemoDomainService demoDomainService) : base(userContext, unitOfWorkManager, cqrs)
        {
            this.demoDomainService = demoDomainService;
        }

        protected override async Task<DemoUseDemoDomainServiceCommandResult> HandleAsync(
            DemoUseDemoDomainServiceCommand request,
            CancellationToken cancellationToken)
        {
            var transferSnippetTextToMultiDbDemoEntityNameResult = await demoDomainService.TransferSnippetTextToMultiDbDemoEntityName();

            return new DemoUseDemoDomainServiceCommandResult()
            {
                TransferSnippetTextToMultiDbDemoEntityNameResult = transferSnippetTextToMultiDbDemoEntityNameResult
            };
        }
    }
}
