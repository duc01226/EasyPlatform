using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="PipeExtension"/>.
/// </summary>
public class PipeExtensionTests : PlatformUnitTestBase
{
    // ── Pipe ──

    [Fact]
    public void Pipe_TransformsValue()
    {
        var result = 5.Pipe(x => x * 2);

        result.Should().Be(10);
    }

    [Fact]
    public void Pipe_ChangesType()
    {
        var result = 42.Pipe(x => x.ToString());

        result.Should().Be("42");
    }

    // ── PipeAction (Func) ──

    [Fact]
    public void PipeAction_Func_ReturnsOriginalAfterSideEffect()
    {
        var sideEffectValue = 0;

        var result = 5.PipeAction(x => sideEffectValue = x * 2);

        result.Should().Be(5);
        sideEffectValue.Should().Be(10);
    }

    // ── PipeAction (Action) ──

    [Fact]
    public void PipeAction_Action_ReturnsOriginalAfterSideEffect()
    {
        var captured = 0;

        var result = 7.PipeAction(x => { captured = x; });

        result.Should().Be(7);
        captured.Should().Be(7);
    }

    // ── PipeAction (async Task) ──

    [Fact]
    public async Task PipeAction_AsyncTask_ReturnsOriginal()
    {
        var captured = 0;

        var result = await 10.PipeAction(async x =>
        {
            await Task.CompletedTask;
            captured = x;
        });

        result.Should().Be(10);
        captured.Should().Be(10);
    }

    // ── PipeAction (async Task<TResult>) ──

    [Fact]
    public async Task PipeAction_AsyncTaskWithResult_ReturnsOriginal()
    {
        var result = await 10.PipeAction(async x =>
        {
            await Task.CompletedTask;
            return x * 2;
        });

        result.Should().Be(10);
    }

    // ── PipeActionIf (Func<TTarget, bool> condition, Func) ──

    [Fact]
    public void PipeActionIf_FuncCondition_ConditionTrue_ExecutesAction()
    {
        var captured = 0;

        var result = 5.PipeActionIf(_ => true, x => captured = x * 3);

        result.Should().Be(5);
        captured.Should().Be(15);
    }

    [Fact]
    public void PipeActionIf_FuncCondition_ConditionFalse_SkipsAction()
    {
        var captured = 0;

        var result = 5.PipeActionIf(_ => false, x => captured = x * 3);

        result.Should().Be(5);
        captured.Should().Be(0);
    }

    // ── PipeActionIf (Func<TTarget, bool> condition, Action) ──

    [Fact]
    public void PipeActionIf_FuncConditionAction_ConditionTrue_ExecutesAction()
    {
        var captured = 0;

        var result = 5.PipeActionIf(_ => true, x => { captured = x; });

        result.Should().Be(5);
        captured.Should().Be(5);
    }

    [Fact]
    public void PipeActionIf_FuncConditionAction_ConditionFalse_SkipsAction()
    {
        var captured = 0;

        var result = 5.PipeActionIf(_ => false, x => { captured = x; });

        result.Should().Be(5);
        captured.Should().Be(0);
    }

    // ── PipeActionIf (bool condition, Action) ──

    [Fact]
    public void PipeActionIf_BoolCondition_True_ExecutesAction()
    {
        var captured = 0;

        var result = 5.PipeActionIf(true, x => { captured = x; });

        result.Should().Be(5);
        captured.Should().Be(5);
    }

    [Fact]
    public void PipeActionIf_BoolCondition_False_SkipsAction()
    {
        var captured = 0;

        var result = 5.PipeActionIf(false, x => { captured = x; });

        result.Should().Be(5);
        captured.Should().Be(0);
    }

    // ── PipeIf ──

    [Fact]
    public void PipeIf_BoolTrue_AppliesTransform()
    {
        var result = "hello".PipeIf(true, x => x.ToUpper());

        result.Should().Be("HELLO");
    }

    [Fact]
    public void PipeIf_BoolFalse_ReturnsOriginal()
    {
        var result = "hello".PipeIf(false, x => x.ToUpper());

        result.Should().Be("hello");
    }

    [Fact]
    public void PipeIf_FuncTrue_AppliesTransform()
    {
        var result = "hello".PipeIf(x => x.Length > 3, x => x.ToUpper());

        result.Should().Be("HELLO");
    }

    [Fact]
    public void PipeIf_FuncFalse_ReturnsOriginal()
    {
        var result = "hi".PipeIf(x => x.Length > 3, x => x.ToUpper());

        result.Should().Be("hi");
    }

    // ── PipeIfNotNull ──

    [Fact]
    public void PipeIfNotNull_NonNull_AppliesTransform()
    {
        var result = "hello".PipeIfNotNull(x => x.Length);

        result.Should().Be(5);
    }

    [Fact]
    public void PipeIfNotNull_Null_ReturnsDefault()
    {
        var result = ((string?)null).PipeIfNotNull(x => x!.Length);

        result.Should().Be(0);
    }

    [Fact]
    public void PipeIfNotNull_Null_ReturnsProvidedDefault()
    {
        var result = ((string?)null).PipeIfNotNull(x => x!.Length, -1);

        result.Should().Be(-1);
    }

    [Fact]
    public void PipeIfNotNull_NullableStruct_HasValue_AppliesTransform()
    {
        int? value = 5;

        var result = value.PipeIfNotNull(x => x * 2);

        result.Should().Be(10);
    }

    [Fact]
    public void PipeIfNotNull_NullableStruct_Null_ReturnsDefault()
    {
        int? value = null;

        var result = value.PipeIfNotNull(x => x * 2);

        result.Should().Be(0);
    }

    // ── PipeIfOrDefault ──

    [Fact]
    public void PipeIfOrDefault_BoolTrue_AppliesTransform()
    {
        var result = "hello".PipeIfOrDefault(true, x => x.ToUpper());

        result.Should().Be("HELLO");
    }

    [Fact]
    public void PipeIfOrDefault_BoolFalse_ReturnsDefault()
    {
        var result = "hello".PipeIfOrDefault(false, x => x.ToUpper());

        result.Should().BeNull();
    }

    [Fact]
    public void PipeIfOrDefault_FuncTrue_AppliesTransform()
    {
        var result = "hello".PipeIfOrDefault(x => x.Length > 3, x => x.ToUpper());

        result.Should().Be("HELLO");
    }

    [Fact]
    public void PipeIfOrDefault_FuncFalse_ReturnsDefault()
    {
        var result = "hi".PipeIfOrDefault(x => x.Length > 3, x => x.ToUpper(), "fallback");

        result.Should().Be("fallback");
    }
}
