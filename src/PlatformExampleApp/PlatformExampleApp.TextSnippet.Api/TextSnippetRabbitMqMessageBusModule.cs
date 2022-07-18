using Easy.Platform.Application.Context;
using Easy.Platform.RabbitMQ;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TextSnippet.Application;

namespace PlatformExampleApp.TextSnippet.Api
{
    public class TextSnippetRabbitMqMessageBusModule : PlatformRabbitMqMessageBusModule
    {
        public TextSnippetRabbitMqMessageBusModule(IServiceProvider serviceProvider, IConfiguration configuration) :
            base(serviceProvider, configuration)
        {
        }

        protected override PlatformRabbitMqOptions RabbitMqOptionsFactory(IServiceProvider serviceProvider)
        {
            var options = Configuration.GetSection("RabbitMqOptions").Get<PlatformRabbitMqOptions>();
            options.ClientProvidedName =
                serviceProvider.GetService<IPlatformApplicationSettingContext>()!.ApplicationName;
            return options;
        }

        protected override string ForApplicationServiceName()
        {
            return TextSnippetApplicationConstants.ApplicationName;
        }
    }
}
