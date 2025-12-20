using Easy.Platform.Common.Validations;

namespace Easy.Platform.Common.Dtos;

/// <summary>
/// Base marker interface for all platform Data Transfer Objects (DTOs).
/// This interface serves as a common contract for DTOs used throughout the platform,
/// enabling consistent handling and identification of DTO types across the system.
/// </summary>
public interface IPlatformDto { }

/// <summary>
/// Generic interface for validatable platform DTOs.
/// This interface extends the base IPlatformDto and provides validation capabilities
/// for DTOs that need to ensure their data integrity and business rule compliance.
/// </summary>
/// <typeparam name="TDto">The specific DTO type that implements this interface. This allows for self-referencing validation results.</typeparam>
public interface IPlatformDto<TDto> : IPlatformDto
    where TDto : IPlatformDto<TDto>
{
    /// <summary>
    /// Validates the current DTO instance according to business rules and data constraints.
    /// This method performs comprehensive validation of the DTO's properties and relationships,
    /// returning a structured validation result that indicates success or failure with detailed error information.
    /// </summary>
    /// <returns>A PlatformValidationResult containing the validation outcome and any error messages if validation fails.</returns>
    PlatformValidationResult<TDto> Validate();
}

/// <summary>
/// Generic interface for mappable platform DTOs that can be converted to other object types.
/// This interface extends the validatable DTO interface and adds object mapping capabilities,
/// allowing DTOs to be transformed into domain entities, view models, or other data structures.
/// </summary>
/// <typeparam name="TDto">The specific DTO type that implements this interface.</typeparam>
/// <typeparam name="TMapForObject">The target object type that this DTO can be mapped to. This is covariant to allow flexible mapping scenarios.</typeparam>
public interface IPlatformDto<TDto, out TMapForObject> : IPlatformDto<TDto>
    where TDto : IPlatformDto<TDto>
{
    /// <summary>
    /// Maps the current DTO instance to a target object type.
    /// This method performs data transformation from the DTO structure to another object representation,
    /// typically used for converting between different layers of the application (e.g., DTO to domain entity).
    /// </summary>
    /// <returns>An instance of TMapForObject containing the mapped data from this DTO.</returns>
    TMapForObject MapToObject();
}
