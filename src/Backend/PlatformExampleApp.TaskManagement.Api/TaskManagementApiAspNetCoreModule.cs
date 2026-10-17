using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text.Json;
using Easy.Platform.AspNetCore;
using Easy.Platform.Common.JsonSerialization;
using Microsoft.Extensions.Configuration;
using PlatformExampleApp.TaskManagement.Application;
using PlatformExampleApp.TaskManagement.Api.Controllers;
using PlatformExampleApp.TaskManagement.Persistence.Mongo;

namespace PlatformExampleApp.TaskManagement.Api;

/// <summary>
/// Reusable HTTP adapter for TaskManagement. Hosts register this module as a child or root without moving
/// application, domain, or persistence ownership into the API project.
/// </summary>
public class TaskManagementApiAspNetCoreModule : PlatformAspNetCoreModule
{
    public TaskManagementApiAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration)
    {
    }

    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes()
    {
        return
        [
            _ => typeof(TaskManagementApplicationModule),
            _ => typeof(TaskManagementMongoPersistenceModule)
        ];
    }

    /// <summary>
    /// Opts in only the TaskManagement API assembly. A composite root can add another module's assembly separately;
    /// referenced assemblies are never discovered implicitly.
    /// </summary>
    public override List<Assembly> GetAssembliesForControllerDiscovery()
    {
        return [typeof(TaskBoardController).Assembly];
    }

    protected override string[] GetAllowCorsOrigins(IConfiguration configuration)
    {
        return configuration["AllowCorsOrigins"]?.Split(
                   ';',
                   StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? [];
    }

    protected override JsonSerializerOptions ProvideCustomJsonSerializerOptions()
    {
        return PlatformJsonSerializer.BuildDefaultOptions(useCamelCaseNaming: true);
    }
}
