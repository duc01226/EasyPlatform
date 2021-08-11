using System;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.RabbitMQ;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace PlatformExampleApp.TextSnippet.Api
{
    public class TextSnippetPlatformRabbitMqEventBusModule : PlatformRabbitMqEventBusModule
    {
        public TextSnippetPlatformRabbitMqEventBusModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override PlatformRabbitMqOptions RabbitMqOptionsFactory(IServiceProvider serviceProvider)
        {
            var options = Configuration.GetSection("RabbitMqOptions").Get<PlatformRabbitMqOptions>();
            options.ClientProvidedName =
                serviceProvider.GetService<IPlatformApplicationSettingContext>()!.ApplicationName;
            return options;
        }
    }
}
