#region

using Easy.Platform.Common;
using Xunit;

#endregion

namespace Easy.Platform.AutomationTest.IntegrationTests;

/// <summary>
/// Abstract base for cross-service integration test fixtures that compose multiple
/// <see cref="PlatformServiceIntegrationTestFixture{TServiceModule}"/> instances.
/// Each composed fixture boots its own service module independently.
///
/// <para>
/// <strong>Usage:</strong>
/// </para>
/// <code>
/// public class MyCrossServiceFixture : PlatformCrossServiceFixture
/// {
///     protected override IReadOnlyList&lt;Type&gt; GetFixtureTypes()
///         =&gt; [typeof(AccountsFixture), typeof(GrowthFixture)];
///
///     public IServiceProvider AccountsServiceProvider
///         =&gt; GetFixture&lt;AccountsFixture&gt;().ServiceProvider;
///
///     public IServiceProvider GrowthServiceProvider
///         =&gt; GetFixture&lt;GrowthFixture&gt;().ServiceProvider;
/// }
///
/// [CollectionDefinition("Cross-Service")]
/// public class CrossServiceCollection : ICollectionFixture&lt;MyCrossServiceFixture&gt; { }
/// </code>
///
/// <para>
/// <strong>Initialization Order:</strong>
/// Fixtures are initialized sequentially in the order returned by <see cref="GetFixtureTypes"/>.
/// Place foundational services (e.g., Accounts) before dependent services (e.g., Growth)
/// to ensure seed data is available.
/// </para>
/// </summary>
public abstract class PlatformCrossServiceFixture : IAsyncLifetime, IDisposable
{
    private readonly Dictionary<Type, object> fixtures = [];
    private bool disposed;

    protected PlatformCrossServiceFixture()
    {
        foreach (var fixtureType in GetFixtureTypes())
        {
            if (!IsPlatformServiceFixture(fixtureType))
                throw new ArgumentException(
                    $"{fixtureType.Name} must extend PlatformServiceIntegrationTestFixture<TModule>.",
                    nameof(fixtureType));

            var instance = Activator.CreateInstance(fixtureType)
                           ?? throw new InvalidOperationException(
                               $"Failed to instantiate {fixtureType.Name}. Ensure it has a parameterless constructor.");

            fixtures[fixtureType] = instance;
        }
    }

    /// <summary>
    /// Return the fixture types to compose. Each must extend
    /// <see cref="PlatformServiceIntegrationTestFixture{TServiceModule}"/>.
    /// Order matters: fixtures are initialized sequentially in the returned order.
    /// </summary>
    protected abstract IReadOnlyList<Type> GetFixtureTypes();

    /// <summary>
    /// Get a composed fixture by its concrete type.
    /// Returns the typed fixture instance, enabling access to <c>.ServiceProvider</c>,
    /// <c>.Configuration</c>, and any service-specific properties.
    /// </summary>
    public TFixture GetFixture<TFixture>() where TFixture : class
    {
        if (fixtures.TryGetValue(typeof(TFixture), out var fixture))
            return (TFixture)fixture;

        throw new InvalidOperationException(
            $"Fixture {typeof(TFixture).Name} not registered. " +
            $"Add it to GetFixtureTypes(). Registered: [{string.Join(", ", fixtures.Keys.Select(t => t.Name))}]");
    }

    /// <summary>
    /// Shortcut: get the service provider for a specific module type.
    /// The module must have been booted by one of the composed fixtures.
    /// </summary>
    public static IServiceProvider GetServiceProvider<TModule>() where TModule : PlatformModule
        => PlatformServiceIntegrationTestBase<TModule>.ServiceProvider;

    /// <summary>
    /// Initializes all composed fixtures sequentially (seeds data in order).
    /// </summary>
    public virtual async Task InitializeAsync()
    {
        foreach (var fixture in fixtures.Values.OfType<IAsyncLifetime>())
            await fixture.InitializeAsync();
    }

    public virtual Task DisposeAsync() => Task.CompletedTask;

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!disposed && disposing)
        {
            // Dispose in reverse order (dependent services first)
            foreach (var fixture in fixtures.Values.Reverse().OfType<IDisposable>())
                fixture.Dispose();

            disposed = true;
        }
    }

    private static bool IsPlatformServiceFixture(Type type)
    {
        var current = type;
        while (current != null)
        {
            if (current.IsGenericType &&
                current.GetGenericTypeDefinition() == typeof(PlatformServiceIntegrationTestFixture<>))
                return true;

            current = current.BaseType;
        }

        return false;
    }
}
