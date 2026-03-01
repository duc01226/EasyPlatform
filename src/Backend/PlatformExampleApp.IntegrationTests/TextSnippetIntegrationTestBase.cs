#region

using Easy.Platform.Application.RequestContext;
using Easy.Platform.AutomationTest.IntegrationTests;
using Easy.Platform.Domain.Repositories;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TextSnippet.Api;
using PlatformExampleApp.TextSnippet.Application.Context.RequestContext;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.IntegrationTests;

/// <summary>
/// TextSnippet-specific integration test base class.
/// Extends the platform base with repository resolution and request context setup.
///
/// <para>
/// <strong>BeforeExecuteAnyAsync Pattern:</strong>
/// Override <see cref="BeforeExecuteAnyAsync"/> to populate the platform request context
/// from a strongly-typed <see cref="TextSnippetTestUserContext"/>.
/// This runs before every <c>ExecuteCommandAsync</c>, <c>ExecuteQueryAsync</c>, and <c>ExecuteWithServicesAsync</c>.
/// </para>
///
/// <para>
/// <strong>How it works:</strong>
/// 1. Tests pass a <see cref="TextSnippetTestUserContext"/> (or null) as <c>userContext</c>
/// 2. <c>BeforeExecuteAnyAsync</c> maps context properties to platform request context keys
/// 3. Command/query handlers read from <c>RequestContext.UserId()</c>, <c>RequestContext.UserRoles()</c>, etc.
/// 4. When <c>userContext</c> is null, a default admin-like context is populated
/// </para>
/// </summary>
public abstract class TextSnippetIntegrationTestBase
    : PlatformServiceIntegrationTestWithAssertions<TextSnippetApiAspNetCoreModule>
{
    /// <inheritdoc />
    protected override IPlatformRepository<TEntity, string> ResolveRepository<TEntity>(IServiceProvider sp)
        => sp.GetRequiredService<ITextSnippetRootRepository<TEntity>>();

    /// <summary>
    /// Populates the platform request context before each command/query/service execution.
    ///
    /// <para>
    /// <strong>POC Demo — Request Context Setup:</strong>
    /// This demonstrates the pattern for mapping a test user context to the platform's
    /// <see cref="IPlatformApplicationRequestContext"/> (which is an <c>IDictionary&lt;string, object&gt;</c>).
    ///
    /// The platform provides setter extension methods on <c>PlatformApplicationCommonRequestContextKeys</c>:
    /// - <c>SetUserId()</c> → sets <c>RequestContextKeys.UserIdContextKey</c>
    /// - <c>SetUserRoles()</c> → sets <c>RequestContextKeys.UserRolesContextKey</c>
    /// - <c>SetEmail()</c> → sets <c>RequestContextKeys.EmailContextKey</c>
    /// - etc.
    ///
    /// For app-specific context keys, use <c>SetRequestContextValue()</c> directly:
    /// <code>
    /// requestContext.SetRequestContextValue(organizations, TextSnippetApplicationCustomRequestContextKeys.Organizations);
    /// </code>
    /// </para>
    ///
    /// <para>
    /// <strong>In a real application, you would:</strong>
    /// - Read seeded admin user data from configuration (<c>SeedAdminUserData.Create(config)</c>)
    /// - Call shared extension methods like <c>PopulateSeedUserAccountInfo()</c>
    /// - Handle multi-tenant context (CompanyId, OrgUnitRoles) for authorization
    /// See <c>GrowthServiceIntegrationTestBase</c> in Growth.IntegrationTests for a production example.
    /// </para>
    /// </summary>
    protected override Task BeforeExecuteAnyAsync(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        object? userContext = null,
        CancellationToken cancellationToken = default)
    {
        // Step 1: Resolve the test user context (or create a default admin context)
        var testContext = userContext switch
        {
            null => TextSnippetTestUserContextFactory.CreateAdminUser(), // Default: admin permissions
            TextSnippetTestUserContext tc => tc,
            _ => throw new ArgumentException(
                $"Expected TextSnippetTestUserContext but got {userContext.GetType().Name}. " +
                "Pass TextSnippetTestUserContextFactory.Create*() or null for default admin.",
                nameof(userContext))
        };

        // Step 2: Populate platform request context from test user context.
        // These keys are what command/query handlers read via RequestContext.UserId(), etc.
        var requestContext = requestContextAccessor.Current;

        requestContext
            .SetUserId(testContext.UserId ?? "integration-test-user-001")
            .SetEmail(testContext.Email ?? "inttest@example.com")
            .SetUserRoles(testContext.Roles);

        // Step 3: Populate app-specific custom context keys.
        // TextSnippet has a custom "Organizations" key defined in TextSnippetApplicationCustomRequestContextKeys.
        if (testContext.Organizations.Count > 0)
        {
            requestContext.SetRequestContextValue(
                testContext.Organizations,
                TextSnippetApplicationCustomRequestContextKeys.Organizations);
        }

        return Task.CompletedTask;
    }
}
