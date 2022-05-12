using Easy.Platform.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Easy.Platform.Common.Timing;
using Microsoft.Extensions.Configuration;

namespace PlatformExampleApp.TextSnippet.Api
{
    public class Program
    {
        public static IConfiguration Configuration = PlatformAppSettingsConfigurationBuilder.GetConfigurationBuilder().Build();

        public static void Main(string[] args)
        {
            // Setting clock provider, using utc time
            Clock.SetProvider(new UtcClockProvider());

            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args)
        {
            return Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder => webBuilder
                    .UseStartup<Startup>()
                    .UseConfiguration(Configuration));
        }
    }
}
