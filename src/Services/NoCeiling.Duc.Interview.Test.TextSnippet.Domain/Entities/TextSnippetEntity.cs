using System;
using FluentValidation;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Entities;
using NoCeiling.Duc.Interview.Test.Platform.Validators;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Entities
{
    public class TextSnippetEntity : AuditedEntity<TextSnippetEntity, Guid>
    {
        public const int FullTextMaxLength = 4000;
        public const int SnippetTextMaxLength = 100;

        public string SnippetText { get; set; }

        public string FullText { get; set; }

        public static PlatformSingleValidator<TextSnippetEntity, string> SnippetTextValidator()
        {
            return PlatformSingleValidator<TextSnippetEntity, string>.New(
                p => p.SnippetText,
                p => p.NotNull().NotEmpty().MaximumLength(SnippetTextMaxLength));
        }

        public static PlatformSingleValidator<TextSnippetEntity, string> FullTextValidator()
        {
            return PlatformSingleValidator<TextSnippetEntity, string>.New(
                p => p.FullText,
                p => p.NotNull().NotEmpty().MaximumLength(FullTextMaxLength));
        }

        protected override PlatformValidator<TextSnippetEntity> GetValidator()
        {
            return new TextSnippetEntityValidator();
        }
    }

    public class TextSnippetEntityValidator : PlatformValidator<TextSnippetEntity>
    {
        public TextSnippetEntityValidator()
        {
            Include(TextSnippetEntity.SnippetTextValidator());
            Include(TextSnippetEntity.FullTextValidator());
        }
    }
}
