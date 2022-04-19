using System.Globalization;
using System.Linq;
using System.Text;
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

                var noDiacriticsTargetText = RemoveDiacritics(targetText);
                var noDiacriticsSearchText = RemoveDiacritics(searchText);

                var searchWords = noDiacriticsSearchText.Trim().Split(" ");
                var isMatchWords = exactMatchAllWords
                    ? searchWords.All(word => Regex.IsMatch(noDiacriticsTargetText, $"{word}", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
                    : searchWords.Any(word => Regex.IsMatch(noDiacriticsTargetText, $"{word}", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant));

                return Regex.IsMatch(noDiacriticsTargetText, $"{noDiacriticsSearchText}", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant) || isMatchWords;
            }

            public static string RemoveDiacritics(string str)
            {
                if (str == null)
                {
                    return null;
                }

                // the normalization to FormD splits accented letters in letters+accents (Ex: "điện" => "d-ie^.n")
                // the rest removes those accents (and other non-spacing characters)
                // and creates a new string from the remaining chars.
                // Normalize again to FormC to compose char again to make "normal" text again, in case of there is some special mark char which
                // it's still match the where condition.
                return new string(str
                    .Normalize(NormalizationForm.FormD)
                    .ToCharArray()
                    .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                    .ToArray())
                    .Normalize(NormalizationForm.FormC);
            }
        }
    }
}
