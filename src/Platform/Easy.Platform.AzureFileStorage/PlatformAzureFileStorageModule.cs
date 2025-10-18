using Azure.Storage.Blobs;
using Easy.Platform.Infrastructures.FileStorage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Easy.Platform.AzureFileStorage;

/// <summary>
/// Platform module define to register PlatformAzureFileStorageService. <br />
/// Example: <br />
/// <code>
/// public class ExampleServiceAbcAzureBlobFileStorageInfrastructureModule : PlatformAzureFileStorageModule
/// {
///     public ExampleServiceAbcAzureBlobFileStorageInfrastructureModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
///     {
///     }
/// 
///     protected override void FileStorageConfigurationConfigure(
///         IServiceProvider serviceProvider, PlatformAzureFileStorageConfiguration options)
///     {
///         options.ConnectionString = "DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=xxx;EndpointSuffix=core.windows.net";
///         options.BlobEndpoint = "https://xxxxx.blob.core.windows.net/";
///     }
/// }
/// </code>
/// </summary>
public abstract class PlatformAzureFileStorageModule : PlatformFileStorageModule
{
    public PlatformAzureFileStorageModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
    {
    }

    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        serviceCollection.TryAddTransient(sp => new PlatformAzureFileStorageConfiguration().With(c => FileStorageConfigurationConfigure(sp, c)));

        serviceCollection.TryAddSingleton(sp => new BlobServiceClient(sp.GetService<PlatformAzureFileStorageConfiguration>()?.ConnectionString));

        serviceCollection.TryAddSingleton<IPlatformFileStorageService, PlatformAzureFileStorageService>();
    }

    protected abstract void FileStorageConfigurationConfigure(
        IServiceProvider serviceProvider,
        PlatformAzureFileStorageConfiguration configs);

    protected override PlatformFileStorageOptions FileStorageOptionsProvider(IServiceProvider serviceProvider)
    {
        return serviceProvider.GetRequiredService<PlatformAzureFileStorageConfiguration>();
    }
}
