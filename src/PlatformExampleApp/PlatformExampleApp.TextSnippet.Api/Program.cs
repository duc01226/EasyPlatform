using Easy.Platform.AspNetCore;
using Easy.Platform.Common.Timing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace PlatformExampleApp.TextSnippet.Api;

public class Program
{
    public static readonly IConfiguration Configuration =
        PlatformAppSettingsConfigurationBuilder.GetConfigurationBuilder().Build();

    public static void Main(string[] args)
    {
        // Setting clock provider, using utc time
        Clock.SetProvider(new UtcClockProvider());

        CreateHostBuilder(args).Build().Run();
    }

    public static IHostBuilder CreateHostBuilder(string[] args)
    {
        return Host.CreateDefaultBuilder(args)
            .ConfigureWebHostDefaults(
                webBuilder => webBuilder
                    .UseStartup<Startup>()
                    .UseConfiguration(Configuration));
    }
}
