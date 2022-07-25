namespace Easy.Platform.Common.Validators.Exceptions;

public interface IPlatformValidationException<TValue>
{
    public string Message { get; }
    public PlatformValidationResult<TValue> ValidationResult { get; set; }
}

public interface IPlatformValidationException : IPlatformValidationException<object>
{
}

public class PlatformValidationException<TValue> : Exception, IPlatformValidationException<TValue>
{
    public PlatformValidationException(PlatformValidationResult<TValue> validationResult) : base(
        validationResult.ToString())
    {
        ValidationResult = validationResult;
    }

    public PlatformValidationResult<TValue> ValidationResult { get; set; }
}

public class PlatformValidationException : PlatformValidationException<object>, IPlatformValidationException
{
    public PlatformValidationException(PlatformValidationResult validationResult) : base(
        new PlatformValidationResult<object>(validationResult.Value, validationResult.Errors))
    {
        ValidationResult = validationResult;
    }

    public new PlatformValidationResult ValidationResult { get; set; }
}
