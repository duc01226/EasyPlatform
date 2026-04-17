#region

using Easy.Platform.AutomationTest.IntegrationTests;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.IntegrationTests.CrossService;

/// <summary>
/// Cross-service integration tests demonstrating the <see cref="PlatformCrossServiceFixture"/> pattern.
///
/// <para>
/// <strong>POC Reference — PlatformCrossServiceFixture Pattern:</strong>
/// In production (e.g., Accounts → Growth), each service boots its own DI container.
/// The producer service writes data; a real message bus event propagates to the consumer;
/// WaitUntilAsync polls the consumer's DB until the data arrives.
///
/// This POC uses two module subclasses of the same TextSnippet service, so both containers
/// share the same physical database — but the structural pattern (two independent ServiceProviders,
/// sequential fixture init, WaitUntilAsync for data-visibility assertions) is production-identical.
/// </para>
///
/// <para>
/// <strong>Container isolation:</strong>
/// ProducerServiceProvider and ConsumerServiceProvider are distinct object references because
/// <c>PlatformServiceIntegrationTestBase&lt;TModule&gt;.ServiceProvider</c> is a static field
/// keyed on the closed generic type parameter. Different module subclasses → different containers.
/// </para>
/// </summary>
[Collection(TextSnippetCrossServiceIntegrationTestCollection.Name)]
[Trait("Category", "CrossService")]
public class TextSnippetCrossServiceIntegrationTests
{
    private readonly TextSnippetCrossServiceFixture fixture;

    public TextSnippetCrossServiceIntegrationTests(TextSnippetCrossServiceFixture fixture)
    {
        this.fixture = fixture;
    }

    /// <summary>
    /// Data written by the producer ServiceProvider is eventually visible when read
    /// via the consumer ServiceProvider, verified using WaitUntilAsync.
    ///
    /// <para>
    /// <strong>Cross-service data-visibility pattern:</strong>
    /// Producer writes a snippet → consumer polls its own DB copy until the snippet appears.
    /// WaitUntilAsync is mandatory here: in real cross-service flows the data propagates
    /// asynchronously via message bus. Even in this single-DB POC the pattern is preserved
    /// to document the mandatory cross-service assertion approach.
    /// </para>
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-029")]
    public async Task ProducerWritesSnippet_ConsumerShouldReadItEventually()
    {
        // Arrange — producer context setup
        var snippetText = IntegrationTestHelper.UniqueName("CrossSvc");
        string snippetId = null!;

        // Act — producer creates a snippet directly via its own DI container
        using (var producerScope = fixture.ProducerServiceProvider.CreateScope())
        {
            var repo = producerScope.ServiceProvider
                .GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();
            var entity = TextSnippetEntity.Create(Ulid.NewUlid().ToString(), snippetText, "cross-service full text");
            await repo.CreateAsync(entity);
            snippetId = entity.Id;
        }

        snippetId.Should().NotBeNullOrEmpty("producer must create the entity and expose its ID");

        // Assert — consumer reads the snippet via its own ServiceProvider
        // WaitUntilAsync is the mandatory pattern for cross-service data-visibility assertions.
        // In a real flow (Accounts → Growth), this waits for the message bus consumer to write to Growth DB.
        // Here both SPs share one DB, so data is already present — but the pattern remains correct.
        await PlatformIntegrationTestHelper.WaitUntilAsync(
            async () =>
            {
                using var scope = fixture.ConsumerServiceProvider.CreateScope();
                var repo = scope.ServiceProvider
                    .GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();

                var entity = await repo.GetByIdAsync(snippetId);

                entity.Should().NotBeNull(
                    $"Consumer DB must contain snippet '{snippetId}' created by the producer");
                entity!.SnippetText.Should().Be(snippetText,
                    "Consumer must see the same SnippetText that the producer wrote");
            },
            timeout: TimeSpan.FromSeconds(10),
            pollingInterval: TimeSpan.FromMilliseconds(500),
            timeoutMessage: $"Consumer did not see snippet '{snippetId}' within timeout");
    }

    /// <summary>
    /// ProducerServiceProvider and ConsumerServiceProvider are different object instances,
    /// confirming that the cross-service fixture creates independent DI containers.
    ///
    /// <para>
    /// <strong>Container isolation invariant:</strong>
    /// This is a structural assertion — not a domain concern. It validates that the
    /// PlatformCrossServiceFixture pattern correctly isolates containers per module type,
    /// which is the foundation guarantee that makes cross-service tests meaningful.
    /// </para>
    /// </summary>
    [Fact]
    [Trait("TestSpec", "TC-EXAMPLE-030")]
    public void ProducerAndConsumerFixtures_ShouldHaveDistinctServiceProviders()
    {
        // Assert — the two ServiceProviders must be separate object instances
        // because PlatformServiceIntegrationTestBase<TModule>.ServiceProvider is a static
        // keyed on the closed generic type — different module subclasses → different statics.
        fixture.ProducerServiceProvider.Should().NotBeNull(
            "ProducerServiceProvider must be initialized by TextSnippetCrossServiceProducerFixture");

        fixture.ConsumerServiceProvider.Should().NotBeNull(
            "ConsumerServiceProvider must be initialized by TextSnippetCrossServiceConsumerFixture");

        fixture.ProducerServiceProvider.Should().NotBeSameAs(
            fixture.ConsumerServiceProvider,
            "Producer and Consumer must be independent DI container instances — " +
            "they are keyed on different closed generic module types in PlatformServiceIntegrationTestBase<TModule>");
    }
}
