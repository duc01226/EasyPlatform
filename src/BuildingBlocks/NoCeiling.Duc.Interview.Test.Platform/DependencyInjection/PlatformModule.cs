using System;
using System.Collections.Generic;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace NoCeiling.Duc.Interview.Test.Platform.DependencyInjection
{
    public abstract class PlatformModule
    {
        private readonly object registerLock = new object();
        private readonly object initLock = new object();

        public PlatformModule(IServiceProvider serviceProvider)
        {
            ServiceProvider = serviceProvider;
        }

        public IServiceProvider ServiceProvider { get; }

        public Assembly Assembly => GetType().Assembly;

        public bool Registered { get; private set; }

        public bool Initiated { get; private set; }

        public void Register(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            lock (registerLock)
            {
                if (Registered)
                    return;

                RegisterAllModuleDependencies(serviceCollection, configuration);
                InternalRegister(serviceCollection, configuration);
                Registered = true;
            }
        }

        public void Init()
        {
            lock (initLock)
            {
                if (Initiated)
                    return;

                InitAllModuleDependencies();

                using (var scope = ServiceProvider.CreateScope())
                {
                    InternalInit(scope).Wait();
                }

                Initiated = true;
            }
        }

        protected virtual void InternalRegister(IServiceCollection serviceCollection, IConfiguration configuration) { }

        protected virtual Task InternalInit(IServiceScope serviceScope)
        {
            return Task.CompletedTask;
        }

        protected virtual List<Type> GetModuleDependencies()
        {
            return new List<Type>();
        }

        private void RegisterAllModuleDependencies(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            GetModuleDependencies().ForEach(p => serviceCollection.RegisterModule(configuration, p));
        }

        private void InitAllModuleDependencies()
        {
            GetModuleDependencies().ForEach(p =>
            {
                var dependModule = ServiceProvider.GetService(p);
                if (dependModule == null)
                    throw new Exception($"Module {GetType().Name} depend on {p.Name} but Module {p.Name} is not registered");
                if (dependModule is PlatformModule typedPlatformModule)
                {
                    typedPlatformModule.Init();
                }
                else
                {
                    throw new Exception(
                        $"Module {GetType().Name} depend on {p.Name} but Module {p.Name} is not inherit from PlatformModule");
                }
            });
        }
    }
}
