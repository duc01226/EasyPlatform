namespace Easy.Platform.Infrastructures.FileStorage;

/// <summary>
/// Represents a file item in a platform storage system.
/// This interface provides properties and methods to access and manipulate file metadata.
/// </summary>
public interface IPlatformFileStorageFileItem
{
    /// <summary>
    /// Gets the root directory where the file is stored.
    /// </summary>
    public string RootDirectory { get; }

    /// <summary>
    /// Gets the full path to the file including the root directory.
    /// </summary>
    public string FullFilePath { get; }

    /// <summary>
    /// Gets the date and time when the file was last modified.
    /// </summary>
    public DateTimeOffset? LastModified { get; }

    /// <summary>
    /// Gets the MIME content type of the file.
    /// </summary>
    public string ContentType { get; }

    /// <summary>
    /// Gets the entity tag (ETag) of the file.
    /// ETags are used for caching validation and concurrency control.
    /// </summary>
    public string Etag { get; }

    /// <summary>
    /// Gets the size of the file in bytes.
    /// </summary>
    public long Size { get; }

    /// <summary>
    /// Gets a description of the file.
    /// </summary>
    public string Description { get; }

    /// <summary>
    /// Gets the absolute URI where the file can be accessed.
    /// </summary>
    public string AbsoluteUri { get; }

    /// <summary>
    /// Returns the file path without the root directory prefix.
    /// </summary>
    /// <returns>The relative path of the file excluding the root directory.</returns>
    public string FullFilePathWithoutRootDirectory();
}
