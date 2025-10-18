using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text;
using Easy.Platform.Common.Extensions;

namespace Easy.Platform.Common.Utils;

public static partial class Util
{
    /// <summary>
    /// Provides utility methods for reading files and streams.
    /// </summary>
    public static class FileReader
    {
        /// <summary>
        /// Reads all characters from the current position to the end of the stream asynchronously.
        /// </summary>
        /// <param name="filePath">The path to the file.</param>
        /// <param name="cancellationToken"></param>
        /// <returns>A task representing the asynchronous operation. The result is the content of the file as a string.</returns>
        public static async Task<string> ReadFileAsStringAsync(string filePath, CancellationToken cancellationToken = default)
        {
            using (var reader = new StreamReader(filePath))
            {
                var result = await reader.ReadToEndAsync(cancellationToken);
                return result;
            }
        }

        /// <summary>
        /// Asynchronously writes a string to a file at the specified file path.
        /// </summary>
        /// <param name="filePath">The path to the file.</param>
        /// <param name="fileContent">The content to write to the file.</param>
        /// <param name="cancellationToken">A cancellation token to cancel the operation.</param>
        /// <returns>A task representing the asynchronous operation.</returns>
        public static async Task WriteStringToFileAsync(string filePath, string fileContent, CancellationToken cancellationToken = default)
        {
            // Ensure the directory of the file exists
            var directory = Path.GetDirectoryName(filePath);
            if (directory != null && !Directory.Exists(directory)) Directory.CreateDirectory(directory);

            // Write the content to the file
            await File.WriteAllTextAsync(filePath, fileContent, cancellationToken);
        }

        public static async Task<byte[]> ReadStreamAsBytesAsync(Func<Stream> openReadStream)
        {
            using (var reader = new StreamReader(openReadStream()))
            {
                using (var ms = new MemoryStream(reader.BaseStream.Length > int.MaxValue ? int.MaxValue : (int)reader.BaseStream.Length))
                {
                    await reader.BaseStream.CopyToAsync(ms);
                    return ms.ToArray();
                }
            }
        }

        /// <summary>
        /// Reads the base64-encoded string and returns it as a stream.
        /// </summary>
        /// <param name="base64">The base64-encoded string.</param>
        /// <returns>A stream containing the decoded content.</returns>
        public static Stream ReadBase64AsStream(string base64)
        {
            return new MemoryStream(Convert.FromBase64String(base64));
        }

        /// <summary>
        /// Reads all characters from the current position to the end of the stream.
        /// </summary>
        /// <param name="applicationRelativeFilePath">The relative path to the file from the application's execution location.</param>
        /// <param name="cancellationToken"></param>
        /// <returns>All file content as a string.</returns>
        public static async Task<string> ReadApplicationFileAsStringAsync(string applicationRelativeFilePath, CancellationToken cancellationToken = default)
        {
            return await ReadFileAsStringAsync(
                PathBuilder.ConcatRelativePath(
                    Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location),
                    applicationRelativeFilePath),
                cancellationToken);
        }

        /// <summary>
        /// Asynchronously writes a string to a file located in the application's directory.
        /// </summary>
        /// <param name="applicationRelativeFilePath">The relative path within the application directory.</param>
        /// <param name="fileContent">The content to write to the file.</param>
        /// <param name="cancellationToken">A cancellation token to cancel the operation.</param>
        /// <returns>A task representing the asynchronous operation.</returns>
        public static async Task WriteStringToApplicationFileAsync(string applicationRelativeFilePath, string fileContent, CancellationToken cancellationToken = default)
        {
            await WriteStringToFileAsync(
                PathBuilder.ConcatRelativePath(
                    Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location),
                    applicationRelativeFilePath),
                fileContent,
                cancellationToken);
        }

        /// <summary>
        /// Checks whether a file exists based on the relative path to the application's execution location.
        /// </summary>
        /// <param name="relativeToEntryExecutionFilePath">The relative path to the file from the application's execution location.</param>
        /// <returns>True if the file exists; otherwise, false.</returns>
        public static bool CheckFileExistsByRelativeToEntryExecutionPath(string relativeToEntryExecutionFilePath)
        {
            var fullPath = PathBuilder.GetFullPathByRelativeToEntryExecutionPath(relativeToEntryExecutionFilePath);
            return File.Exists(fullPath);
        }

        /// <summary>
        /// Reads all characters from the current position to the end of the stream.
        /// </summary>
        /// <param name="filePath">The path to the file.</param>
        /// <returns>All file content as a string.</returns>
        public static string ReadFileAsString(string filePath)
        {
            using (var reader = new StreamReader(filePath))
            {
                return reader.ReadToEnd();
            }
        }

        /// <summary>
        /// Reads the entire stream as bytes.
        /// </summary>
        /// <param name="openReadStream">A function that opens the stream to read.</param>
        /// <returns>The content of the stream as bytes.</returns>
        public static byte[] ReadFileAsBytes(Func<Stream> openReadStream)
        {
            using (var reader = new StreamReader(openReadStream()))
            {
                using (var ms = new MemoryStream(reader.BaseStream.Length > int.MaxValue ? int.MaxValue : (int)reader.BaseStream.Length))
                {
                    reader.BaseStream.CopyTo(ms);
                    return ms.ToArray();
                }
            }
        }

        /// <summary>
        /// Reads all characters from the current position to the end of the stream.
        /// </summary>
        /// <param name="applicationRelativeFilePath">The relative path to the file from the application's execution location.</param>
        /// <returns>All file content as a string.</returns>
        public static string ReadApplicationFileAsString(string applicationRelativeFilePath)
        {
            return ReadFileAsString(
                PathBuilder.ConcatRelativePath(
                    Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location),
                    applicationRelativeFilePath));
        }

        public static async Task<List<T>> GetUnzipFiles<T>(Stream zipFileStream, Func<ZipArchiveEntry, Task<T>> readFileFn)
        {
            using (var newZipArchive = new ZipArchive(zipFileStream, ZipArchiveMode.Read))
            {
                return await newZipArchive.Entries.SelectAsync(readFileFn);
            }
        }

        public static async Task<Stream> ZipFilesAsStream<TFileContent>(
            List<ZipFilesAsStreamFileItem<TFileContent>> files,
            Func<TFileContent, char[]> readFileAsCharsFn)
        {
            var returnZipFileStream = new MemoryStream();

            using (var newZipArchive = new ZipArchive(returnZipFileStream, ZipArchiveMode.Create, true))
            {
                foreach (var file in files)
                {
                    var fileZipEntry = newZipArchive.CreateEntry(file.FileName);

                    // Write not-zip file content to a zip file item
                    using (var writer = new StreamWriter(fileZipEntry.Open(), file.FileEncoding))
                    {
                        await writer.WriteAsync(readFileAsCharsFn(file.FileContent));
                    }
                }
            }

            // Reset the position of the MemoryStream to the beginning
            returnZipFileStream.Seek(0, SeekOrigin.Begin);

            return returnZipFileStream;
        }

        public static async Task<Stream> ZipFilesAsStream<TFileContent>(
            List<ZipFilesAsStreamFileItem<TFileContent>> files,
            Func<TFileContent, byte[]> readFileAsBytesFn)
        {
            var returnZipFileStream = new MemoryStream();

            using (var newZipArchive = new ZipArchive(returnZipFileStream, ZipArchiveMode.Create, true))
            {
                foreach (var file in files)
                {
                    var fileZipEntry = newZipArchive.CreateEntry(file.FileName);

                    // Write the file data to the entry
                    using (var entryStream = fileZipEntry.Open())
                    {
                        var fileBytes = readFileAsBytesFn(file.FileContent);

                        await entryStream.WriteAsync(fileBytes);
                    }
                }
            }

            // Reset the position of the MemoryStream to the beginning
            returnZipFileStream.Seek(0, SeekOrigin.Begin);

            return returnZipFileStream;
        }

        /// <summary>
        /// Read entire stream to byte[] without changing Position requirements.
        /// Caller owns 'source' disposal.
        /// </summary>
        public static async Task<byte[]> ReadAllBytesAsync(Stream source, CancellationToken ct = default)
        {
            using var ms = new MemoryStream();
            await source.CopyToAsync(ms, 81_920, ct); // 80KB buffer
            return ms.ToArray();
        }

        public class ZipFilesAsStreamFileItem<TFileContent>
        {
            public ZipFilesAsStreamFileItem(string fileName, TFileContent fileContent, Encoding fileEncoding)
            {
                FileName = fileName;
                FileContent = fileContent;
                FileEncoding = fileEncoding;
            }

            public string FileName { get; init; }
            public TFileContent FileContent { get; init; }
            public Encoding FileEncoding { get; set; }
        }
    }
}
