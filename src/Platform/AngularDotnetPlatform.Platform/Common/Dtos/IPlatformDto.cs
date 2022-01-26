using AngularDotnetPlatform.Platform.Common.Validators;

namespace AngularDotnetPlatform.Platform.Common.Dtos
{
    public interface IPlatformDto
    {
        PlatformValidationResult Validate();
    }

    public interface IPlatformDto<TMapForObject> where TMapForObject : class
    {
        PlatformValidationResult Validate();

        TMapForObject MapToObject();
    }
}
