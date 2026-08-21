using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.HangfireBackgroundJob;
using Easy.Platform.Infrastructures.BackgroundJob;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Easy.Platform.Tests.Unit.Infrastructures.BackgroundJob;

/// <summary>
/// Guards the background-job module option objects and the dashboard app-builder extension.
/// <para>
/// <b>Invariants guarded:</b> the dashboard UI exposes every queued job, its arguments and a manual re-trigger button,
/// so <see cref="PlatformBackgroundJobUseDashboardUiOptions.EnsureValid" /> is the gate that stops a deployment
/// publishing that surface with authentication requested but no credential to enforce it. The retry defaults decide how
/// long a transiently failing job keeps retrying before it is abandoned.
/// </para>
/// </summary>
public class PlatformBackgroundJobModuleOptionsTests
{
    // TC-PLATJOB-060: dashboard defaults — a fixed public path, and authentication OFF until explicitly requested.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-060")]
    public void DashboardUiOptions_Defaults_UseTheFixedPathAndLeaveAuthenticationOff()
    {
        var options = new PlatformBackgroundJobUseDashboardUiOptions();

        options.DashboardUiPathStart.Should().Be("/BackgroundJobsDashboard", "deployments and reverse-proxy rules pin this exact path");
        options.UseAuthentication.Should().BeFalse();
        options.BasicAuthentication.Should().BeNull();
    }

    // TC-PLATJOB-061: the anonymous configuration (no auth requested, no credentials) is valid.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-061")]
    public void EnsureValid_ForAnonymousDashboard_Passes()
    {
        var options = new PlatformBackgroundJobUseDashboardUiOptions();

        var act = options.EnsureValid;

        act.Should().NotThrow("an unauthenticated dashboard is a deliberate, allowed configuration");
    }

    // TC-PLATJOB-062: requesting authentication WITHOUT any credential is rejected — the fail-open case.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-062")]
    public void EnsureValid_WhenAuthenticationIsRequestedWithoutCredentials_Throws()
    {
        var options = new PlatformBackgroundJobUseDashboardUiOptions { UseAuthentication = true, BasicAuthentication = null };

        var act = options.EnsureValid;

        // Without this gate the dashboard would be published with authentication switched on but nothing to check
        // against — the fail-OPEN outcome, which is the whole reason the rule exists.
        act.Should().Throw<PlatformValidationException>().WithMessage("*UseAuthentication*");
    }

    // TC-PLATJOB-063: a complete credential pair is valid.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-063")]
    public void EnsureValid_WithACompleteCredentialPair_Passes()
    {
        var options = new PlatformBackgroundJobUseDashboardUiOptions
        {
            UseAuthentication = true,
            BasicAuthentication = new PlatformBackgroundJobUseDashboardUiOptions.BasicAuthentications { UserName = "ops", Password = "s3cret" }
        };

        var act = options.EnsureValid;

        act.Should().NotThrow();
    }

    // TC-PLATJOB-064: a credential with a null or EMPTY half is rejected, in either position.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATJOB-064")]
    [InlineData(null, "s3cret")]
    [InlineData("", "s3cret")]
    [InlineData("ops", null)]
    [InlineData("ops", "")]
    [InlineData("", "")]
    [InlineData(null, null)]
    public void EnsureValid_WithANullOrEmptyCredentialHalf_Throws(string? userName, string? password)
    {
        var options = new PlatformBackgroundJobUseDashboardUiOptions
        {
            BasicAuthentication = new PlatformBackgroundJobUseDashboardUiOptions.BasicAuthentications { UserName = userName!, Password = password! }
        };

        var act = options.EnsureValid;

        act.Should().Throw<PlatformValidationException>().WithMessage("*UserName and Password must be not null, empty or whitespace*");
    }

    // TC-PLATJOB-065: a whitespace-only credential half is REJECTED, in either position, regardless of UseAuthentication.
    //
    // Recorded finding fixes: (1) added .WithMessage — today only the whitespace rule's message can fire for these
    // inputs, but without pinning it a THIRD rule added later to EnsureValid could make this pass for the wrong
    // reason (asymmetric with sibling TC-PLATJOB-064, which already pins its message). (2) added the UseAuthentication
    // = false row: the whitespace rule (PlatformBackgroundJobModule.cs:213-218) is unconditional on UseAuthentication,
    // but every row here previously set it true — weakening the guard to also require UseAuthentication would have
    // stayed green, re-admitting whitespace credentials for every deployment that has not yet flipped the flag on.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATJOB-065")]
    [InlineData(" ", "s3cret", true)]
    [InlineData("ops", " ", true)]
    [InlineData("\t", "\t", true)]
    [InlineData(" ", "s3cret", false)]
    public void EnsureValid_WithAWhitespaceOnlyCredentialHalf_IsRejected(string userName, string password, bool useAuthentication)
    {
        // DELIBERATE REVERSAL of this test's previous verdict, made as an explicit owner decision.
        // The earlier pin asserted whitespace PASSES, reasoning that the credential flows into
        // HangfireCustomBasicAuthenticationFilter { User, Pass } (PlatformHangfireBackgroundJobModule.cs:356-359) for an
        // exact string comparison, so " " is a "real, matchable secret" unlike an empty string.
        // That argument is sound about MECHANISM and wrong about RISK, which is what the guard exists to manage:
        //   - It conflates "technically matchable" with "safe". A password of " " or "\t" is trivially guessable; being
        //     comparable is not the property that makes a secret a secret.
        //   - Whitespace-only values overwhelmingly arrive by ACCIDENT, not intent — a Helm value that rendered blank,
        //     an env var set to " ", a partially-populated config. The old guard classified exactly those as
        //     "credentials configured" and silently stood up an effectively-unprotected dashboard.
        //   - The fail-open case the old rationale worried about (empty) stays rejected either way; tightening to
        //     whitespace strictly enlarges the rejected set and cannot newly let anyone in.
        // The guard is now IsNotNullOrWhiteSpace (PlatformBackgroundJobModule.cs, EnsureValid). A deployment that truly
        // wants a whitespace secret must now say so by other means rather than getting one by misconfiguration.
        var options = new PlatformBackgroundJobUseDashboardUiOptions
        {
            UseAuthentication = useAuthentication,
            BasicAuthentication = new PlatformBackgroundJobUseDashboardUiOptions.BasicAuthentications { UserName = userName, Password = password }
        };

        var act = options.EnsureValid;

        act.Should()
            .Throw<PlatformValidationException>()
            .WithMessage(
                "*UserName and Password must be not null, empty or whitespace*",
                "a whitespace-only credential is a misconfiguration, not a secret — it must fail the deployment gate regardless of "
                + "whether authentication is currently switched on");
    }

    // TC-PLATJOB-066: recorded finding fix — the previous inputs (UserName="ops", Password="", UseAuthentication
    // defaulted false) were already a STRICT SUBSET of TC-PLATJOB-064's own `[InlineData("ops", "")]` row (:78, which
    // also never sets UseAuthentication), so this test could never fail independently of its sibling. Repointed to the
    // genuinely uncovered combination the finding names: UseAuthentication EXPLICITLY true with an EMPTY credential
    // half — proves the completeness rule fires the same way once authentication is switched ON, not only in the
    // auth-off default case TC-PLATJOB-064 already owns.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-066")]
    public void EnsureValid_WithAnEmptyCredentialHalfAndAuthenticationOn_StillThrows()
    {
        var options = new PlatformBackgroundJobUseDashboardUiOptions
        {
            UseAuthentication = true,
            BasicAuthentication = new PlatformBackgroundJobUseDashboardUiOptions.BasicAuthentications { UserName = "ops", Password = "" }
        };

        var act = options.EnsureValid;

        act.Should().Throw<PlatformValidationException>(
            "a half-configured credential must fail even with UseAuthentication switched ON, not only in the auth-off default case "
            + "TC-PLATJOB-064 already covers");
    }

    // TC-PLATJOB-067: automatic-retry defaults — effectively unlimited attempts, 5 minutes apart.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-067")]
    public void AutomaticRetryOnFailedOptions_DefaultsToUnlimitedAttemptsFiveMinutesApart()
    {
        PlatformBackgroundJobAutomaticRetryOnFailedOptions.DefaultAttempts.Should().Be(
            int.MaxValue,
            "a transiently failing job must keep retrying rather than be abandoned after a fixed budget");
        PlatformBackgroundJobAutomaticRetryOnFailedOptions.DefaultRetryDelayInSeconds.Should().Be(300);

        var options = new PlatformBackgroundJobAutomaticRetryOnFailedOptions();

        options.Attempts.Should().Be(PlatformBackgroundJobAutomaticRetryOnFailedOptions.DefaultAttempts);
        options.DelayInSecondsByAttemptFunc.Should().NotBeNull();
    }

    // TC-PLATJOB-068: the default retry delay is CONSTANT — it does not back off with the attempt number.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATJOB-068")]
    [InlineData(1L)]
    [InlineData(2L)]
    [InlineData(50L)]
    [InlineData(long.MaxValue)]
    public void AutomaticRetryOnFailedOptions_DefaultDelayFunc_IsConstantAcrossAttemptNumbers(long attemptNumber)
    {
        var options = new PlatformBackgroundJobAutomaticRetryOnFailedOptions();

        options.DelayInSecondsByAttemptFunc(attemptNumber).Should().Be(
            PlatformBackgroundJobAutomaticRetryOnFailedOptions.DefaultRetryDelayInSeconds,
            "the shipped default is a flat delay, not exponential back-off — a job retrying forever with back-off would "
            + "stretch its recovery window without bound");
    }

    // TC-PLATJOB-069: the retry options are overridable per deployment.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-069")]
    public void AutomaticRetryOnFailedOptions_AreOverridable()
    {
        var options = new PlatformBackgroundJobAutomaticRetryOnFailedOptions
        {
            Attempts = 3,
            DelayInSecondsByAttemptFunc = attempt => (int)attempt * 10
        };

        options.Attempts.Should().Be(3);
        options.DelayInSecondsByAttemptFunc(1).Should().Be(10);
        options.DelayInSecondsByAttemptFunc(4).Should().Be(40);
    }

    // TC-PLATJOB-087: the dashboard app-builder extension is a public static extension on IApplicationBuilder.
    //
    // Recorded finding fixes: (1) previously shared TC-PLATJOB-069 with the unrelated retry-overridability test above
    // — retagged so the 1:1 technical-spec traceability the rest of this file maintains holds here too. (2) honesty
    // note — the generic-parameter-constraint assertions below (IsGenericMethodDefinition, the single type argument,
    // its PlatformBackgroundJobModule constraint) are all compiler-guaranteed by the method's own declaration
    // (`UseDashboardUi<TBackgroundJobModule>(...) where TBackgroundJobModule : PlatformBackgroundJobModule`,
    // PlatformBackgroundJobApplicationBuilderExtensions.cs:13-15); reflecting them back proves the source compiles as
    // written, not a runtime behavior. Kept as a discoverable trip-wire: removing the constraint is a legitimate
    // compile-time-compatible change (no existing call site would break) that would otherwise pass unnoticed.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-087")]
    public void UseDashboardUiExtension_IsAnExtensionMethodConstrainedToBackgroundJobModules()
    {
        var method = typeof(PlatformBackgroundJobApplicationBuilderExtensions)
            .GetMethod(nameof(PlatformBackgroundJobApplicationBuilderExtensions.UseDashboardUi));

        method.Should().NotBeNull();
        method!.IsStatic.Should().BeTrue();
        method.IsGenericMethodDefinition.Should().BeTrue();

        var moduleTypeArgument = method.GetGenericArguments().Should().ContainSingle().Subject;

        moduleTypeArgument.GetGenericParameterConstraints().Should().ContainSingle()
            .Which.Should().Be(
                typeof(PlatformBackgroundJobModule),
                "the constraint is what stops the dashboard being wired to an unrelated module at compile time");

        method.GetParameters()[1].ParameterType.Should().Be(typeof(PlatformBackgroundJobUseDashboardUiOptions));
        method.GetParameters()[1].HasDefaultValue.Should().BeTrue("callers may omit options and take the defaults");
    }

    // TC-PLATJOB-086: recorded MEDIUM finding — every test above drives EnsureValid() directly; none proved the
    // production CALLER actually invokes it. Deleting the call site (PlatformHangfireBackgroundJobModule.cs:347)
    // would leave every credential assertion in this file green while the dashboard published live with an
    // unvalidated credential. PlatformHangfireBackgroundJobModule.UseDashboardUi is the ONLY override that calls
    // EnsureValid() — the base PlatformBackgroundJobModule.UseDashboardUi (PlatformBackgroundJobModule.cs:51-54) is a
    // no-op, by design (the base class has no dashboard to validate for). EnsureValid() runs BEFORE
    // app.UseHangfireDashboard(...) (PlatformHangfireBackgroundJobModule.cs:343-349), so invalid options throw before
    // any real Hangfire/ASP.NET Core pipeline is touched — a loose IApplicationBuilder mock is enough to prove the wiring.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATJOB-086")]
    public void UseDashboardUi_OnTheHangfireModule_CallsEnsureValidBeforeTouchingTheAppPipeline()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        using var serviceProvider = services.BuildServiceProvider();
        var configuration = new ConfigurationBuilder().Build();
        var module = new MinimalHangfireBackgroundJobModule(serviceProvider, configuration);
        var invalidOptions = new PlatformBackgroundJobUseDashboardUiOptions { UseAuthentication = true, BasicAuthentication = null };

        var act = () => module.UseDashboardUi(new Mock<IApplicationBuilder>().Object, invalidOptions);

        act.Should().Throw<PlatformValidationException>(
            "UseDashboardUi must call EnsureValid() before wiring the dashboard pipeline — otherwise every invalid-options case "
            + "this file documents as rejected would still ship the dashboard live");
    }

    #region Test doubles

    /// <summary>
    /// Minimal concrete <see cref="PlatformHangfireBackgroundJobModule" /> — the only module type in the codebase
    /// whose <c>UseDashboardUi</c> override actually calls <c>EnsureValid()</c>. Overrides nothing except the one
    /// abstract member required to compile, so the wiring proven by
    /// <see cref="UseDashboardUi_OnTheHangfireModule_CallsEnsureValidBeforeTouchingTheAppPipeline" /> comes from the
    /// PRODUCTION base class, not this double.
    /// </summary>
    private sealed class MinimalHangfireBackgroundJobModule : PlatformHangfireBackgroundJobModule
    {
        public MinimalHangfireBackgroundJobModule(IServiceProvider serviceProvider, IConfiguration configuration)
            : base(serviceProvider, configuration)
        {
        }

        protected override PlatformHangfireBackgroundJobStorageType UseBackgroundJobStorage()
        {
            return PlatformHangfireBackgroundJobStorageType.InMemory;
        }
    }

    #endregion
}
