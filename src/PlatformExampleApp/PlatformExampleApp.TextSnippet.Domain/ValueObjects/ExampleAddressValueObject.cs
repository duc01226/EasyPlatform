using Easy.Platform.Common.Validators;
using Easy.Platform.Common.ValueObjects;

namespace PlatformExampleApp.TextSnippet.Domain.ValueObjects
{
    public class ExampleAddressValueObject : PlatformValueObject<ExampleAddressValueObject>
    {
        public string Number { get; set; }
        public string Street { get; set; }

        public static PlatformExpressionValidator<ExampleAddressValueObject> NumberValidator()
        {
            return new PlatformExpressionValidator<ExampleAddressValueObject>(
                p => !string.IsNullOrEmpty(p.Number),
                "Number must be not null or empty");
        }

        public static PlatformExpressionValidator<ExampleAddressValueObject> StreetValidator()
        {
            return new PlatformExpressionValidator<ExampleAddressValueObject>(
                p => !string.IsNullOrEmpty(p.Street),
                "Street must be not null or empty");
        }

        public static PlatformValidator<ExampleAddressValueObject> GetValidator()
        {
            return PlatformValidator<ExampleAddressValueObject>.Create(NumberValidator(), StreetValidator());
        }

        public override PlatformValidationResult Validate()
        {
            return GetValidator().Validate(this);
        }
    }
}
