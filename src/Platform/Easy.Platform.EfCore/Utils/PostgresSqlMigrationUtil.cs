using Microsoft.EntityFrameworkCore.Migrations;

namespace Easy.Platform.EfCore.Utils;

public static class PostgresSqlMigrationUtil
{
    public static void DropConstraintIfExists(MigrationBuilder migrationBuilder, string name, string table, bool suppressTransaction = false)
    {
        migrationBuilder.Sql(
            $@"DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = '{name}' AND table_name = '{table}'
                ) THEN
                    EXECUTE 'ALTER TABLE ""{table}"" DROP CONSTRAINT ""{name}""';
                END IF;
            END $$;",
            suppressTransaction);
    }

    public static void DropIndexIfExists(MigrationBuilder migrationBuilder, string indexName, string table, bool suppressTransaction = false)
    {
        migrationBuilder.Sql(
            $@"DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_indexes
                    WHERE indexname = '{indexName}' AND tablename = '{table}'
                ) THEN
                    EXECUTE 'DROP INDEX IF EXISTS ""{indexName}""';
                END IF;
            END $$;",
            suppressTransaction);
    }

    public static void DropColumnIfExists(MigrationBuilder migrationBuilder, string columnName, string table, bool suppressTransaction = false)
    {
        migrationBuilder.Sql(
            $@"DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = '{table}' AND column_name = '{columnName}'
                ) THEN
                    EXECUTE 'ALTER TABLE ""{table}"" DROP COLUMN ""{columnName}""';
                END IF;
            END $$;",
            suppressTransaction);
    }

    /// <summary>
    /// Sanitize strings in an object by removing null characters to fix Postgres SQL errors invalid byte sequence.
    /// </summary>
    public static T SanitizeStrings<T>(T obj)
    {
        foreach (var prop in typeof(T).GetProperties().Where(p => p.PropertyType == typeof(string)))
        {
            var value = (string)prop.GetValue(obj);
            if (value?.Contains('\0') == true) prop.SetValue(obj, value.Replace("\0", ""));
        }

        return obj;
    }
}
