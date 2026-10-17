using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Constants;
using Easy.Platform.AspNetCore.Middleware;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Moq;

namespace Easy.Platform.Tests.Unit.AspNetCore;

/// <summary>
/// Guards the response-header correlation contract of <see cref="PlatformRequestIdGeneratorMiddleware" />.
/// <para />
/// Invariant guarded: stamping the <c>Request-Id</c> response header is BEST-EFFORT diagnostics and must never fail
/// the request it describes. Kestrel pools <see cref="HttpContext" /> per connection, so an OnStarting callback can
/// run after the context it closed over has been recycled for the next request on that connection. Touching a
/// recycled context throws from deep inside Microsoft.Extensions.Features — reported as
/// <c>ObjectDisposedException: IFeatureCollection has been disposed</c> — which Kestrel escalates into an
/// EventId-13 "An unhandled exception was thrown by the application" and a failed request.
/// <para />
/// This is the same use-after-recycle race that <c>PlatformAspNetApplicationRequestContext</c> documents on its
/// <c>RecordDeadHttpContextRead</c> helper, reached through a different path: a deferred response callback rather
/// than a background scope. Both are fixed the same way — remove the deferred read, then catch defensively.
/// </summary>
public class PlatformRequestIdGeneratorMiddlewareTests
{
    [Fact]
    [Trait("TechnicalSpec", "TC-REQUEST-ID-101")]
    public async Task OnStartingCallback_AppendsIncomingRequestIdHeader_WhenContextIsAlive()
    {
        var (middleware, context, responseFeature) = CreateSubjectUnderTest();
        context.Request.Headers[PlatformAspnetConstant.CommonHttpHeaderNames.RequestId] = "incoming-request-id";

        await middleware.InvokeAsync(context, _ => Task.CompletedTask);
        await responseFeature.FireOnStartingAsync();

        context.TraceIdentifier.Should().Be("incoming-request-id");
        responseFeature.Headers[PlatformAspnetConstant.CommonHttpHeaderNames.RequestId]
            .ToString()
            .Should()
            .Be("incoming-request-id");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-REQUEST-ID-101")]
    public async Task OnStartingCallback_GeneratesRequestIdHeader_WhenRequestHasNoRequestId()
    {
        var (middleware, context, responseFeature) = CreateSubjectUnderTest();

        await middleware.InvokeAsync(context, _ => Task.CompletedTask);
        await responseFeature.FireOnStartingAsync();

        var generatedRequestId = context.Request.Headers[PlatformAspnetConstant.CommonHttpHeaderNames.RequestId].ToString();

        generatedRequestId.Should().NotBeEmpty();
        responseFeature.Headers[PlatformAspnetConstant.CommonHttpHeaderNames.RequestId]
            .ToString()
            .Should()
            .Be(generatedRequestId);
    }

    /// <summary>
    /// THE REGRESSION TEST. Reproduces the reported production failure: the pooled <see cref="DefaultHttpContext" />
    /// is uninitialized — exactly what ASP.NET Core does when a request ends and its context is recycled — BEFORE
    /// the response starts. The callback must degrade silently instead of throwing.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-REQUEST-ID-101")]
    public async Task OnStartingCallback_DoesNotThrow_WhenHttpContextWasRecycledBeforeResponseStarted()
    {
        var (middleware, context, responseFeature) = CreateSubjectUnderTest();

        await middleware.InvokeAsync(context, _ => Task.CompletedTask);

        // Simulate the connection completing/aborting: ASP.NET Core uninitializes the pooled context, which nulls its
        // FeatureReferences. Any later context.Response access now throws the exact production exception.
        context.Uninitialize();

        var fireOnStarting = async () => await responseFeature.FireOnStartingAsync();

        await fireOnStarting.Should().NotThrowAsync();
    }

    /// <summary>
    /// Locks in the root cause of the reported incident: the callback body must stay on the request-processing thread
    /// and must not re-read the context. Both were broken by a blanket June-2025 "wrap sync work in Task.Run" sweep,
    /// so the shape is asserted directly — once the defensive catch exists a thread-pool hop is invisible to the
    /// behavioural tests above, yet it re-opens the window in which the context is recycled mid-callback.
    /// </summary>
    [Fact]
    [Trait("TechnicalSpec", "TC-REQUEST-ID-101")]
    public void OnStartingCallback_DoesNotOffloadToThreadPool_NorReReadTraceIdentifier()
    {
        var callbackSource = ExtractOnStartingCallbackSource();

        callbackSource.Should().NotContain("Task.Run", "the header write must stay on the request-processing thread");
        callbackSource.Should().NotContain("context.TraceIdentifier", "the request id must be captured before the callback");
        callbackSource.Should().Contain("ObjectDisposedException");
        callbackSource.Should().Contain("NullReferenceException");
        callbackSource.Should().Contain("InvalidOperationException");
    }

    private static string ExtractOnStartingCallbackSource()
    {
        var sourcePath = ResolveRepositoryFile(
            "src/Platform/Easy.Platform.AspNetCore/Middleware/PlatformRequestIdGeneratorMiddleware.cs");
        var source = File.ReadAllText(sourcePath);

        var start = source.IndexOf("context.Response.OnStarting(", StringComparison.Ordinal);
        start.Should().BeGreaterThanOrEqualTo(0, "the middleware must still register an OnStarting callback");

        var end = source.IndexOf("await next(context);", start, StringComparison.Ordinal);
        end.Should().BeGreaterThan(start);

        return source[start..end];
    }

    private static string ResolveRepositoryFile(string relativePath)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory != null && !File.Exists(Path.Combine(directory.FullName, relativePath)))
            directory = directory.Parent;

        directory.Should().NotBeNull($"could not locate '{relativePath}' walking up from {AppContext.BaseDirectory}");

        return Path.Combine(directory!.FullName, relativePath);
    }

    private static (PlatformRequestIdGeneratorMiddleware Middleware, DefaultHttpContext Context, CallbackCapturingHttpResponseFeature ResponseFeature)
        CreateSubjectUnderTest()
    {
        var requestContext = new Mock<IPlatformApplicationRequestContext>();
        var requestContextAccessor = new Mock<IPlatformApplicationRequestContextAccessor>();
        requestContextAccessor.SetupGet(accessor => accessor.Current).Returns(requestContext.Object);

        var responseFeature = new CallbackCapturingHttpResponseFeature();
        var features = new FeatureCollection();
        features.Set<IHttpRequestFeature>(new HttpRequestFeature { Headers = new HeaderDictionary() });
        features.Set<IHttpResponseFeature>(responseFeature);

        return (new PlatformRequestIdGeneratorMiddleware(requestContextAccessor.Object), new DefaultHttpContext(features), responseFeature);
    }

    /// <summary>
    /// The framework's default response feature silently DISCARDS OnStarting callbacks, so it cannot be used to
    /// assert this behaviour. This fake records them and replays them on demand, the way Kestrel's
    /// <c>HttpProtocol.FireOnStarting</c> does.
    /// </summary>
    private sealed class CallbackCapturingHttpResponseFeature : IHttpResponseFeature
    {
        private readonly List<(Func<object, Task> Callback, object State)> onStartingCallbacks = [];

        public int StatusCode { get; set; } = 200;
        public string? ReasonPhrase { get; set; }
        public IHeaderDictionary Headers { get; set; } = new HeaderDictionary();
        public Stream Body { get; set; } = Stream.Null;
        public bool HasStarted { get; private set; }

        public void OnStarting(Func<object, Task> callback, object state)
        {
            onStartingCallbacks.Add((callback, state));
        }

        public void OnCompleted(Func<object, Task> callback, object state)
        {
        }

        public async Task FireOnStartingAsync()
        {
            HasStarted = true;

            foreach (var (callback, state) in onStartingCallbacks)
                await callback(state);
        }
    }
}
