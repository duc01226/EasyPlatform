using PlatformExampleApp.Test.Shared.Pages;
using PlatformExampleApp.Test.TestCases.Helpers;

namespace PlatformExampleApp.Test.TestCases;

[Trait("App", "TextSnippet")]
public class SearchSnippetTextTestCases : TestCase
{
    public SearchSnippetTextTestCases(
        IWebDriverManager driverManager,
        AutomationTestSettings settings,
        IScopedLazyWebDriver lazyWebDriver,
        ISingletonLazyWebDriver globalLazyWebDriver) : base(driverManager, settings, lazyWebDriver, globalLazyWebDriver)
    {
    }

    [Fact]
    [Trait("Category", "Smoke")]
    public void WHEN_SearchSnippetText_BY_CopyFirstItemTextAsSearchText()
    {
        // GIVEN: loadedHomePage
        var loadedHomePage = GlobalWebDriver.NavigatePage<TextSnippetApp.HomePage>(Settings)
            .WaitInitLoadingDataSuccessWithFullPagingData(
                Util.RandomGenerator.ReturnByChanceOrDefault(
                    20, // random 20 percent test failed waiting timeout error by only one second
                    1,
                    TextSnippetApp.Const.DefaultMaxWaitSeconds));

        // WHEN: Copy snippet text in first grid row to search box
        var firstItemSnippetText = loadedHomePage.TextSnippetItemsTable
            .GetCell(0, TextSnippetApp.HomePage.SnippetTextColName)!.Text;

        loadedHomePage.DoSearchTextSnippet(firstItemSnippetText);

        // THEN: At least one item matched with the search test displayed
        loadedHomePage.WaitUntilAssertSuccess(
            p => p.AssertHasMatchingItemsForSearchText(firstItemSnippetText),
            p => p.AssertPageHasNoErrors());
    }

    [Fact]
    [Trait("Category", "Smoke")]
    public void WHEN_SearchSnippetText_BY_NotExistingItemSearchText()
    {
        // GIVEN: loadedHomePage
        var loadedHomePage = GlobalWebDriver.GetLoadingDataFinishedWithFullPagingDataHomePage(Settings);
        // WHEN: Search with random guid + "NotExistingItemSearchText"
        var searchText = "NotExistingItemSearchText" + Ulid.NewUlid();

        loadedHomePage.DoSearchTextSnippet(searchText);

        // THEN: No item is displayed
        loadedHomePage.WaitUntilAssertSuccess(
            p => p.AssertNotHasMatchingItemsForSearchText(searchText),
            p => p.AssertPageHasNoErrors());
    }
}
