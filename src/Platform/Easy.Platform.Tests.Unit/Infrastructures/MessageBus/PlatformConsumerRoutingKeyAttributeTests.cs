using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Infrastructures.MessageBus;

/// <summary>
/// Guards <see cref="PlatformConsumerRoutingKeyAttribute" /> — the pure logic that decides WHICH messages a consumer
/// class is allowed to see.
/// <para>
/// <b>Invariant guarded:</b> this attribute is the only thing standing between a message and the wrong consumer. A
/// pattern that matches too widely silently hands one service's messages to another service's handler; a pattern that
/// matches too narrowly silently drops messages with no error anywhere — the message is acked, the consumer never runs,
/// and nothing logs. Neither failure produces a stack trace, so the matching matrix below (including, deliberately,
/// every NON-matching row) is the only place that failure mode is detectable.
/// </para>
/// <para>
/// <b>Why construction-time throws are asserted:</b> every constructor ends in <c>EnsureValid()</c>
/// (<c>PlatformConsumerRoutingKeyAttribute.cs:40,57,65</c>). Attributes are instantiated by the reflection binding scan
/// at startup, so an invalid key must fail loudly THEN — at deploy time — rather than degrade into a binding that never
/// receives anything in production.
/// </para>
/// </summary>
public class PlatformConsumerRoutingKeyAttributeTests : PlatformUnitTestBase
{
    // TC-PLATCONS-001: The 4-part constructor AutoFixes separators, defaults omitted parts to match-all, and accepts
    // match-all for every part below the group level.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-001")]
    public void FourPartConstructor_AutoFixesSeparatorsAndDefaultsOmittedPartsToMatchAll()
    {
        var attribute = new PlatformConsumerRoutingKeyAttribute("Group.WithSeparator", null, null);

        // The separator is the routing key's own delimiter — leaving it inside a part would silently turn one key part
        // into two and shift every later part one level down. AutoFixKeyPart replaces it rather than rejecting it.
        attribute.MessageGroup.Should().Be("Group-WithSeparator");

        // Nulls become match-all, NOT empty: an empty part would make the binding key malformed, whereas match-all is
        // the documented "I do not constrain this level" value.
        attribute.ProducerContext.Should().Be(PlatformBusMessageRoutingKey.MatchAllSingleGroupLevelChar);
        attribute.MessageType.Should().Be(PlatformBusMessageRoutingKey.MatchAllSingleGroupLevelChar);
        attribute.MessageAction.Should().Be(PlatformBusMessageRoutingKey.MatchAllSingleGroupLevelChar);
        attribute.CustomRoutingKey.Should().BeNull("the 4-part constructor never sets a custom key");

        // Counter-assertion to TC-PLATCONS-002: an explicit match-all below the group level must be ACCEPTED. Without
        // it, "reject every '*' everywhere" would satisfy TC-PLATCONS-002 while unbinding every real cross-service
        // consumer, which binds producer context on "*" by design.
        var explicitMatchAll = () => new PlatformConsumerRoutingKeyAttribute(
            "Group",
            PlatformBusMessageRoutingKey.MatchAllSingleGroupLevelChar,
            PlatformBusMessageRoutingKey.MatchAllSingleGroupLevelChar);

        explicitMatchAll.Should().NotThrow();
    }

    // TC-PLATCONS-002: An invalid message group is rejected at CONSTRUCTION, not at first message.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATCONS-002")]
    [InlineData("*")]
    [InlineData("")]
    [InlineData("Prefix*Suffix")]
    public void FourPartConstructor_WithMatchAllOrEmptyMessageGroup_ThrowsAtConstruction(string invalidMessageGroup)
    {
        // MessageGroup is the ONE part the validator refuses to let match-all through
        // (PlatformBusMessageRoutingKey.Validator: KeyPartValidator(p => p.MessageGroup) passes
        // allowMatchingAllPattern=false). A consumer binding on "*" at the group level would subscribe to every message
        // in the entire platform — the widest possible mis-binding, which is exactly why it is a hard failure.
        var act = () => new PlatformConsumerRoutingKeyAttribute(invalidMessageGroup, "Producer", "MessageType");

        act.Should().Throw<PlatformValidationException>();
    }

    // TC-PLATCONS-003: The combined-pattern constructor pads short patterns with match-all via ElementAtOrDefault.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATCONS-003")]
    [InlineData("AA", "AA", "*", "*", "*")]
    [InlineData("AA.BB", "AA", "BB", "*", "*")]
    [InlineData("AA.BB.CC", "AA", "BB", "CC", "*")]
    [InlineData("AA.BB.CC.DD", "AA", "BB", "CC", "DD")]
    [InlineData("AA.BB.CC.DD.EE", "AA", "BB", "CC", "DD")]
    public void CombinedPatternConstructor_PadsMissingPartsWithMatchAllAndDropsExtraParts(
        string combinedKeyPattern,
        string expectedGroup,
        string expectedProducerContext,
        string expectedMessageType,
        string expectedMessageAction)
    {
        var attribute = new PlatformConsumerRoutingKeyAttribute(combinedKeyPattern);

        attribute.MessageGroup.Should().Be(expectedGroup);
        attribute.ProducerContext.Should().Be(expectedProducerContext);
        attribute.MessageType.Should().Be(expectedMessageType);
        attribute.MessageAction.Should().Be(expectedMessageAction);

        // The 5-part row is the load-bearing one: `ElementAtOrDefault(0..3)` reads only four indexes, so a fifth part is
        // SILENTLY DISCARDED rather than rejected. Pinned so a future author who writes a 5-level pattern by mistake
        // finds this documented instead of wondering why the extra level had no effect.
    }

    // TC-PLATCONS-004: An empty combined pattern is rejected at construction.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-004")]
    public void CombinedPatternConstructor_WithEmptyPattern_ThrowsAtConstruction()
    {
        // "".Split(".") yields [""], so MessageGroup becomes empty — an empty group would produce the binding key
        // ".*.*", which binds to nothing and reports no error. This is the combined-pattern entry into the same
        // silent-drop failure mode TC-PLATCONS-002 guards on the 4-part constructor.
        var act = () => new PlatformConsumerRoutingKeyAttribute("");

        act.Should().Throw<PlatformValidationException>();
    }

    // TC-PLATCONS-005: Pattern-vs-routing-key matching matrix, both matching AND non-matching rows.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATCONS-005")]
    // Exact and match-all
    [InlineData("Group.Producer.Type", "Group.Producer.Type", true)]
    [InlineData("Group.Producer.Type", "Group.Producer.OtherType", false)]
    [InlineData("Group.*.*", "Group.AnyProducer.AnyType", true)]
    [InlineData("Group.*.*", "OtherGroup.AnyProducer.AnyType", false)]
    [InlineData("Group", "Group.AnyProducer.AnyType", true)]
    [InlineData("Group", "OtherGroup.AnyProducer.AnyType", false)]
    // "*XXX" == value STARTS WITH XXX (per the wording at PlatformConsumerRoutingKeyAttribute.cs:15)
    [InlineData("Group.*.*Employee", "Group.Producer.EmployeeCreated", true)]
    [InlineData("Group.*.*Employee", "Group.Producer.CreatedEmployee", false)]
    // "XXX*" == value ENDS WITH XXX
    [InlineData("Group.*.Employee*", "Group.Producer.CreatedEmployee", true)]
    [InlineData("Group.*.Employee*", "Group.Producer.EmployeeCreated", false)]
    // 4-level action matching, including the "message carries no action level at all" row
    [InlineData("Group.Producer.Type.Created", "Group.Producer.Type.Created", true)]
    [InlineData("Group.Producer.Type.Created", "Group.Producer.Type.Updated", false)]
    [InlineData("Group.Producer.Type.Created", "Group.Producer.Type", false)]
    [InlineData("Group.Producer.Type", "Group.Producer.Type.Created", true)]
    public void IsMatchMessageRoutingKey_WithoutCustomKey_MatchesOnlyTheIntendedRoutingKeys(
        string combinedKeyPattern,
        string messageRoutingKey,
        bool expectedIsMatch)
    {
        var attribute = new PlatformConsumerRoutingKeyAttribute(combinedKeyPattern);

        attribute.IsMatchMessageRoutingKey(messageRoutingKey).Should().Be(expectedIsMatch);

        // The false rows carry the value here. A regression that widens matching — dropping a part comparison, or
        // treating every unmatched level as match-all — still passes every true row; only the false rows detect a
        // consumer that has started receiving messages it was never meant to see.
    }

    // TC-PLATCONS-006: The documented "contains (*XXX*)" form does NOT actually match by containment.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-006")]
    public void IsMatchMessageRoutingKey_WithContainsStylePattern_DoesNotMatchByContainment()
    {
        // DOCUMENTED-VS-ACTUAL MISMATCH — pinned deliberately, not endorsed.
        // PlatformConsumerRoutingKeyAttribute.cs:15 states the pattern supports "contains (*XXX*)". It does not:
        // PlatformBusMessageRoutingKey.MatchPattern tests StartsWith("*") BEFORE the contains branch, so "*Employee*"
        // is consumed by the startsWith branch and evaluates value.StartsWith("Employee*"). The contains branch
        // (guarded by `pattern.Length > 2 && StartsWith && EndsWith`) is unreachable dead code.
        // The test pins ACTUAL behavior so nobody ships a "*XXX*" consumer believing it matches by containment; the
        // discrepancy is reported as a source-side finding rather than silently normalized here.
        var attribute = new PlatformConsumerRoutingKeyAttribute("Group.*.*Employee*");

        attribute
            .IsMatchMessageRoutingKey("Group.Producer.CreatedEmployeeEvent")
            .Should()
            .BeFalse("the contains branch of MatchPattern is unreachable — startsWith wins the branch race");

        // Counter-row proving which branch DOES run: the pattern degenerates to startsWith of the literal "Employee*",
        // asterisk included. That is what makes the dead branch a real defect rather than a harmless one.
        attribute.IsMatchMessageRoutingKey("Group.Producer.Employee*Anything").Should().BeTrue();
    }

    // TC-PLATCONS-007: A custom routing key matches EITHER the bare custom key OR "{MessageGroup}.{CustomRoutingKey}".
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATCONS-007")]
    [InlineData("CustomFreeTextKey", true)]
    [InlineData("MessageGroupName.CustomFreeTextKey", true)]
    [InlineData("SomeOtherKey", false)]
    [InlineData("OtherGroup.CustomFreeTextKey", false)]
    public void IsMatchMessageRoutingKey_WithCustomRoutingKey_MatchesEitherBareKeyOrGroupQualifiedKey(
        string messageRoutingKey,
        bool expectedIsMatch)
    {
        // Both arms of the OR must stay covered: producers publish the bare custom key in some services and the
        // group-qualified key in others, so dropping either arm silently starves one half of the producers.
        var attribute = new PlatformConsumerRoutingKeyAttribute("MessageGroupName", "CustomFreeTextKey");

        attribute.IsMatchMessageRoutingKey(messageRoutingKey).Should().Be(expectedIsMatch);
    }

    // TC-PLATCONS-008: ConsumerBindingRoutingKey has two distinct shapes; the action level is never bound; and a null
    // group slips past validation into a malformed key.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-008")]
    public void ConsumerBindingRoutingKey_DiffersByCustomRoutingKeyAndExcludesTheActionLevel()
    {
        // Shape 1 — structured: group.producer.type. The ACTION is deliberately absent: binding at the action level
        // would make a consumer that declares `messageAction: "Created"` miss every other action of the same message
        // type, so the action is a MATCH-time filter only, never a BIND-time one.
        new PlatformConsumerRoutingKeyAttribute("Group", "Producer", "Type", "Created")
            .ConsumerBindingRoutingKey()
            .Should()
            .Be("Group.Producer.Type");

        // Shape 2 — custom: group.customKey. Only two levels; the producer/type levels do not participate.
        new PlatformConsumerRoutingKeyAttribute("Group", "CustomKey").ConsumerBindingRoutingKey().Should().Be("Group.CustomKey");

        // GAP pinned deliberately. EnsureValid validates a PlatformBusMessageRoutingKey COPY whose MessageGroup getter
        // substitutes "DefaultMessageGroup" for null, so a null group never reaches the validator. The attribute's own
        // MessageGroup stays null and is interpolated as empty here — a leading-dot key that binds to nothing while
        // reporting no error. Same silent-drop failure mode as TC-PLATCONS-002, arriving through the one input the
        // validator cannot see. Reported as a source-side finding; this pins today's behavior.
        var nullGroupAttribute = new PlatformConsumerRoutingKeyAttribute(null!, "Producer", "Type");

        nullGroupAttribute.MessageGroup.Should().BeNull("AutoFixKeyPart(null) returns null and the 4-part ctor does not default the group");
        nullGroupAttribute.ConsumerBindingRoutingKey().Should().StartWith(".", "an empty leading level is a malformed binding key");
    }

    // TC-PLATCONS-009: CanMessageBusConsumerProcess ORs across every attribute, walks base types, and never throws.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-009")]
    public void CanMessageBusConsumerProcess_OrsAcrossAllAttributesIncludingInheritedOnes()
    {
        // The attribute is AllowMultiple = true precisely so one consumer can serve several routing keys. Asserting the
        // SECOND attribute (not only the first) is what proves the scan does not stop at index 0 — a bug that looks
        // fine in every single-attribute consumer and breaks only the multi-key ones.
        PlatformConsumerRoutingKeyAttribute.CanMessageBusConsumerProcess(typeof(TwoRoutingKeysConsumer), "FirstGroup.Producer.Type").Should().BeTrue();
        PlatformConsumerRoutingKeyAttribute.CanMessageBusConsumerProcess(typeof(TwoRoutingKeysConsumer), "SecondGroup.Producer.Type").Should().BeTrue();
        PlatformConsumerRoutingKeyAttribute
            .CanMessageBusConsumerProcess(typeof(TwoRoutingKeysConsumer), "UnrelatedGroup.Producer.Type")
            .Should()
            .BeFalse("a consumer with two declared keys must still reject a third, unrelated key");

        // inherit: true at PlatformConsumerRoutingKeyAttribute.cs:96. Shared base consumers that declare the routing key
        // once and are specialized per service depend on this; flipping inherit to false would silently unbind every
        // derived consumer while leaving the base ones working.
        PlatformConsumerRoutingKeyAttribute
            .CanMessageBusConsumerProcess(typeof(DerivedFromRoutingKeyConsumer), "FirstGroup.Producer.Type")
            .Should()
            .BeTrue();

        // This runs inside the startup binding scan over EVERY registered consumer type. Throwing on an undecorated
        // type would abort the whole scan and take down every OTHER consumer's binding with it, so "no attributes" must
        // degrade to a plain false.
        var undecorated = () => PlatformConsumerRoutingKeyAttribute.CanMessageBusConsumerProcess(typeof(NoRoutingKeyConsumer), "AnyGroup.Producer.Type");

        undecorated.Should().NotThrow();
        undecorated().Should().BeFalse();
    }

    [PlatformConsumerRoutingKey("FirstGroup.*.*")]
    [PlatformConsumerRoutingKey("SecondGroup.*.*")]
    private sealed class TwoRoutingKeysConsumer;

    [PlatformConsumerRoutingKey("FirstGroup.*.*")]
    private class BaseRoutingKeyConsumer;

    private sealed class DerivedFromRoutingKeyConsumer : BaseRoutingKeyConsumer;

    private sealed class NoRoutingKeyConsumer;
}
