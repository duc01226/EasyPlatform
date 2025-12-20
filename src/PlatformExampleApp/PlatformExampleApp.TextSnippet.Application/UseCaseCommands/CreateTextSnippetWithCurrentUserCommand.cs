#region

using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.RequestContext;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

/// <summary>
/// Example command that demonstrates using LazyLoadRequestContextAccessorRegistersFactory
/// to access CurrentUser throughout the request lifecycle with automatic caching.
/// </summary>
public sealed class CreateTextSnippetWithCurrentUserCommand : PlatformCqrsCommand<CreateTextSnippetWithCurrentUserCommandResult>
{
    public string SnippetText { get; set; } = "";
    public string Title { get; set; } = "";
    public string Category { get; set; } = "";

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return this.ValidateNot(p => string.IsNullOrWhiteSpace(p.SnippetText), "Snippet text is required")
            .AndNot(p => string.IsNullOrWhiteSpace(p.Title), "Title is required")
            .Of<IPlatformCqrsRequest>();
    }
}

public sealed class CreateTextSnippetWithCurrentUserCommandResult : PlatformCqrsCommandResult
{
    public string TextSnippetId { get; set; } = "";
    public string CreatedByUserName { get; set; } = "";
    public string CreatedByDepartment { get; set; } = "";
}

/// <summary>
/// Command handler demonstrating LazyLoadRequestContextAccessorRegistersFactory usage.
/// Shows how to access CurrentUser multiple times within the same request with automatic caching.
/// </summary>
internal sealed class CreateTextSnippetWithCurrentUserCommandHandler
    : PlatformCqrsCommandApplicationHandler<CreateTextSnippetWithCurrentUserCommand, CreateTextSnippetWithCurrentUserCommandResult>
{
    public CreateTextSnippetWithCurrentUserCommandHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        Lazy<IPlatformCqrs> platformCqrs,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider
    )
        : base(requestContextAccessor, unitOfWorkManager, platformCqrs, loggerFactory, serviceProvider)
    {
    }

    protected override async Task<CreateTextSnippetWithCurrentUserCommandResult> HandleAsync(
        CreateTextSnippetWithCurrentUserCommand request,
        CancellationToken cancellationToken)
    {
        // Step 1: Get current user (lazy-loaded on first access, cached for subsequent calls)
        var currentUser = await RequestContext.CurrentUser();
        if (currentUser == null)
            throw new UnauthorizedAccessException("Current user not found in request context");

        // Step 2: Create text snippet with user information
        var textSnippet = new TextSnippetEntity
        {
            Id = Guid.NewGuid().ToString(),
            SnippetText = request.SnippetText,
            Title = request.Title,
            Category = request.Category,
            CreatedBy = currentUser.Id, // Use inherited property from RootAuditedEntity
            CreatedDate = DateTime.UtcNow,
            // Additional user context can be added
            CreatedByDepartment = currentUser.DepartmentId
        };

        // Step 3: Validate business rules using current user context
        await ValidateUserCanCreateSnippet(currentUser, request.Category, cancellationToken); // Step 4: Save text snippet
        var repository = ServiceProvider.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();

        await repository.CreateOrUpdateAsync(textSnippet, cancellationToken: cancellationToken);
        await UnitOfWorkManager.CurrentActiveUow().SaveChangesAsync(cancellationToken);

        // Step 5: Create audit log (demonstrates multiple access to cached user)
        await CreateAuditLog(currentUser, textSnippet, cancellationToken); // Step 6: Return result with user information (cached user accessed again)
        return new CreateTextSnippetWithCurrentUserCommandResult
        {
            TextSnippetId = textSnippet.Id,
            CreatedByUserName = await RequestContext.CurrentUserFullName() ?? "Unknown", // Extension method usage
            CreatedByDepartment = await RequestContext.CurrentUserDepartmentId() ?? "Unknown"
        };
    }

    /// <summary>
    /// Example business logic that uses the current user context for validation.
    /// </summary>
    private async Task ValidateUserCanCreateSnippet(UserEntity currentUser, string category, CancellationToken cancellationToken)
    {
        // Example business rule: Only IT department can create "Technical" snippets
        if (category.Equals("Technical", StringComparison.OrdinalIgnoreCase) && !currentUser.DepartmentId.Equals("IT", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"User from {currentUser.DepartmentName} department cannot create Technical snippets");

        // Example: Check if user has reached daily snippet limit
        var repository = ServiceProvider.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();

        var todaySnippetsCount = await repository.CountAsync(
            predicate: s => s.CreatedBy == currentUser.Id && s.CreatedDate.HasValue && s.CreatedDate.Value.Date == DateTime.UtcNow.Date,
            cancellationToken: cancellationToken
        );

        if (todaySnippetsCount >= 10) throw new InvalidOperationException($"User {currentUser.FullName} has reached daily snippet creation limit");
    }

    /// <summary>
    /// Example method that demonstrates accessing the cached user multiple times.
    /// </summary>
    private async Task CreateAuditLog(UserEntity currentUser, TextSnippetEntity snippet, CancellationToken cancellationToken)
    {
        Logger.LogInformation(
            "Text snippet created - ID: {SnippetId}, Title: {Title}, CreatedBy: {UserName} ({UserId}), Department: {Department}",
            snippet.Id,
            snippet.Title,
            currentUser.FullName, // Accessing cached user data
            currentUser.Id,
            currentUser.DepartmentName
        );

        // Additional audit logic could go here
        // Each access to RequestContext.CurrentUser() returns the cached value

        // Simulate saving audit log with user context
        await Task.Delay(1, cancellationToken); // Placeholder for actual audit saving
    }
}
