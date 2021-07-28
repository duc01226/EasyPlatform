using System;
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
        public static readonly PlatformAspNetCoreModulePolicies CorsPolicies = new PlatformAspNetCoreModulePolicies();

        public PlatformAspNetCoreModule(IServiceProvider serviceProvider) : base(serviceProvider)
        {
        }

        /// <summary>
        /// Auto Register default exception filter. Can set it to false if UseGlobalExceptionHandlerMiddleware has been used.
        /// </summary>
        protected bool AutoRegisterDefaultExceptionFilter { get; init; } = true;

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
        /// <param name="applicationBuilder"></param>
        public IApplicationBuilder UseDefaultCorsPolicy(IApplicationBuilder applicationBuilder)
        {
            var env = ServiceProvider.GetService<IWebHostEnvironment>();
            var corsPolicyName = env.IsDevelopment() ? CorsPolicies.DevelopmentCorsPolicy : CorsPolicies.CorsPolicy;
            applicationBuilder.UseCors(corsPolicyName);

            return applicationBuilder;
        }

        /// <summary>
        /// Use a specific middleware by middle class type
        /// </summary>
        public IApplicationBuilder UseMiddleware<TMiddleware>(IApplicationBuilder applicationBuilder) where TMiddleware : PlatformMiddleware
        {
            return applicationBuilder.UseMiddleware<PlatformRequestIdGeneratorMiddleware>();
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

        protected override void InternalRegister(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            base.InternalRegister(serviceCollection, configuration);

            if (AutoRegisterDefaultExceptionFilter)
                RegisterDefaultExceptionFilter(serviceCollection);

            AddDefaultCorsPolicy(serviceCollection, configuration);
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

        protected virtual void AddDefaultCorsPolicy(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            serviceCollection.AddCors(options => options.AddPolicy(
                CorsPolicies.DevelopmentCorsPolicy,
                builder =>
                    builder.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .WithExposedHeaders(PlatformAspnetConstant.CommonHttpHeaderNames.RequestId)
                        .SetPreflightMaxAge(DefaultCorsPolicyPreflightMaxAge(configuration))));

            serviceCollection.AddCors(options => options.AddPolicy(
                CorsPolicies.CorsPolicy,
                builder =>
                    builder.WithOrigins(GetAllowCorsOrigins(configuration))
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .AllowCredentials()
                        .WithExposedHeaders(PlatformAspnetConstant.CommonHttpHeaderNames.RequestId)
                        .SetPreflightMaxAge(DefaultCorsPolicyPreflightMaxAge(configuration))));
        }

        /// <summary>
        /// DefaultCorsPolicyPreflightMaxAge for AddDefaultCorsPolicy and UseDefaultCorsPolicy. Default is 1 day.
        /// </summary>
        protected virtual TimeSpan DefaultCorsPolicyPreflightMaxAge(IConfiguration configuration)
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
