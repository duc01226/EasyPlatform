using Easy.Platform.Common.Validators;

namespace Easy.Platform.Common.Dtos
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
