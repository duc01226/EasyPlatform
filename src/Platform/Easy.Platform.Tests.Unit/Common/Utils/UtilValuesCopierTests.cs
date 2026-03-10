using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Utils;

/// <summary>
/// Unit tests for <see cref="Util.ValuesCopier"/>.
/// </summary>
public sealed class UtilValuesCopierTests : PlatformUnitTestBase
{
    private sealed class SourcePoco
    {
        public string Name { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Email { get; set; } = string.Empty;
    }

    private sealed class TargetPoco
    {
        public string Name { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Email { get; set; } = string.Empty;
    }

    [Fact]
    public void CopyValues_MatchingProperties_CopiesAllValues()
    {
        var source = new SourcePoco { Name = "Alice", Age = 30, Email = "alice@test.com" };
        var target = new TargetPoco();

        Util.ValuesCopier.CopyValues(source, target);

        target.Name.Should().Be("Alice");
        target.Age.Should().Be(30);
        target.Email.Should().Be("alice@test.com");
    }

    [Fact]
    public void CopyValues_WithIgnoredProperties_SkipsIgnored()
    {
        var source = new SourcePoco { Name = "Bob", Age = 25, Email = "bob@test.com" };
        var target = new TargetPoco { Email = "original@test.com" };

        Util.ValuesCopier.CopyValues(source, target, s => s.Email);

        target.Name.Should().Be("Bob");
        target.Age.Should().Be(25);
        target.Email.Should().Be("original@test.com");
    }

    [Fact]
    public void CopyValues_OverwritesExistingValues()
    {
        var source = new SourcePoco { Name = "New", Age = 99, Email = "new@test.com" };
        var target = new TargetPoco { Name = "Old", Age = 1, Email = "old@test.com" };

        Util.ValuesCopier.CopyValues(source, target);

        target.Name.Should().Be("New");
        target.Age.Should().Be(99);
        target.Email.Should().Be("new@test.com");
    }

    [Fact]
    public void CopyValues_NullSource_ThrowsArgumentNullException()
    {
        var target = new TargetPoco();

        var act = () => Util.ValuesCopier.CopyValues<SourcePoco, TargetPoco>(null!, target);

        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void CopyValues_MultipleIgnoredProperties_SkipsAll()
    {
        var source = new SourcePoco { Name = "Charlie", Age = 40, Email = "c@test.com" };
        var target = new TargetPoco { Name = "Keep", Age = 0, Email = "keep@test.com" };

        Util.ValuesCopier.CopyValues(source, target, s => s.Name, s => s.Email);

        target.Name.Should().Be("Keep");
        target.Age.Should().Be(40);
        target.Email.Should().Be("keep@test.com");
    }

    [Fact]
    public void CopyValues_SameValues_DoesNotThrow()
    {
        var source = new SourcePoco { Name = "Same", Age = 10, Email = "same@test.com" };
        var target = new TargetPoco { Name = "Same", Age = 10, Email = "same@test.com" };

        var act = () => Util.ValuesCopier.CopyValues(source, target);

        act.Should().NotThrow();
        target.Name.Should().Be("Same");
    }
}
