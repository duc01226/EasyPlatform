using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Controllers;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Infrastructures.Caching;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using PlatformExampleApp.TextSnippet.Application.Caching;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Application.Persistence;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands.OtherDemos;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace PlatformExampleApp.TextSnippet.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TextSnippetController : PlatformBaseController
{
    private readonly ITextSnippetDbContext textSnippetDbContext;
    private readonly ITextSnippetRootRepository<TextSnippetEntity> snippetRepository;
    private readonly ITextSnippetRootRepository<TextSnippetCategory> categoryRepository;

    public TextSnippetController(
        IPlatformCqrs cqrs,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        IConfiguration configuration,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        ITextSnippetDbContext textSnippetDbContext,
        ITextSnippetRootRepository<TextSnippetEntity> snippetRepository,
        ITextSnippetRootRepository<TextSnippetCategory> categoryRepository) : base(cqrs, cacheRepositoryProvider, configuration, requestContextAccessor)
    {
        this.textSnippetDbContext = textSnippetDbContext;
        this.snippetRepository = snippetRepository;
        this.categoryRepository = categoryRepository;
    }

    // GET: api/<TextSnippetController>
    [HttpGet]
    [Route("search")]
    public async Task<SearchSnippetTextQueryResult> Search([FromQuery] SearchSnippetTextQuery request)
    {
        // Random delay slow request for spinner
        Util.RandomGenerator.DoByChance(50, () => Thread.Sleep(1000));

        // RandomThrowToTestHandleInternalException();

        // Using default last registered cache repository (default is built-in memory cache).
        //return await CacheRepositoryProvider.GetCollection<TextSnippetApplicationCollectionCacheKeyProvider>()
        //    .CacheRequestAsync(
        //        () => Cqrs.SendQuery(request),
        //        new object[] { nameof(Search), request },
        //        new TextSnippetConfigurationCollectionCacheEntryOptions(Configuration));

        // Test case use default CacheEntryOptions. Could be configured via override DefaultPlatformCacheEntryOptions in module
        return await CacheRepositoryProvider.GetCollection<TextSnippetCollectionCacheKeyProvider>()
            .CacheRequestAsync(
                () => Cqrs.SendQuery(request),
                SearchSnippetTextQuery.BuildCacheRequestKeyParts(request, null, null),
                tags: [SearchSnippetTextQuery.BuildCacheRequestTag(RequestContext.UserId())]);

        // Using distributed cache and also use CacheRequestUseConfigOptionsAsync for convenient
        //return await CacheRepositoryProvider.GetCollection<TextSnippetCollectionCacheKeyProvider>(PlatformCacheRepositoryType.Distributed)
        //    .CacheRequestUseConfigOptionsAsync<TextSnippetCollectionConfigurationCacheEntryOptions, SearchSnippetTextQueryResult>(
        //        () => Cqrs.SendQuery(request),
        //        new object[] { nameof(Search), request });
    }

    // POST api/<TextSnippetController>
    [HttpPost]
    [Route("save")]
    public async Task<SaveSnippetTextCommandResult> Save([FromBody] SaveSnippetTextCommand request)
    {
        // Random delay slow request for spinner
        Util.RandomGenerator.DoByChance(50, () => Thread.Sleep(1000));

        // RandomThrowToTestHandleInternalException();

        return await Cqrs.SendCommand(request);
    }

    [HttpGet]
    [Route("demoScheduleBackgroundJobManuallyCommand")]
    public async Task<DemoScheduleBackgroundJobManuallyCommandResult> DemoScheduleBackgroundJobManuallyCommand(
        string updateTextSnippetFullText = "")
    {
        return await Cqrs.SendCommand(
            new DemoScheduleBackgroundJobManuallyCommand
            {
                NewSnippetText = updateTextSnippetFullText
            });
    }

    [HttpGet]
    [Route("DemoUseDemoDomainServiceCommand")]
    public async Task<DemoUseDemoDomainServiceCommandResult> DemoUseDemoDomainServiceCommand()
    {
        return await Cqrs.SendCommand(
            new DemoUseDemoDomainServiceCommand());
    }

    [HttpPost]
    [Route("demoSendFreeFormatEventBusMessageCommand")]
    public async Task<DemoSendFreeFormatEventBusMessageCommandResult> DemoSendFreeFormatEventBusMessageCommand(
        [FromBody] DemoSendFreeFormatEventBusMessageCommand request)
    {
        return await Cqrs.SendCommand(request);
    }

    [HttpGet]
    [Route("testHandleInternalException")]
    public Task TestHandleInternalException()
    {
        throw new Exception("TestLoggingForInternalException");
    }

    /// <summary>
    /// Test get very big data stream to see data downloading streaming by return IAsyncEnumerable. Return data as stream using IAsyncEnumerable do not load all data into memory
    /// </summary>
    [HttpGet]
    [Route("testGetAllDataAsIAsyncEnumerableStream")]
    public async Task<IActionResult> TestGetAllDataAsIAsyncEnumerableStream()
    {
        var result = await Cqrs.SendQuery(new TestGetAllDataAsStreamQuery()).Then(p => p.AsyncEnumerableResult);
        return Ok(result);
    }

    /// <summary>
    /// // Test get very big data as IEnumerable to see memory issues compared to IAsyncEnumerable
    /// </summary>
    [HttpGet]
    [Route("testGetAllDataAsIEnumerableStream")]
    public async Task<IActionResult> TestGetAllDataAsIEnumerableStream()
    {
        var result = await Cqrs.SendQuery(new TestGetAllDataAsStreamQuery()).Then(p => p.EnumerableResult);
        return Ok(result);
    }

    /// <summary>
    /// // Test get very big data as IEnumerable to see memory issues compared to IAsyncEnumerable
    /// </summary>
    [HttpGet]
    [Route("testGetAllDataAsIEnumerableFromAsyncEnumerableStream")]
    public async Task<IActionResult> TestGetAllDataAsIEnumerableFromAsyncEnumerableStream()
    {
        var result = await Cqrs.SendQuery(new TestGetAllDataAsStreamQuery()).Then(p => p.EnumerableResultFromAsyncEnumerable);
        return Ok(result);
    }

    [HttpPost]
    [Route("testSaveUsingDirectDbContext")]
    public async Task<SaveSnippetTextCommandResult> TestSaveUsingDirectDbContext([FromBody] SaveSnippetTextCommand request)
    {
        var savedEntity = await textSnippetDbContext.CreateOrUpdateAsync<TextSnippetEntity, string>(request.Data.MapToEntity());

        await textSnippetDbContext.SaveChangesAsync();

        return new SaveSnippetTextCommandResult
        {
            SavedData = new TextSnippetEntityDto(savedEntity)
        };
    }

    [HttpGet]
    [Route("DemoUseCreateOrUpdateMany")]
    public async Task<DemoUseCreateOrUpdateManyCommandResult> DemoUseCreateOrUpdateMany([FromQuery] DemoUseCreateOrUpdateManyCommand request)
    {
        var result = await Cqrs.SendCommand(request);

        return result;
    }

    //DemoUseCreateOrUpdateManyCommand

    //private void RandomThrowToTestHandleInternalException(int percentChance = 5)
    //{
    //    if (Configuration.GetSection("RandomThrowExceptionForTesting").Get<bool?>() == true)
    //    {
    //        Util.RandomGenerator.DoByChance(
    //            percentChance,
    //            () => throw new Exception("Random Test Throw Exception"));
    //    }
    //}


    [HttpGet]
    [Route("TestIAsyncEnumerable")]
    public IAsyncEnumerable<string> TestIAsyncEnumerable()
    {
        return GetAsyncContent();
    }

    private static async IAsyncEnumerable<string> GetAsyncContent()
    {
        for (var i = 0; i < int.MaxValue; i++)
            yield return await Task.Run(() => Ulid.NewUlid().ToString());
    }

    /// <summary>
    /// Test endpoint to verify navigation property loading works correctly.
    /// Creates a 3-level category hierarchy and tests single, 2-level, and 3-level deep navigation loading.
    /// Works with MongoDB (PlatformNavigationPropertyAttribute) and EF Core (Include/ThenInclude).
    /// </summary>
    [HttpGet]
    [Route("testNavigationLoading")]
    public async Task<IActionResult> TestNavigationLoading(CancellationToken ct)
    {
        var testId = Ulid.NewUlid().ToString()[..8];
        var results = new List<object>();

        // ═══════════════════════════════════════════════════════════════════════════════
        // TEST 1: Basic Deep Navigation Loading (3-level hierarchy)
        // ═══════════════════════════════════════════════════════════════════════════════
        var test1 = await TestBasicDeepNavigation(testId, ct);
        results.Add(test1);

        // ═══════════════════════════════════════════════════════════════════════════════
        // TEST 2: Null Foreign Key Handling
        // ═══════════════════════════════════════════════════════════════════════════════
        var test2 = await TestNullForeignKey(testId, ct);
        results.Add(test2);

        // ═══════════════════════════════════════════════════════════════════════════════
        // TEST 3: Batch Loading (GetAllAsync with navigation)
        // ═══════════════════════════════════════════════════════════════════════════════
        var test3 = await TestBatchLoading(testId, ct);
        results.Add(test3);

        // ═══════════════════════════════════════════════════════════════════════════════
        // TEST 4: Self-Referential Navigation (Category -> ParentCategory)
        // ═══════════════════════════════════════════════════════════════════════════════
        var test4 = await TestSelfReferentialNavigation(testId, ct);
        results.Add(test4);

        // ═══════════════════════════════════════════════════════════════════════════════
        // TEST 5: Multiple Navigation Expressions in Single Query
        // ═══════════════════════════════════════════════════════════════════════════════
        var test5 = await TestMultipleNavigationExpressions(testId, ct);
        results.Add(test5);

        // ═══════════════════════════════════════════════════════════════════════════════
        // TEST 6: Missing Related Entity (FK points to non-existent entity)
        // ═══════════════════════════════════════════════════════════════════════════════
        var test6 = await TestMissingRelatedEntity(testId, ct);
        results.Add(test6);

        // ═══════════════════════════════════════════════════════════════════════════════
        // TEST 7: GetByIdsAsync with Navigation Loading
        // ═══════════════════════════════════════════════════════════════════════════════
        var test7 = await TestGetByIdsWithNavigation(testId, ct);
        results.Add(test7);

        // ═══════════════════════════════════════════════════════════════════════════════
        // SUMMARY
        // ═══════════════════════════════════════════════════════════════════════════════
        var passedCount = results.Count(r => (bool)r.GetType().GetProperty("passed")!.GetValue(r)!);
        var totalCount = results.Count;

        return Ok(
            new
            {
                testId,
                timestamp = DateTime.UtcNow,
                tests = results,
                summary = new
                {
                    totalTests = totalCount,
                    passedTests = passedCount,
                    failedTests = totalCount - passedCount,
                    allTestsPassed = passedCount == totalCount,
                    message = passedCount == totalCount
                        ? "All navigation loading tests passed successfully!"
                        : $"{totalCount - passedCount} test(s) failed. Check individual test results."
                }
            });
    }

    /// <summary>
    /// Test 1: Basic deep navigation with 3-level hierarchy
    /// </summary>
    private async Task<object> TestBasicDeepNavigation(string testId, CancellationToken ct)
    {
        try
        {
            // Create 3-level hierarchy: Root -> Level2 -> Level3
            var rootCategory = TextSnippetCategory.CreateRoot($"Test1-Root-{testId}", "Root for basic deep nav test");
            await categoryRepository.CreateAsync(rootCategory, cancellationToken: ct);

            var level2 = TextSnippetCategory.CreateChild(rootCategory.Id, $"Test1-L2-{testId}", "Level 2");
            await categoryRepository.CreateAsync(level2, cancellationToken: ct);

            var level3 = TextSnippetCategory.CreateChild(level2.Id, $"Test1-L3-{testId}", "Level 3");
            await categoryRepository.CreateAsync(level3, cancellationToken: ct);

            // Create snippet with Level3 category
            var snippet = TextSnippetEntity.Create(Ulid.NewUlid().ToString(), $"Test1-Snippet-{testId}", "Full text");
            snippet.CategoryId = level3.Id;
            await snippetRepository.CreateAsync(snippet, cancellationToken: ct);

            // Test all navigation levels
            var singleLevel = await snippetRepository.GetByIdAsync(snippet.Id, ct, e => e.SnippetCategory!);
            var twoLevel = await snippetRepository.GetByIdAsync(snippet.Id, ct, e => e.SnippetCategory!.ParentCategory!);
            var threeLevel = await snippetRepository.GetByIdAsync(snippet.Id, ct, e => e.SnippetCategory!.ParentCategory!.ParentCategory!);

            var singlePassed = singleLevel?.SnippetCategory?.Id == level3.Id;
            var twoPassed = twoLevel?.SnippetCategory?.ParentCategory?.Id == level2.Id;
            var threePassed = threeLevel?.SnippetCategory?.ParentCategory?.ParentCategory?.Id == rootCategory.Id;

            return new
            {
                name = "Basic Deep Navigation (3-level hierarchy)",
                passed = singlePassed && twoPassed && threePassed,
                details = new
                {
                    singleLevel = new { passed = singlePassed, expected = level3.Id, actual = singleLevel?.SnippetCategory?.Id },
                    twoLevel = new { passed = twoPassed, expected = level2.Id, actual = twoLevel?.SnippetCategory?.ParentCategory?.Id },
                    threeLevel = new { passed = threePassed, expected = rootCategory.Id, actual = threeLevel?.SnippetCategory?.ParentCategory?.ParentCategory?.Id }
                }
            };
        }
        catch (Exception ex)
        {
            return new { name = "Basic Deep Navigation (3-level hierarchy)", passed = false, error = ex.Message };
        }
    }

    /// <summary>
    /// Test 2: Null foreign key handling - should not throw, should set nav to null
    /// </summary>
    private async Task<object> TestNullForeignKey(string testId, CancellationToken ct)
    {
        try
        {
            // Create snippet WITHOUT category (null FK)
            var snippet = TextSnippetEntity.Create(Ulid.NewUlid().ToString(), $"Test2-NullFK-{testId}", "No category");
            snippet.CategoryId = null;
            await snippetRepository.CreateAsync(snippet, cancellationToken: ct);

            // This should not throw - should return entity with null navigation
            var result = await snippetRepository.GetByIdAsync(snippet.Id, ct, e => e.SnippetCategory!);

            var passed = result != null && result.SnippetCategory == null && result.CategoryId == null;

            return new
            {
                name = "Null Foreign Key Handling",
                passed,
                details = new
                {
                    entityLoaded = result != null,
                    navigationIsNull = result?.SnippetCategory == null,
                    fkIsNull = result?.CategoryId == null
                }
            };
        }
        catch (Exception ex)
        {
            return new { name = "Null Foreign Key Handling", passed = false, error = ex.Message };
        }
    }

    /// <summary>
    /// Test 3: Batch loading with GetAllAsync
    /// </summary>
    private async Task<object> TestBatchLoading(string testId, CancellationToken ct)
    {
        try
        {
            // Create 2 categories
            var cat1 = TextSnippetCategory.CreateRoot($"Test3-Cat1-{testId}", "Category 1");
            var cat2 = TextSnippetCategory.CreateRoot($"Test3-Cat2-{testId}", "Category 2");
            await categoryRepository.CreateAsync(cat1, cancellationToken: ct);
            await categoryRepository.CreateAsync(cat2, cancellationToken: ct);

            // Create 3 snippets with different categories
            var snippets = new List<TextSnippetEntity>
            {
                TextSnippetEntity.Create(Ulid.NewUlid().ToString(), $"Test3-S1-{testId}", "Snippet 1").With(s => s.CategoryId = cat1.Id),
                TextSnippetEntity.Create(Ulid.NewUlid().ToString(), $"Test3-S2-{testId}", "Snippet 2").With(s => s.CategoryId = cat2.Id),
                TextSnippetEntity.Create(Ulid.NewUlid().ToString(), $"Test3-S3-{testId}", "Snippet 3").With(s => s.CategoryId = cat1.Id)
            };
            await snippetRepository.CreateManyAsync(snippets, cancellationToken: ct);

            // Batch load with navigation
            var snippetIds = snippets.Select(s => s.Id).ToList();
            var loadedSnippets = await snippetRepository.GetByIdsAsync(snippetIds, ct, e => e.SnippetCategory!);

            var allHaveCategory = loadedSnippets.All(s => s.SnippetCategory != null);
            var cat1Count = loadedSnippets.Count(s => s.SnippetCategory?.Id == cat1.Id);
            var cat2Count = loadedSnippets.Count(s => s.SnippetCategory?.Id == cat2.Id);

            return new
            {
                name = "Batch Loading (GetByIdsAsync with navigation)",
                passed = allHaveCategory && cat1Count == 2 && cat2Count == 1,
                details = new
                {
                    totalLoaded = loadedSnippets.Count,
                    allHaveCategory,
                    cat1Count,
                    cat2Count
                }
            };
        }
        catch (Exception ex)
        {
            return new { name = "Batch Loading (GetByIdsAsync with navigation)", passed = false, error = ex.Message };
        }
    }

    /// <summary>
    /// Test 4: Self-referential navigation (Category -> ParentCategory)
    /// </summary>
    private async Task<object> TestSelfReferentialNavigation(string testId, CancellationToken ct)
    {
        try
        {
            // Create parent-child categories
            var parent = TextSnippetCategory.CreateRoot($"Test4-Parent-{testId}", "Parent");
            await categoryRepository.CreateAsync(parent, cancellationToken: ct);

            var child = TextSnippetCategory.CreateChild(parent.Id, $"Test4-Child-{testId}", "Child");
            await categoryRepository.CreateAsync(child, cancellationToken: ct);

            // Load child with parent navigation
            var loaded = await categoryRepository.GetByIdAsync(child.Id, ct, c => c.ParentCategory!);

            var passed = loaded?.ParentCategory?.Id == parent.Id && loaded?.ParentCategory?.Name == parent.Name;

            return new
            {
                name = "Self-Referential Navigation (Category -> ParentCategory)",
                passed,
                details = new
                {
                    childLoaded = loaded != null,
                    parentLoaded = loaded?.ParentCategory != null,
                    parentIdMatches = loaded?.ParentCategory?.Id == parent.Id,
                    parentNameMatches = loaded?.ParentCategory?.Name == parent.Name
                }
            };
        }
        catch (Exception ex)
        {
            return new { name = "Self-Referential Navigation (Category -> ParentCategory)", passed = false, error = ex.Message };
        }
    }

    /// <summary>
    /// Test 5: Multiple navigation expressions in single query
    /// </summary>
    private async Task<object> TestMultipleNavigationExpressions(string testId, CancellationToken ct)
    {
        try
        {
            // Create hierarchy
            var root = TextSnippetCategory.CreateRoot($"Test5-Root-{testId}", "Root");
            await categoryRepository.CreateAsync(root, cancellationToken: ct);

            var level2 = TextSnippetCategory.CreateChild(root.Id, $"Test5-L2-{testId}", "Level2");
            await categoryRepository.CreateAsync(level2, cancellationToken: ct);

            var snippet = TextSnippetEntity.Create(Ulid.NewUlid().ToString(), $"Test5-Snippet-{testId}", "Text");
            snippet.CategoryId = level2.Id;
            await snippetRepository.CreateAsync(snippet, cancellationToken: ct);

            // Load with multiple navigation expressions
            var loaded = await snippetRepository.GetByIdAsync(
                snippet.Id,
                ct,
                e => e.SnippetCategory!,
                e => e.SnippetCategory!.ParentCategory!);

            var categoryLoaded = loaded?.SnippetCategory?.Id == level2.Id;
            var parentLoaded = loaded?.SnippetCategory?.ParentCategory?.Id == root.Id;

            return new
            {
                name = "Multiple Navigation Expressions in Single Query",
                passed = categoryLoaded && parentLoaded,
                details = new
                {
                    categoryLoaded,
                    parentLoaded,
                    categoryId = loaded?.SnippetCategory?.Id,
                    parentId = loaded?.SnippetCategory?.ParentCategory?.Id
                }
            };
        }
        catch (Exception ex)
        {
            return new { name = "Multiple Navigation Expressions in Single Query", passed = false, error = ex.Message };
        }
    }

    /// <summary>
    /// Test 6: Missing related entity (FK points to non-existent ID)
    /// </summary>
    private async Task<object> TestMissingRelatedEntity(string testId, CancellationToken ct)
    {
        try
        {
            // Create snippet with non-existent category ID
            var nonExistentCategoryId = Ulid.NewUlid().ToString();
            var snippet = TextSnippetEntity.Create(Ulid.NewUlid().ToString(), $"Test6-Missing-{testId}", "Text");
            snippet.CategoryId = nonExistentCategoryId;
            await snippetRepository.CreateAsync(snippet, cancellationToken: ct);

            // This should not throw - should return entity with null navigation (related not found)
            var loaded = await snippetRepository.GetByIdAsync(snippet.Id, ct, e => e.SnippetCategory!);

            // FK should be preserved but navigation should be null since related entity doesn't exist
            var passed = loaded != null && loaded.CategoryId == nonExistentCategoryId && loaded.SnippetCategory == null;

            return new
            {
                name = "Missing Related Entity (FK to non-existent)",
                passed,
                details = new
                {
                    entityLoaded = loaded != null,
                    fkPreserved = loaded?.CategoryId == nonExistentCategoryId,
                    navigationIsNull = loaded?.SnippetCategory == null,
                    explanation = "Navigation should be null when FK points to non-existent entity"
                }
            };
        }
        catch (Exception ex)
        {
            return new { name = "Missing Related Entity (FK to non-existent)", passed = false, error = ex.Message };
        }
    }

    /// <summary>
    /// Test 7: GetByIdsAsync with deep navigation
    /// </summary>
    private async Task<object> TestGetByIdsWithNavigation(string testId, CancellationToken ct)
    {
        try
        {
            // Create hierarchy
            var root = TextSnippetCategory.CreateRoot($"Test7-Root-{testId}", "Root");
            await categoryRepository.CreateAsync(root, cancellationToken: ct);

            var child = TextSnippetCategory.CreateChild(root.Id, $"Test7-Child-{testId}", "Child");
            await categoryRepository.CreateAsync(child, cancellationToken: ct);

            // Create multiple snippets
            var snippet1 = TextSnippetEntity.Create(Ulid.NewUlid().ToString(), $"Test7-S1-{testId}", "Text1").With(s => s.CategoryId = child.Id);
            var snippet2 = TextSnippetEntity.Create(Ulid.NewUlid().ToString(), $"Test7-S2-{testId}", "Text2").With(s => s.CategoryId = child.Id);
            await snippetRepository.CreateManyAsync([snippet1, snippet2], cancellationToken: ct);

            // Load with deep navigation
            var ids = new List<string> { snippet1.Id, snippet2.Id };
            var loaded = await snippetRepository.GetByIdsAsync(ids, ct, e => e.SnippetCategory!.ParentCategory!);

            var allHaveCategory = loaded.All(s => s.SnippetCategory?.Id == child.Id);
            var allHaveParent = loaded.All(s => s.SnippetCategory?.ParentCategory?.Id == root.Id);

            return new
            {
                name = "GetByIdsAsync with Deep Navigation",
                passed = loaded.Count == 2 && allHaveCategory && allHaveParent,
                details = new
                {
                    count = loaded.Count,
                    allHaveCategory,
                    allHaveParent,
                    snippet1CategoryId = loaded.FirstOrDefault(s => s.Id == snippet1.Id)?.SnippetCategory?.Id,
                    snippet1ParentId = loaded.FirstOrDefault(s => s.Id == snippet1.Id)?.SnippetCategory?.ParentCategory?.Id
                }
            };
        }
        catch (Exception ex)
        {
            return new { name = "GetByIdsAsync with Deep Navigation", passed = false, error = ex.Message };
        }
    }
}
