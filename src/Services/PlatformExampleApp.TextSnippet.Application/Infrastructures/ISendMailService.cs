using Easy.Platform.Infrastructures;
using Easy.Platform.Infrastructures.Abstract;

namespace PlatformExampleApp.TextSnippet.Application.Infrastructures
{
    /// <summary>
    /// This for demo the best practice example for implementing an infrastructure services.
    /// We could implement the implementation right in the application module. But we recommend that it should be
    /// a separated project infrastructure module from <see cref="PlatformInfrastructureModule"/>
    /// </summary>
    public interface ISendMailService : IPlatformInfrastructureService
    {
        void SendEmail(string toEmail, string mailHeader, string mailContent);
    }
}
