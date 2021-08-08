namespace AngularDotnetPlatform.Platform.Application.Dtos
{
    public interface IPagedRequest : IPlatformDto
    {
        int SkipCount { get; set; }
        int MaxResultCount { get; set; }

        public bool IsPagedRequestValid();
    }
}
