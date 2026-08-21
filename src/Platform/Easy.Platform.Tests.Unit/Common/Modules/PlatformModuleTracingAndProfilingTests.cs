using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Covers the observability configuration a module contributes: distributed-tracing sources and
/// performance-profiling switches.
/// <para>
/// Both default to OFF. That is a deliberate safety posture rather than an oversight — tracing and
/// profiling attach exporters and continuous samplers to a running process, so a module that enabled
/// them implicitly would impose cost on every host that merely referenced it. These tests pin the
/// off-by-default stance and the aggregation rules that apply once a host opts in.
/// </para>
/// </summary>
public class PlatformModuleTracingAndProfilingTests : PlatformModuleTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-060")]
    public void TracingSources_DefaultToEmpty_ForAModuleThatPublishesNone()
    {
        var (services, configuration) = NewHost();

        CreateModule<LeafTestPlatformModule>(services, configuration).TracingSources().Should().BeEmpty();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-060")]
    public void TracingSources_ReturnTheModulesOwnDeclaredSources()
    {
        var (services, configuration) = NewHost();

        CreateModule<TracingTestPlatformModule>(services, configuration)
            .TracingSources()
            .Should()
            .BeEquivalentTo([TracingTestPlatformModule.CustomSourceName]);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-061")]
    public void CommonTracingSources_AreNonEmptyAndDistinct()
    {
        var commonTracingSources = PlatformModule.CommonTracingSources();

        commonTracingSources.Should()
            .NotBeEmpty("CQRS event handling and interval background services are traced for every platform host")
            .And.OnlyHaveUniqueItems("duplicates would add the same activity source to the tracer provider twice")
            .And.OnlyContain(sourceName => !string.IsNullOrWhiteSpace(sourceName), "an empty source name silently traces nothing");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-062")]
    public void DistributedTracing_IsDisabledByDefault_AndRegisteredForResolution()
    {
        var (services, _) = NewHost();

        services.RegisterModule<LeafTestPlatformModule>();

        var distributedTracingConfig = services.BuildServiceProvider().GetService<PlatformModule.DistributedTracingConfig>();

        distributedTracingConfig.Should().NotBeNull("the config is registered so downstream code can branch on it without re-reading configuration");
        distributedTracingConfig!.Enabled.Should().BeFalse("attaching exporters must be an explicit host decision");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-062")]
    public void DistributedTracingConfig_TiesStackTraceCaptureToBeingEnabled()
    {
        // Stack-trace capture is expensive; it must never be on while tracing itself is off.
        new PlatformModule.DistributedTracingConfig { Enabled = false }.IsStackTraceEnabled().Should().BeFalse();
        new PlatformModule.DistributedTracingConfig { Enabled = false }.GetStackTraceIfEnabled().Should().BeNull();

        new PlatformModule.DistributedTracingConfig { Enabled = true }.IsStackTraceEnabled().Should().BeTrue();
        new PlatformModule.DistributedTracingConfig { Enabled = true }.GetStackTraceIfEnabled().Should().NotBeNull();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-063")]
    public void PerformanceProfiling_IsDisabledByDefault()
    {
        var performanceProfilingConfig = new PlatformModule.PerformanceProfilingConfig();

        performanceProfilingConfig.Enabled.Should().BeFalse(
            "continuous profiling samples a live process; it must be opted into per environment, never inherited by default");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-063")]
    public void PerformanceProfiling_DefaultsFavourLowOverheadTrackers()
    {
        var performanceProfilingConfig = new PlatformModule.PerformanceProfilingConfig();

        // CPU and allocation tracking are the cheap, generally-useful signals and default ON *once
        // profiling is enabled*; contention and exception tracking are the expensive ones and stay OFF.
        performanceProfilingConfig.CpuTrackingEnabled.Should().BeTrue();
        performanceProfilingConfig.AllocationTrackingEnabled.Should().BeTrue();
        performanceProfilingConfig.ContentionTrackingEnabled.Should().BeFalse();
        performanceProfilingConfig.ExceptionTrackingEnabled.Should().BeFalse();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-064")]
    public void AdditionalTracingSetup_IsAbsentByDefault_SoTheTracerBuilderIsLeftUntouched()
    {
        var (services, configuration) = NewHost();

        CreateModule<LeafTestPlatformModule>(services, configuration)
            .AdditionalTracingSetup
            .Should()
            .BeNull("the base module contributes no tracer customization; only provider modules such as ASP.NET Core and MongoDB do");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATMOD-065")]
    public void ModuleInitializationTimeout_IsGenerousEnoughForRealMigrations()
    {
        IPlatformModule.DefaultInitializationTimeoutSeconds
            .Should()
            .Be(
                (int)TimeSpan.FromDays(5).TotalSeconds,
                "initialization waits cover large data migrations and cold external dependencies; a short "
                + "ceiling here aborts a legitimately slow startup and leaves the database half-migrated");

        IPlatformModule.DefaultLogCategory.Should().Be("Easy.Platform", "log filtering and alerting rules key off this exact category");
    }
}
