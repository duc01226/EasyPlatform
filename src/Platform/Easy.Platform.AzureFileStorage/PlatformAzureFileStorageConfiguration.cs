using Easy.Platform.Infrastructures.FileStorage;

namespace Easy.Platform.AzureFileStorage;

public class PlatformAzureFileStorageConfiguration : PlatformFileStorageOptions
{
    private string blobEndpoint;
    private string publicBlobEndpoint;

    /// <summary>
    /// Connection string used by Azure.Storage.Blobs clients. It may contain private/internal endpoints for server-side access.
    /// Ex: DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=xxx;EndpointSuffix=core.windows.net
    /// </summary>
    public string ConnectionString { get; set; }

    /// <summary>
    /// Public/client-visible blob endpoint returned in file URLs. Configure this when it differs from the SDK endpoint in <see cref="ConnectionString"/>.
    /// Ex: https://xxxxx.blob.core.windows.net/
    /// </summary>
    public string PublicBlobEndpoint
    {
        get => publicBlobEndpoint ?? blobEndpoint;
        set => publicBlobEndpoint = value;
    }

    /// <summary>
    /// Backward-compatible alias for <see cref="PublicBlobEndpoint"/>.
    /// </summary>
    public string BlobEndpoint
    {
        get => blobEndpoint ?? publicBlobEndpoint;
        set => blobEndpoint = value;
    }

    /// <summary>
    /// Default expiration time span for uri when generate share private file url in minutes
    /// </summary>
    public int DefaultSharedPrivateFileUriAccessTimeMinutes { get; set; } = 60;

    public string GetPublicBlobEndpoint()
    {
        return PublicBlobEndpoint;
    }
}
