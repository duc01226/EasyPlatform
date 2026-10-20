using System.Reflection;
using System.Text.Json;
using FluentAssertions;
using PlatformExampleApp.TaskManagement.Contracts.Messages;

namespace PlatformExampleApp.Tests.Unit.TaskManagement;

/// <summary>
/// Pins the standalone transport contract boundary without loading any TaskManagement domain or persistence type.
/// </summary>
public sealed class TaskManagementContractTests
{
    [Fact]
    [Trait("TechnicalSpec", "TC-CONTRACT-101")]
    public void ContractAssembly_ContainsOnlyThePlatformDependency()
    {
        var assembly = typeof(TaskBoardItemCreatedIntegrationEvent).Assembly;
        var referencedAssemblyNames = assembly
            .GetReferencedAssemblies()
            .Select(reference => reference.Name!)
            .Where(name => name != null)
            .ToHashSet(StringComparer.Ordinal);

        referencedAssemblyNames.Should().Contain("Easy.Platform");

        // Allow-list: a contract may depend only on the platform and the runtime/BCL. Any other reference (for example
        // TaskManagement.Domain, a persistence provider, or another module) breaks the transport-contract boundary.
        referencedAssemblyNames.Should().OnlyContain(
            name => IsAllowedContractDependency(name),
            "the contract assembly must reference only Easy.Platform and runtime assemblies");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-CONTRACT-102")]
    public void CreatedIntegrationEvent_HasStablePayloadAndTransportIdentityOnly()
    {
        var declaredPayloadProperties = typeof(TaskBoardItemCreatedIntegrationEvent)
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(property => property.DeclaringType == typeof(TaskBoardItemCreatedIntegrationEvent))
            .Select(property => property.Name)
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToArray();

        declaredPayloadProperties.Should().Equal("Status", "TaskId", "Title");
        TaskBoardItemCreatedIntegrationEvent.StableEventName.Should().Be("TaskBoardItemCreated");

        var message = new TaskBoardItemCreatedIntegrationEvent
        {
            TaskId = "task-001",
            Title = "First task",
            Status = "Open"
        };
        var serialized = JsonSerializer.Serialize(message);

        serialized.Should().Contain("task-001").And.Contain("First task").And.Contain("Open");
        serialized.Should().NotContain("Repository").And.NotContain("ConnectionString").And.NotContain("DbContext");
        message.SubQueuePrefix().Should().Be("task-001");
    }

    private static bool IsAllowedContractDependency(string assemblyName)
    {
        return assemblyName == "Easy.Platform" ||
               assemblyName == "netstandard" ||
               assemblyName == "mscorlib" ||
               assemblyName.StartsWith("System", StringComparison.Ordinal) ||
               assemblyName.StartsWith("Microsoft.", StringComparison.Ordinal);
    }
}
