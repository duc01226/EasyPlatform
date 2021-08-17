using System;
using System.Collections.Generic;
using AngularDotnetPlatform.Platform.Application;
using AngularDotnetPlatform.Platform.Application.Context;
using Microsoft.Extensions.Configuration;
using PlatformExampleApp.TextSnippet.Domain;
using PlatformExampleApp.TextSnippet.Persistence;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;

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

            if (Configuration.GetSection("DemoUseMultiDbForSaveSnippetTextCommand").Get<bool>())
            {
                if (Configuration.GetSection("UseMongoDb").Get<bool>())
                {
                    // If get default repository/unitOfWork will get from the latest registered module. If use mongo then register mongo module at last
                    result.Add(p => typeof(TextSnippetEfCorePersistencePlatformModule));
                    result.Add(p => typeof(TextSnippetMongoPersistencePlatformModule));
                }
                else
                {
                    result.Add(p => typeof(TextSnippetMongoPersistencePlatformModule));
                    result.Add(p => typeof(TextSnippetEfCorePersistencePlatformModule));
                }
            }
            else
            {
                result.Add(p => p.GetSection("UseMongoDb").Get<bool>()
                    ? typeof(TextSnippetMongoPersistencePlatformModule)
                    : typeof(TextSnippetEfCorePersistencePlatformModule));
            }

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
    }
}
