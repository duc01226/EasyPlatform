using System.Data.SqlClient;
using Serilog.Exceptions.Core;
using Serilog.Exceptions.Destructurers;

namespace Easy.Platform.EfCore.Logging.Exceptions;

/// <summary>
/// Destructurer for the legacy <see cref="SqlException" /> from <c>System.Data.SqlClient</c>.
/// Kept as a defensive net: first-party code now uses <c>Microsoft.Data.SqlClient</c>, but
/// some transitive dependencies (e.g. older driver versions, third-party libs) may still
/// throw the <c>System.Data.SqlClient</c> exception. Without this destructurer Serilog
/// falls back to reflection-based destructuring which can leak the entire DbContext.
/// </summary>
/// <seealso cref="ExceptionDestructurer" />
public class PlatformSystemSqlExceptionDestructurer : ExceptionDestructurer
{
    /// <inheritdoc />
    public override Type[] TargetTypes => [typeof(SqlException)];

    /// <inheritdoc />
    public override void Destructure(
        Exception exception,
        IExceptionPropertiesBag propertiesBag,
        Func<Exception, IReadOnlyDictionary<string, object>> destructureException)
    {
        base.Destructure(exception, propertiesBag, destructureException);

#pragma warning disable CA1062 // Validate arguments of public methods
        var sqlException = (SqlException)exception;
        propertiesBag.AddProperty(nameof(SqlException.ClientConnectionId), sqlException.ClientConnectionId);
        propertiesBag.AddProperty(nameof(SqlException.Class), sqlException.Class);
        propertiesBag.AddProperty(nameof(SqlException.LineNumber), sqlException.LineNumber);
        propertiesBag.AddProperty(nameof(SqlException.Number), sqlException.Number);
        propertiesBag.AddProperty(nameof(SqlException.Server), sqlException.Server);
        propertiesBag.AddProperty(nameof(SqlException.State), sqlException.State);
        propertiesBag.AddProperty(nameof(SqlException.Errors), sqlException.Errors.Cast<SqlError>().ToArray());
#pragma warning restore CA1062 // Validate arguments of public methods
    }
}
