using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Common.Dtos;
using Easy.Platform.Common.Extensions;
using FluentAssertions;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries.TaskItem;

namespace PlatformExampleApp.Tests.Unit.TextSnippet;

/// <summary>Technical boundary guards TC-APP-120..123: app-only paging, cache identity and retained task validation.</summary>
public class TextSnippetQueryBoundaryTests
{
    public static TheoryData<bool, int?, bool> PageSizes()
    {
        var cases = new TheoryData<bool, int?, bool>();
        foreach (var taskList in new[] { false, true })
        {
            foreach (var size in new int?[] { null, -1, 0, 1, 10, 25, 50, 200, 201, int.MaxValue })
                cases.Add(taskList, size, size is > 0 and <= 200);
        }
        return cases;
    }

    [Theory]
    [MemberData(nameof(PageSizes))]
    [Trait("TechnicalSpec", "TC-APP-120")]
    public void PublicListQueries_RequireFinitePositivePages(bool taskList, int? pageSize, bool valid)
    {
        IPlatformCqrsRequest request = taskList ? new GetTaskListQuery() : new SearchSnippetTextQuery();
        var pagedRequest = (IPlatformPagedRequest)request;
        pagedRequest.MaxResultCount.Should().Be(20, "omitted sizes must align with the typed client's finite default");
        pagedRequest.MaxResultCount = pageSize;

        request.Validate().IsValid.Should().Be(valid);
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData(0, true)]
    [InlineData(1, true)]
    [InlineData(-1, false)]
    [Trait("TechnicalSpec", "TC-APP-120")]
    public void PublicListQueries_RejectNegativeOffsets(int? skip, bool valid)
    {
        new SearchSnippetTextQuery { SkipCount = skip }.Validate().IsValid.Should().Be(valid);
        new GetTaskListQuery { SkipCount = skip }.Validate().IsValid.Should().Be(valid);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-APP-121")]
    public void GenericPaging_PreservesExplicitUnlimitedContract()
    {
        var query = new InternalQuery { MaxResultCount = null };

        Enumerable.Range(0, 250).AsQueryable().PageBy(query.SkipCount, query.MaxResultCount).Count().Should().Be(250);
        query.IsPagedRequestValid().Should().BeTrue();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-APP-122")]
    public void SearchCacheKey_PartitionsUsersAndAnonymousAndInvalidatesLegacySharedNamespace()
    {
        var request = new SearchSnippetTextQuery { SearchText = "same-filter", MaxResultCount = 10 };
        var owner = SearchSnippetTextQuery.BuildCacheRequestKeyParts(request, "owner", null!);
        var other = SearchSnippetTextQuery.BuildCacheRequestKeyParts(request, "other", null!);
        var anonymous = SearchSnippetTextQuery.BuildCacheRequestKeyParts(request, null!, null!);
        var legacy = IPlatformCqrsRequest.BuildCacheRequestKeyParts(request, null!, null!);

        owner.Should().NotEqual(other);
        owner.Should().NotEqual(anonymous);
        anonymous.Should().NotEqual(legacy, "old anonymous keys could hold another user's private result");
        request.MaxResultCount = 25;
        SearchSnippetTextQuery.BuildCacheRequestKeyParts(request, "owner", null!).Should().NotEqual(owner);
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(30, true)]
    [InlineData(31, false)]
    [Trait("TechnicalSpec", "TC-APP-123")]
    public void TaskList_RetainsDueSoonValidation(int days, bool valid)
    {
        new GetTaskListQuery { DueSoonDays = days }.Validate().IsValid.Should().Be(valid);
    }

    private sealed class InternalQuery : PlatformCqrsPagedQuery<InternalResult, int>;
    private sealed class InternalResult : PlatformCqrsQueryPagedResult<int>;
}
