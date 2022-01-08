using System;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.AspNetCore.Constants;
using AngularDotnetPlatform.Platform.AspNetCore.Middleware.Abstracts;
using AngularDotnetPlatform.Platform.Common.Extensions;
using Microsoft.AspNetCore.Http;

namespace AngularDotnetPlatform.Platform.AspNetCore.Middleware
{
    /// <summary>
    /// This middleware will add a generated guid request id in to headers. It should be added at the first middleware or second after UseGlobalExceptionHandlerMiddleware
    /// </summary>
    public class PlatformRequestIdGeneratorMiddleware : PlatformMiddleware
    {
        private readonly IPlatformApplicationUserContextAccessor applicationUserContextAccessor;

        public PlatformRequestIdGeneratorMiddleware(RequestDelegate next, IPlatformApplicationUserContextAccessor applicationUserContextAccessor) : base(next)
        {
            this.applicationUserContextAccessor = applicationUserContextAccessor;
        }

        protected override async Task InternalInvokeAsync(HttpContext context)
        {
            if (!context.Request.Headers.TryGetValue(PlatformAspnetConstant.CommonHttpHeaderNames.RequestId,
                out var existedRequestId) || string.IsNullOrEmpty(existedRequestId))
            {
                var newGeneratedRequestId = Guid.NewGuid().ToString();
                context.Request.Headers.Upsert(PlatformAspnetConstant.CommonHttpHeaderNames.RequestId, newGeneratedRequestId);
            }

            context.TraceIdentifier = context.Request.Headers[PlatformAspnetConstant.CommonHttpHeaderNames.RequestId];
            applicationUserContextAccessor.Current.SetValue(context.TraceIdentifier, PlatformApplicationCommonUserContextKeys.RequestId);

            // apply the request ID to the response header for client side tracking
            context.Response.OnStarting(() =>
            {
                if (!context.Response.Headers.ContainsKey(PlatformAspnetConstant.CommonHttpHeaderNames.RequestId))
                    context.Response.Headers.Add(PlatformAspnetConstant.CommonHttpHeaderNames.RequestId, new[] { context.TraceIdentifier });
                return Task.CompletedTask;
            });

            // Call the next delegate/middleware in the pipeline
            await Next(context);
        }
    }
}
