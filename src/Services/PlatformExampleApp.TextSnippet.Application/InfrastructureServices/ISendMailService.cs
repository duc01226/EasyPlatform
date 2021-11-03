using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.InfrastructureServices;
using Microsoft.Extensions.Logging;

namespace PlatformExampleApp.TextSnippet.Application.InfrastructureServices
{
    /// <summary>
    /// This for demo the best practice example for implementing an infrastructure services.
    /// We could implement the implementation right in the application module. But we recommend that it should be
    /// a separated project infrastructure module from <see cref="AngularDotnetPlatform.Platform.Application.PlatformInfrastructureServicesModule"/>
    /// </summary>
    public interface ISendMailService : IPlatformInfrastructureService
    {
        void SendEmail(string toEmail, string mailHeader, string mailContent);
    }

    /// <summary>
    /// Example of implementation directly in the application module. It is ok but not recommended.
    /// </summary>
    public class AwsSendMailService : ISendMailService
    {
        private readonly ILogger logger;

        public AwsSendMailService(ILogger<AwsSendMailService> logger)
        {
            this.logger = logger;
        }

        public void SendEmail(string toEmail, string mailHeader, string mailContent)
        {
            logger.LogInformation($"Demo implemented AwsSendMailService directly in application module. " +
                                  $"ToEmail: {toEmail}. Header: {mailHeader}. MailContent: {mailContent}");
        }
    }
}
