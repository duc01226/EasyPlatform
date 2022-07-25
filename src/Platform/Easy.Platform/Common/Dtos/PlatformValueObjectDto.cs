using Easy.Platform.Common.Validators;
using Easy.Platform.Common.ValueObjects;

namespace Easy.Platform.Common.Dtos;

public abstract class PlatformValueObjectDto<TValueObject> : IPlatformDto<TValueObject>
    where TValueObject : class, IPlatformValueObject<TValueObject>
{
    public virtual PlatformValidationResult Validate()
    {
        return MapToObject().Validate();
    }

    public abstract TValueObject MapToObject();
}
