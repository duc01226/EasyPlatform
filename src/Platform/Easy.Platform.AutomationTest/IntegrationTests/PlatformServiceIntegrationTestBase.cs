#region

using System.IO;
using System.Reflection;
using Easy.Platform.Application.BackgroundJob;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Infrastructures.BackgroundJob;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Repositories;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Xunit;

#endregion

// Exclude global using to avoid FluentAssertions conflicts
// global using Easy.Platform.Common.Extensions;
// global using FluentAssertions;

namespace Easy.Platform.AutomationTest.IntegrationTests;

/// <summary>
/// Abstract base class for microservice integration tests that provides CQRS command/query execution with proper DI scope and request context.
/// This platform-independent base class follows Easy.Platform extensibility patterns using virtual methods.
///
/// <para>
/// <strong>Platform Independence:</strong>
/// This class is designed to be project-agnostic and can be used by any project utilizing Easy.Platform framework,
/// not just specific projects. All project-specific logic must be implemented in derived classes through virtual method overrides.
/// </para>
///
/// <para>
/// <strong>Extensibility Pattern:</strong>
/// Following Easy.Platform's virtual method pattern (similar to BeforeExecuteHandleAsync in PlatformCqrsEventHandler),
/// this class provides extension points through virtual methods that derived classes can override to implement
/// project-specific request context setup, user authentication, and test data preparation.
/// </para>
///
/// <para>
/// <strong>User Context Patterns:</strong>
/// The userContext parameter in execution methods enables flexible testing scenarios through strongly-typed context objects:
/// </para>
/// <list type="bullet">
/// <item><description><strong>Admin User Testing:</strong> Pass admin context for system-level permissions testing</description></item>
/// <item><description><strong>Employee Testing:</strong> Pass employee context for regular user permission testing</description></item>
/// <item><description><strong>Role-Based Testing:</strong> Pass HR Manager, Department Head, or other role contexts</description></item>
/// <item><description><strong>Multi-Tenant Testing:</strong> Pass different company/organization contexts</description></item>
/// <item><description><strong>Permission Testing:</strong> Pass contexts with specific permission combinations</description></item>
/// <item><description><strong>Unauthenticated Testing:</strong> Pass null or guest context for public endpoint testing</description></item>
/// </list>
///
/// <para>
/// <strong>Implementation Example:</strong>
/// </para>
/// <code>
/// // Service-specific base class implementation
/// public class MyServiceIntegrationTestBase : PlatformServiceIntegrationTestBase&lt;MyServiceApiAspNetCoreModule&gt;
/// {
///     protected override async Task BeforeExecuteCommandAsync(
///         IPlatformApplicationRequestContextAccessor requestContextAccessor,
///         object? userContext = null,
///         CancellationToken cancellationToken = default)
///     {
///         // Interpret userContext and setup project-specific request context
///         switch (userContext)
///         {
///             case AdminUserContext admin:
///                 await SetupAdminContext(requestContextAccessor, admin.CompanyId, cancellationToken);
///                 break;
///             case EmployeeUserContext employee:
///                 await SetupEmployeeContext(requestContextAccessor, employee.UserId, employee.CompanyId, cancellationToken);
///                 break;
///             case ManagerContext manager:
///                 await SetupManagerContext(requestContextAccessor, manager.UserId, manager.DepartmentIds, cancellationToken);
///                 break;
///             default:
///                 // Default to admin user for backward compatibility
///                 await SetupDefaultAdminContext(requestContextAccessor, cancellationToken);
///                 break;
///         }
///     }
/// }
///
/// // Test usage
/// public class EmployeeIntegrationTests : MyServiceIntegrationTestBase
/// {
///     [Fact]
///     public async Task SaveEmployee_AsAdmin_ShouldSucceed()
///     {
///         var result = await ExecuteCommandAsync(
///             new SaveEmployeeCommand { Name = "John Doe" },
///             userContext: new AdminUserContext { CompanyId = "company1" }
///         );
///
///         result.Should().NotBeNull();
///     }
///
///     [Fact]
///     public async Task GetEmployees_AsManager_ShouldReturnDepartmentEmployees()
///     {
///         var result = await ExecuteQueryAsync(
///             new GetEmployeesQuery(),
///             userContext: new ManagerContext { UserId = "mgr1", DepartmentIds = ["dept1"] }
///         );
///
///         result.Employees.Should().OnlyContain(e => e.DepartmentId == "dept1");
///     }
/// }
/// </code>
///
/// <para>
/// <strong>Usage Guidelines:</strong>
/// Do not extend this class directly in your tests. Instead, create a service-specific base class
/// (e.g., MyServiceIntegrationTestBase) that overrides the virtual methods with your project's specific logic,
/// then extend that class in your actual test classes.
/// </para>
/// </summary>
/// <typeparam name="TServiceModule">The ASP.NET Core module type for the microservice (e.g., MyServiceApiAspNetCoreModule)</typeparam>
public abstract class PlatformServiceIntegrationTestBase<TServiceModule>
    where TServiceModule : PlatformModule
{
    // Design Note: Static fields in a generic type are intentional here.
    // Each closed generic (e.g., PlatformServiceIntegrationTestBase<GrowthModule>) gets its own
    // independent static fields. Combined with xUnit's [Collection] attribute (which ensures
    // sequential execution within a collection), this is thread-safe.
    // Sonar S2743 is suppressed because the "shared state across generic instances" concern
    // does not apply — each service module type gets its own isolated state.
#pragma warning disable S2743
    private static IServiceProvider? serviceProvider;
    private static IConfiguration? configuration;
    private static IServiceCollection? serviceCollection;
#pragma warning restore S2743

    public static IServiceProvider ServiceProvider =>
        serviceProvider ?? throw new InvalidOperationException("ServiceProvider not initialized. Call SetupIntegrationTest first.");

    protected static IConfiguration Configuration =>
        configuration ?? throw new InvalidOperationException("Configuration not initialized. Call SetupIntegrationTest first.");

    /// <summary>
    /// Convenience extension point for setting up request context before any operation (command, query, or service).
    /// Override this single method when all three hooks need identical context setup.
    /// Individual hooks (<see cref="BeforeExecuteCommandAsync"/>, <see cref="BeforeExecuteQueryAsync"/>,
    /// <see cref="BeforeExecuteWithServicesAsync"/>) still exist for cases where command vs query context differs.
    /// </summary>
    protected virtual Task BeforeExecuteAnyAsync(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        object? userContext = null,
        CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// Extension point for setting up request context before executing commands.
    /// Override in service-specific base classes to provide project-specific context setup.
    /// Default: delegates to <see cref="BeforeExecuteAnyAsync"/>.
    /// </summary>
    protected virtual Task BeforeExecuteCommandAsync(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        object? userContext = null,
        CancellationToken cancellationToken = default)
    {
        return BeforeExecuteAnyAsync(requestContextAccessor, userContext, cancellationToken);
    }

    /// <summary>
    /// Extension point for setting up request context before executing queries.
    /// Override in service-specific base classes to provide project-specific context setup.
    /// Default: delegates to <see cref="BeforeExecuteAnyAsync"/>.
    /// </summary>
    protected virtual Task BeforeExecuteQueryAsync(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        object? userContext = null,
        CancellationToken cancellationToken = default)
    {
        return BeforeExecuteAnyAsync(requestContextAccessor, userContext, cancellationToken);
    }

    /// <summary>
    /// Extension point for setting up request context before executing custom service operations.
    /// Override in service-specific base classes to provide project-specific context setup.
    /// Default: delegates to <see cref="BeforeExecuteAnyAsync"/>.
    /// </summary>
    protected virtual Task BeforeExecuteWithServicesAsync(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        object? userContext = null,
        CancellationToken cancellationToken = default)
    {
        return BeforeExecuteAnyAsync(requestContextAccessor, userContext, cancellationToken);
    }

    /// <summary>
    /// Sets up the service provider and configuration for integration tests.
    /// Call this from xUnit class fixture or test setup.
    /// </summary>
    public static void SetupIntegrationTest(
        IConfiguration config,
        Assembly testProjectAssembly,
        string fallbackAspCoreEnvironmentValue,
        Action<IServiceCollection>? additionalServiceConfiguration = null)
    {
        configuration = config;

        var services = new ServiceCollection();
        serviceCollection = services;

        services.Register(typeof(IConfiguration), sp => configuration, ServiceLifeTime.Singleton);
        services.RegisterModule<TServiceModule>(false);
        ConfigureWebHostEnvironment(services, testProjectAssembly, fallbackAspCoreEnvironmentValue);
        additionalServiceConfiguration?.Invoke(services);

        serviceProvider = services.BuildServiceProvider();
    }

    /// <summary>
    /// Executes a command using CQRS pattern with proper scope and request context.
    /// This method provides a generic platform approach that delegates project-specific
    /// context setup to the BeforeExecuteCommandAsync virtual method.
    /// </summary>
    /// <param name="command">The command to execute</param>
    /// <param name="userContext">Optional user context for flexible testing scenarios (user roles, companies, etc.)</param>
    /// <param name="cancellationToken">Cancellation token for async operations</param>
    protected async Task<TResult> ExecuteCommandAsync<TResult>(
        PlatformCqrsCommand<TResult> command,
        object? userContext = null,
        CancellationToken cancellationToken = default)
        where TResult : PlatformCqrsCommandResult, new()
    {
        return await ServiceProvider.ExecuteInjectScopedAsync<TResult>(async (IPlatformCqrs cqrs, IPlatformApplicationRequestContextAccessor requestContextAccessor) =>
            {
                await BeforeExecuteCommandAsync(requestContextAccessor, userContext, cancellationToken);
                return await cqrs.SendCommand(command, cancellationToken);
            }
        );
    }

    /// <summary>
    /// Executes a query using CQRS pattern with proper scope and request context.
    /// This method provides a generic platform approach that delegates project-specific
    /// context setup to the BeforeExecuteQueryAsync virtual method.
    /// </summary>
    /// <param name="query">The query to execute</param>
    /// <param name="userContext">Optional user context for flexible testing scenarios (user roles, companies, etc.)</param>
    /// <param name="cancellationToken">Cancellation token for async operations</param>
    protected async Task<TResult> ExecuteQueryAsync<TResult>(PlatformCqrsQuery<TResult> query, object? userContext = null, CancellationToken cancellationToken = default)
    {
        return await ServiceProvider.ExecuteInjectScopedAsync<TResult>(async (IPlatformCqrs cqrs, IPlatformApplicationRequestContextAccessor requestContextAccessor) =>
            {
                await BeforeExecuteQueryAsync(requestContextAccessor, userContext, cancellationToken);
                return await cqrs.SendQuery(query, cancellationToken);
            }
        );
    }

    /// <summary>
    /// Executes custom test logic with access to repositories and services in proper DI scope.
    /// This method provides a generic platform approach that delegates project-specific
    /// context setup to the BeforeExecuteWithServicesAsync virtual method.
    /// </summary>
    /// <param name="testAction">The custom test logic to execute with access to the DI container</param>
    /// <param name="userContext">Optional user context for flexible testing scenarios (user roles, companies, etc.)</param>
    protected async Task<TResult> ExecuteWithServicesAsync<TResult>(Func<IServiceProvider, Task<TResult>> testAction, object? userContext = null)
    {
        return await ServiceProvider.ExecuteInjectScopedAsync<TResult>(async (
                IPlatformApplicationRequestContextAccessor requestContextAccessor,
                IServiceProvider scopedServiceProvider) =>
            {
                await BeforeExecuteWithServicesAsync(requestContextAccessor, userContext);
                return await testAction(scopedServiceProvider);
            }
        );
    }

    /// <summary>
    /// Executes custom test logic with access to repositories and services in proper DI scope (void version).
    /// This method provides a generic platform approach that delegates project-specific
    /// context setup to the BeforeExecuteWithServicesAsync virtual method.
    /// </summary>
    /// <param name="testAction">The custom test logic to execute with access to the DI container</param>
    /// <param name="userContext">Optional user context for flexible testing scenarios (user roles, companies, etc.)</param>
    protected async Task ExecuteWithServicesAsync(Func<IServiceProvider, Task> testAction, object? userContext = null)
    {
        await ServiceProvider.ExecuteInjectScopedAsync(async (
                IPlatformApplicationRequestContextAccessor requestContextAccessor,
                IServiceProvider scopedServiceProvider) =>
            {
                await BeforeExecuteWithServicesAsync(requestContextAccessor, userContext);
                await testAction(scopedServiceProvider);
            }
        );
    }

    /// <summary>
    /// Gets a service from the DI container within proper scope and request context.
    /// This method provides a generic platform approach that delegates project-specific
    /// context setup to the BeforeExecuteWithServicesAsync virtual method.
    /// <para>
    /// <strong>Warning:</strong> The returned service is resolved from a scoped provider that is disposed
    /// after this call completes. Only safe for Singleton or Transient services.
    /// For Scoped services, use <see cref="ExecuteWithServicesAsync{TResult}"/> instead to keep
    /// the scope alive during your operation.
    /// </para>
    /// </summary>
    /// <param name="userContext">Optional user context for flexible testing scenarios (user roles, companies, etc.)</param>
    protected async Task<T> GetServiceAsync<T>(object? userContext = null)
        where T : notnull
    {
        return await ExecuteWithServicesAsync(serviceProvider => Task.FromResult(serviceProvider.GetRequiredService<T>()), userContext);
    }

    /// <summary>
    /// Executes a background job through the real <see cref="IPlatformApplicationBackgroundJobScheduler"/> pipeline.
    /// Mimics production: DI resolution → request context propagation → UoW → ProcessAsync().
    /// The job runs synchronously in-process — returns when done, throws on failure.
    /// </summary>
    /// <typeparam name="TJob">The background job executor type to execute</typeparam>
    /// <param name="userContext">Optional user context to seed before scheduling (some BG jobs require request context)</param>
    protected async Task ExecuteBackgroundJobAsync<TJob>(object? userContext = null)
        where TJob : IPlatformBackgroundJobExecutor
    {
        await ExecuteWithServicesAsync(
            async sp =>
            {
                var scheduler = sp.GetRequiredService<IPlatformApplicationBackgroundJobScheduler>();
                await scheduler.ExecuteBackgroundJob<TJob>();
            },
            userContext);
    }

    /// <summary>
    /// Executes a parameterized background job through the real <see cref="IPlatformApplicationBackgroundJobScheduler"/> pipeline.
    /// Mimics production: DI resolution → request context propagation → UoW → ProcessAsync(param).
    /// </summary>
    /// <typeparam name="TJob">The background job executor type to execute</typeparam>
    /// <param name="jobParam">The parameter to pass to the job executor</param>
    /// <param name="userContext">Optional user context to seed before scheduling</param>
    protected async Task ExecuteBackgroundJobWithParamAsync<TJob>(object? jobParam, object? userContext = null)
        where TJob : IPlatformBackgroundJobExecutor
    {
        await ExecuteWithServicesAsync(
            async sp =>
            {
                var scheduler = sp.GetRequiredService<IPlatformApplicationBackgroundJobScheduler>();
                await scheduler.ExecuteBackgroundJobWithParam<TJob>(jobParam);
            },
            userContext);
    }

    /// <summary>
    /// Asserts that executing a command throws a validation exception (either <see cref="PlatformValidationException"/>
    /// from command-level Validate(), or <see cref="PlatformDomainValidationException"/> from handler/domain logic).
    /// Both implement <see cref="IPlatformValidationException"/>, so this helper catches either type.
    ///
    /// Use this instead of Assert.ThrowsAsync&lt;PlatformValidationException&gt; to avoid false negatives when
    /// validation is enforced at the domain layer rather than the command layer.
    /// </summary>
    /// <param name="action">The async action that should throw a validation exception</param>
    /// <param name="expectedMessageSubstring">Optional substring to check in the exception message</param>
    /// <returns>The caught exception for further assertions</returns>
    protected static async Task<Exception> AssertValidationFailsAsync(Func<Task> action, string? expectedMessageSubstring = null)
    {
        var exception = await Record.ExceptionAsync(action);
        exception.Should().NotBeNull("Expected a validation exception but none was thrown");
        exception.Should().BeAssignableTo<IPlatformValidationException>(
            $"Expected IPlatformValidationException but got {exception!.GetType().Name}: {exception.Message}");
        if (expectedMessageSubstring != null)
            exception.Message.Should().Contain(expectedMessageSubstring);
        return exception;
    }

    /// <summary>
    /// Configures IWebHostEnvironment for integration tests using the shared PlatformTestWebHostEnvironment.
    /// </summary>
    protected static void ConfigureWebHostEnvironment(IServiceCollection services, Assembly testProjectAssembly, string fallbackAspCoreEnvironmentValue)
    {
        var applicationName = testProjectAssembly.GetName().Name ?? "PlatformIntegrationTest";
        var environmentName = PlatformEnvironment.AspCoreEnvironmentValue ?? fallbackAspCoreEnvironmentValue;
        var contentRootPath = Directory.GetCurrentDirectory();
        var webRootPath = Path.Combine(contentRootPath, "wwwroot");

        services.AddSingleton<IWebHostEnvironment>(
            _ => PlatformTestWebHostEnvironment.Create(applicationName, environmentName, contentRootPath, webRootPath));
    }

    /// <summary>
    /// Cleanup method to dispose resources. Call this from test teardown.
    /// </summary>
    public static void TeardownIntegrationTest()
    {
        // Cleanup PlatformModule registration tracking to prevent memory leaks
        if (serviceCollection != null)
            PlatformModule.CleanupRegistrationTracking(serviceCollection);

        if (serviceProvider is IDisposable disposableServiceProvider)
            disposableServiceProvider.Dispose();

        serviceProvider = null;
        configuration = null;
        serviceCollection = null;
    }
}

/// <summary>
/// Extended integration test base that adds database assertion convenience methods.
/// Override <see cref="ResolveRepository{TEntity}"/> to provide the service-specific repository for each entity type.
///
/// <para>
/// <strong>Usage:</strong>
/// </para>
/// <code>
/// public class GrowthServiceIntegrationTestBase : PlatformServiceIntegrationTestWithAssertions&lt;GrowthApiAspNetCoreModule&gt;
/// {
///     protected override IPlatformRepository&lt;TEntity, string&gt; ResolveRepository&lt;TEntity&gt;(IServiceProvider sp)
///         =&gt; sp.GetRequiredService&lt;IGrowthRootRepository&lt;TEntity&gt;&gt;();
/// }
/// </code>
/// </summary>
/// <typeparam name="TServiceModule">The ASP.NET Core module type for the microservice</typeparam>
public abstract class PlatformServiceIntegrationTestWithAssertions<TServiceModule>
    : PlatformServiceIntegrationTestBase<TServiceModule>
    where TServiceModule : PlatformModule
{
    /// <summary>
    /// Resolves the service-specific repository for the given entity type from DI.
    /// Each service overrides this to return its own repository (e.g., IGrowthRootRepository&lt;TEntity&gt;).
    /// </summary>
    protected abstract IPlatformRepository<TEntity, string> ResolveRepository<TEntity>(IServiceProvider sp)
        where TEntity : class, IRootEntity<string>, new();

    /// <summary>
    /// Asserts that an entity with the given ID exists in the database.
    /// Uses WaitUntilAsync polling internally for eventual-consistency handling.
    /// Creates a fresh DI scope per poll iteration to avoid stale reads from repository caching.
    /// </summary>
    protected async Task AssertEntityExistsAsync<TEntity>(string id, TimeSpan? timeout = null)
        where TEntity : class, IRootEntity<string>, new()
    {
        await PlatformIntegrationTestHelper.WaitUntilAsync(
            async () =>
            {
                using var scope = ServiceProvider.CreateScope();
                var repo = ResolveRepository<TEntity>(scope.ServiceProvider);
                var entity = await repo.GetByIdAsync(id);
                entity.Should().NotBeNull(
                    $"Expected {typeof(TEntity).Name} with ID '{id}' to exist in database");
            },
            timeout: timeout ?? PlatformAssertDatabaseState.DefaultAssertTimeout,
            timeoutMessage: $"{typeof(TEntity).Name} with ID '{id}' not found within timeout");
    }

    /// <summary>
    /// Asserts that an entity exists and matches the given assertions.
    /// Uses WaitUntilAsync polling internally for eventual-consistency handling.
    /// Creates a fresh DI scope per poll iteration to avoid stale reads from repository caching.
    /// </summary>
    protected async Task AssertEntityMatchesAsync<TEntity>(string id, Action<TEntity> assertions, TimeSpan? timeout = null)
        where TEntity : class, IRootEntity<string>, new()
    {
        await PlatformIntegrationTestHelper.WaitUntilAsync(
            async () =>
            {
                using var scope = ServiceProvider.CreateScope();
                var repo = ResolveRepository<TEntity>(scope.ServiceProvider);
                var entity = await repo.GetByIdAsync(id);
                entity.Should().NotBeNull(
                    $"Expected {typeof(TEntity).Name} with ID '{id}' to exist in database");
                assertions(entity!);
            },
            timeout: timeout ?? PlatformAssertDatabaseState.DefaultAssertTimeout,
            timeoutMessage: $"{typeof(TEntity).Name} with ID '{id}' assertion not satisfied within timeout");
    }

    /// <summary>
    /// Asserts that an entity with the given ID no longer exists in the database.
    /// Uses WaitUntilAsync polling internally for eventual-consistency handling.
    /// Creates a fresh DI scope per poll iteration to avoid stale reads from repository caching.
    /// </summary>
    protected async Task AssertEntityDeletedAsync<TEntity>(string id, TimeSpan? timeout = null)
        where TEntity : class, IRootEntity<string>, new()
    {
        await PlatformIntegrationTestHelper.WaitUntilAsync(
            async () =>
            {
                using var scope = ServiceProvider.CreateScope();
                var repo = ResolveRepository<TEntity>(scope.ServiceProvider);
                // Use FirstOrDefaultAsync instead of GetByIdAsync because GetByIdAsync may throw
                // (e.g., if platform adds .EnsureFound()). FirstOrDefaultAsync reliably returns null.
                var entity = await repo.FirstOrDefaultAsync(e => e.Id == id);
                return entity == null;
            },
            timeout: timeout ?? PlatformAssertDatabaseState.DefaultAssertTimeout,
            timeoutMessage: $"{typeof(TEntity).Name} with ID '{id}' still exists after timeout — expected deletion");
    }
}
