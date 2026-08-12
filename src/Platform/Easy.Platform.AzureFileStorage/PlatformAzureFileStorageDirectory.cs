using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Easy.Platform.Infrastructures.FileStorage;

namespace Easy.Platform.AzureFileStorage;

public class PlatformAzureFileStorageDirectory : IPlatformFileStorageDirectory
{
    private static readonly HashSet<string> ReservedFileNames =
    [
        ".",
        "..",
        "LPT1",
        "LPT2",
        "LPT3",
        "LPT4",
        "LPT5",
        "LPT6",
        "LPT7",
        "LPT8",
        "LPT9",
        "COM1",
        "COM2",
        "COM3",
        "COM4",
        "COM5",
        "COM6",
        "COM7",
        "COM8",
        "COM9",
        "PRN",
        "AUX",
        "NUL",
        "CON",
        "CLOCK$"
    ];

    public PlatformAzureFileStorageDirectory(BlobContainerClient blobContainer, string directoryRelativePath, string publicBlobEndpoint = null)
    {
        DirectoryAbsoluteUri = string.IsNullOrWhiteSpace(publicBlobEndpoint)
            ? blobContainer.Uri
            : PlatformAzureFileStorageFileItem.BuildPublicAbsoluteUri(publicBlobEndpoint, blobContainer.Name);
        BlobContainer = blobContainer;
        DirectoryRelativePathPrefix = directoryRelativePath;
        PublicBlobEndpoint = publicBlobEndpoint;
        RootDirectoryName = blobContainer.Name;
    }

    public BlobContainerClient BlobContainer { get; }
    public string PublicBlobEndpoint { get; }

    public string RootDirectoryName { get; }
    public Uri DirectoryAbsoluteUri { get; set; }
    public string DirectoryRelativePathPrefix { get; set; }

    public IPlatformFileStorageDirectory GetRelativeChildDirectory(string directoryRelativePath)
    {
        return new PlatformAzureFileStorageDirectory(
            BlobContainer,
            $"{DirectoryRelativePathPrefix}/{directoryRelativePath}",
            PublicBlobEndpoint);
    }

    public IEnumerable<IPlatformFileStorageFileItem> GetFileItems()
    {
        var result = BlobContainer.GetBlobs(BlobTraits.Metadata, BlobStates.None, DirectoryRelativePathPrefix)
            .Where(p => !ReservedFileNames.Any(s => p.Name.EndsWith(s)))
            .Select(p => PlatformAzureFileStorageFileItem.Create(p, BlobContainer, PublicBlobEndpoint));

        return result;
    }
}
