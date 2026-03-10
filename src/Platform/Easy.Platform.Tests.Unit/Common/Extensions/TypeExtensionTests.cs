using Easy.Platform.Common.Extensions;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Extensions;

/// <summary>
/// Unit tests for <see cref="TypeExtension"/>.
/// </summary>
public class TypeExtensionTests : PlatformUnitTestBase
{
    private interface IGenericInterface<T>;

    private sealed class StringImpl : IGenericInterface<string>;

    private sealed class NonGenericClass;

    private sealed class MutableClass
    {
        public string? Name { get; set; }
    }

    private static class ConstHolder
    {
        public const string First = "A";
        public const string Second = "B";
        public const int Number = 42;
    }

    [Fact]
    public void IsAssignableToGenericType_MatchingInterface_ReturnsTrue()
    {
        typeof(StringImpl).IsAssignableToGenericType(typeof(IGenericInterface<>)).Should().BeTrue();
    }

    [Fact]
    public void IsAssignableToGenericType_NonMatching_ReturnsFalse()
    {
        typeof(NonGenericClass).IsAssignableToGenericType(typeof(IGenericInterface<>)).Should().BeFalse();
    }

    [Fact]
    public void IsAssignableToGenericType_ListToIEnumerable_ReturnsTrue()
    {
        typeof(List<int>).IsAssignableToGenericType(typeof(IEnumerable<>)).Should().BeTrue();
    }

    [Fact]
    public void GetNameOrGenericTypeName_NonGeneric_ReturnsName()
    {
        typeof(string).GetNameOrGenericTypeName().Should().Be("String");
    }

    [Fact]
    public void GetNameOrGenericTypeName_Generic_ReturnsFormattedName()
    {
        typeof(List<string>).GetNameOrGenericTypeName().Should().Be("List[String]");
    }

    [Fact]
    public void GetFullNameOrGenericTypeFullName_NonGeneric_ReturnsFullName()
    {
        typeof(int).GetFullNameOrGenericTypeFullName().Should().Be("System.Int32");
    }

    [Fact]
    public void GetFullNameOrGenericTypeFullName_Generic_ReturnsFormattedFullName()
    {
        var result = typeof(List<int>).GetFullNameOrGenericTypeFullName();

        result.Should().Contain("List<Int32>");
        result.Should().StartWith("System.Collections.Generic.");
    }

    [Fact]
    public void GetAllPublicConstantValues_StringConstants_ReturnsAll()
    {
        typeof(ConstHolder).GetAllPublicConstantValues<string>().Should().BeEquivalentTo(["A", "B"]);
    }

    [Fact]
    public void GetAllPublicConstantValues_IntConstants_ReturnsMatchingType()
    {
        typeof(ConstHolder).GetAllPublicConstantValues<int>().Should().BeEquivalentTo([42]);
    }

    [Fact]
    public void FindMatchedGenericType_Matching_ReturnsType()
    {
        var result = typeof(StringImpl).FindMatchedGenericType(typeof(IGenericInterface<>));

        result.Should().NotBeNull();
        result.Should().Be(typeof(IGenericInterface<string>));
    }

    [Fact]
    public void FindMatchedGenericType_NoMatch_ReturnsNull()
    {
        typeof(NonGenericClass).FindMatchedGenericType(typeof(IGenericInterface<>)).Should().BeNull();
    }

    [Fact]
    public void GetDefaultValue_ValueType_ReturnsDefault()
    {
        typeof(int).GetDefaultValue().Should().Be(0);
    }

    [Fact]
    public void GetDefaultValue_ReferenceType_ReturnsNull()
    {
        typeof(string).GetDefaultValue().Should().BeNull();
    }

    [Fact]
    public void IsMutableType_MutableClass_ReturnsTrue()
    {
        typeof(MutableClass).IsMutableType().Should().BeTrue();
    }

    [Theory]
    [InlineData(typeof(string), false)]
    [InlineData(typeof(int), false)]
    public void IsMutableType_ImmutableTypes_ReturnsFalse(Type type, bool expected)
    {
        type.IsMutableType().Should().Be(expected);
    }

    [Fact]
    public void IsAnonymousType_AnonymousObject_ReturnsTrue()
    {
        var anon = new { Name = "test" };

        anon.GetType().IsAnonymousType().Should().BeTrue();
    }

    [Fact]
    public void IsAnonymousType_RegularClass_ReturnsFalse()
    {
        typeof(MutableClass).IsAnonymousType().Should().BeFalse();
    }

    [Theory]
    [InlineData(typeof(int), true)]
    [InlineData(typeof(decimal), true)]
    [InlineData(typeof(float), true)]
    [InlineData(typeof(string), false)]
    public void IsNumericType_ReturnsExpected(Type type, bool expected)
    {
        type.IsNumericType().Should().Be(expected);
    }

    [Fact]
    public void IsNumericType_NullableDouble_ReturnsTrue()
    {
        typeof(double?).IsNumericType().Should().BeTrue();
    }

    [Fact]
    public void MatchGenericArguments_MatchingArgs_ReturnsTrue()
    {
        typeof(IGenericInterface<string>).MatchGenericArguments(typeof(IGenericInterface<string>)).Should().BeTrue();
    }

    [Fact]
    public void MatchGenericArguments_NonGenericTarget_ReturnsFalse()
    {
        typeof(IGenericInterface<string>).MatchGenericArguments(typeof(NonGenericClass)).Should().BeFalse();
    }
}
