using System.IO;

namespace Easy.Platform.Common.Utils;

public static partial class Util
{
    public static class FileReaders
    {
        /// <summary>
        /// Reads all characters from the current position to the end of the stream.
        /// </summary>
        /// <param name="filePath">filePath</param>
        /// <returns>All file content as string</returns>
        public static string ReadFileToEnd(string filePath)
        {
            using (var reader = new StreamReader(filePath))
            {
                return reader.ReadToEnd();
            }
        }
    }
}
