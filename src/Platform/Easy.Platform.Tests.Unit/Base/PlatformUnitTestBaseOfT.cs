using AutoFixture;
using Moq;

namespace Easy.Platform.Tests.Unit.Base;

/// <summary>
/// Generic base class that auto-creates the System Under Test (SUT) with all dependencies mocked.
/// AutoFixture.AutoMoq resolves constructor parameters automatically.
/// When SUT gains new dependencies, tests don't break.
/// </summary>
/// <typeparam name="TSut">The type of the system under test.</typeparam>
public abstract class PlatformUnitTestBase<TSut> : PlatformUnitTestBase where TSut : class
{
    protected PlatformUnitTestBase()
    {
        Sut = CreateSut();
    }

    /// <summary>
    /// The system under test, auto-created with mocked dependencies via AutoFixture.AutoMoq.
    /// </summary>
    protected TSut Sut { get; }

    /// <summary>
    /// Retrieve the mock for a dependency of the SUT.
    /// Use this to setup return values or verify interactions.
    /// </summary>
    /// <typeparam name="TDependency">The dependency interface type.</typeparam>
    protected Mock<TDependency> GetMock<TDependency>() where TDependency : class
    {
        return Fixture.Create<Mock<TDependency>>();
    }

    /// <summary>
    /// Override to create the SUT manually if AutoFixture defaults aren't sufficient.
    /// </summary>
    protected virtual TSut CreateSut() => Fixture.Create<TSut>();
}
