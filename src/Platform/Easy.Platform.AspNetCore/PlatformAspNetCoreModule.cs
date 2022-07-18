using System.Text.Json;
using Easy.Platform.Application;
using Easy.Platform.Application.Context.UserContext;
using Easy.Platform.AspNetCore.Constants;
using Easy.Platform.AspNetCore.Context.UserContext;
using Easy.Platform.AspNetCore.Context.UserContext.UserContextKeyToClaimTypeMapper;
using Easy.Platform.AspNetCore.Context.UserContext.UserContextKeyToClaimTypeMapper.Abstract;
using Easy.Platform.AspNetCore.ExceptionHandling;
using Easy.Platform.AspNetCore.Middleware;
using Easy.Platform.AspNetCore.Middleware.Abstracts;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Easy.Platform.AspNetCore
{
    public abstract class PlatformAspNetCoreModule : PlatformModule
    {
        public PlatformAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(
            serviceProvider,
            configuration)
        {
        }

        /// <summary>
        /// Auto Register default exception filter. Can set it to false if UseGlobalExceptionHandlerMiddleware has been used.
        /// </summary>
        protected bool AutoRegisterDefaultExceptionFilter { get; init; } = false;

        public static void DefaultJsonSerializerOptionsConfigure(JsonSerializerOptions options)
        {
            options.PropertyNamingPolicy = PlatformJsonSerializer.CurrentOptions.Value.PropertyNamingPolicy;
        }

        public override void Init()
        {
            lock (InitLock)
            {
                if (Initiated)
                    return;

                InitAllModuleDependencies();

                using (var scope = ServiceProvider.CreateScope())
                {
                    RunApplicationSeedData(scope);

                    InternalInit(scope).Wait();
                }

                Initiated = true;
            }
        }

        /// <summary>
        ///  With endpoint routing, the CORS middleware must be configured to execute between the calls to UseRouting and UseEndpoints.
        ///  Incorrect configuration will cause the middleware to stop functioning correctly.
        ///  Use <see cref="PlatformAspNetCoreModuleDefaultPolicies.DevelopmentCorsPolicy"/> in dev environment,
        ///  if not then <see cref="PlatformAspNetCoreModuleDefaultPolicies.CorsPolicy"/> will be used
        /// </summary>
        public IApplicationBuilder UseDefaultCorsPolicy(
            IApplicationBuilder applicationBuilder,
            string specificCorPolicy = null)
        {
            var env = ServiceProvider.GetService<IWebHostEnvironment>();
            var defaultCorsPolicyName = env.IsDevelopment()
                ? PlatformAspNetCoreModuleDefaultPolicies.DevelopmentCorsPolicy
                : PlatformAspNetCoreModuleDefaultPolicies.CorsPolicy;
            applicationBuilder.UseCors(specificCorPolicy ?? defaultCorsPolicyName);

            return applicationBuilder;
        }

        /// <summary>
        /// Use a specific middleware by middle class type
        /// </summary>
        public IApplicationBuilder UseMiddleware<TMiddleware>(IApplicationBuilder applicationBuilder)
            where TMiddleware : PlatformMiddleware
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
        /// <see cref="PlatformGlobalExceptionHandlerMiddleware"/> will be used.
        /// </summary>
        public IApplicationBuilder UseGlobalExceptionHandlerMiddleware(IApplicationBuilder applicationBuilder)
        {
            return UseMiddleware<PlatformGlobalExceptionHandlerMiddleware>(applicationBuilder);
        }

        protected abstract string[] GetAllowCorsOrigins(IConfiguration configuration);

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);

            if (AutoRegisterDefaultExceptionFilter)
                RegisterDefaultExceptionFilter(serviceCollection);

            RegisterUserContext(serviceCollection);

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
            serviceCollection.AddCors(
                options => options.AddPolicy(
                    PlatformAspNetCoreModuleDefaultPolicies.DevelopmentCorsPolicy,
                    builder =>
                        builder.AllowAnyOrigin()
                            .AllowAnyMethod()
                            .AllowAnyHeader()
                            .WithExposedHeaders(DefaultCorsPolicyExposedHeaders())
                            .SetPreflightMaxAge(DefaultCorsPolicyPreflightMaxAge())));

            serviceCollection.AddCors(
                options => options.AddPolicy(
                    PlatformAspNetCoreModuleDefaultPolicies.CorsPolicy,
                    builder =>
                        builder.WithOrigins(GetAllowCorsOrigins(Configuration))
                            .SetIsOriginAllowedToAllowWildcardSubdomains()
                            .AllowAnyMethod()
                            .AllowAnyHeader()
                            .AllowCredentials()
                            .WithExposedHeaders(DefaultCorsPolicyExposedHeaders())
                            .SetPreflightMaxAge(DefaultCorsPolicyPreflightMaxAge())));
        }

        /// <summary>
        /// Used to override WithExposedHeaders for Cors. Default has <see cref="PlatformAspnetConstant.CommonHttpHeaderNames.RequestId"/>
        /// </summary>
        protected virtual string[] DefaultCorsPolicyExposedHeaders()
        {
            return new string[]
            {
                PlatformAspnetConstant.CommonHttpHeaderNames.RequestId
            };
        }

        /// <summary>
        /// DefaultCorsPolicyPreflightMaxAge for AddDefaultCorsPolicy and UseDefaultCorsPolicy. Default is 1 day.
        /// </summary>
        protected virtual TimeSpan DefaultCorsPolicyPreflightMaxAge()
        {
            return TimeSpan.FromDays(1);
        }

        protected void RegisterUserContext(IServiceCollection serviceCollection)
        {
            serviceCollection.AddHttpContextAccessor();
            serviceCollection.Register(
                typeof(IPlatformApplicationUserContextAccessor),
                typeof(PlatformAspNetApplicationUserContextAccessor),
                ServiceLifeTime.Singleton,
                replaceIfExist: true,
                ServiceCollectionExtension.ReplaceServiceStrategy.ByService);

            RegisterUserContextKeyToClaimTypeMapper(serviceCollection);
        }

        /// <summary>
        /// This function is used to register implementation for <see cref="IPlatformApplicationUserContextKeyToClaimTypeMapper"/>
        /// Default implementation is <see cref="PlatformApplicationUserContextKeyToJwtClaimTypeMapper"/>
        /// </summary>
        /// <returns></returns>
        protected virtual Type UserContextKeyToClaimTypeMapperType()
        {
            return typeof(PlatformApplicationUserContextKeyToJwtClaimTypeMapper);
        }

        private void RegisterUserContextKeyToClaimTypeMapper(IServiceCollection serviceCollection)
        {
            serviceCollection.Register(
                typeof(IPlatformApplicationUserContextKeyToClaimTypeMapper),
                UserContextKeyToClaimTypeMapperType(),
                ServiceLifeTime.Transient);
        }

        private void RunApplicationSeedData(IServiceScope scope)
        {
            var applicationModuleType = GetModuleTypeDependencies()
                .Select(p => p.Invoke(Configuration))
                .FirstOrDefault(p => p.IsAssignableTo(typeof(PlatformApplicationModule)));

            if (applicationModuleType != null)
            {
                var applicationModule =
                    (PlatformApplicationModule)scope.ServiceProvider.GetService(applicationModuleType);
                applicationModule?.SeedData(scope).Wait();
            }
        }
    }
}
