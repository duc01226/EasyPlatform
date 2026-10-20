using System;
using System.Collections.Generic;
using Easy.Platform.Application;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.RabbitMQ;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TaskManagement.Application;

namespace PlatformExampleApp.TaskManagement.Api;

/// <summary>
/// Standalone composition root for TaskManagement. The composite host can reuse the API module and provide one
/// process-wide RabbitMQ provider; this root adds the provider only for its own executable when messaging is enabled.
/// </summary>
public class TaskManagementStandaloneModule : TaskManagementApiAspNetCoreModule
{
    public TaskManagementStandaloneModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration)
    {
    }

    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes()
    {
        var dependencies = base.GetDependentModuleTypes();

        if (TaskManagementApplicationSettings.IsMessagingEnabled(Configuration))
            dependencies.Add(_ => typeof(TaskManagementRabbitMqMessageBusModule));

        return dependencies;
    }
}

/// <summary>
/// Standalone-only RabbitMQ adapter. It is intentionally not a dependency of the reusable API module, so a
/// composite host can own one shared transport provider without registering duplicate provider modules.
/// </summary>
public sealed class TaskManagementRabbitMqMessageBusModule : PlatformRabbitMqMessageBusModule
{
    public TaskManagementRabbitMqMessageBusModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration)
    {
    }

    protected override PlatformRabbitMqOptions RabbitMqOptionsFactory(IServiceProvider serviceProvider)
    {
        var options = Configuration.GetSection("RabbitMqOptions").Get<PlatformRabbitMqOptions>() ?? new();

        return options.With(
            messageBusOptions =>
                messageBusOptions.ClientProvidedName = serviceProvider
                    .GetRequiredService<IPlatformApplicationSettingContext>()
                    .ApplicationName);
    }

    protected override PlatformMessageBusConfig MessageBusConfigFactory(IServiceProvider sp)
    {
        return Configuration.GetSection("RabbitMqOptions").Get<PlatformMessageBusConfig>() ?? new();
    }
}
