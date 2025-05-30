using System.Diagnostics.CodeAnalysis;
using System.IO;
using Easy.Platform.Common.Extensions;
using Microsoft.AspNetCore.Http;

namespace Easy.Platform.Infrastructures.FileStorage;

/// <summary>
/// Represents a file uploader for platform file storage operations.
/// This class encapsulates all necessary information needed to upload a file to storage,
/// including the file's content, location details, and access permissions.
/// </summary>
public class PlatformFileStorageUploader
{
    private string contentType;

    private PlatformFileStorageUploader() { }

    /// <summary>
    /// Gets or sets the content type (MIME type) of the file.
    /// If not explicitly set, it will be determined from the file name using PlatformFileMimeTypeMapper.
    /// </summary>
    public string ContentType
    {
        get => contentType.IsNullOrEmpty() ? PlatformFileMimeTypeMapper.Instance.GetMimeType(FileName) : contentType;
        set => contentType = value;
    }

    /// <summary>
    /// Gets the root directory where the file will be stored.
    /// This is typically "public" or "private" depending on access requirements.
    /// </summary>
    public string RootDirectory { get; private init; }

    /// <summary>
    /// The following directory after rootDirectory, should define this more detail for good practice
    /// NOTICE: this should not include the fileName, just prefix directory
    /// </summary>
    public string PrefixDirectoryPath { get; private init; }

    /// <summary>
    /// Gets the name of the file to be uploaded.
    /// </summary>
    public string FileName { get; private init; }

    /// <summary>
    /// Gets or sets a description for the file.
    /// </summary>
    public string FileDescription { get; set; }

    /// <summary>
    /// Gets the stream containing the file's content to be uploaded.
    /// </summary>
    public Stream Stream { get; private init; }

    /// <summary>
    /// Gets or sets the public access type for the file, determining who can access it.
    /// Defaults to None (private).
    /// </summary>
    public PlatformFileStorageOptions.PublicAccessTypes PublicAccessType { get; set; } = PlatformFileStorageOptions.PublicAccessTypes.None;

    /// <summary>
    /// Creates a new instance of PlatformFileStorageUploader with the specified parameters.
    /// </summary>
    /// <param name="stream">The stream containing the file content.</param>
    /// <param name="prefixDirectoryPath">The directory path under the root directory where the file will be stored.</param>
    /// <param name="fileName">The name of the file.</param>
    /// <param name="rootDirectory">The root directory where the file will be stored.</param>
    /// <param name="publicAccessType">The public access type for the file.</param>
    /// <param name="contentType">The content type (MIME type) of the file.</param>
    /// <returns>A configured PlatformFileStorageUploader instance.</returns>
    /// <exception cref="ArgumentNullException">Thrown if stream, prefixDirectoryPath, or fileName is null.</exception>
    public static PlatformFileStorageUploader Create(
        Stream stream,
        [NotNull] string prefixDirectoryPath,
        [NotNull] string fileName,
        [NotNull] string rootDirectory,
        PlatformFileStorageOptions.PublicAccessTypes publicAccessType,
        string contentType = null
    )
    {
        ArgumentNullException.ThrowIfNull(stream);
        ArgumentNullException.ThrowIfNull(prefixDirectoryPath);
        ArgumentNullException.ThrowIfNull(fileName);

        return new PlatformFileStorageUploader
        {
            Stream = stream,
            RootDirectory = rootDirectory,
            PrefixDirectoryPath = prefixDirectoryPath,
            FileName = fileName,
            ContentType = contentType,
            PublicAccessType = publicAccessType,
        };
    }

    /// <summary>
    /// Creates a new instance of PlatformFileStorageUploader with the specified parameters,
    /// using default values for root directory and public access type.
    /// </summary>
    /// <param name="stream">The stream containing the file content.</param>
    /// <param name="prefixDirectoryPath">The directory path under the root directory where the file will be stored.</param>
    /// <param name="fileName">The name of the file.</param>
    /// <param name="contentType">The content type (MIME type) of the file.</param>
    /// <returns>A configured PlatformFileStorageUploader instance.</returns>
    public static PlatformFileStorageUploader Create(
        Stream stream,
        [NotNull] string prefixDirectoryPath,
        [NotNull] string fileName,
        string contentType = null
    )
    {
        return Create(
            stream,
            prefixDirectoryPath,
            fileName,
            rootDirectory: IPlatformFileStorageService.GetDefaultRootDirectoryName(isPrivate: true),
            publicAccessType: IPlatformFileStorageService.GetDefaultPublicAccessType(isPrivate: true),
            contentType
        );
    }

    /// <summary>
    /// Creates a new instance of PlatformFileStorageUploader from an IFormFile instance,
    /// specifying all parameters including file name and content type.
    /// </summary>
    /// <param name="formFile">The IFormFile instance representing the file to be uploaded.</param>
    /// <param name="prefixDirectoryPath">The directory path under the root directory where the file will be stored.</param>
    /// <param name="rootDirectory">The root directory where the file will be stored.</param>
    /// <param name="publicAccessType">The public access type for the file.</param>
    /// <param name="fileName">The name of the file. If null, the original file name from formFile is used.</param>
    /// <param name="contentType">The content type (MIME type) of the file.</param>
    /// <param name="fileDescription">A description for the file.</param>
    /// <returns>A configured PlatformFileStorageUploader instance.</returns>
    public static PlatformFileStorageUploader Create(
        IFormFile formFile,
        [NotNull] string prefixDirectoryPath,
        [NotNull] string rootDirectory,
        PlatformFileStorageOptions.PublicAccessTypes publicAccessType,
        string fileName = null,
        string contentType = null,
        string fileDescription = null
    )
    {
        return new PlatformFileStorageUploader
        {
            Stream = formFile.OpenReadStream(),
            RootDirectory = rootDirectory,
            PrefixDirectoryPath = prefixDirectoryPath,
            FileName = fileName ?? formFile.FileName,
            ContentType = contentType,
            FileDescription = fileDescription,
            PublicAccessType = publicAccessType,
        };
    }

    /// <summary>
    /// Creates a new instance of PlatformFileStorageUploader from an IFormFile instance,
    /// using default values for root directory and public access type.
    /// </summary>
    /// <param name="formFile">The IFormFile instance representing the file to be uploaded.</param>
    /// <param name="prefixDirectoryPath">The directory path under the root directory where the file will be stored.</param>
    /// <param name="fileName">The name of the file. If null, the original file name from formFile is used.</param>
    /// <param name="contentType">The content type (MIME type) of the file.</param>
    /// <param name="fileDescription">A description for the file.</param>
    /// <returns>A configured PlatformFileStorageUploader instance.</returns>
    public static PlatformFileStorageUploader Create(
        IFormFile formFile,
        [NotNull] string prefixDirectoryPath,
        string fileName = null,
        string contentType = null,
        string fileDescription = null
    )
    {
        return Create(
            formFile,
            prefixDirectoryPath,
            rootDirectory: IPlatformFileStorageService.GetDefaultRootDirectoryName(isPrivate: true),
            publicAccessType: IPlatformFileStorageService.GetDefaultPublicAccessType(isPrivate: true),
            fileName,
            contentType,
            fileDescription
        );
    }

    /// <summary>
    /// Creates a new instance of PlatformFileStorageUploader from an IPlatformFile instance,
    /// specifying all parameters including file name and content type.
    /// </summary>
    /// <param name="platformFileInfo">The IPlatformFile instance representing the file to be uploaded.</param>
    /// <param name="prefixDirectoryPath">The directory path under the root directory where the file will be stored.</param>
    /// <param name="rootDirectory">The root directory where the file will be stored.</param>
    /// <param name="publicAccessType">The public access type for the file.</param>
    /// <param name="fileName">The name of the file. If null, the original file name from platformFileInfo is used.</param>
    /// <param name="contentType">The content type (MIME type) of the file.</param>
    /// <param name="fileDescription">A description for the file.</param>
    /// <returns>A configured PlatformFileStorageUploader instance.</returns>
    public static PlatformFileStorageUploader Create(
        IPlatformFile platformFileInfo,
        [NotNull] string prefixDirectoryPath,
        [NotNull] string rootDirectory,
        PlatformFileStorageOptions.PublicAccessTypes publicAccessType,
        string fileName = null,
        string contentType = null,
        string fileDescription = null
    )
    {
        return new PlatformFileStorageUploader
        {
            Stream = platformFileInfo.OpenReadStream(),
            RootDirectory = rootDirectory,
            PrefixDirectoryPath = prefixDirectoryPath,
            FileName = fileName ?? platformFileInfo.GetFileName(),
            ContentType = contentType,
            FileDescription = fileDescription,
            PublicAccessType = publicAccessType,
        };
    }

    /// <summary>
    /// Creates a new instance of PlatformFileStorageUploader from an IPlatformFile instance,
    /// using default values for root directory and public access type.
    /// </summary>
    /// <param name="platformFileInfo">The IPlatformFile instance representing the file to be uploaded.</param>
    /// <param name="prefixDirectoryPath">The directory path under the root directory where the file will be stored.</param>
    /// <param name="fileName">The name of the file. If null, the original file name from platformFileInfo is used.</param>
    /// <param name="contentType">The content type (MIME type) of the file.</param>
    /// <param name="fileDescription">A description for the file.</param>
    /// <returns>A configured PlatformFileStorageUploader instance.</returns>
    public static PlatformFileStorageUploader Create(
        IPlatformFile platformFileInfo,
        [NotNull] string prefixDirectoryPath,
        string fileName = null,
        string contentType = null,
        string fileDescription = null
    )
    {
        return Create(
            platformFileInfo,
            prefixDirectoryPath,
            rootDirectory: IPlatformFileStorageService.GetDefaultRootDirectoryName(isPrivate: true),
            publicAccessType: IPlatformFileStorageService.GetDefaultPublicAccessType(isPrivate: true),
            fileName,
            contentType,
            fileDescription
        );
    }

    /// <summary>
    /// Create a path to storage content on cloud, this method will join each param with a <c>'/'</c>
    /// <para>NOTICE: best practice with Azure: {container}/{app}/{service}/{guid-com-id}/...</para>
    /// <para>Ex: private/talents/candidates/my-file.pdf</para>
    /// </summary>
    public static string CombinePath(params string[] elements)
    {
        return string.Join('/', elements.Where(el => el.IsNotNullOrEmpty()));
    }
}
