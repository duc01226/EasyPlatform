using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using AngularDotnetPlatform.Platform.Application;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.JsonSerialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.CqrsPipelineMiddleware;
using PlatformExampleApp.TextSnippet.Domain;

namespace PlatformExampleApp.TextSnippet.Application
{
    public class TextSnippetApplicationModule : PlatformApplicationModule
    {
        public TextSnippetApplicationModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<PlatformApplicationModule> logger) : base(serviceProvider, configuration, logger)
        {
        }

        protected override List<Func<IConfiguration, Type>> GetModuleDependencies()
        {
            var result = new List<Func<IConfiguration, Type>>
            {
                p => typeof(TextSnippetDomainModule)
            };
            return result;
        }

        // Your application can either override factory method DefaultApplicationSettingContextFactory to register default PlatformApplicationSettingContext
        // or just declare a class implement IPlatformApplicationSettingContext in project to use. It will be automatically registered.
        // Example that the class TextSnippetApplicationSettingContext has replace the default application setting
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

        // Example Override this to set the whole application default JsonSerializerOptions for PlatformJsonSerializer.CurrentOptions
        // The platform use PlatformJsonSerializer.CurrentOptions for every Json Serialization Tasks
        //protected override JsonSerializerOptions JsonSerializerCurrentOptions()
        //{
        //    return PlatformJsonSerializer.BuildDefaultOptions(
        //        useCamelCaseNaming: false,
        //        useJsonStringEnumConverter: false,
        //        customConverters: new List<JsonConverter>()
        //        {
        //            /* Your custom converters if existed*/
        //        });
        //}
    }
}
