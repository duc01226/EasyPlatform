using System.Diagnostics.CodeAnalysis;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using OpenQA.Selenium;
using SolidToken.SpecFlow.DependencyInjection;

namespace PlatformExampleApp.Test.BDD;

/*
 * Note: Use <EnableXunitDependencyInjectionDefaultTestFrameworkAttribute>false</EnableXunitDependencyInjectionDefaultTestFrameworkAttribute> in csproj
 * https://github.com/pengweiqhca/Xunit.DependencyInjection/issues/26 . We use our own startup file
 */
internal sealed class Startup : BaseStartup
{
    [ScenarioDependencies]
    public static IServiceCollection SpecFlowConfigureServices()
    {
        return SpecFlowConfigureServices(() => new Startup());
    }

    // Uncomment this code, change the example "fallbackAspCoreEnv: "Development.Docker"" to the specific environment to run test in visual studio
    // Because when you click run in visual studio, ASPNETCORE_ENVIRONMENT is missing which
    // will fallback to fallbackAspCoreEnv value
    public override void ConfigureHostConfiguration(IHostBuilder hostBuilder)
    {
        hostBuilder.ConfigureHostConfiguration(
            configureDelegate: builder => builder.AddConfiguration(
                config: PlatformConfigurationBuilder.GetConfigurationBuilder(fallbackAspCoreEnv: "Development").Build()));
    }

    // ReSharper disable once RedundantOverriddenMember
    [SuppressMessage(
        category: "Minor Code Smell",
        checkId: "S1185:Overriding members should do more than simply call the same member in the base class",
        Justification = "<Pending>")]
    public override void ConfigureServices(IServiceCollection services)
    {
        base.ConfigureServices(services);

        //// Example you could define class extend from AutomationTestSettings to auto register custom Settings for your app
        //// It will be auto registered via IConfiguration by default or you could override AutomationTestSettingsProvider to register
        //// by yourself
        services.Register(
            typeof(TextSnippetAutomationTestSettings),
            sp => sp.GetRequiredService<IConfiguration>().GetSection(DefaultAutomationTestSettingsConfigurationSection).Get<TextSnippetAutomationTestSettings>()!);
    }

    // Optional override to config WebDriverManager DriverOptions
    public override void ConfigWebDriverOptions(IOptions options)
    {
        options.Timeouts().PageLoad = 1.Minutes();
    }

    // Default register AutomationTestSettings via IConfiguration first level binding. Override this to custom.
    // By default it will binding from configuration root level
    //public override AutomationTestSettings AutomationTestSettingsProvider(IServiceProvider sp)
    //{
    //    return sp.GetRequiredService<IConfiguration>().GetSection(DefaultAutomationTestSettingsConfigurationSection).Get<AutomationTestSettings>()!;
    //}
}

// Example you could define class extend from AutomationTestSettings to auto register custom Settings for your app
// It will be auto registered via IConfiguration by default or you could override AutomationTestSettingsProvider to register
// by yourself
public class TextSnippetAutomationTestSettings : AutomationTestSettings
{
    public bool? RandomTestShortWaitingFailed { get; set; }
}
