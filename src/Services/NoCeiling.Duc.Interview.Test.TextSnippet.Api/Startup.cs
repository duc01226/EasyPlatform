using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using NoCeiling.Duc.Interview.Test.Platform.DependencyInjection;
using NoCeiling.Duc.Interview.Test.TextSnippet.Application;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Api
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
            services.AddControllers();
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "NoCeiling.Duc.Interview.Test.TextSnippet.Api", Version = "v1" });
            });

            services.RegisterModule<TextSnippetApiAspNetCoreModule>(Configuration);
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env, TextSnippetApiAspNetCoreModule apiModule)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "NoCeiling.Duc.Interview.Test.TextSnippet.Api v1"));
            }

            app.UseRouting();

            app.UseAuthorization();

            /*
             * With endpoint routing, the CORS middleware must be configured to execute between the calls to UseRouting and UseEndpoints.
             * Incorrect configuration will cause the middleware to stop functioning correctly.
             */
            apiModule.UseCors(app);

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });

            apiModule.Init(app);
        }
    }
}
