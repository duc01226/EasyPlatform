namespace Easy.Platform.AutomationTest.IntegrationTests;

/// <summary>
/// Abstract base for idempotent test data seeders.
/// Services override <see cref="SeedAsync"/> to add service-specific reference data.
/// Uses FirstOrDefault + create-if-missing pattern to support accumulative test execution.
/// </summary>
public abstract class PlatformIntegrationTestDataSeeder
{
    public abstract Task SeedAsync(IServiceProvider serviceProvider);
}
