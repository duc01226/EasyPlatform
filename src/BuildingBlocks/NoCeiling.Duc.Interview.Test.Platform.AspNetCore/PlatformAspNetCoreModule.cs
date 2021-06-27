using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NoCeiling.Duc.Interview.Test.Platform.AspNetCore.ExceptionHandling;
using NoCeiling.Duc.Interview.Test.Platform.DependencyInjection;

namespace NoCeiling.Duc.Interview.Test.Platform.AspNetCore
{
    public abstract class PlatformAspNetCoreModule : PlatformModule
    {
        public static readonly PlatformAspNetCoreModulePolicies CorsPolicies = new PlatformAspNetCoreModulePolicies();

        public PlatformAspNetCoreModule(IServiceProvider serviceProvider) : base(serviceProvider)
        {
        }

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

        public void UseCors(IApplicationBuilder applicationBuilder)
        {
            var env = ServiceProvider.GetService<IWebHostEnvironment>();
            var corsPolicyName = env.IsDevelopment() ? CorsPolicies.DevelopmentCorsPolicy : CorsPolicies.CorsPolicy;
            applicationBuilder.UseCors(corsPolicyName);
        }

        protected virtual Task InternalInit(IServiceScope serviceScope, IApplicationBuilder app)
        {
            return Task.CompletedTask;
        }

        protected abstract string[] GetAllowCorsOrigins(IConfiguration configuration);

        protected override void InternalRegister(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            base.InternalRegister(serviceCollection, configuration);
            serviceCollection.AddScoped<PlatformExceptionFilter>();
            serviceCollection
                .Configure<MvcOptions>(mvcOptions =>
                {
                    mvcOptions.Filters.AddService(typeof(PlatformExceptionFilter));
                });

            AddCors(serviceCollection, configuration);
        }

        protected virtual void AddCors(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            serviceCollection.AddCors(options => options.AddPolicy(
                CorsPolicies.DevelopmentCorsPolicy,
                builder =>
                    builder.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .WithExposedHeaders(PlatformCommonHttpHeaderNames.RequestId)
                        .SetPreflightMaxAge(TimeSpan.FromDays(1))));

            serviceCollection.AddCors(options => options.AddPolicy(
                CorsPolicies.CorsPolicy,
                builder =>
                    builder.WithOrigins(GetAllowCorsOrigins(configuration))
                        .AllowAnyMethod()
                        .AllowAnyHeader()
                        .WithExposedHeaders(PlatformCommonHttpHeaderNames.RequestId)
                        .SetPreflightMaxAge(TimeSpan.FromDays(1))));
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
