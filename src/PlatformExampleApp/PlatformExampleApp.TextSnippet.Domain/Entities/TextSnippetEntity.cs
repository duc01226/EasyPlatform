#region

using System.Security.Cryptography;
using System.Text;
using Easy.Platform.Common.Validations.Validators;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Exceptions.Extensions;
using FluentValidation;
using PlatformExampleApp.TextSnippet.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.ValueObjects;

#endregion

namespace PlatformExampleApp.TextSnippet.Domain.Entities;

// DEMO USING AutoAddFieldUpdatedEvent to track entity property updated
[TrackFieldUpdatedDomainEvent]
public class TextSnippetEntity : RootAuditedEntity<TextSnippetEntity, string, string>, IRowVersionEntity
{
    public const int FullTextMaxLength = 4000;
    public const int SnippetTextMaxLength = 100;

    [TrackFieldUpdatedDomainEvent]
    public string SnippetText { get; set; }

    [TrackFieldUpdatedDomainEvent]
    public string FullText { get; set; }

    public TimeOnly TimeOnly { get; set; } = TimeOnly.MaxValue;

    /// <summary>
    /// Demo ForeignKey for TextSnippetAssociatedEntity
    /// </summary>
    public string CreatedByUserId { get; set; }

    /// <summary>
    /// Properties for LazyLoadRequestContextAccessorRegistersFactory demo
    /// </summary>
    public string Title { get; set; } = "";
    public string Category { get; set; } = "";
    public string CreatedByDepartment { get; set; } = "";

    public ExampleAddressValueObject Address { get; set; } = new() { Street = "Random default street" };

    public List<string> AddressStrings { get; set; } = ["Random default street", "Random default streetAB", "Random default streetCD"];

    //// Example of using FindByUniqueCompositeIdExpr to check unique composite key for entity
    //public override Expression<Func<TextSnippetEntity, bool>> FindByUniqueCompositeIdExpr()
    //{
    //    //return p => p.SnippetText == SnippetText && p.Id == Id;
    //    return null;
    //}

    public List<ExampleAddressValueObject> Addresses { get; set; } =
        [new() { Street = "Random default street" }, new() { Street = "Random default streetAB" }, new() { Street = "Random default streetCD" }];

    public string? ConcurrencyUpdateToken { get; set; }

    public override string UniqueCompositeId()
    {
        return Id;
    }

    public static TextSnippetEntity Create(string id, string snippetText, string fullText)
    {
        return new TextSnippetEntity
        {
            Id = id,
            SnippetText = snippetText,
            FullText = fullText,
        };
    }

    public override PlatformCheckUniqueValidator<TextSnippetEntity> CheckUniqueValidator()
    {
        return new PlatformCheckUniqueValidator<TextSnippetEntity>(
            targetItem: this,
            findOtherDuplicatedItemExpr: otherItem => otherItem.Id != Id && otherItem.SnippetText == SnippetText,
            "SnippetText must be unique"
        );
    }

    public TextSnippetEntity DemoDoSomeDomainEntityLogicAction_EncryptSnippetText()
    {
        var bytes = Encoding.UTF8.GetBytes(SnippetText);

        var hash = SHA256.HashData(bytes);

        SnippetText = Convert.ToBase64String(hash);
        var originalSnippetText = SnippetText;

        AddDomainEvent(new EncryptSnippetTextDomainEvent { OriginalSnippetText = originalSnippetText, EncryptedSnippetText = SnippetText });

        return this;
    }

    public async Task<PlatformValidationResult<TextSnippetEntity>> ValidateSomeSpecificIsXxxLogicAsync(
        ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository,
        ITextSnippetRootRepository<MultiDbDemoEntity> multiDbDemoEntityRepository
    )
    {
        // Example get data from db to check and validate logic
        return await this.ValidateAsync(
            must: async () => !await textSnippetEntityRepository.AnyAsync(p => p.Id != Id && p.SnippetText == SnippetText),
            "SnippetText is duplicated"
        );
    }

    public class EncryptSnippetTextDomainEvent : ISupportDomainEventsEntity.DomainEvent
    {
        public string OriginalSnippetText { get; set; }

        public string EncryptedSnippetText { get; set; }
    }

    #region Basic Prop Validators

    public static PlatformSingleValidator<TextSnippetEntity, string> SnippetTextValidator()
    {
        return new PlatformSingleValidator<TextSnippetEntity, string>(p => p.SnippetText, p => p.NotNull().NotEmpty().MaximumLength(SnippetTextMaxLength));
    }

    public static PlatformSingleValidator<TextSnippetEntity, string> FullTextValidator()
    {
        return new PlatformSingleValidator<TextSnippetEntity, string>(p => p.FullText, p => p.NotNull().NotEmpty().MaximumLength(FullTextMaxLength));
    }

    public static PlatformSingleValidator<TextSnippetEntity, ExampleAddressValueObject> AddressValidator()
    {
        return new PlatformSingleValidator<TextSnippetEntity, ExampleAddressValueObject>(p => p.Address, p => p.SetValidator(ExampleAddressValueObject.GetValidator()));
    }

    public override PlatformValidator<TextSnippetEntity> GetValidator()
    {
        return PlatformValidator<TextSnippetEntity>.Create(SnippetTextValidator(), FullTextValidator(), AddressValidator());
    }

    #endregion

    #region Demo Validation Logic, Reuse logic and Expression

    public static PlatformExpressionValidator<TextSnippetEntity> SavePermissionValidator(string userId)
    {
        return new PlatformExpressionValidator<TextSnippetEntity>(
            must: p => p.CreatedByUserId == null || userId == null || p.CreatedByUserId == userId,
            errorMessage: "User must be the creator to update text snippet entity"
        );
    }

    public static PlatformExpressionValidator<TextSnippetEntity> SomeSpecificIsXxxLogicValidator()
    {
        return new PlatformExpressionValidator<TextSnippetEntity>(must: p => true, errorMessage: "Some example domain logic violated message.");
    }

    public PlatformValidationResult<TextSnippetEntity> ValidateSomeSpecificIsXxxLogic()
    {
        return SomeSpecificIsXxxLogicValidator().Validate(this).WithDomainException();
    }

    public PlatformValidationResult<TextSnippetEntity> ValidateSavePermission(string userId)
    {
        return SavePermissionValidator(userId).Validate(this).WithPermissionException();
    }

    #endregion
}
