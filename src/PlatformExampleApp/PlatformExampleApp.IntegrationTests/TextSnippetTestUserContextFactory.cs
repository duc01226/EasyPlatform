namespace PlatformExampleApp.IntegrationTests;

/// <summary>
/// Factory for creating <see cref="TextSnippetTestUserContext"/> instances for integration tests.
///
/// <para>
/// <strong>POC Reference — Extensibility Pattern:</strong>
/// In a real application, the factory would:
/// - Reference seeded user data (e.g., <c>SeedAdminUserData.Create(config).Id</c>)
/// - Validate required fields (CompanyId, UserId) against seed constants
/// - Provide role-specific constructors matching your domain's authorization model
/// </para>
///
/// <para>
/// <strong>Usage in tests:</strong>
/// <code>
/// // Admin context (default — full permissions)
/// var result = await ExecuteCommandAsync(command);
///
/// // Specific user context
/// var user = TextSnippetTestUserContextFactory.CreateUser();
/// var result = await ExecuteCommandAsync(command, user);
///
/// // Custom context for permission testing
/// var viewer = TextSnippetTestUserContextFactory.CreateViewerUser();
/// await Assert.ThrowsAsync&lt;PlatformPermissionException&gt;(
///     () => ExecuteCommandAsync(deleteCommand, viewer));
/// </code>
/// </para>
/// </summary>
public static class TextSnippetTestUserContextFactory
{
    // -------------------------------------------------------------------
    // Default IDs — In a real app, these come from seed data constants.
    // Example: SeedAdminUserData.Create(config).Id
    // For this POC, we use hardcoded demo values.
    // -------------------------------------------------------------------
    private const string DefaultUserId = "integration-test-user-001";
    private const string DefaultUserName = "IntTest User";
    private const string DefaultEmail = "inttest@example.com";
    private const string DefaultOrganization = "test-org-001";

    /// <summary>
    /// Creates a default admin-like user context with full permissions.
    /// </summary>
    public static TextSnippetTestUserContext CreateAdminUser(string? userId = null)
    {
        return new TextSnippetTestUserContext
        {
            UserId = userId ?? DefaultUserId,
            UserName = DefaultUserName,
            Email = DefaultEmail,
            Roles = ["Admin", "User"],
            Organizations = [DefaultOrganization],
        };
    }

    /// <summary>
    /// Creates a regular user context (no admin role).
    ///
    /// <para>
    /// In a real app, this user context would have limited permissions.
    /// The SaveSnippetTextCommand checks <c>RequestContext.UserId()</c> for save permission —
    /// only the creator can update their own snippets.
    /// </para>
    /// </summary>
    public static TextSnippetTestUserContext CreateUser(string? userId = null)
    {
        return new TextSnippetTestUserContext
        {
            UserId = userId ?? DefaultUserId,
            UserName = DefaultUserName,
            Email = DefaultEmail,
            Roles = ["User"],
            Organizations = [DefaultOrganization],
        };
    }

    /// <summary>
    /// Creates a read-only viewer context.
    /// Demonstrates testing permission boundaries — viewers should fail on write commands.
    /// </summary>
    public static TextSnippetTestUserContext CreateViewerUser(string? userId = null)
    {
        return new TextSnippetTestUserContext
        {
            UserId = userId ?? "viewer-user-001",
            UserName = "Viewer User",
            Email = "viewer@example.com",
            Roles = ["Viewer"],
            Organizations = [DefaultOrganization],
        };
    }
}
