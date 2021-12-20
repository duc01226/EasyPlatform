using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.Infrastructures;

namespace PlatformExampleApp.TextSnippet.Api.AwsEmailModule
{
    /// <summary>
    /// Example of implementation in other project assembly module. This folder should be in a separated project
    /// </summary>
    public class AwsEmailInfrastructureModule : PlatformInfrastructureServicesModule
    {
        public AwsEmailInfrastructureModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }
    }

    /// <summary>
    /// Example of implementation in other project assembly module. This folder should be in a separated project
    /// </summary>
    public class AwsSeparatedModuleSendMailService : ISendMailService
    {
        private readonly ILogger logger;

        public AwsSeparatedModuleSendMailService(ILogger<AwsSendMailService> logger)
        {
            this.logger = logger;
        }

        public void SendEmail(string toEmail, string mailHeader, string mailContent)
        {
            logger.LogInformation($"Demo implemented AwsSeparatedModuleSendMailService. " +
                                  $"ToEmail: {toEmail}. Header: {mailHeader}. MailContent: {mailContent}");
        }
    }
}
