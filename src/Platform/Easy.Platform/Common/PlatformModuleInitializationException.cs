namespace Easy.Platform.Common;

/// <summary>
/// Identifies the lifecycle stage that failed while a platform module was initializing.
/// </summary>
/// <remarks>
/// Members are declared in execution order. Values are not persisted or serialized.
/// </remarks>
public enum PlatformModuleInitializationStage
{
    CompositionValidation,
    DependencyInitialization,
    PerformanceProfiling,
    InternalInitialization
}

/// <summary>
/// Describes a platform module initialization failure without replacing the original exception.
/// </summary>
public sealed class PlatformModuleInitializationException : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformModuleInitializationException" /> class.
    /// </summary>
    /// <param name="moduleType">The module type whose initialization failed.</param>
    /// <param name="stage">The lifecycle stage that failed.</param>
    /// <param name="innerException">The original initialization exception.</param>
    public PlatformModuleInitializationException(
        Type moduleType,
        PlatformModuleInitializationStage stage,
        Exception innerException)
        : base(
            $"Platform module '{moduleType?.FullName ?? moduleType?.Name ?? "<unknown>"}' failed during {stage}.",
            innerException)
    {
        ArgumentNullException.ThrowIfNull(moduleType);
        ArgumentNullException.ThrowIfNull(innerException);

        ModuleType = moduleType;
        Stage = stage;
    }

    /// <summary>
    /// Gets the type of the module whose initialization failed.
    /// </summary>
    public Type ModuleType { get; }

    /// <summary>
    /// Gets the lifecycle stage that failed.
    /// </summary>
    public PlatformModuleInitializationStage Stage { get; }
}
