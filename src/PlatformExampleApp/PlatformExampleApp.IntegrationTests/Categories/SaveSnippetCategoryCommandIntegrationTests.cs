#region

using Easy.Platform.Common.Validations.Exceptions;
using FluentAssertions;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands.Category;
using PlatformExampleApp.TextSnippet.Domain.Entities;

#endregion

namespace PlatformExampleApp.IntegrationTests.Categories;

[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "Command")]
public class SaveSnippetCategoryCommandIntegrationTests : TextSnippetIntegrationTestBase
{
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-007")]
    public async Task SaveSnippetCategory_WhenValidData_ShouldCreateSuccessfully()
    {
        // Arrange
        var categoryName = IntegrationTestHelper.UniqueName("Test Category");

        var command = new SaveSnippetCategoryCommand
        {
            Category = new TextSnippetCategoryDto
            {
                Name = categoryName,
                Description = "Integration test category",
            },
        };

        // Act
        var result = await ExecuteCommandAsync(command);

        // Assert — result properties
        result.Should().NotBeNull();
        result.SavedCategory.Should().NotBeNull();
        result.SavedCategory.Id.Should().NotBeNullOrEmpty();
        result.SavedCategory.Name.Should().Be(categoryName);

        // Assert — DB state
        await AssertEntityMatchesAsync<TextSnippetCategory>(result.SavedCategory.Id, category =>
        {
            category.Name.Should().Be(categoryName);
        });
    }

    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-008")]
    public async Task SaveSnippetCategory_WhenEmptyName_ShouldFailValidation()
    {
        // Arrange — empty name violates validation
        var command = new SaveSnippetCategoryCommand
        {
            Category = new TextSnippetCategoryDto
            {
                Name = "",
                Description = "Should fail",
            },
        };

        // Act & Assert
        await Assert.ThrowsAsync<PlatformValidationException>(
            () => ExecuteCommandAsync(command));
    }

    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-009")]
    public async Task SaveSnippetCategory_WhenUpdating_ShouldPreserveIdAndUpdateFields()
    {
        // Arrange — Create first
        var originalName = IntegrationTestHelper.UniqueName("Original Category");
        var createResult = await ExecuteCommandAsync(new SaveSnippetCategoryCommand
        {
            Category = new TextSnippetCategoryDto
            {
                Name = originalName,
                Description = "Original description",
            },
        });

        var categoryId = createResult.SavedCategory.Id;
        var updatedName = IntegrationTestHelper.UniqueName("Updated Category");

        // Act — Update
        var updateResult = await ExecuteCommandAsync(new SaveSnippetCategoryCommand
        {
            Category = new TextSnippetCategoryDto
            {
                Id = categoryId,
                Name = updatedName,
                Description = "Updated description",
            },
        });

        // Assert
        updateResult.SavedCategory.Id.Should().Be(categoryId);
        updateResult.SavedCategory.Name.Should().Be(updatedName);

        await AssertEntityMatchesAsync<TextSnippetCategory>(categoryId, category =>
        {
            category.Name.Should().Be(updatedName);
        });
    }
}
