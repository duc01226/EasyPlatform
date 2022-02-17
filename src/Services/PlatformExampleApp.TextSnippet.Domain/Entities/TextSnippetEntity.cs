using System;
using System.Security.Cryptography;
using System.Text;
using AngularDotnetPlatform.Platform.Common.Validators;
using FluentValidation;
using AngularDotnetPlatform.Platform.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.ValueObjects;

namespace PlatformExampleApp.TextSnippet.Domain.Entities
{
    public class TextSnippetEntity : AuditedEntity<TextSnippetEntity, Guid, Guid?>
    {
        public const int FullTextMaxLength = 4000;
        public const int SnippetTextMaxLength = 100;

        public string SnippetText { get; set; }

        public string FullText { get; set; }

        public ExampleAddressValueObject Address { get; set; }

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

        public static PlatformSingleValidator<TextSnippetEntity, ExampleAddressValueObject> AddressValidator()
        {
            return new PlatformSingleValidator<TextSnippetEntity, ExampleAddressValueObject>(
                p => p.Address,
                p => p.SetValidator(ExampleAddressValueObject.GetValidator()));
        }

        public override PlatformCheckUniquenessValidator<TextSnippetEntity> CheckUniquenessValidator()
        {
            return new PlatformCheckUniquenessValidator<TextSnippetEntity>(
                targetItem: this,
                findOtherDuplicatedItemExpr: otherItem => !otherItem.Id.Equals(Id) && otherItem.SnippetText == SnippetText,
                "SnippetText must be unique");
        }

        public override PlatformValidator<TextSnippetEntity> GetValidator()
        {
            return PlatformValidator<TextSnippetEntity>.Create(SnippetTextValidator(), FullTextValidator(), AddressValidator());
        }

        public PlatformValidationResult ValidateSomeSpecificDomainLogic()
        {
            return PlatformValidationResult.ValidIf(validCondition: true, "Some example domain logic violated message.");
        }

        public TextSnippetEntity DemoDoSomeDomainEntityLogicAction_EncryptSnippetText()
        {
            var originalSnippetText = SnippetText;

            using (var sha = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(SnippetText);
                var hash = sha.ComputeHash(bytes);

                SnippetText = Convert.ToBase64String(hash);
            }

            AddBusinessActionEvents(
                eventActionName: EncryptSnippetTextPayload.ForEventActionName,
                new EncryptSnippetTextPayload
                {
                    OriginalSnippetText = originalSnippetText,
                    EncryptedSnippetText = SnippetText
                });

            return this;
        }

        public class EncryptSnippetTextPayload
        {
            public const string ForEventActionName = "EncryptSnippetText";

            public string OriginalSnippetText { get; set; }

            public string EncryptedSnippetText { get; set; }
        }
    }
}
