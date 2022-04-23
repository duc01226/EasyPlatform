using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Easy.Platform.AspNetCore.Extensions
{
    public static class FormFileExtensions
    {
        public static async Task<byte[]> GetFileBinaries(this IFormFile formFile)
        {
            await using (var fileStream = new MemoryStream())
            {
                await formFile.CopyToAsync(fileStream);

                return fileStream.ToArray();
            }
        }
    }
}
