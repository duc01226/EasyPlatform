namespace Easy.Platform.Application.Helpers
{
    /// <summary>
    /// This interface is used for conventional register class mapping via PlatformApplicationModule.InternalRegister
    /// <br/>
    /// Helper is used to serve some internal/additional application logic, not visible to the end user or domain expert.
    /// <br/>
    /// Helper is used by Queries/Commands. It is used to prevent boiler plate code and DRY (Don't repeat yourself)
    /// </summary>
    public interface IPlatformApplicationHelper
    {
    }
}
