namespace Easy.Platform.Common.Dtos
{
    public interface IPlatformPagedRequest : IPlatformDto
    {
        int? SkipCount { get; set; }
        int? MaxResultCount { get; set; }

        public bool IsPagedRequestValid();
    }
}
