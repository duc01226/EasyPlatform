using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Middleware;
using Easy.Platform.Common.JsonSerialization;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;

namespace Easy.Platform.Tests.Unit.AspNetCore;

/// <summary>
/// Guards the slow-request sink while proving that buffering and redaction do not consume or alter
/// the request body used by normal MVC model binding.
/// </summary>
public class PlatformSlowRequestWarningMiddlewareRedactionTests
{
    [Fact]
    public async Task InvokeAsync_WhenJsonBodyContainsMarkedMember_BindsNormallyAndLogsRedactedPayload()
    {
        var sentinel = CreateSentinel();
        var querySentinel = CreateSentinel();
        var requestContextSentinel = CreateSentinel();
        var request = new DiagnosticRequest { SensitiveValue = sentinel, PublicValue = "public-visible" };
        var requestJson = PlatformJsonSerializer.Serialize(request);
        var httpContext = BuildHttpContext(requestJson);
        httpContext.Request.QueryString = new QueryString($"?access_token={querySentinel}");
        var capturedLogs = new ConcurrentQueue<string>();
        var requestContext = new Mock<IPlatformApplicationRequestContext>();
        var requestContextAccessor = new Mock<IPlatformApplicationRequestContextAccessor>();
        DiagnosticRequest? boundRequest = null;

        requestContext
            .Setup(context => context.GetAllKeyValues())
            .Returns(new Dictionary<string, object?> { ["UserId"] = requestContextSentinel });
        requestContextAccessor.SetupGet(accessor => accessor.Current).Returns(requestContext.Object);

        using var loggerFactory = LoggerFactory.Create(
            builder => builder
                .SetMinimumLevel(LogLevel.Trace)
                .AddProvider(new CaptureLoggerProvider(capturedLogs)));
        using var serviceProvider = new ServiceCollection().BuildServiceProvider();
        var middleware = new PlatformSlowRequestWarningMiddleware(
            Options.Create(new PlatformSlowRequestWarningMiddlewareOptions
            {
                Enabled = true,
                SlowProcessWarningTimeMilliseconds = 0
            }),
            loggerFactory,
            requestContextAccessor.Object,
            serviceProvider);

        await middleware.InvokeAsync(
            httpContext,
            async context =>
            {
                using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
                var body = await reader.ReadToEndAsync();

                boundRequest = PlatformJsonSerializer.Deserialize<DiagnosticRequest>(body);
                context.SetEndpoint(BuildControllerEndpoint());
            });

        (boundRequest?.SensitiveValue == sentinel).Should().BeTrue(
            "request buffering must preserve the body for normal MVC binding");
        (capturedLogs.Count == 1).Should().BeTrue("one slow-request warning is expected");
        capturedLogs.TryPeek(out var capturedLog).Should().BeTrue();
        ContainsAnySentinelRepresentation(capturedLog!, sentinel).Should().BeFalse(
            "the log must not disclose raw, partial, encoded, or reversible forms");
        ContainsAnySentinelRepresentation(capturedLog!, querySentinel).Should().BeFalse(
            "raw query values must not be emitted by slow-request diagnostics");
        ContainsAnySentinelRepresentation(capturedLog!, requestContextSentinel).Should().BeFalse(
            "the complete request context must not be emitted by slow-request diagnostics");
        capturedLog!.Contains("protectedValue", StringComparison.OrdinalIgnoreCase).Should().BeFalse(
            "the marked property name must be omitted from diagnostics");
        capturedLog.Should().Contain("public-visible");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Serialize_WhenEndpointOrBodyParameterMetadataIsMissing_ReturnsOnlyOmittedPayload(
        bool hasEndpointWithoutBodyParameter)
    {
        var sentinel = CreateSentinel();
        var requestJson = PlatformJsonSerializer.Serialize(
            new DiagnosticRequest { SensitiveValue = sentinel, PublicValue = "public-visible" });
        var httpContext = BuildHttpContext(requestJson);

        if (hasEndpointWithoutBodyParameter)
            httpContext.SetEndpoint(BuildControllerEndpoint(includeBodyParameterMetadata: false));

        var diagnosticPayload = PlatformHttpRequestBodyDiagnosticSerializer.Serialize(httpContext, requestJson);

        diagnosticPayload.Should().Be(PlatformHttpRequestBodyDiagnosticSerializer.OmittedPayload);
        ContainsAnySentinelRepresentation(diagnosticPayload, sentinel).Should().BeFalse(
            "missing endpoint or body-parameter metadata must never fall back to the raw request body");
    }

    [Fact]
    public void Serialize_WhenMarkedRequestBodyContainsMalformedJson_ReturnsOnlyOmittedPayload()
    {
        var sentinel = CreateSentinel();
        var validRequestJson = PlatformJsonSerializer.Serialize(
            new DiagnosticRequest { SensitiveValue = sentinel, PublicValue = "public-visible" });
        var malformedRequestJson = validRequestJson[..^1];
        var httpContext = BuildHttpContext(malformedRequestJson);

        httpContext.SetEndpoint(BuildControllerEndpoint());

        var diagnosticPayload = PlatformHttpRequestBodyDiagnosticSerializer.Serialize(httpContext, malformedRequestJson);

        diagnosticPayload.Should().Be(PlatformHttpRequestBodyDiagnosticSerializer.OmittedPayload);
        ContainsAnySentinelRepresentation(diagnosticPayload, sentinel).Should().BeFalse(
            "malformed JSON must never fall back to the raw request body");
    }

    [Theory]
    [InlineData(nameof(TestController.SaveObject))]
    [InlineData(nameof(TestController.SaveDictionary))]
    [InlineData(nameof(TestController.SaveJsonElement))]
    [InlineData(nameof(TestController.SaveJsonNode))]
    public void Serialize_WhenBodyTypeIsDynamicContainer_ReturnsOnlyOmittedPayload(string actionName)
    {
        var sentinel = CreateSentinel();
        var requestJson = $"{{\"accessToken\":\"{sentinel}\",\"profile\":{{\"email\":\"{sentinel}\"}}}}";
        var httpContext = BuildHttpContext(requestJson);
        httpContext.SetEndpoint(BuildControllerEndpoint(actionName));

        var diagnosticPayload = PlatformHttpRequestBodyDiagnosticSerializer.Serialize(httpContext, requestJson);

        diagnosticPayload.Should().Be(PlatformHttpRequestBodyDiagnosticSerializer.OmittedPayload);
        ContainsAnySentinelRepresentation(diagnosticPayload, sentinel).Should().BeFalse(
            "dynamic and dictionary payloads have no trustworthy typed allowlist and must fail closed");
    }

    [Fact]
    public void Serialize_WhenTypedBodyContainsUnmarkedDynamicContainer_ReturnsOnlyOmittedPayload()
    {
        var sentinel = CreateSentinel();
        var requestJson =
            $"{{\"protectedValue\":\"redacted\",\"metadata\":{{\"providerResponse\":\"{sentinel}\"}}}}";
        var httpContext = BuildHttpContext(requestJson);
        httpContext.SetEndpoint(BuildControllerEndpoint(nameof(TestController.SaveNestedDynamic)));

        var diagnosticPayload = PlatformHttpRequestBodyDiagnosticSerializer.Serialize(httpContext, requestJson);

        diagnosticPayload.Should().Be(PlatformHttpRequestBodyDiagnosticSerializer.OmittedPayload);
        ContainsAnySentinelRepresentation(diagnosticPayload, sentinel).Should().BeFalse(
            "a marked sibling must not authorize an untyped nested container to enter diagnostics");
    }

    [Fact]
    public void Serialize_WhenTypeMetadataResolutionThrows_ReturnsOnlyOmittedPayload()
    {
        var sentinel = CreateSentinel();
        var requestJson = $"{{\"protectedValue\":\"{sentinel}\"}}";
        var httpContext = BuildHttpContext(requestJson);
        httpContext.SetEndpoint(BuildControllerEndpoint(nameof(TestController.SaveHostile)));

        var act = () => PlatformHttpRequestBodyDiagnosticSerializer.Serialize(httpContext, requestJson);

        act.Should().NotThrow("diagnostic metadata/converter failures must not mask the request");
        act().Should().Be(PlatformHttpRequestBodyDiagnosticSerializer.OmittedPayload);
        ContainsAnySentinelRepresentation(act(), sentinel).Should().BeFalse();
    }

    private static DefaultHttpContext BuildHttpContext(string requestJson)
    {
        return new DefaultHttpContext
        {
            Request =
            {
                Method = HttpMethods.Post,
                ContentType = "application/json",
                Body = new MemoryStream(Encoding.UTF8.GetBytes(requestJson))
            }
        };
    }

    private static Endpoint BuildControllerEndpoint(
        bool includeBodyParameterMetadata = true)
    {
        return BuildControllerEndpoint(nameof(TestController.Save), includeBodyParameterMetadata);
    }

    private static Endpoint BuildControllerEndpoint(
        string actionName,
        bool includeBodyParameterMetadata = true)
    {
        var parameterInfo = typeof(TestController)
            .GetMethod(actionName)!
            .GetParameters()
            .Single();
        var actionDescriptor = new ControllerActionDescriptor
        {
            Parameters = includeBodyParameterMetadata
                ?
                [
                    new ControllerParameterDescriptor
                    {
                        Name = parameterInfo.Name!,
                        ParameterInfo = parameterInfo,
                        ParameterType = parameterInfo.ParameterType,
                        BindingInfo = new BindingInfo { BindingSource = BindingSource.Body }
                    }
                ]
                : []
        };

        return new Endpoint(
            _ => Task.CompletedTask,
            new EndpointMetadataCollection(actionDescriptor),
            "diagnostic-test");
    }

    private static string CreateSentinel()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    }

    private static bool ContainsAnySentinelRepresentation(string value, string sentinel)
    {
        var suffix = sentinel[^12..];
        var reversed = new string(sentinel.Reverse().ToArray());
        var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(sentinel));

        return value.Contains(sentinel, StringComparison.Ordinal)
               || value.Contains(suffix, StringComparison.Ordinal)
               || value.Contains(reversed, StringComparison.Ordinal)
               || value.Contains(base64, StringComparison.Ordinal);
    }

    private sealed class TestController
    {
        public void Save([FromBody] DiagnosticRequest request)
        {
        }

        public void SaveObject([FromBody] object request)
        {
        }

        public void SaveDictionary([FromBody] Dictionary<string, object?> request)
        {
        }

        public void SaveJsonElement([FromBody] JsonElement request)
        {
        }

        public void SaveJsonNode([FromBody] JsonNode request)
        {
        }

        public void SaveHostile([FromBody] HostileRequest request)
        {
        }

        public void SaveNestedDynamic([FromBody] NestedDynamicRequest request)
        {
        }
    }

    private sealed class DiagnosticRequest
    {
        [JsonPropertyName("protectedValue")]
        [PlatformSensitiveData]
        public string SensitiveValue { get; set; } = string.Empty;

        public string PublicValue { get; set; } = string.Empty;
    }

    [JsonConverter(typeof(ThrowingHostileRequestConverter))]
    private sealed class HostileRequest
    {
        [PlatformSensitiveData]
        public string SensitiveValue { get; set; } = string.Empty;
    }

    private sealed class NestedDynamicRequest
    {
        [JsonPropertyName("protectedValue")]
        [PlatformSensitiveData]
        public string SensitiveValue { get; set; } = string.Empty;

        public Dictionary<string, object?> Metadata { get; set; } = [];
    }

    private sealed class ThrowingHostileRequestConverter : JsonConverter<HostileRequest>
    {
        public override HostileRequest? Read(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options)
        {
            throw new InvalidOperationException("hostile converter must not execute");
        }

        public override void Write(
            Utf8JsonWriter writer,
            HostileRequest value,
            JsonSerializerOptions options)
        {
            throw new InvalidOperationException("hostile converter must not execute");
        }
    }

    private sealed class CaptureLoggerProvider(ConcurrentQueue<string> capturedLogs) : ILoggerProvider
    {
        public ILogger CreateLogger(string categoryName)
        {
            return new CaptureLogger(capturedLogs);
        }

        public void Dispose()
        {
        }
    }

    private sealed class CaptureLogger(ConcurrentQueue<string> capturedLogs) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull
        {
            return null;
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            return true;
        }

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            capturedLogs.Enqueue(formatter(state, exception));
        }
    }
}
