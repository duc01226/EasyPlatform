using Easy.Platform.Common.Extensions;

namespace Easy.Platform.Infrastructures.FileStorage;

/// <summary>
/// Represents a directory within the platform file storage system.
/// This interface provides properties and methods to work with directories and their content.
/// </summary>
public interface IPlatformFileStorageDirectory
{
    /// <summary>
    /// Gets the name of the root directory.
    /// </summary>
    public string RootDirectoryName { get; }

    /// <summary>
    /// Gets or sets the absolute URI of the directory.
    /// This URI can be used to access the directory via HTTP or other protocols.
    /// </summary>
    public Uri DirectoryAbsoluteUri { get; set; }

    /// <summary>
    /// Present the virtual folder path prefix, not including RootDirectory. <br />
    /// Example: a file item path: root/folder1/folder2/fileName.extension. The folder2 will be: <br />
    /// {RootDirectory: root, Prefix: folder1/folder2}
    /// </summary>
    public string DirectoryRelativePathPrefix { get; set; }

    /// <summary>
    /// Gets a child directory relative to this directory.
    /// </summary>
    /// <param name="directoryRelativePath">The relative path to the child directory.</param>
    /// <returns>An interface representing the child directory.</returns>
    public IPlatformFileStorageDirectory GetRelativeChildDirectory(string directoryRelativePath);

    /// <summary>
    /// Gets all file items contained in this directory.
    /// </summary>
    /// <returns>An enumerable collection of file items in the directory.</returns>
    public IEnumerable<IPlatformFileStorageFileItem> GetFileItems();

    /// <summary>
    /// Gets all immediate child directories of this directory.
    /// This method extracts directory names from file paths and creates
    /// directory objects for each unique directory found.
    /// </summary>
    /// <returns>A list of directory objects representing the direct children of this directory.</returns>
    public List<IPlatformFileStorageDirectory> GetDirectChildDirectories()
    {
        var fileItems = GetFileItems().ToList();

        var result = fileItems
            .Select(blobItem =>
                blobItem
                    .FullFilePath.TrimStart('/')
                    .Substring(blobItem.RootDirectory.Length)
                    .TrimStart('/')
                    .Substring(startIndex: DirectoryRelativePathPrefix.Length)
                    .TrimStart('/')
                    .TakeUntilNextChar('/')
            )
            .Distinct()
            .SelectList(GetRelativeChildDirectory);

        return result;
    }
}
