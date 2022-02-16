using AngularDotnetPlatform.Platform.Common.Extensions;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.Infrastructures;

namespace PlatformExampleApp.TextSnippet.Api.AwsEmailModule
{
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
            logger.LogInformationIfEnabled($"Demo implemented AwsSeparatedModuleSendMailService. " +
                                  $"ToEmail: {toEmail}. Header: {mailHeader}. MailContent: {mailContent}");
        }
    }
}
