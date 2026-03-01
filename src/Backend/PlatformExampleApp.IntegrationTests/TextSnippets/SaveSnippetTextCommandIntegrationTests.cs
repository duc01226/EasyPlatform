#region

using Easy.Platform.Common.Validations.Exceptions;
using FluentAssertions;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.ValueObjects;

#endregion

namespace PlatformExampleApp.IntegrationTests.TextSnippets;

[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "Command")]
public class SaveSnippetTextCommandIntegrationTests : TextSnippetIntegrationTestBase
{
    [Fact]
    public async Task SaveSnippetText_WhenValidData_ShouldCreateSuccessfully()
    {
        // Arrange
        var snippetText = IntegrationTestHelper.UniqueName("Snippet");
        var fullText = IntegrationTestHelper.UniqueName("Full text content for integration test");

        var command = new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto
            {
                SnippetText = snippetText,
                FullText = fullText,
                Address = new ExampleAddressValueObject { Street = "123 Test Street" },
            },
        };

        // Act
        var result = await ExecuteCommandAsync(command);

        // Assert — result properties
        result.Should().NotBeNull();
        result.SavedData.Should().NotBeNull();
        result.SavedData.Id.Should().NotBeNullOrEmpty();
        result.SavedData.SnippetText.Should().Be(snippetText);

        // Assert — DB state (WaitUntil-polled, eventual consistency)
        await AssertEntityMatchesAsync<TextSnippetEntity>(result.SavedData.Id, entity =>
        {
            entity.SnippetText.Should().Be(snippetText);
            entity.FullText.Should().Contain(fullText);
        });
    }

    [Fact]
    public async Task SaveSnippetText_WhenInvalidData_ShouldFailValidation()
    {
        // Arrange — empty SnippetText violates entity validation
        var command = new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto
            {
                SnippetText = "",
                FullText = "",
                Address = new ExampleAddressValueObject { Street = "123 Test Street" },
            },
        };

        // Act & Assert
        await Assert.ThrowsAsync<PlatformValidationException>(
            () => ExecuteCommandAsync(command));
    }

    [Fact]
    public async Task SaveSnippetText_WhenUpdatingExisting_ShouldPreserveIdAndUpdateFields()
    {
        // Arrange — Create first
        var originalSnippet = IntegrationTestHelper.UniqueName("Original Snippet");
        var createResult = await ExecuteCommandAsync(new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto
            {
                SnippetText = originalSnippet,
                FullText = IntegrationTestHelper.UniqueName("Original full text"),
                Address = new ExampleAddressValueObject { Street = "123 Test Street" },
            },
        });

        var entityId = createResult.SavedData.Id;
        var updatedSnippet = IntegrationTestHelper.UniqueName("Updated Snippet");

        // Act — Update with same ID
        var updateResult = await ExecuteCommandAsync(new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto
            {
                Id = entityId,
                SnippetText = updatedSnippet,
                FullText = IntegrationTestHelper.UniqueName("Updated full text"),
                Address = new ExampleAddressValueObject { Street = "456 Updated Street" },
            },
        });

        // Assert
        updateResult.SavedData.Id.Should().Be(entityId);

        await AssertEntityMatchesAsync<TextSnippetEntity>(entityId, entity =>
        {
            entity.SnippetText.Should().Contain(updatedSnippet);
        });
    }
}
