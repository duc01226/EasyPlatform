using System;
using Easy.Platform.Domain;
using Microsoft.Extensions.Configuration;

namespace PlatformExampleApp.TaskManagement.Domain;

/// <summary>
/// Registers the TaskManagement domain boundary for either a composite or standalone host.
/// </summary>
public sealed class TaskManagementDomainModule : PlatformDomainModule
{
    public TaskManagementDomainModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration)
    {
    }
}
