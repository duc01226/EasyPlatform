using AngularDotnetPlatform.Platform.AspNetCore;
using AngularDotnetPlatform.Platform.Common.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;

namespace PlatformExampleApp.TextSnippet.Api
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddControllers().AddJsonOptions(options =>
            {
                PlatformAspNetCoreModule.DefaultJsonSerializerOptionsConfigure(options.JsonSerializerOptions);
            });
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "PlatformExampleApp.TextSnippet.Api", Version = "v1" });
            });

            services.RegisterModule<TextSnippetApiAspNetCoreModule>();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env, TextSnippetApiAspNetCoreModule apiModule)
        {
            if (env.IsDevelopment() || env.EnvironmentName.Contains(Environments.Development))
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "PlatformExampleApp.TextSnippet.Api v1"));
            }

            // Reference middleware orders: https://docs.microsoft.com/en-us/aspnet/core/fundamentals/middleware/?view=aspnetcore-5.0#middleware-order

            apiModule.UseGlobalExceptionHandlerMiddleware(app);
            apiModule.UseRequestIdGeneratorMiddleware(app);

            app.UseRouting();

            /*
             * With endpoint routing, the CORS middleware must be configured to execute between the calls to UseRouting and UseEndpoints.
             * Incorrect configuration will cause the middleware to stop functioning correctly.
             */
            apiModule.UseDefaultCorsPolicy(app);

            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });

            apiModule.Init(app);
        }
    }
}
