using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using NoCeiling.Duc.Interview.Test.Platform.Timing;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Api
{
    public class Program
    {
        public static void Main(string[] args)
        {
            // Setting clock provider, using utc time
            Clock.SetProvider(new UtcClockProvider());

            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args)
        {
            return Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder => webBuilder.UseStartup<Startup>());
        }
    }
}
