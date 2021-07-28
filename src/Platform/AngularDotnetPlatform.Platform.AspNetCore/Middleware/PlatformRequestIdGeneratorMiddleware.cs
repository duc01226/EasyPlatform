using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.AspNetCore.Constants;
using AngularDotnetPlatform.Platform.AspNetCore.Middleware.Abstracts;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using AngularDotnetPlatform.Platform.Extensions;

namespace AngularDotnetPlatform.Platform.AspNetCore.Middleware
{
    /// <summary>
    /// This middleware will add a generated guid request id in to headers. It should be added at the first middleware or second after UseGlobalExceptionHandlerMiddleware
    /// </summary>
    public class PlatformRequestIdGeneratorMiddleware : PlatformMiddleware
    {
        public PlatformRequestIdGeneratorMiddleware(RequestDelegate next) : base(next)
        {
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
