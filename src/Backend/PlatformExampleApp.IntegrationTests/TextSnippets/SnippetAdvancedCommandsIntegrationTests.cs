#region

using FluentAssertions;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands.Snippet;
using PlatformExampleApp.TextSnippet.Domain.Entities;

#endregion

namespace PlatformExampleApp.IntegrationTests.TextSnippets;

/// <summary>
/// Integration tests for advanced snippet commands: CloneSnippetCommand and BulkUpdateSnippetStatusCommand.
///
/// <para>
/// <strong>POC Reference — CloneSnippetCommand Pattern:</strong>
/// Clone creates a new entity with a new Ulid ID. SnippetText = source + CloneSuffix.
/// Status resets to Draft, ViewCount=0, PublishedDate=null regardless of source state.
/// Validates source exists; target category (if specified) must also exist.
/// </para>
///
/// <para>
/// <strong>POC Reference — BulkUpdateSnippetStatusCommand Pattern:</strong>
/// Demonstrates two sub-patterns: all-or-nothing (SkipInvalidItems=false) and
/// partial-success (SkipInvalidItems=true). Invalid items are either rejected entirely
/// or skipped with error details in the result.
/// </para>
/// </summary>
[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "Command")]
public class SnippetAdvancedCommandsIntegrationTests : TextSnippetIntegrationTestBase
{
    /// <summary>
    /// CloneSnippetCommand creates a new snippet with:
    /// - New unique Ulid ID (different from source)
    /// - SnippetText = source.SnippetText + CloneSuffix (" (Copy)" by default)
    /// - Status = Draft (reset from source's Published state)
    /// - ViewCount = 0 (reset)
    /// - PublishedDate = null (reset)
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-021")]
    public async Task CloneSnippet_ShouldCreateNewEntityWithResetDefaults()
    {
        // Arrange — create a Published source snippet with ViewCount > 0
        var sourceText = IntegrationTestHelper.UniqueName("CloneSource");
        var createResult = await ExecuteCommandAsync(new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto { SnippetText = sourceText, FullText = "source content" },
        });
        var sourceId = createResult.SavedData.Id;

        // Promote source to Published so clone must reset it
        await ExecuteCommandAsync(new BulkUpdateSnippetStatusCommand
        {
            SnippetIds = [sourceId],
            NewStatus = SnippetStatus.Published,
            SkipInvalidItems = false,
        });

        // Act — clone the Published snippet
        var cloneResult = await ExecuteCommandAsync(new CloneSnippetCommand
        {
            SourceSnippetId = sourceId,
        });

        // Assert — result properties
        cloneResult.ClonedSnippet.Should().NotBeNull();
        cloneResult.SourceSnippetId.Should().Be(sourceId);

        var cloneId = cloneResult.ClonedSnippet.Id;
        cloneId.Should().NotBeNullOrEmpty();
        cloneId.Should().NotBe(sourceId, "clone must get a new unique ID");

        // Assert — DB state
        await AssertEntityMatchesAsync<TextSnippetEntity>(cloneId, entity =>
        {
            entity.SnippetText.Should().Contain(sourceText,
                "clone SnippetText must start with source's SnippetText");
            entity.SnippetText.Should().Contain(" (Copy)",
                "clone SnippetText must append the default CloneSuffix");
            entity.Status.Should().Be(SnippetStatus.Draft,
                "clone must reset Status to Draft regardless of source status");
            entity.ViewCount.Should().Be(0,
                "clone must reset ViewCount to 0");
            entity.PublishedDate.Should().BeNull(
                "clone must reset PublishedDate to null");
        });
    }

    /// <summary>
    /// CloneSnippetCommand with a non-existent source ID throws PlatformValidationException.
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-022")]
    public async Task CloneSnippet_SourceNotFound_ShouldThrowValidationException()
    {
        // Arrange — a non-existent source ID
        var nonExistentId = Ulid.NewUlid().ToString();

        // Act & Assert
        await AssertValidationFailsAsync(
            () => ExecuteCommandAsync(new CloneSnippetCommand { SourceSnippetId = nonExistentId }),
            "Source snippet not found");
    }

    /// <summary>
    /// BulkUpdateSnippetStatusCommand with SkipInvalidItems=false rejects the entire batch
    /// when any ID does not exist. Valid items remain unchanged (all-or-nothing semantics).
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-023")]
    public async Task BulkUpdateSnippetStatus_SkipInvalidFalse_ShouldRollbackEntireBatch()
    {
        // Arrange — create 2 valid snippets and 1 non-existent ID
        var snippetText1 = IntegrationTestHelper.UniqueName("BulkRollback1");
        var snippetText2 = IntegrationTestHelper.UniqueName("BulkRollback2");
        var nonExistentId = Ulid.NewUlid().ToString();

        var result1 = await ExecuteCommandAsync(new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto { SnippetText = snippetText1, FullText = "content 1" },
        });
        var result2 = await ExecuteCommandAsync(new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto { SnippetText = snippetText2, FullText = "content 2" },
        });

        var snippetId1 = result1.SavedData.Id;
        var snippetId2 = result2.SavedData.Id;

        // Act & Assert — command must throw because one ID is missing and SkipInvalidItems=false
        await Assert.ThrowsAnyAsync<Exception>(
            () => ExecuteCommandAsync(new BulkUpdateSnippetStatusCommand
            {
                SnippetIds = [snippetId1, snippetId2, nonExistentId],
                NewStatus = SnippetStatus.Published,
                SkipInvalidItems = false,
            }));

        // Assert — valid snippets must retain their original Draft status (batch was rejected)
        await AssertEntityMatchesAsync<TextSnippetEntity>(snippetId1, entity =>
            entity.Status.Should().Be(SnippetStatus.Draft,
                "Snippet1 must remain Draft — SkipInvalidItems=false rejected the entire batch"));
        await AssertEntityMatchesAsync<TextSnippetEntity>(snippetId2, entity =>
            entity.Status.Should().Be(SnippetStatus.Draft,
                "Snippet2 must remain Draft — SkipInvalidItems=false rejected the entire batch"));
    }

    /// <summary>
    /// BulkUpdateSnippetStatusCommand with SkipInvalidItems=true updates valid items and
    /// silently skips non-existent IDs. Returns SkippedIds list with details.
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-024")]
    public async Task BulkUpdateSnippetStatus_SkipInvalidTrue_ShouldUpdateValidItemsAndSkipInvalid()
    {
        // Arrange — 2 valid snippets + 1 non-existent ID
        var snippetText1 = IntegrationTestHelper.UniqueName("BulkSkip1");
        var snippetText2 = IntegrationTestHelper.UniqueName("BulkSkip2");
        var nonExistentId = Ulid.NewUlid().ToString();

        var result1 = await ExecuteCommandAsync(new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto { SnippetText = snippetText1, FullText = "content 1" },
        });
        var result2 = await ExecuteCommandAsync(new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto { SnippetText = snippetText2, FullText = "content 2" },
        });

        var snippetId1 = result1.SavedData.Id;
        var snippetId2 = result2.SavedData.Id;

        // Act — SkipInvalidItems=true: command must NOT throw, invalid IDs are skipped
        var bulkResult = await ExecuteCommandAsync(new BulkUpdateSnippetStatusCommand
        {
            SnippetIds = [snippetId1, snippetId2, nonExistentId],
            NewStatus = SnippetStatus.Published,
            SkipInvalidItems = true,
        });

        // Assert — result indicates 2 updated and 1 skipped
        bulkResult.UpdatedCount.Should().Be(2,
            "2 valid snippets must be updated");
        bulkResult.SkippedIds.Should().Contain(nonExistentId,
            "non-existent ID must appear in SkippedIds");

        // Assert — valid snippets are now Published with PublishedDate set
        await AssertEntityMatchesAsync<TextSnippetEntity>(snippetId1, entity =>
        {
            entity.Status.Should().Be(SnippetStatus.Published,
                "Snippet1 must be Published after SkipInvalidItems=true bulk update");
            entity.PublishedDate.Should().NotBeNull(
                "PublishedDate must be set for Snippet1 on Publish");
        });
        await AssertEntityMatchesAsync<TextSnippetEntity>(snippetId2, entity =>
        {
            entity.Status.Should().Be(SnippetStatus.Published,
                "Snippet2 must be Published after SkipInvalidItems=true bulk update");
            entity.PublishedDate.Should().NotBeNull(
                "PublishedDate must be set for Snippet2 on Publish");
        });
    }
}
