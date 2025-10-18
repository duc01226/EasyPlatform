using PlatformExampleApp.Test.Shared.Pages;
using PlatformExampleApp.Test.TestCases.Helpers;

namespace PlatformExampleApp.Test.TestCases.OthersLearningDemo;

/// <summary>
/// You could implement IDisposable for test case to dispose driver in dispose method and other disposable things <br />
/// If you do not dispose in this case, the browser driver is not closed after test <br />
/// THIS IS ONLY FOR LEARNING PURPOSE. USING DEPENDENCY INJECTION ALREADY DISPOSE DISPOSABLE OBJECT FOR US
/// </summary>
[Trait(name: "App", value: "TextSnippet")]
public sealed class SearchSnippetTextTestCases_IDisposableDisposeObjectDemo : TestCase, IDisposable
{
    private readonly LazyWebDriver manuallyCreateDriverLazyInitializer;

    public SearchSnippetTextTestCases_IDisposableDisposeObjectDemo(
        IWebDriverManager driverManager,
        AutomationTestSettings settings,
        IScopedLazyWebDriver lazyWebDriver,
        ISingletonLazyWebDriver globalLazyWebDriver) : base(driverManager, settings, lazyWebDriver, globalLazyWebDriver)
    {
        manuallyCreateDriverLazyInitializer = new LazyWebDriver(settings);
    }

    public void Dispose()
    {
        manuallyCreateDriverLazyInitializer.Dispose();
    }

    [Fact]
    [Trait(name: "Category", value: "Smoke")]
    public void WHEN_SearchSnippetText_BY_CopyFirstItemTextAsSearchText()
    {
        // GIVEN: loadedHomePage
        var loadedHomePage = manuallyCreateDriverLazyInitializer.Value.NavigatePage<TextSnippetApp.HomePage>(Settings)
            .WaitInitLoadingDataSuccessWithFullPagingData(
                maxWaitForLoadingDataSeconds: Util.RandomGenerator.ReturnByChanceOrDefault(
                    percentChance: 20, // random 20 percent test failed waiting timeout error by only one second
                    chanceReturnValue: 1,
                    TextSnippetApp.Const.DefaultMaxWaitSeconds));

        // WHEN: Copy snippet text in first grid row to search box
        var firstItemSnippetText = loadedHomePage
            .TextSnippetItemsTable
            .GetCell(rowIndex: 0, TextSnippetApp.HomePage.SnippetTextColName)!.RootElement!
            .Text;
        loadedHomePage.DoSearchTextSnippet(firstItemSnippetText);

        // THEN: At least one item matched with the search test displayed
        loadedHomePage.WaitUntilAssertSuccess(
            waitForSuccess: p => p.AssertHasMatchingItemsForSearchText(firstItemSnippetText),
            continueWaitOnlyWhen: p => p.AssertPageHasNoErrors());
    }

    [Fact]
    [Trait(name: "Category", value: "Smoke")]
    public void WHEN_SearchSnippetText_BY_NotExistingItemSearchText()
    {
        // GIVEN: loadedHomePage
        var loadedHomePage = manuallyCreateDriverLazyInitializer.Value.GetLoadingDataFinishedWithFullPagingDataHomePage(Settings);

        // WHEN: Search with random guid + "NotExistingItemSearchText"
        var searchText = "NotExistingItemSearchText" + Ulid.NewUlid();
        loadedHomePage.DoSearchTextSnippet(searchText: "NotExistingItemSearchText" + Ulid.NewUlid());

        // THEN: No item is displayed
        loadedHomePage.WaitUntilAssertSuccess(
            waitForSuccess: p => p.AssertNotHasMatchingItemsForSearchText(searchText),
            continueWaitOnlyWhen: p => p.AssertPageHasNoErrors());
    }
}
