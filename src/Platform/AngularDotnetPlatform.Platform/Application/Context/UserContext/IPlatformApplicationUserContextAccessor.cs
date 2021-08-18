using System.Diagnostics.CodeAnalysis;

namespace AngularDotnetPlatform.Platform.Application.Context.UserContext
{
    /// <summary>
    /// This is a singleton object help to access the current UserContext.
    /// </summary>
    public interface IPlatformApplicationUserContextAccessor
    {
        [NotNull]
        IPlatformApplicationUserContext Current { get; set; }
    }
}
