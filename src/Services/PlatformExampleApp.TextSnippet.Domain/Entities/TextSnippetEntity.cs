using System;
using System.Linq.Expressions;
using FluentValidation;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Validators;

namespace PlatformExampleApp.TextSnippet.Domain.Entities
{
    public class TextSnippetEntity : AuditedEntity<TextSnippetEntity, Guid, Guid?>
    {
        public const int FullTextMaxLength = 4000;
        public const int SnippetTextMaxLength = 100;

        public string SnippetText { get; set; }

        public string FullText { get; set; }

        public static PlatformSingleValidator<TextSnippetEntity, string> SnippetTextValidator()
        {
            return new PlatformSingleValidator<TextSnippetEntity, string>(
                p => p.SnippetText,
                p => p.NotNull().NotEmpty().MaximumLength(SnippetTextMaxLength));
        }

        public static PlatformSingleValidator<TextSnippetEntity, string> FullTextValidator()
        {
            return new PlatformSingleValidator<TextSnippetEntity, string>(
                p => p.FullText,
                p => p.NotNull().NotEmpty().MaximumLength(FullTextMaxLength));
        }

        public override PlatformCheckUniquenessValidator<TextSnippetEntity> CheckUniquenessValidator()
        {
            return new PlatformCheckUniquenessValidator<TextSnippetEntity>(
                this,
                otherItem => !otherItem.Id.Equals(Id) && otherItem.SnippetText == SnippetText,
                "SnippetText must be unique");
        }

        public override PlatformValidator<TextSnippetEntity> GetValidator()
        {
            return PlatformValidator<TextSnippetEntity>.Create(SnippetTextValidator(), FullTextValidator());
        }
    }
}
