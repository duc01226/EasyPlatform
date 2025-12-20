#region

using System.Diagnostics.CodeAnalysis;
using System.IO;
using Easy.Platform.Common.Validations;
using Easy.Platform.Infrastructures.Abstract;
using Microsoft.AspNetCore.Http;

#endregion

namespace Easy.Platform.Infrastructures.FileStorage;

/// <summary>
/// Defines a service for managing file storage operations across different storage providers.
/// This interface provides methods for uploading, downloading, and managing files in storage.
/// It's designed to abstract the underlying storage implementation (cloud, local, etc.)
/// and provide a consistent API for file operations.
/// </summary>
public interface IPlatformFileStorageService : IPlatformInfrastructureService
{
    public const string DefaultPrivateRootDirectoryName = "private";
    public const string DefaultPublicRootDirectoryName = "public";

    /// <summary>
    /// Gets the default root directory name based on privacy setting.
    /// </summary>
    /// <param name="isPrivate">Indicates whether the directory should be private.</param>
    /// <returns>The default directory name: "private" for private directories and "public" for public ones.</returns>
    public static string GetDefaultRootDirectoryName(bool isPrivate)
    {
        return isPrivate ? DefaultPrivateRootDirectoryName : DefaultPublicRootDirectoryName;
    }

    /// <summary>
    /// Gets the default public access type based on privacy setting.
    /// </summary>
    /// <param name="isPrivate">Indicates whether the content should be private.</param>
    /// <returns>None for private content, Container for public content.</returns>
    public static PlatformFileStorageOptions.PublicAccessTypes GetDefaultPublicAccessType(bool isPrivate)
    {
        return isPrivate ? PlatformFileStorageOptions.PublicAccessTypes.None : PlatformFileStorageOptions.PublicAccessTypes.Container;
    }

    /// <summary>
    /// Determines the default public access type based on the root directory name.
    /// </summary>
    /// <param name="rootDirectoryName">Name of the root directory.</param>
    /// <returns>
    /// None for private directory, Container for public directory, or null if the directory name doesn't match defaults.
    /// </returns>
    public static PlatformFileStorageOptions.PublicAccessTypes? GetDefaultRootDirectoryPublicAccessType(string rootDirectoryName)
    {
        return rootDirectoryName switch
        {
            DefaultPrivateRootDirectoryName => PlatformFileStorageOptions.PublicAccessTypes.None,
            DefaultPublicRootDirectoryName => PlatformFileStorageOptions.PublicAccessTypes.Container,
            _ => null
        };
    }

    /// <summary>
    /// Extracts the path part from a full file URL, removing any root directory prefixes.
    /// </summary>
    /// <param name="fullFileUrl">The full URL or path to the file.</param>
    /// <returns>The file path without root directory prefixes.</returns>
    public static string GetPathOnlyFromFullFilePath(string fullFileUrl)
    {
        var trimmedSlashUrl = fullFileUrl.TrimStart('/');

        if (trimmedSlashUrl.StartsWith(DefaultPrivateRootDirectoryName))
            return trimmedSlashUrl.Substring(DefaultPrivateRootDirectoryName.Length).TrimStart('/');
        if (trimmedSlashUrl.StartsWith(DefaultPublicRootDirectoryName))
            return trimmedSlashUrl.Substring(DefaultPublicRootDirectoryName.Length).TrimStart('/');

        return fullFileUrl;
    }

    /// <summary>
    /// Upload FormFile to cloud storage.
    /// </summary>
    /// <param name="formFile">The file from an HTTP form submission to be uploaded.</param>
    /// <param name="prefixDirectoryPath">The relative directory path where the file will be stored within the root directory.</param>
    /// <param name="isPrivate">Determines if the file should be stored in a private or public root directory
    /// and with corresponding access permissions.</param>
    /// <param name="fileDescription">Optional description for the file to store metadata.</param>
    /// <param name="fileName">Optional custom name for the file. If null, the original file name from the form file will be used.</param>
    /// <param name="cancellationToken">A token to cancel the asynchronous operation.</param>
    /// <returns>A file storage item representing the uploaded file with its metadata and location.</returns>
    Task<IPlatformFileStorageFileItem> UploadAsync(
        IFormFile formFile,
        [NotNull] string prefixDirectoryPath,
        bool isPrivate,
        string fileDescription = null,
        string fileName = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Upload file to cloud storage using a configured uploader.
    /// </summary>
    /// <param name="fileStorageUploader">A configured uploader containing all necessary file properties
    /// such as stream, path, access type, and metadata.</param>
    /// <param name="cancellationToken">A token to cancel the asynchronous operation.</param>
    /// <returns>A file storage item representing the uploaded file with its metadata and location.</returns>
    Task<IPlatformFileStorageFileItem> UploadAsync(PlatformFileStorageUploader fileStorageUploader, CancellationToken cancellationToken = default);

    /// <summary>
    /// Upload stream content to cloud service and return the storage file item.
    /// This method provides direct control over all file storage parameters for maximum flexibility.
    /// </summary>
    /// <param name="contentStream">The stream containing the file's content to be uploaded.</param>
    /// <param name="rootDirectory">The root directory where the file will be stored (e.g., "private" or "public").</param>
    /// <param name="filePath">The relative path of the file within the root directory.</param>
    /// <param name="publicAccessType">Optional override for the file's public access type.
    /// If null, it will be determined based on the root directory.</param>
    /// <param name="mimeContentType">Optional MIME type of the content. If null, it will be determined based on the file extension.</param>
    /// <param name="fileDescription">Optional description for the file to store as metadata.</param>
    /// <param name="cancellationToken">A token to cancel the asynchronous operation.</param>
    /// <returns>A file storage item representing the uploaded file with its metadata and location.</returns>
    Task<IPlatformFileStorageFileItem> UploadAsync(
        Stream contentStream,
        [NotNull] string rootDirectory,
        [NotNull] string filePath,
        PlatformFileStorageOptions.PublicAccessTypes? publicAccessType = null,
        string mimeContentType = null,
        string fileDescription = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Checks if a file exists in the storage.
    /// </summary>
    /// <param name="rootDirectory">The root directory where the file should be located (e.g., "private" or "public").</param>
    /// <param name="filePath">The relative path of the file within the root directory.</param>
    /// <returns>True if the file exists, false otherwise.</returns>
    Task<bool> ExistsAsync([NotNull] string rootDirectory, [NotNull] string filePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes a file from cloud storage using its full path identifier.
    /// </summary>
    /// <param name="fullFilePath">The complete path to the file, including the root directory and relative file path.</param>
    /// <param name="cancellationToken">A token to cancel the asynchronous operation.</param>
    /// <returns>True if the file was successfully deleted, false if the file didn't exist or couldn't be deleted.</returns>
    Task<bool> DeleteAsync(string fullFilePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes a file from cloud storage by specifying its root directory and file path separately.
    /// </summary>
    /// <param name="rootDirectory">The root directory where the file is located (e.g., "private" or "public").</param>
    /// <param name="filePath">The relative path of the file within the root directory.</param>
    /// <param name="cancellationToken">A token to cancel the asynchronous operation.</param>
    /// <returns>True if the file was successfully deleted, false if the file didn't exist or couldn't be deleted.</returns>
    Task<bool> DeleteAsync(string rootDirectory, string filePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a stream of the file's content from the storage service using the full file path.
    /// The stream can be used to read the file contents without downloading the entire file at once.
    /// </summary>
    /// <param name="fullFilePath">The complete path to the file, including the root directory and relative file path.</param>
    /// <param name="cancellationToken">A token to cancel the asynchronous operation.</param>
    /// <returns>A stream containing the file's content.</returns>
    Task<Stream> GetStreamAsync(string fullFilePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a stream of the file's content from the storage service by specifying its root directory and file path separately.
    /// The stream can be used to read the file contents without downloading the entire file at once.
    /// </summary>
    /// <param name="rootDirectory">The root directory where the file is located (e.g., "private" or "public").</param>
    /// <param name="filePath">The relative path of the file within the root directory.</param>
    /// <param name="cancellationToken">A token to cancel the asynchronous operation.</param>
    /// <returns>A stream containing the file's content.</returns>
    Task<Stream> GetStreamAsync([NotNull] string rootDirectory, [NotNull] string filePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a temporary access URI for non-public content using the full file path.
    /// This allows secure, time-limited access to private files without making them permanently public.
    /// </summary>
    /// <param name="fullFilePath">The complete path to the file, including the root directory and relative file path.</param>
    /// <param name="expirationTime">Optional time duration for which the URI will be valid. If null, a default expiration will be used.</param>
    /// <param name="cancellationToken">A token to cancel the asynchronous operation.</param>
    /// <returns>A URI that provides temporary access to the file.</returns>
    Task<Uri> CreateSharedAccessUriAsync(string fullFilePath, TimeSpan? expirationTime = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a temporary access URI for non-public content by specifying the root directory and file path separately.
    /// This allows secure, time-limited access to private files without making them permanently public.
    /// </summary>
    /// <param name="rootDirectory">The root directory where the file is located (e.g., "private" or "public").</param>
    /// <param name="filePath">The relative path of the file within the root directory.</param>
    /// <param name="expirationTime">Optional time duration for which the URI will be valid. If null, a default expiration will be used.</param>
    /// <param name="cancellationToken">A token to cancel the asynchronous operation.</param>
    /// <returns>A URI that provides temporary access to the file.</returns>
    Task<Uri?> CreateSharedAccessUriAsync(
        string rootDirectory,
        string filePath,
        TimeSpan? expirationTime = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Copies a file from one location to another within the storage system.
    /// This operation creates a duplicate of the file at the destination while preserving the original file.
    /// </summary>
    /// <param name="sourceFullFilePath">The complete path to the source file, including the root directory.</param>
    /// <param name="destinationFullFilePath">The complete path where the file should be copied to, including the root directory.</param>
    /// <returns>The full path of the newly created copy of the file.</returns>
    Task<string> CopyFileAsync(string sourceFullFilePath, string destinationFullFilePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Moves a file from one location to another within the storage system.
    /// This operation transfers the file to the destination and removes it from the original location.
    /// </summary>
    /// <param name="fullFilePath">The complete path to the source file to be moved, including the root directory.</param>
    /// <param name="newLocationFullFilePath">The complete path where the file should be moved to, including the root directory.</param>
    /// <returns>The full path of the file at its new location.</returns>
    Task<string> MoveFileAsync(string fullFilePath, string newLocationFullFilePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Performs server-side blob copy, eliminating SSL stream conflicts and improving performance.
    /// This method uses native copy operation instead of download→upload pattern.
    /// </summary>
    /// <param name="sourceFullFilePath">Source blob path (e.g., "private/path/to/file.pdf")</param>
    /// <param name="rootDirectory">Destination root directory (e.g., "private" or "public")</param>
    /// <param name="destinationFilePath">Destination file path within root directory</param>
    /// <param name="publicAccessType">Optional public access type override for destination</param>
    /// <param name="fileDescription">Optional description override for destination file metadata</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>File storage item with metadata of the copied file</returns>
    Task<IPlatformFileStorageFileItem> CopyBlobWithMetadataAsync(
        string sourceFullFilePath,
        string rootDirectory,
        string destinationFilePath,
        PlatformFileStorageOptions.PublicAccessTypes? publicAccessType = null,
        string fileDescription = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the base endpoint URL for the file storage service.
    /// This URL serves as the base address for accessing files through HTTP.
    /// </summary>
    /// <returns>The base URL of the file storage service.</returns>
    string GetFileStorageEndpoint();

    /// <summary>
    /// Gets a directory object representing a folder in the storage system.
    /// This allows enumeration and management of files within the directory.
    /// </summary>
    /// <param name="rootDirectory">The root directory where the target directory is located (e.g., "private" or "public").</param>
    /// <param name="directoryPath">The relative path of the directory within the root directory.</param>
    /// <returns>A directory object that provides access to the directory's contents and properties.</returns>
    Task<IPlatformFileStorageDirectory> GetDirectoryAsync(string rootDirectory, string directoryPath);

    /// <summary>
    /// Gets a file item object representing a specific file in the storage system.
    /// This provides access to the file's metadata without downloading the file content.
    /// </summary>
    /// <param name="rootDirectory">The root directory where the file is located (e.g., "private" or "public").</param>
    /// <param name="filePath">The relative path of the file within the root directory.</param>
    /// <returns>A file item object that provides access to the file's metadata and properties.</returns>
    Task<IPlatformFileStorageFileItem> GetFileItemAsync(string rootDirectory, string filePath, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates a file name to ensure it complies with the storage system's naming requirements.
    /// Checks for invalid characters, length restrictions, and other naming constraints.
    /// </summary>
    /// <param name="fileName">The file name to validate.</param>
    /// <returns>A validation result indicating whether the file name is valid and any error messages if it's not.</returns>
    PlatformValidationResult<string> ValidateFileName(string fileName);

    /// <summary>
    /// Validates a directory name to ensure it complies with the storage system's naming requirements.
    /// Checks for invalid characters, length restrictions, and other naming constraints.
    /// </summary>
    /// <param name="directoryName">The directory name to validate.</param>
    /// <returns>A validation result indicating whether the directory name is valid and any error messages if it's not.</returns>
    PlatformValidationResult<string> ValidateDirectoryName(string directoryName);

    /// <summary>
    /// Updates the description metadata of an existing file in the storage system.
    /// This operation only modifies the file's metadata without altering its content.
    /// </summary>
    /// <param name="rootDirectory">The root directory where the file is located (e.g., "private" or "public").</param>
    /// <param name="filePath">The relative path of the file within the root directory.</param>
    /// <param name="fileDescription">The new description to associate with the file.</param>
    /// <returns>A task representing the asynchronous update operation.</returns>
    Task UpdateFileDescriptionAsync(string rootDirectory, string filePath, string fileDescription);
}
