using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Dtos;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Validators;
using MediatR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform
{
    public abstract class PlatformModule
    {
        protected readonly object RegisterLock = new object();
        protected readonly object InitLock = new object();

        public PlatformModule(IServiceProvider serviceProvider, IConfiguration configuration)
        {
            ServiceProvider = serviceProvider;
            Configuration = configuration;
            Logger = serviceProvider?.GetService<ILoggerFactory>().CreateLogger(GetType());
        }

        public IServiceProvider ServiceProvider { get; }
        public IConfiguration Configuration { get; }

        public Assembly Assembly => GetType().Assembly;

        public bool RegisterServicesExecuted { get; protected set; }

        public bool Initiated { get; protected set; }

        protected List<Type> AdditionalModuleTypeDependencies { get; set; } = new List<Type>();

        protected ILogger Logger { get; init; }

        /// <summary>
        /// Override this to call every time a new platform module is registered
        /// </summary>
        public virtual void OnNewPlatformModuleRegistered(IServiceCollection serviceCollection, PlatformModule newModule) { }

        public void RegisterRuntimeModuleDependencies<TModule>(
            IServiceCollection serviceCollection) where TModule : PlatformModule
        {
            serviceCollection.RegisterModule<TModule>();

            if (!AdditionalModuleTypeDependencies.Contains(typeof(TModule)))
                AdditionalModuleTypeDependencies.Add(typeof(TModule));
        }

        public void RegisterServices(IServiceCollection serviceCollection)
        {
            lock (RegisterLock)
            {
                if (RegisterServicesExecuted)
                    return;

                RegisterAllModuleDependencies(serviceCollection);
                RegisterDefaultLogs(serviceCollection);
                RegisterCqrs(serviceCollection);

                InternalRegister(serviceCollection);
                RegisterServicesExecuted = true;

                if (JsonSerializerCurrentOptions() != null)
                    PlatformJsonSerializer.SetCurrentOptions(JsonSerializerCurrentOptions());
            }
        }

        public virtual void Init()
        {
            lock (InitLock)
            {
                if (Initiated)
                    return;

                EnsurePlatformImplementationValid();
                InitAllModuleDependencies();

                using (var scope = ServiceProvider.CreateScope())
                {
                    InternalInit(scope).Wait();
                }

                Initiated = true;
            }
        }

        protected virtual void InternalRegister(IServiceCollection serviceCollection) { }

        protected virtual Task InternalInit(IServiceScope serviceScope)
        {
            return Task.CompletedTask;
        }

        /// <summary>
        /// Define list of any modules that this module depend on. The type must be assigned to <see cref="PlatformModule"/>.
        /// Example from a XXXServiceAspNetCoreModule could depend on XXXPlatformApplicationModule and XXXPlatformPersistenceModule.
        /// Example code : return new { config => typeof(XXXPlatformApplicationModule), config => typeof(XXXPlatformPersistenceModule) };
        /// </summary>
        protected virtual List<Func<IConfiguration, Type>> GetModuleTypeDependencies()
        {
            return new List<Func<IConfiguration, Type>>();
        }

        /// <summary>
        /// Override this function provider to register <see cref="PlatformCqrsPipelineMiddleware{TRequest,TResponse}"/>.
        /// Default is a empty list. The PlatformCqrsPipelineMiddleware is executed in same orders of the return list.
        /// </summary>
        /// <summary>
        /// Define list of <see cref="PlatformCqrsPipelineMiddleware{TRequest,TResponse}"/> to register. The type must be assigned to <see cref="PlatformCqrsPipelineMiddleware{TRequest,TResponse}"/>.
        /// Default is a empty list. The PlatformCqrsPipelineMiddleware is executed in same orders of the return list.
        /// <br/>
        /// Example that before any command/query is handled, XXXCqrsPipelineMiddleware then YYYCqrsPipelineMiddleware need to capture it first, then:
        /// Example code : return new { typeof(XXXCqrsPipelineMiddleware), typeof(YYYCqrsPipelineMiddleware) };
        /// </summary>
        protected virtual List<Type> CqrsPipelinesProvider()
        {
            return new List<Type>();
        }

        /// <summary>
        /// Override this to setup custom value for <see cref="PlatformJsonSerializer.CurrentOptions"/>
        /// </summary>
        /// <returns></returns>
        protected virtual JsonSerializerOptions JsonSerializerCurrentOptions()
        {
            return null;
        }

        protected void EnsurePlatformImplementationValid()
        {
            EnsurePlatformDtosValid();
        }

        protected void EnsurePlatformDtosValid()
        {
            // Validate all IPlatformDto must have parameter less constructor so that it could be Deserialize from json string object.
            var missingParameterLessConstructorDtos = Assembly.GetTypes()
                .Where(p => p.IsAssignableTo(typeof(IPlatformDto)) && !p.IsAbstract && p.GetConstructor(Type.EmptyTypes) == null)
                .ToList();
            if (missingParameterLessConstructorDtos.Any())
            {
                throw new Exception(
                    $"Developer Error. " +
                    $"All implementation of IPlatformDto must have parameter less constructor. " +
                    $"Invalid Types: {string.Join(", ", missingParameterLessConstructorDtos.Select(p => p.FullName))}");
            }
        }

        protected void InitAllModuleDependencies()
        {
            GetModuleTypeDependencies()
                .Select(moduleTypeProvider => moduleTypeProvider(Configuration))
                .Concat(AdditionalModuleTypeDependencies)
                .ToList()
                .ForEach(moduleType =>
                {
                    var dependModule = ServiceProvider.GetService(moduleType);
                    if (dependModule == null)
                        throw new Exception($"Module {GetType().Name} depend on {moduleType.Name} but Module {moduleType.Name} is not registered");
                    if (dependModule is PlatformModule typedPlatformModule)
                    {
                        typedPlatformModule.Init();
                    }
                    else
                    {
                        throw new Exception(
                            $"Module {GetType().Name} depend on {moduleType.Name} but Module {moduleType.Name} is not inherit from PlatformModule");
                    }
                });
        }

        private void RegisterDefaultLogs(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterIfServiceNotExist(typeof(ILoggerFactory), typeof(LoggerFactory), ServiceLifeTime.Transient);
            serviceCollection.RegisterIfServiceNotExist(typeof(ILogger<>), typeof(Logger<>), ServiceLifeTime.Transient);
        }

        private void RegisterCqrs(IServiceCollection serviceCollection)
        {
            serviceCollection.AddMediatR(Assembly);
            serviceCollection.Register(typeof(IPlatformCqrs), typeof(PlatformCqrs), ServiceLifeTime.Transient, replaceIfExist: true);
            CqrsPipelinesProvider().ForEach(p =>
            {
                PlatformValidationResult
                    .ValidIf(
                        p.IsGenericType && p.GetGenericTypeDefinition().IsAssignableToGenericType(typeof(PlatformCqrsPipelineMiddleware<,>)),
                        "Pipeline type must be GenericType and inherit from PlatformCqrsPipelineMiddleware<,>")
                    .EnsureValid(val => new Exception(val.ErrorsMsg()));

                serviceCollection.Register(typeof(IPipelineBehavior<,>), p, ServiceLifeTime.Transient);
            });
        }

        private void RegisterAllModuleDependencies(IServiceCollection serviceCollection)
        {
            GetModuleTypeDependencies()
                .Select(moduleTypeProvider => moduleTypeProvider(Configuration))
                .Concat(AdditionalModuleTypeDependencies)
                .ToList()
                .ForEach(moduleType => serviceCollection.RegisterModule(moduleType));
        }
    }
}
