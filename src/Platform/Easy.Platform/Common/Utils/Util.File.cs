using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Easy.Platform.Common.Utils
{
    public static partial class Util
    {
        public static class File
        {
            public static string ReadFile(string filePath)
            {
                using (var reader = new StreamReader(filePath))
                {
                    return reader.ReadToEnd();
                }
            }
        }
    }
}
