using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace AngularDotnetPlatform.Platform.AspNetCore.Middleware.Abstracts
{
    public interface IPlatformMiddleware
    {
        public Task InvokeAsync(HttpContext context);
    }

    public abstract class PlatformMiddleware : IPlatformMiddleware
    {
        protected readonly RequestDelegate Next;

        public PlatformMiddleware(RequestDelegate next)
        {
            Next = next;
        }

        public Task InvokeAsync(HttpContext context)
        {
            return InternalInvokeAsync(context);
        }

        protected abstract Task InternalInvokeAsync(HttpContext context);
    }
}
