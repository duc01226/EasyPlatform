using System;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.Context.UserContext.Default;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.AspNetCore.Context.UserContext
{
    /// <summary>
    /// Implementation of <see cref="IPlatformApplicationUserContextAccessor"/>
    /// Inspired by Microsoft.AspNetCore.Http.HttpContextAccessor
    /// </summary>
    public class PlatformAspNetApplicationUserContextAccessor : PlatformDefaultApplicationUserContextAccessor, IPlatformApplicationUserContextAccessor
    {
        private readonly IServiceProvider serviceProvider;

        public PlatformAspNetApplicationUserContextAccessor(IServiceProvider serviceProvider)
        {
            this.serviceProvider = serviceProvider;
        }

        protected override IPlatformApplicationUserContext CreateNewContext()
        {
            var httpContextAccessor = serviceProvider.GetService<IHttpContextAccessor>();
            if (httpContextAccessor == null)
                return null;
            return new PlatformAspNetApplicationUserContext(httpContextAccessor);
        }
    }
}
