using Easy.Platform.AspNetCore;
using Easy.Platform.AzureFileStorage;
using Easy.Platform.FirebasePushNotification;
using Easy.Platform.Infrastructures.PushNotification;
using Easy.Platform.MongoDB;
using Easy.Platform.RabbitMQ;
using Easy.Platform.RedisCache;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Smallest legal concrete implementations of the abstract PROVIDER modules.
/// <para>
/// Each provider base leaves exactly one thing to the host: the connection or credential factory that
/// only the host can know. These doubles supply a placeholder for that single member and override nothing
/// else, so any behavior a test observes belongs to the provider base rather than to the double. None of
/// them ever opens a connection — construction is inert by design, which is the property the lifecycle
/// tests rely on.
/// </para>
/// </summary>
public class ConcreteTestAspNetCoreModule : PlatformAspNetCoreModule
{
    public ConcreteTestAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    protected override string[] GetAllowCorsOrigins(IConfiguration configuration) => ["https://localhost"];
}

/// <summary>Derives from a non-abstract ASP.NET Core module, to prove the narrowed assembly scan still holds.</summary>
public class DerivedFromConcreteTestAspNetCoreModule : ConcreteTestAspNetCoreModule
{
    public DerivedFromConcreteTestAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }
}

public class ConcreteTestRabbitMqMessageBusModule : PlatformRabbitMqMessageBusModule
{
    public ConcreteTestRabbitMqMessageBusModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    protected override PlatformRabbitMqOptions RabbitMqOptionsFactory(IServiceProvider serviceProvider) => new();
}

public class ConcreteTestRedisCacheModule : PlatformRedisCacheModule
{
    public ConcreteTestRedisCacheModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    protected override void SetupRedisCacheOptions(RedisCacheOptions options)
    {
        options.Configuration = "localhost:6379";
    }
}

public class ConcreteTestAzureFileStorageModule : PlatformAzureFileStorageModule
{
    public ConcreteTestAzureFileStorageModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    protected override void FileStorageConfigurationConfigure(IServiceProvider serviceProvider, PlatformAzureFileStorageConfiguration configs)
    {
        configs.ConnectionString = "UseDevelopmentStorage=true";
    }
}

public class ConcreteTestFireBasePushNotificationModule : FireBasePushNotificationPlatformModule
{
    public ConcreteTestFireBasePushNotificationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration) { }

    protected override FireBasePushNotificationSettings FireBasePushNotificationSettingsProvider(IServiceProvider serviceProvider) => new();
}

/// <summary>
/// NEVER instantiated. Exists solely to close <see cref="PlatformMongoDbPersistenceModule{TDbContext,TClientContext,TMongoOptions}" />'s
/// open generic type parameters via reflection (<c>Type.MakeGenericType</c>), so a unit test can read the
/// closed type's static members without opening a real Mongo connection or standing up a working DbContext.
/// Remains <c>abstract</c> so it need not implement <see cref="PlatformMongoDbContext{TDbContext}.InternalEnsureIndexesAsync" />.
/// </summary>
public abstract class TestMongoDbContextDouble : PlatformMongoDbContext<TestMongoDbContextDouble>
{
    // Never called — this type is only ever passed to MakeGenericType, never `new`'d, so the base
    // constructor's arguments are irrelevant.
    protected TestMongoDbContextDouble()
        : base(null!, null!, null!, null!, null!, null!) { }
}

/// <summary>NEVER instantiated — see <see cref="TestMongoDbContextDouble" />.</summary>
public sealed class TestMongoClientDouble : IPlatformMongoClient<TestMongoDbContextDouble>
{
    public MongoClient MongoClient =>
        throw new NotSupportedException($"{nameof(TestMongoClientDouble)} exists only to close a generic type for reflection and must never be constructed.");
}
