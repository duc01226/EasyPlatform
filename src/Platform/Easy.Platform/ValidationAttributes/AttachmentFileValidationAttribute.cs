using System.ComponentModel.DataAnnotations;
using System.IO;
using Microsoft.AspNetCore.Http;

namespace Easy.Platform.ValidationAttributes;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field)]
public class AttachmentFileValidationAttribute : ValidationAttribute
{
    public const long DefaultMaxFileSize = 5 * 1024 * 1024; // 5MB

    // Default values
    public static readonly string[] DefaultSupportedExtensions = [".pdf", ".doc", ".docx", ".xlsx", ".xls", ".txt"];

    public AttachmentFileValidationAttribute(
        string[]? supportedExtensions = null,
        long maxFileSize = DefaultMaxFileSize)
    {
        SupportedExtensions = supportedExtensions ?? DefaultSupportedExtensions;
        MaxFileSize = maxFileSize;
    }

    public string[] SupportedExtensions { get; }
    public long MaxFileSize { get; }

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is IFormFile file)
        {
            // Validate single file
            if (!SupportedExtensions.Contains(Path.GetExtension(file.FileName).ToLowerInvariant()))
                return new ValidationResult($"File '{file.FileName}' is not a supported format. Allowed: {string.Join(", ", SupportedExtensions)}");
            if (file.Length > MaxFileSize)
                return new ValidationResult($"File '{file.FileName}' exceeds maximum allowed size of {MaxFileSize / (1024 * 1024)}MB.");
        }
        else if (value is IEnumerable<IFormFile> files)
        {
            foreach (var f in files)
            {
                if (!SupportedExtensions.Contains(Path.GetExtension(f.FileName).ToLowerInvariant()))
                    return new ValidationResult($"File '{f.FileName}' is not a supported format. Allowed: {string.Join(", ", SupportedExtensions)}");
                if (f.Length > MaxFileSize)
                    return new ValidationResult($"File '{f.FileName}' exceeds maximum allowed size of {MaxFileSize / (1024 * 1024)}MB.");
            }
        }

        return ValidationResult.Success;
    }
}
