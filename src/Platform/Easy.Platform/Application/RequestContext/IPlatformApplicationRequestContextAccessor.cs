#region

using System.Diagnostics.CodeAnalysis;

#endregion

namespace Easy.Platform.Application.RequestContext;

/// <summary>
/// This is an object help to access the current RequestContext.
/// </summary>
public interface IPlatformApplicationRequestContextAccessor
{
    [NotNull]
    IPlatformApplicationRequestContext Current { get; set; }

    public bool FirstAccessCurrentInitiated { get; }

    IPlatformApplicationRequestContextAccessor SetValues(IDictionary<string, object> values);

    IPlatformApplicationRequestContextAccessor AddValues(IDictionary<string, object> values);
}
