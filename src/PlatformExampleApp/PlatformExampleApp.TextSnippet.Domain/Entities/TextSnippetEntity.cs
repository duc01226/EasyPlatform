using System.Security.Cryptography;
using System.Text;
using Easy.Platform.Common.Validators;
using Easy.Platform.Domain.Entities;
using FluentValidation;
using PlatformExampleApp.TextSnippet.Domain.ValueObjects;

namespace PlatformExampleApp.TextSnippet.Domain.Entities;

public class TextSnippetEntity : AuditedEntity<TextSnippetEntity, Guid, Guid?>, IRowVersionEntity
{
    public const int FullTextMaxLength = 4000;
    public const int SnippetTextMaxLength = 100;

    public string SnippetText { get; set; }

    public string FullText { get; set; }

    /// <summary>
    /// Demo ForeignKey for TextSnippetAssociatedEntity
    /// </summary>
    public Guid? CreatedByUserId { get; set; }

    public virtual ExampleAddressValueObject Address { get; set; }

    public Guid? ConcurrencyUpdateToken { get; set; }

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
            findOtherDuplicatedItemExpr: otherItem =>
                !otherItem.Id.Equals(Id) && otherItem.SnippetText == SnippetText,
            "SnippetText must be unique");
    }

    public override PlatformValidator<TextSnippetEntity> GetValidator()
    {
        return PlatformValidator<TextSnippetEntity>.Create(
            SnippetTextValidator(),
            FullTextValidator(),
            AddressValidator());
    }

    public PlatformValidationResult ValidateSomeSpecificDomainLogic()
    {
        return PlatformValidationResult.ValidIf(
            must: true,
            "Some example domain logic violated message.");
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
