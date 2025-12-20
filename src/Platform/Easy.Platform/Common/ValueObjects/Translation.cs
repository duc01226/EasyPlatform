using Easy.Platform.Common.ValueObjects.Abstract;

namespace Easy.Platform.Common.ValueObjects;

public class Translation : PlatformValueObject<Translation>
{
    // The Template property stores the template or base text to be translated.
    public string Template { get; set; } = "";

    // The Params property is a dictionary that holds placeholder values to be inserted into the template.
    public Dictionary<string, object> Params { get; set; } = [];

    public static Translation Create(string template, Dictionary<string, object> parameters)
    {
        return new Translation
        {
            Template = template,
            Params = parameters ?? []
        };
    }

    public static Translation Create(string template, string paramKey, object paramValue)
    {
        return new Translation
        {
            Template = template,
            Params = new Dictionary<string, object>
            {
                { paramKey, paramValue }
            }
        };
    }

    public static Translation Create(string template)
    {
        return new Translation
        {
            Template = template
        };
    }
}
