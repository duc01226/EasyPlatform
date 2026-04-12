#region

using FluentAssertions;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries;
using PlatformExampleApp.TextSnippet.Domain.ValueObjects;

#endregion

namespace PlatformExampleApp.IntegrationTests.TextSnippets;

[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "Query")]
public class SearchSnippetTextQueryIntegrationTests : TextSnippetIntegrationTestBase
{
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-016")]
    public async Task SearchSnippetText_WhenQuerying_ShouldReturnPagedResults()
    {
        // Arrange
        var query = new SearchSnippetTextQuery
        {
            SkipCount = 0,
            MaxResultCount = 10,
        };

        // Act
        var result = await ExecuteQueryAsync(query);

        // Assert
        result.Should().NotBeNull();
        result.Items.Should().NotBeNull();
        result.TotalCount.Should().BeGreaterThanOrEqualTo(0);
        result.PageSize.Should().Be(10);
    }

    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-017")]
    public async Task SearchSnippetText_WhenCreateThenQuery_ShouldFindCreatedSnippet()
    {
        // Arrange — Create a snippet with unique text
        var snippetText = IntegrationTestHelper.UniqueName("Searchable");
        await ExecuteCommandAsync(new SaveSnippetTextCommand
        {
            Data = new TextSnippetEntityDto
            {
                SnippetText = snippetText,
                FullText = IntegrationTestHelper.UniqueName("Full text for search test"),
                Address = new ExampleAddressValueObject { Street = "789 Search Street" },
            },
        });

        // Act — Search by the unique snippet text
        var result = await ExecuteQueryAsync(new SearchSnippetTextQuery
        {
            SearchText = snippetText,
            SkipCount = 0,
            MaxResultCount = 10,
        });

        // Assert — newly created snippet appears in results
        result.Items.Should().Contain(s => s.SnippetText == snippetText);
    }
}
