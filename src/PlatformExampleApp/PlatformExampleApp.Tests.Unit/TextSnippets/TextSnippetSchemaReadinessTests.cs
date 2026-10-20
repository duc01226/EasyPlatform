using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;

namespace PlatformExampleApp.Tests.Unit.TextSnippets;

public sealed class TextSnippetSchemaReadinessTests
{
    /// <summary>
    /// Repeated startup readiness must retain transient recovery while refusing incompatible schema immediately.
    /// Fail at scoped context resolution inside the readiness callback: no Mongo DDL or migration body is tested.
    /// </summary>
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    [Trait("TechnicalSpec", "TextSnippetRequiredSchemaReadiness")]
    public async Task RequiredSchemaReadiness_RetriesTransientFailureAndStopsOnPermanentRefusal(bool failTransientlyFirst)
    {
        var permanentRefusal = new InvalidOperationException("Required schema is incompatible");
        var resolutions = 0;
        var provider = new Mock<IServiceProvider>();
        provider.Setup(services => services.GetService(typeof(TextSnippetDbContext))).Returns(() =>
        {
            resolutions++;
            if (failTransientlyFirst && resolutions == 1)
                throw new TimeoutException("Transient readiness failure");
            throw permanentRefusal;
        });
        var scope = new Mock<IServiceScope>();
        scope.SetupGet(value => value.ServiceProvider).Returns(provider.Object);
        var module = new TextSnippetMongoPersistenceModule(provider.Object, new ConfigurationBuilder().Build());

        var initialize = () => module.InitializeDatabaseAsync(scope.Object);
        var failure = await initialize.Should().ThrowAsync<InvalidOperationException>();
        failure.Which.Should().BeSameAs(permanentRefusal, "permanent refusal must propagate without running normal initialization");
        resolutions.Should().Be(failTransientlyFirst ? 2 : 1, "only the transient failure may be retried");
    }
}
