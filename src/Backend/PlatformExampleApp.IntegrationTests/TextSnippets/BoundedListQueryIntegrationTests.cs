using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands.TaskItem;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries.TaskItem;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.IntegrationTests.TextSnippets;

[Collection(TextSnippetIntegrationTestCollection.Name)]
[Trait("Category", "Query")]
public class BoundedListQueryIntegrationTests : TextSnippetIntegrationTestBase
{
    /// <summary>Controlled creator cannot be set by the snippet DTO; seed via the real repository as TC-EXAMPLE-025 does.</summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-APP-PAGING-011")]
    public async Task Search_DefaultAndFollowingPage_ReturnAllOwnedRowsWithoutUnboundedMaterialization()
    {
        var user = TextSnippetTestUserContextFactory.CreateUser(IntegrationTestHelper.UniqueName("PagedOwner"));
        var ids = new List<string>();
        await ExecuteWithServicesAsync(async services =>
        {
            var repository = services.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            for (var index = 0; index < 31; index++)
            {
                var entity = TextSnippetEntity.Create(Ulid.NewUlid().ToString(), IntegrationTestHelper.UniqueName("PagedSnippet"), "page content");
                entity.CreatedByUserId = user.UserId;
                await repository.CreateOrUpdateAsync(entity);
                ids.Add(entity.Id);
            }
        });

        var first = await ExecuteQueryAsync(new SearchSnippetTextQuery(), user);
        var second = await ExecuteQueryAsync(new SearchSnippetTextQuery { SkipCount = 20 }, user);

        first.Items.Should().HaveCount(20);
        second.Items.Should().HaveCount(11);
        first.TotalCount.Should().Be(31);
        second.TotalCount.Should().Be(31);
        first.PageSize.Should().Be(20);
        first.TotalPages.Should().Be(2);
        first.Items.Select(item => item.Id).Concat(second.Items.Select(item => item.Id)).Should().BeEquivalentTo(ids);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-APP-PAGING-013")]
    public async Task TaskList_DefaultAndFollowingPage_PreserveFilteredTotalsAndRows()
    {
        var assignee = IntegrationTestHelper.UniqueName("PagedAssignee");
        var ids = new List<string>();
        for (var index = 0; index < 31; index++)
        {
            var saved = await ExecuteCommandAsync(new SaveTaskItemCommand
            {
                Task = new TaskItemEntityDto { Title = IntegrationTestHelper.UniqueName("PagedTask"), AssigneeId = assignee },
            });
            saved.SavedTask.Id.Should().NotBeNullOrEmpty();
            ids.Add(saved.SavedTask.Id!);
        }

        var first = await ExecuteQueryAsync(new GetTaskListQuery { AssigneeId = assignee });
        var second = await ExecuteQueryAsync(new GetTaskListQuery { AssigneeId = assignee, SkipCount = 20 });

        first.Items.Should().HaveCount(20);
        second.Items.Should().HaveCount(11);
        first.TotalCount.Should().Be(31);
        second.TotalCount.Should().Be(31);
        first.TotalPages.Should().Be(2);
        first.StatusCounts.Values.Sum().Should().Be(31);
        first.Items.Select(item => item.Id).Concat(second.Items.Select(item => item.Id)).Should().BeEquivalentTo(ids);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(-1)]
    [InlineData(0)]
    [InlineData(201)]
    [Trait("TechnicalSpec", "TC-APP-PAGING-012")]
    public async Task ListQueries_RejectInvalidPageSizesThroughCqrs(int? size)
    {
        await AssertValidationFailsAsync(() => ExecuteQueryAsync(new SearchSnippetTextQuery { MaxResultCount = size }), "MaxResultCount");
        await AssertValidationFailsAsync(() => ExecuteQueryAsync(new GetTaskListQuery { MaxResultCount = size }), "MaxResultCount");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-APP-PAGING-012")]
    public async Task ListQueries_RejectNegativeOffsetsThroughCqrs()
    {
        await AssertValidationFailsAsync(() => ExecuteQueryAsync(new SearchSnippetTextQuery { SkipCount = -1 }), "SkipCount");
        await AssertValidationFailsAsync(() => ExecuteQueryAsync(new GetTaskListQuery { SkipCount = -1 }), "SkipCount");
    }
}
