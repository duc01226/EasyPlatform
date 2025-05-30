#region

using Microsoft.AspNetCore.Http;

#endregion

namespace Easy.Platform.AspNetCore.Middleware.Abstracts;

public interface IPlatformMiddleware : IMiddleware
{
}

public abstract class PlatformMiddleware : IPlatformMiddleware
{
    public Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        return InternalInvokeAsync(context, next);
    }

    protected abstract Task InternalInvokeAsync(HttpContext context, RequestDelegate next);
}
