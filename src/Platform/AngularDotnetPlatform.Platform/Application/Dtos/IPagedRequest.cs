using AngularDotnetPlatform.Platform.Validators;

namespace AngularDotnetPlatform.Platform.Application.Dtos
{
    public interface IPlatformPagedRequest : IPlatformDto
    {
        int SkipCount { get; set; }
        int MaxResultCount { get; set; }

        public bool IsPagedRequestValid();
    }

    public class PlatformPlatformPagedRequest : IPlatformPagedRequest
    {
        public int SkipCount { get; set; }
        public int MaxResultCount { get; set; }

        public bool IsPagedRequestValid()
        {
            return SkipCount >= 0;
        }

        public PlatformValidationResult Validate()
        {
            return PlatformValidationResult.ValidIf(IsPagedRequestValid, "SkipCount must be bigger or equal zero.");
        }
    }
}
