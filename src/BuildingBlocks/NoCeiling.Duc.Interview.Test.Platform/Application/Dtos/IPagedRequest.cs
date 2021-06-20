namespace NoCeiling.Duc.Interview.Test.Platform.Application.Dtos
{
    public interface IPagedRequest
    {
        int SkipCount { get; set; }
        int MaxResultCount { get; set; }

        public bool IsPagedRequestValid();
    }
}
