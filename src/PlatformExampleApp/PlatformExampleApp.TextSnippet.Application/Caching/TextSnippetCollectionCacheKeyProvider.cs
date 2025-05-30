using Easy.Platform.Application;
using Easy.Platform.Application.Caching;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries;

namespace PlatformExampleApp.TextSnippet.Application.Caching;

public class TextSnippetCollectionCacheKeyProvider : PlatformApplicationCollectionCacheKeyProvider<TextSnippetCollectionCacheKeyProvider>
{
    public TextSnippetCollectionCacheKeyProvider(IPlatformApplicationSettingContext applicationSettingContext) :
        base(applicationSettingContext)
    {
    }

    public override string Collection => nameof(SearchSnippetTextQuery);
}
