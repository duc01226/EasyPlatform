namespace Easy.Platform.Domain.Entities;

/// <summary>
/// This attribute is used to mark properties of an entity that are computed properties (Property has get {return someComputeLogicHere();}; set { // Do not thing}).
/// For these properties, the setter is ignored and the value is computed dynamically, which cause check diff mechanism to not work.
/// This attribute is used to indicate that the property should use json clone deep mechanism to check for changes instead of the default reference equality check.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public class ComputedEntityPropertyAttribute : Attribute
{
}
