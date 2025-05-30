using System.IO;
using Easy.Platform.Common.Extensions;
using Microsoft.AspNetCore.Http;

namespace Easy.Platform.Infrastructures.FileStorage;

/// <summary>
/// Defines the standard interface for platform file operations.
/// Provides methods to access file metadata and content regardless of the underlying file source.
/// </summary>
public interface IPlatformFile
{
    /// <summary>
    /// Gets the name of the file including its extension.
    /// </summary>
    /// <returns>The file name with extension.</returns>
    public string GetFileName();

    /// <summary>
    /// Opens the file as a stream for reading.
    /// </summary>
    /// <returns>A Stream that can be used to read the file's contents.</returns>
    public Stream OpenReadStream();

    /// <summary>
    /// Gets the file's contents as a byte array.
    /// </summary>
    /// <returns>A task that completes with the file's binary content.</returns>
    public Task<byte[]> GetFileBinaries();
}

/// <summary>
/// Implements IPlatformFile for files submitted through HTTP form requests.
/// Wraps the ASP.NET Core IFormFile interface to provide standard platform file access methods.
/// </summary>
public class PlatformHttpFormFile : IPlatformFile
{
    /// <summary>
    /// Gets or sets the underlying form file from an HTTP request.
    /// </summary>
    public IFormFile FormFile { get; set; }

    /// <summary>
    /// Gets the name of the uploaded form file.
    /// </summary>
    /// <returns>The file name with extension.</returns>
    public string GetFileName()
    {
        return FormFile.FileName;
    }

    /// <summary>
    /// Opens the form file as a read stream, ensuring the stream position is set to the beginning.
    /// </summary>
    /// <returns>A Stream that can be used to read the file's contents.</returns>
    public Stream OpenReadStream()
    {
        return FormFile.OpenReadStream().With(s => s.Position = 0);
    }

    /// <summary>
    /// Gets the form file's contents as a byte array.
    /// </summary>
    /// <returns>A task that completes with the file's binary content.</returns>
    public Task<byte[]> GetFileBinaries()
    {
        return FormFile.GetFileBinaries();
    }

    /// <summary>
    /// Creates a new PlatformHttpFormFile instance wrapping the specified form file.
    /// </summary>
    /// <param name="formFile">The form file to wrap.</param>
    /// <returns>A new PlatformHttpFormFile instance.</returns>
    public static PlatformHttpFormFile Create(IFormFile formFile)
    {
        return new PlatformHttpFormFile { FormFile = formFile };
    }
}

/// <summary>
/// Implements IPlatformFile for files represented as in-memory streams.
/// This allows working with files that may not have originated from HTTP form uploads.
/// </summary>
public class PlatformStreamFile : IPlatformFile
{
    /// <summary>
    /// Gets or sets the stream containing the file's content.
    /// </summary>
    public Stream Stream { get; set; }

    /// <summary>
    /// Gets or sets the name of the file including its extension.
    /// </summary>
    public string FileName { get; set; }

    /// <summary>
    /// Gets the name of the file.
    /// </summary>
    /// <returns>The file name with extension.</returns>
    public string GetFileName()
    {
        return FileName;
    }

    /// <summary>
    /// Opens the stream as a read stream, ensuring the stream position is set to the beginning.
    /// </summary>
    /// <returns>A Stream that can be used to read the file's contents.</returns>
    public Stream OpenReadStream()
    {
        return Stream.With(s => s.Position = 0);
    }

    /// <summary>
    /// Gets the stream's contents as a byte array.
    /// </summary>
    /// <returns>A task that completes with the file's binary content.</returns>
    public Task<byte[]> GetFileBinaries()
    {
        return Stream.GetBinaries();
    }

    /// <summary>
    /// Creates a new PlatformStreamFile instance with the specified stream and file name.
    /// </summary>
    /// <param name="stream">The stream containing the file's content.</param>
    /// <param name="fileName">The name of the file including its extension.</param>
    /// <returns>A new PlatformStreamFile instance.</returns>
    public static PlatformStreamFile Create(Stream stream, string fileName)
    {
        return new PlatformStreamFile { Stream = stream, FileName = fileName };
    }
}
