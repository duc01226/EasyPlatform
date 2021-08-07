using System;
using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.AspNetCore.Constants;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using AngularDotnetPlatform.Platform.AspNetCore.ExceptionHandling;
using AngularDotnetPlatform.Platform.AspNetCore.Middleware;
using AngularDotnetPlatform.Platform.AspNetCore.Middleware.Abstracts;
using AngularDotnetPlatform.Platform.DependencyInjection;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace AngularDotnetPlatform.Platform.AspNetCore
{
    public abstract class PlatformAspNetCoreModule : PlatformModule
    {
        public PlatformAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        public static void DefaultJsonSerializerOptionsConfigure(JsonSerializerOptions options)
        {
            options.PropertyNamingPolicy = PlatformAspNetCoreDefaultJsonSerializerOptions.Value.PropertyNamingPolicy;
        }

        /// <summary>
        /// Auto Register default exception filter. Can set it to false if UseGlobalExceptionHandlerMiddleware has been used.
        /// </summary>
        protected bool AutoRegisterDefaultExceptionFilter { get; init; } = false;

        public void Init(IApplicationBuilder app)
        {
            lock (InitLock)
            {
                if (Initiated)
                    return;

                InitAllModuleDependencies();

                using (var scope = ServiceProvider.CreateScope())
                {
                    InternalInit(scope, app).Wait();
                }

                Initiated = true;
            }
        }

        /// <summary>
        ///  With endpoint routing, the CORS middleware must be configured to execute between the calls to UseRouting and UseEndpoints.
        ///  Incorrect configuration will cause the middleware to stop functioning correctly.
        ///  Use DevelopmentCorsPolicy in dev environment, if not then CorsPolicy will be used
        /// </summary>
        public IApplicationBuilder UseDefaultCorsPolicy(IApplicationBuilder applicationBuilder, string specificCorPolicy = null)
        {
            var env = ServiceProvider.GetService<IWebHostEnvironment>();
            var defaultCorsPolicyName = env.IsDevelopment() ? PlatformAspNetCoreModuleDefaultPolicies.DevelopmentCorsPolicy : PlatformAspNetCoreModuleDefaultPolicies.CorsPolicy;
            applicationBuilder.UseCors(specificCorPolicy ?? defaultCorsPolicyName);

            return applicationBuilder;
        }

        /// <summary>
        /// Use a specific middleware by middle class type
        /// </summary>
        public IApplicationBuilder UseMiddleware<TMiddleware>(IApplicationBuilder applicationBuilder) where TMiddleware : PlatformMiddleware
        {
            return applicationBuilder.UseMiddleware<TMiddleware>();
        }

        /// <summary>
        /// This middleware will add a generated guid request id in to headers. It should be added at the first middleware or second after UseGlobalExceptionHandlerMiddleware
        /// </summary>
        public IApplicationBuilder UseRequestIdGeneratorMiddleware(IApplicationBuilder applicationBuilder)
        {
            return UseMiddleware<PlatformRequestIdGeneratorMiddleware>(applicationBuilder);
        }

        /// <summary>
        /// This middleware should be used it at the first level to catch exception from any next middleware.
        /// PlatformGlobalExceptionHandlerMiddleware will be used.
        /// </summary>
        public IApplicationBuilder UseGlobalExceptionHandlerMiddleware(IApplicationBuilder applicationBuilder)
        {
            return UseMiddleware<PlatformGlobalExceptionHandlerMiddleware>(applicationBuilder);
        }

        protected virtual Task InternalInit(IServiceScope serviceScope, IApplicationBuilder app)
        {
            return Task.CompletedTask;
        }

        protected abstract string[] GetAllowCorsOrigins(IConfiguration configuration);

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);

            if (AutoRegisterDefaultExceptionFilter)
                RegisterDefaultExceptionFilter(serviceCollection);

            AddDefaultCorsPolicy(serviceCollection);
        }

        /// <summary>
        /// Register and config Exception Filters. Default is using PlatformExceptionFilter.
        /// </summary>
        protected virtual void RegisterDefaultExceptionFilter(IServiceCollection serviceCollection)
        {
            serviceCollection.AddScoped<PlatformExceptionFilter>();
            serviceCollection
                .Configure<MvcOptions>(mvcOptions => mvcOptions.Filters.AddService(typeof(PlatformExceptionFilter)));
        }

        protected virtual void AddDefaultCorsPolicy(IServiceCollection serviceCollection)
        {
            serviceCollection.AddCors(options => options.AddPolicy(
                PlatformAspNetCoreModuleDefaultPolicies.DevelopmentCorsPolicy,
                builder =>
                    builder.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .WithExposedHeaders(PlatformAspnetConstant.CommonHttpHeaderNames.RequestId)
                        .SetPreflightMaxAge(DefaultCorsPolicyPreflightMaxAge())));

            serviceCollection.AddCors(options => options.AddPolicy(
                PlatformAspNetCoreModuleDefaultPolicies.CorsPolicy,
                builder =>
                    builder.WithOrigins(GetAllowCorsOrigins(Configuration))
                        .SetIsOriginAllowedToAllowWildcardSubdomains()
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials()
                        .WithExposedHeaders(PlatformAspnetConstant.CommonHttpHeaderNames.RequestId)
                        .SetPreflightMaxAge(DefaultCorsPolicyPreflightMaxAge())));
        }

        /// <summary>
        /// DefaultCorsPolicyPreflightMaxAge for AddDefaultCorsPolicy and UseDefaultCorsPolicy. Default is 1 day.
        /// </summary>
        protected virtual TimeSpan DefaultCorsPolicyPreflightMaxAge()
        {
            return TimeSpan.FromDays(1);
        }

        /// <summary>
        /// Hide base Init to allow use new init only
        /// </summary>
        private new void Init() { }

        /// <summary>
        /// Hide base InternalInit to allow use new InternalInit only
        /// </summary>
        private new Task InternalInit(IServiceScope serviceScope)
        {
            return Task.CompletedTask;
        }
    }
}
