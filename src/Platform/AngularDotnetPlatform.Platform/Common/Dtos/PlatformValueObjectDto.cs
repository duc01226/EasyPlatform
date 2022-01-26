using AngularDotnetPlatform.Platform.Common.Validators;
using AngularDotnetPlatform.Platform.Common.ValueObjects;

namespace AngularDotnetPlatform.Platform.Common.Dtos
{
    public abstract class PlatformValueObjectDto<TValueObject> : IPlatformDto<TValueObject>
        where TValueObject : class, IPlatformValueObject<TValueObject>
    {
        public virtual PlatformValidationResult Validate()
        {
            return MapToObject().Validate();
        }

        public abstract TValueObject MapToObject();
    }
}
