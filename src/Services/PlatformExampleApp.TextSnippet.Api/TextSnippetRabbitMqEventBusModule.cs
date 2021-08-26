using System;
using System.Collections.Generic;
using System.Reflection;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.RabbitMQ;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TextSnippet.Application;

namespace PlatformExampleApp.TextSnippet.Api
{
    public class TextSnippetRabbitMqEventBusModule : PlatformRabbitMqEventBusModule
    {
        public TextSnippetRabbitMqEventBusModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override PlatformRabbitMqOptions RabbitMqOptionsFactory(IServiceProvider serviceProvider)
        {
            var options = Configuration.GetSection("RabbitMqOptions").Get<PlatformRabbitMqOptions>();
            options.ClientProvidedName =
                serviceProvider.GetService<IPlatformApplicationSettingContext>()!.ApplicationName;
            return options;
        }

        protected override List<Assembly> EventBusScanAssemblies()
        {
            return new List<Assembly>() { typeof(TextSnippetApplicationModule).Assembly };
        }
    }
}
