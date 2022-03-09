using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace AngularDotnetPlatform.Platform.Common.Utils
{
    public static partial class Util
    {
        public static class Strings
        {
            public static T Parse<T>(string value)
            {
                return JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(value));
            }

            public static bool IsFullTextSearchMatch(string targetText, string searchText, bool exactMatchAllWords = false)
            {
                if (targetText == null)
                    return false;

                var searchWords = searchText.Trim().Split(" ");
                var isMatchWords = exactMatchAllWords
                    ? searchWords.All(word => Regex.IsMatch(targetText, $"{word}"))
                    : searchWords.Any(word => Regex.IsMatch(targetText, $"{word}"));

                return Regex.IsMatch(targetText, $"{searchText}", RegexOptions.IgnoreCase) || isMatchWords;
            }
        }
    }
}
