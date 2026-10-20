#region

using Easy.Platform.Common.Exceptions;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.IntegrationTests.RequestContext;

/// <summary>
/// Integration tests for request context and authorization patterns.
///
/// <para>
/// <strong>POC Reference — BeforeExecuteAnyAsync Pattern:</strong>
/// <see cref="TextSnippetIntegrationTestBase.BeforeExecuteAnyAsync"/> populates
/// <c>IPlatformApplicationRequestContextAccessor.Current</c> before every command/query.
/// Pass a <see cref="TextSnippetTestUserContext"/> as the second argument to override
/// the default admin identity for permission testing.
/// </para>
///
/// <para>
/// <strong>SavePermissionValidator:</strong>
/// <c>TextSnippetEntity.SavePermissionValidator(userId)</c> enforces that only the
/// entity's <c>CreatedByUserId</c> may update it. Violation throws
/// <see cref="PlatformPermissionException"/>.
/// </para>
/// </summary>
[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "Authorization")]
public class UserContextIntegrationTests : TextSnippetIntegrationTestBase
{
    /// <summary>
    /// Verifies that SaveSnippetTextCommand rejects updates when the caller's userId
    /// does not match the entity's CreatedByUserId.
    ///
    /// <para>
    /// <strong>Setup:</strong> Entity is seeded directly via repository with
    /// <c>CreatedByUserId = "user-a-001"</c>. Then an update is attempted with
    /// a request context for a different user ("user-b-999"), which the
    /// <c>SavePermissionValidator</c> rejects with <see cref="PlatformPermissionException"/>.
    /// </para>
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-025")]
    public async Task SaveSnippetText_NonOwnerUpdate_ShouldThrowPermissionException()
    {
        // Arrange Step 1 — seed entity directly via repo with a known CreatedByUserId
        var snippetId = Ulid.NewUlid().ToString();
        var snippetText = IntegrationTestHelper.UniqueName("PermissionTest");
        const string creatorUserId = "user-a-owner-001";

        await ExecuteWithServicesAsync(async sp =>
        {
            var repo = sp.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            var entity = TextSnippetEntity.Create(snippetId, snippetText, "content");
            entity.CreatedByUserId = creatorUserId; // Explicit creator
            await repo.CreateOrUpdateAsync(entity);
        });

        // Verify entity was seeded correctly
        await AssertEntityMatchesAsync<TextSnippetEntity>(snippetId, entity =>
            entity.CreatedByUserId.Should().Be(creatorUserId,
                "entity must be seeded with the expected CreatedByUserId"));

        // Arrange Step 2 — different user context (NOT the creator)
        var nonOwnerContext = TextSnippetTestUserContextFactory.CreateUser(userId: "user-b-not-owner-999");

        var updateCommand = new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto
            {
                Id = snippetId,
                SnippetText = IntegrationTestHelper.UniqueName("AttemptedUpdate"),
                FullText = "attempted update",
            },
        };

        // Act & Assert — non-owner update must throw PlatformPermissionException
        // SavePermissionValidator: entity.CreatedByUserId != requestContext.UserId → permission denied
        var ex = await Record.ExceptionAsync(
            () => ExecuteCommandAsync(updateCommand, nonOwnerContext));

        ex.Should().NotBeNull("Expected PlatformPermissionException but no exception was thrown");
        ex.Should().BeOfType<PlatformPermissionException>(
            "SavePermissionValidator with WithPermissionException() must throw PlatformPermissionException " +
            $"when caller '{nonOwnerContext.UserId}' != creator '{creatorUserId}'");
    }

    /// <summary>
    /// Verifies that SaveSnippetTextCommand succeeds when the request context's UserId
    /// matches the entity's CreatedByUserId (the owner updates their own entity).
    ///
    /// <para>
    /// <strong>Positive complement of TC-EXAMPLE-025:</strong>
    /// This test demonstrates the full BeforeExecuteAnyAsync pattern — passing a
    /// <see cref="TextSnippetTestUserContext"/> with the same UserId as the entity creator
    /// proves that the SavePermissionValidator passes and the update persists to the DB.
    /// </para>
    ///
    /// <para>
    /// <strong>Why seed via repo (not SaveSnippetTextCommand):</strong>
    /// <c>TextSnippetEntityDto</c> has no <c>CreatedByUserId</c> property and the
    /// handler does not auto-stamp it from <c>RequestContext.UserId()</c>. Direct repo
    /// creation is the only way to seed a known <c>CreatedByUserId</c> for permission tests.
    /// </para>
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-031")]
    public async Task SaveSnippetText_OwnerUpdate_ShouldSucceedAndPersistToDb()
    {
        // Arrange Step 1 — seed entity directly via repo with a known CreatedByUserId
        var snippetId = Ulid.NewUlid().ToString();
        var originalText = IntegrationTestHelper.UniqueName("OwnerOriginal");
        const string ownerUserId = "user-c-owner-777";

        await ExecuteWithServicesAsync(async sp =>
        {
            var repo = sp.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            var entity = TextSnippetEntity.Create(snippetId, originalText, "original content");
            entity.CreatedByUserId = ownerUserId;
            await repo.CreateOrUpdateAsync(entity);
        });

        // Verify seeded state
        await AssertEntityMatchesAsync<TextSnippetEntity>(snippetId, entity =>
            entity.CreatedByUserId.Should().Be(ownerUserId,
                "entity must be seeded with the expected CreatedByUserId before the owner update"));

        // Arrange Step 2 — owner context: UserId matches CreatedByUserId
        // BeforeExecuteAnyAsync populates IPlatformApplicationRequestContextAccessor.Current
        // from this context before the command executes.
        var ownerContext = TextSnippetTestUserContextFactory.CreateUser(userId: ownerUserId);

        var updatedText = IntegrationTestHelper.UniqueName("OwnerUpdated");
        var updateCommand = new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto
            {
                Id = snippetId,
                SnippetText = updatedText,
                FullText = "owner update content",
            },
        };

        // Act — owner update must succeed (SavePermissionValidator: CreatedByUserId == UserId → passes)
        var ex = await Record.ExceptionAsync(
            () => ExecuteCommandAsync(updateCommand, ownerContext));

        // Assert — no exception means permission check passed
        ex.Should().BeNull(
            $"Owner '{ownerUserId}' must be able to update their own entity — " +
            "SavePermissionValidator passes when CreatedByUserId == RequestContext.UserId()");

        // Assert — DB state reflects the update
        await AssertEntityMatchesAsync<TextSnippetEntity>(snippetId, entity =>
            entity.SnippetText.Should().Be(updatedText,
                "DB must reflect the owner's update after SaveSnippetTextCommand succeeds"));
    }
}
