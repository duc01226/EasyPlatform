using System.Data.Common;
using Microsoft.Data.SqlClient;
using Npgsql;

namespace Easy.Platform.EfCore.Extensions;

/// <summary>
/// Provider-agnostic entry point for applying Platform diagnostic defaults to ADO.NET
/// connection-string builders.
///
/// <para>
/// <b>Postgres</b> (Npgsql) redacts constraint-violation DETAIL by default to comply with
/// privacy rules. Platform opts in via <c>Include Error Detail=true</c> so FK / uniqueness
/// failures expose the offending column values needed for debugging.
/// </para>
///
/// <para>
/// <b>SQL Server</b> and most other engines already return constraint detail by default,
/// so their overloads are intentional no-ops today — they exist so call sites can be written
/// provider-agnostic and stay compile-safe when a service switches database engines.
/// </para>
///
/// <para>
/// <b>Adding a new provider:</b> add a typed extension overload AND a <c>case</c> in
/// <see cref="WithPlatformDiagnosticsDefaults(DbConnectionStringBuilder)"/> so the runtime
/// dispatch picks it up.
/// </para>
/// </summary>
public static class PlatformDbConnectionStringDiagnosticsExtensions
{
    public const bool DefaultIncludeErrorDetail = true;

    /// <summary>
    /// Provider-agnostic dispatch. Detects the concrete builder type at runtime and applies
    /// the matching diagnostic defaults. Unknown builder types are returned unchanged so this
    /// is safe to chain in code that holds the base <see cref="DbConnectionStringBuilder"/>.
    /// </summary>
    public static DbConnectionStringBuilder WithPlatformDiagnosticsDefaults(this DbConnectionStringBuilder builder)
    {
        switch (builder)
        {
            case NpgsqlConnectionStringBuilder pg:
                pg.WithPlatformDiagnosticsDefaults();
                break;
            case SqlConnectionStringBuilder sql:
                sql.WithPlatformDiagnosticsDefaults();
                break;
        }

        return builder;
    }

    /// <summary>
    /// Postgres — opts into <c>Include Error Detail</c> so constraint-violation DETAIL is
    /// surfaced in exception messages. Default is <c>true</c> across all environments.
    /// </summary>
    public static NpgsqlConnectionStringBuilder WithPlatformDiagnosticsDefaults(
        this NpgsqlConnectionStringBuilder builder,
        bool? includeErrorDetail = null)
    {
        builder.IncludeErrorDetail = includeErrorDetail ?? DefaultIncludeErrorDetail;
        return builder;
    }

    /// <summary>
    /// SQL Server — no-op today. <c>SqlException</c> already includes the constraint name
    /// and offending values in <c>Message</c>. Reserved for future diagnostic toggles
    /// (e.g., enabling MARS, transient-fault telemetry, command timeout audit).
    /// </summary>
    public static SqlConnectionStringBuilder WithPlatformDiagnosticsDefaults(this SqlConnectionStringBuilder builder)
    {
        return builder;
    }

    /// <summary>
    /// Raw-string overload. The dispatch cannot infer the engine from the string alone, so
    /// the caller passes a <see cref="PlatformDbProvider"/> hint. Defaults to
    /// <see cref="PlatformDbProvider.Postgres"/> to preserve the previous Npgsql-only
    /// call-site behavior.
    /// </summary>
    public static string WithPlatformDiagnosticsDefaults(
        this string connectionString,
        PlatformDbProvider provider = PlatformDbProvider.Postgres)
    {
        return provider switch
        {
            PlatformDbProvider.Postgres => new NpgsqlConnectionStringBuilder(connectionString)
                .WithPlatformDiagnosticsDefaults()
                .ToString(),
            PlatformDbProvider.SqlServer => new SqlConnectionStringBuilder(connectionString)
                .WithPlatformDiagnosticsDefaults()
                .ToString(),
            _ => connectionString
        };
    }
}

/// <summary>
/// Database engine hint used by the raw-string overload of
/// <see cref="PlatformDbConnectionStringDiagnosticsExtensions.WithPlatformDiagnosticsDefaults(string, PlatformDbProvider)"/>.
/// </summary>
public enum PlatformDbProvider
{
    Postgres,
    SqlServer,
    MySql,
    Sqlite,
    Other
}
