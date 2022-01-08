using AngularDotnetPlatform.Platform.Common.Validators;

namespace AngularDotnetPlatform.Platform.Common.Dtos
{
    public interface IPlatformDto
    {
        PlatformValidationResult Validate();
    }
}
