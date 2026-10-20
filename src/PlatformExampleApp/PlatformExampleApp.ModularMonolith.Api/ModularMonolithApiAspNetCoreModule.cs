using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text.Json;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.AspNetCore;
using Easy.Platform.Common.JsonSerialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TaskManagement.Application;
using PlatformExampleApp.TaskManagement.Api.Controllers;
using PlatformExampleApp.TaskManagement.Persistence.Mongo;
using PlatformExampleApp.TextSnippet.Api;
using PlatformExampleApp.TextSnippet.Api.Controllers;
using PlatformExampleApp.TextSnippet.Application;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;
using PlatformExampleApp.TextSnippet.Persistence.MultiDbDemo.Mongo;

namespace PlatformExampleApp.ModularMonolith.Api;

/// <summary>
/// The single composition root for the modular-monolith proof of concept.
/// It owns process-wide providers and endpoint composition while each application and persistence module retains
/// its own lifecycle, repository types, seeder ownership, and message-bus store key.
/// </summary>
public sealed class ModularMonolithApiAspNetCoreModule : PlatformAspNetCoreModule
{
    public const string MODULAR_MONOLITH_AUTOMATIC_DATA_SEEDING_ON_INIT_CONFIGURATION_KEY =
        "ModularMonolith:EnableAutomaticDataSeedingOnInit";

    public ModularMonolithApiAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration)
    {
    }

    /// <summary>
    /// Strict validation is part of this example's architecture contract, not an optional runtime toggle.
    /// The matching configuration value remains in the host settings as an explicit deployment/documentation seam.
    /// </summary>
    protected override bool EnableStrictCompositionValidation => true;

    /// <summary>
    /// Production keeps the platform default of automatic dependent-module seeding. Integration hosts can set this
    /// module-owned switch to <c>false</c> and invoke each application module's public seeding pipeline explicitly,
    /// which keeps host startup deterministic while preserving the same lifecycle code path.
    /// </summary>
    protected override bool EnableAutomaticDataSeedingOnInit =>
        Configuration.GetValue(
            MODULAR_MONOLITH_AUTOMATIC_DATA_SEEDING_ON_INIT_CONFIGURATION_KEY,
            defaultValue: true);

    /// <summary>
    /// Registers application and persistence boundaries directly. The API modules are referenced only for their
    /// controller assemblies; registering them wholesale would duplicate process-wide provider ownership.
    /// </summary>
    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes()
    {
        return
        [
            _ => typeof(TextSnippetApplicationModule),
            _ => typeof(TextSnippetMongoPersistenceModule),
            _ => typeof(TextSnippetMultiDbDemoMongoPersistenceModule),
            _ => typeof(TaskManagementApplicationModule),
            _ => typeof(TaskManagementMongoPersistenceModule),

            // One shared provider set serves both keyed application lanes.
            _ => typeof(TextSnippetRabbitMqMessageBusModule),
            _ => typeof(TextSnippetRedisCacheModule)
        ];
    }

    /// <summary>
    /// Explicitly exposes both API adapter assemblies. The platform's registration hook removes duplicates when a
    /// future module adds one of these assemblies again.
    /// </summary>
    public override List<Assembly> GetAssembliesForControllerDiscovery()
    {
        return [typeof(TextSnippetController).Assembly, typeof(TaskBoardController).Assembly];
    }

    /// <inheritdoc />
    protected override string[] GetAllowCorsOrigins(IConfiguration configuration)
    {
        return configuration["AllowCorsOrigins"]?.Split(
                   ';',
                   StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? [];
    }

    /// <inheritdoc />
    protected override JsonSerializerOptions ProvideCustomJsonSerializerOptions()
    {
        return PlatformJsonSerializer.BuildDefaultOptions(useCamelCaseNaming: true);
    }

    /// <inheritdoc />
    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        // The root is the only owner of cross-module wiring. Keys remain logical; physical Mongo placement is
        // selected by each persistence module and can be shared or isolated without a cross-context transaction claim.
        serviceCollection.AddSingleton(
            new PlatformMessageBusStoreBinding(
                new PlatformMessageBusStoreKey(TextSnippetApplicationModule.MessageBusStoreKeyValue),
                typeof(TextSnippetApplicationModule),
                typeof(TextSnippetMongoPersistenceModule)));
        serviceCollection.AddSingleton(
            new PlatformMessageBusStoreBinding(
                TaskManagementApplicationModule.MessageBusStoreKeyInstance,
                typeof(TaskManagementApplicationModule),
                typeof(TaskManagementMongoPersistenceModule)));
    }
}
