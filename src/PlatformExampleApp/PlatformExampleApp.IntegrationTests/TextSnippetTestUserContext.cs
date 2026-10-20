#region

using Easy.Platform.Application.RequestContext;

#endregion

namespace PlatformExampleApp.IntegrationTests;

/// <summary>
/// Demo test user context for PlatformExampleApp integration tests.
/// Carries user identity and role info to populate the request context before each test execution.
///
/// <para>
/// <strong>POC Reference — Extensibility Pattern:</strong>
/// In a real application, add properties matching your domain's authorization model:
/// - Roles, permissions, organizational units for multi-tenant apps
/// - CompanyId, DepartmentIds for org-scoped queries
/// - Custom claims for JWT-based auth
/// The test base class reads this context in <c>BeforeExecuteAnyAsync</c> and populates
/// the platform request context accordingly.
/// </para>
///
/// <para>
/// <strong>Platform Request Context Keys:</strong>
/// The properties here map to <see cref="PlatformApplicationCommonRequestContextKeys"/>:
/// - UserId → <see cref="PlatformApplicationCommonRequestContextKeys.UserIdContextKey"/>
/// - UserName → <see cref="PlatformApplicationCommonRequestContextKeys.UserNameContextKey"/>
/// - Email → <see cref="PlatformApplicationCommonRequestContextKeys.EmailContextKey"/>
/// - Roles → <see cref="PlatformApplicationCommonRequestContextKeys.UserRolesContextKey"/>
/// </para>
/// </summary>
public class TextSnippetTestUserContext
{
    /// <summary>
    /// User ID to populate into RequestContext.
    /// Maps to <see cref="PlatformApplicationCommonRequestContextKeys.UserIdContextKey"/>.
    /// Commands use this via <c>RequestContext.UserId()</c> for permission checks and audit fields.
    /// </summary>
    public string? UserId { get; set; }

    /// <summary>
    /// User display name.
    /// Maps to <see cref="PlatformApplicationCommonRequestContextKeys.UserNameContextKey"/>.
    /// </summary>
    public string? UserName { get; set; }

    /// <summary>
    /// User email.
    /// Maps to <see cref="PlatformApplicationCommonRequestContextKeys.EmailContextKey"/>.
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// User roles for authorization.
    /// Maps to <see cref="PlatformApplicationCommonRequestContextKeys.UserRolesContextKey"/>.
    /// Extend with your app's role constants (e.g., "Admin", "Editor", "Viewer").
    /// </summary>
    public List<string> Roles { get; set; } = [];

    /// <summary>
    /// Custom organizations list for the TextSnippet app.
    /// Maps to <c>TextSnippetApplicationCustomRequestContextKeys.Organizations</c>.
    /// Demonstrates how to carry app-specific context beyond platform defaults.
    /// </summary>
    public List<string> Organizations { get; set; } = [];
}
