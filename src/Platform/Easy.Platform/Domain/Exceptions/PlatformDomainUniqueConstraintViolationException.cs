namespace Easy.Platform.Domain.Exceptions;

/// <summary>
/// Thrown when a write violates a UNIQUE constraint (unique index / primary key) in the underlying store.
/// <para>
/// This is the PROVIDER-NEUTRAL representation of that failure, mirroring
/// <see cref="PlatformDomainRowVersionConflictException" />. Each persistence provider recognises its own native
/// error and re-throws THIS type before the failure can escape the persistence layer:
/// <list type="bullet">
/// <item><description>EF Core (any provider) — <c>DbUpdateException</c> whose inner <c>DbException</c> carries SQLSTATE 23505 (<c>unique_violation</c>). Providers that do not populate SQLSTATE need their own error-code check; see <c>PlatformEfCoreDbContext.IsUniqueConstraintViolation</c>.</description></item>
/// <item><description>MongoDB — a write error in the <c>DuplicateKey</c> category (server error 11000).</description></item>
/// </list>
/// </para>
/// <para>
/// <b>Why this type exists.</b> Application and domain code must be able to react to "this row already exists"
/// WITHOUT naming a database-provider exception type. Referencing <c>DbUpdateException</c> or a provider's own
/// native exception type from the Application layer couples that layer to one storage technology, and the
/// common workaround — matching <c>ex.GetType().Name is "..."</c> — is worse still: it keeps compiling after the
/// type is renamed or the provider is swapped, silently degrading the handler into a no-op with no build error
/// and no failing test. Catch this type instead; it is stable across providers and enforced by the compiler.
/// </para>
/// <para>
/// The original provider exception is always preserved as <see cref="Exception.InnerException" />, so diagnostics,
/// log destructurers, and constraint-name inspection lose nothing.
/// </para>
/// </summary>
public class PlatformDomainUniqueConstraintViolationException : PlatformDomainException
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformDomainUniqueConstraintViolationException"/> class.
    /// </summary>
    /// <param name="errorMsg">The error message that explains the reason for the exception.</param>
    /// <param name="innerException">The provider-native exception that caused this failure. Always supply it — it carries the constraint name and full diagnostics.</param>
    public PlatformDomainUniqueConstraintViolationException(string errorMsg, Exception innerException = null)
        : base(errorMsg, innerException) { }
}
