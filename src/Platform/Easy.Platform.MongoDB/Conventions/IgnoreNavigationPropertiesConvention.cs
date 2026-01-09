using System.Reflection;
using Easy.Platform.Domain.Entities;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;

namespace Easy.Platform.MongoDB.Conventions;

/// <summary>
/// MongoDB convention that auto-ignores properties marked with
/// [PlatformNavigationProperty] during BSON serialization.
/// </summary>
public class IgnoreNavigationPropertiesConvention : IMemberMapConvention
{
    public string Name => "PlatformIgnoreNavigationProperties";

    public void Apply(BsonMemberMap memberMap)
    {
        var hasNavigationAttr = memberMap.MemberInfo
            .GetCustomAttribute<PlatformNavigationPropertyAttribute>() != null;

        if (hasNavigationAttr)
        {
            // Skip serialization entirely
            memberMap.SetShouldSerializeMethod(_ => false);
            memberMap.SetIgnoreIfNull(true);
        }
    }
}
