#region

using System.IO;
using Easy.Platform.AutomationTest.Extensions.DependencyInjection;
using Easy.Platform.AutomationTest.TestCases;
using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using OpenQA.Selenium;

#endregion

namespace Easy.Platform.AutomationTest;

public abstract class BaseStartup
{
    public const string DefaultAutomationTestSettingsConfigurationSection = "AutomationTestSettings";

    public static readonly Lazy<IServiceProvider> GlobalLazyDiServiceProvider = new(valueFactory: () => GlobalDiServices!.BuildServiceProvider());
    public static IServiceProvider GlobalDiServiceProvider => GlobalLazyDiServiceProvider.Value;
    public static IServiceCollection GlobalDiServices { get; private set; } = new ServiceCollection();

    public IServiceCollection Services { get; private set; } = new ServiceCollection();
    public static IConfiguration Configuration => GlobalDiServiceProvider.GetRequiredService<IConfiguration>();

    /// <summary>
    /// Populate all startup services might created from host builder, return ServiceCollection contain all services generated from the start-up
    /// configuration for host builder.
    /// </summary>
    /// <typeparam name="TStartUp"></typeparam>
    /// <param name="startupFactory"></param>
    /// <returns></returns>
    public static IServiceCollection SpecFlowConfigureServices<TStartUp>(Func<TStartUp> startupFactory)
        where TStartUp : BaseStartup
    {
        var hostBuilder = new HostBuilder();
        var startUp = startupFactory();

        startUp.ConfigureHostConfiguration(hostBuilder);
        hostBuilder.ConfigureServices(services => startUp.ConfigureServices(services));
        hostBuilder.ConfigureServices(services => services.Register<IPlatformRootServiceProvider>(sp => new PlatformRootServiceProvider(sp, services), ServiceLifeTime.Singleton));

        // Populate ServiceCollection to ExposeServiceCollectionFactory through UseServiceProviderFactory
        // and hostBuilder.Build() => trigger CreateBuilder => expose ServiceCollection
        var factory = new ExposeServiceCollectionFactory();
        hostBuilder.UseServiceProviderFactory(factory);
        hostBuilder.Build();

        startUp.Services = factory.ServiceCollection;
        GlobalDiServices = factory.ServiceCollection;

        return factory.ServiceCollection;
    }

    public virtual void ConfigureHost(IHostBuilder hostBuilder)
    {
        ConfigureHostConfiguration(hostBuilder);
    }

    public virtual void ConfigureServices(IServiceCollection services)
    {
        services.AddTransient(
            serviceType: typeof(IWebDriverManager),
            implementationFactory: sp =>
                new WebDriverManager(settings: sp.GetRequiredService<AutomationTestSettings>()).With(p => p.ConfigWebDriverOptions = ConfigWebDriverOptions)
        );

        services.AddTransient(serviceType: typeof(AutomationTestSettings), AutomationTestSettingsProvider);

        services.AddScoped<IScopedLazyWebDriver, LazyWebDriver>();
        services.AddSingleton<ISingletonLazyWebDriver, LazyWebDriver>();
        services.RegisterAllSelfImplementationFromType(conventionalType: typeof(IBddStepsContext), GetType().Assembly, ServiceLifeTime.Scoped);

        // Register IWebHostEnvironment for integration tests that require ASP.NET Core hosting environment
        ConfigureWebHostEnvironment(services);

        Services = services;
        GlobalDiServices = services;
    }

    /// <summary>
    /// Optional override to config WebDriverManager DriverOptions
    /// </summary>
    public virtual void ConfigWebDriverOptions(IOptions options) { }

    /// <summary>
    /// Default register AutomationTestSettings via IConfiguration first level binding using section key <see cref="DefaultAutomationTestSettingsConfigurationSection" />. Override this to custom
    /// </summary>
    public virtual AutomationTestSettings AutomationTestSettingsProvider(IServiceProvider sp)
    {
        return sp.GetRequiredService<IConfiguration>().GetSection(DefaultAutomationTestSettingsConfigurationSection).Get<AutomationTestSettings>()!;
    }

    public virtual void ConfigureHostConfiguration(IHostBuilder hostBuilder)
    {
        hostBuilder.ConfigureHostConfiguration(configureDelegate: builder => builder.AddConfiguration(config: PlatformConfigurationBuilder.GetConfigurationBuilder().Build()));
    }

    /// <summary>
    /// Configures IWebHostEnvironment for integration tests. Override to customize the hosting environment.
    /// </summary>
    protected virtual void ConfigureWebHostEnvironment(IServiceCollection services)
    {
        services.AddSingleton<IWebHostEnvironment>(
            _ => PlatformTestWebHostEnvironment.Create(GetApplicationName(), GetEnvironmentName(), GetContentRootPath(), GetWebRootPath()));
    }

    /// <summary>
    /// Gets the application name for the hosting environment. Defaults to the calling assembly name.
    /// Override to provide a custom application name.
    /// </summary>
    protected virtual string GetApplicationName()
    {
        return GetType().Assembly.GetName().Name ?? "PlatformIntegrationTest";
    }

    /// <summary>
    /// Gets the environment name for the hosting environment. Defaults to "Test".
    /// Override to provide a custom environment name (e.g., "Development", "Integration", "SystemTest").
    /// </summary>
    protected virtual string GetEnvironmentName()
    {
        return PlatformEnvironment.AspCoreEnvironmentValue ?? FallbackAspCoreEnvironmentValue();
    }

    protected virtual string FallbackAspCoreEnvironmentValue()
    {
        return "Development";
    }

    /// <summary>
    /// Gets the content root path for the hosting environment. Defaults to current directory.
    /// Override to provide a custom content root path.
    /// </summary>
    protected virtual string GetContentRootPath()
    {
        return Directory.GetCurrentDirectory();
    }

    /// <summary>
    /// Gets the web root path for the hosting environment. Defaults to wwwroot under content root.
    /// Override to provide a custom web root path.
    /// </summary>
    protected virtual string GetWebRootPath()
    {
        return Path.Combine(GetContentRootPath(), "wwwroot");
    }
}
