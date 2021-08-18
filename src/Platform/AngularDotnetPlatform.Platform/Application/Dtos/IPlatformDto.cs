using AngularDotnetPlatform.Platform.Validators;

namespace AngularDotnetPlatform.Platform.Application.Dtos
{
    public interface IPlatformDto
    {
        PlatformValidationResult Validate();
    }
}
