using System;
using System.Collections.Generic;
using AngularDotnetPlatform.Platform.Application;
using AngularDotnetPlatform.Platform.Application.Context;
using Microsoft.Extensions.Configuration;
using PlatformExampleApp.TextSnippet.Application.CqrsPipelineMiddleware;
using PlatformExampleApp.TextSnippet.Domain;

namespace PlatformExampleApp.TextSnippet.Application
{
    public class TextSnippetApplicationModule : PlatformApplicationModule
    {
        public TextSnippetApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override List<Func<IConfiguration, Type>> GetModuleDependencies()
        {
            var result = new List<Func<IConfiguration, Type>>
            {
                p => typeof(TextSnippetDomainPlatformModule)
            };
            return result;
        }

        // Your application can either override factory method DefaultApplicationSettingContextFactory to register default PlatformApplicationSettingContext
        // or just declare a class implement IPlatformApplicationSettingContext to use. It will be automatically registered.
        protected override PlatformApplicationSettingContext DefaultApplicationSettingContextFactory(IServiceProvider serviceProvider)
        {
            return new PlatformApplicationSettingContext()
            {
                ApplicationName = TextSnippetApplicationConstants.ApplicationName
            };
        }

        protected override List<Type> CqrsPipelinesProvider()
        {
            return new List<Type>() { typeof(CommandAuditLogCqrsPipelineMiddleware<,>) };
        }
    }
}
