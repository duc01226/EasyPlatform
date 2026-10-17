using Easy.Platform.Infrastructures.FileStorage;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Infrastructures.FileStorage;

public class PlatformBlobUriRewriterTests : PlatformUnitTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    public void Rewrite_WhenFromEqualsTo_ShouldReturnUriUnchanged()
    {
        // Deployed envs + local IDE: connection-string account host == configured public endpoint => no-op.
        var blobUri = new Uri("https://account.blob.core.windows.net/container/avatars/photo.png");

        var result = PlatformBlobUriRewriter.Rewrite(
            "https://account.blob.core.windows.net/",
            "https://account.blob.core.windows.net/",
            blobUri);

        result.AbsoluteUri.Should().Be(blobUri.AbsoluteUri);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    public void Rewrite_WhenInternalToPublic_ShouldRewriteHostAndPreservePath()
    {
        // Local Docker emit path: SDK connects via internal "azurite" host, client must receive host-visible "127.0.0.1".
        var blobUri = new Uri("http://azurite:10000/devstoreaccount1/candidate-files/avatars/photo.png");

        var result = PlatformBlobUriRewriter.Rewrite(
            "http://azurite:10000/devstoreaccount1/",
            "http://127.0.0.1:10000/devstoreaccount1/",
            blobUri);

        result.AbsoluteUri.Should().Be("http://127.0.0.1:10000/devstoreaccount1/candidate-files/avatars/photo.png");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-003")]
    public void Rewrite_WhenPublicToInternal_ShouldRewriteHostAndPreservePath()
    {
        // Server re-fetch path (reverse of emit): a stored host-visible "127.0.0.1" URL must be rewritten back to the
        // internal "azurite" SDK host so the server-side HttpClient can reach Azurite inside the Docker network.
        var storedPublicUri = new Uri("http://127.0.0.1:10000/devstoreaccount1/candidate-files/cv/resume.pdf");

        var result = PlatformBlobUriRewriter.Rewrite(
            "http://127.0.0.1:10000/devstoreaccount1/",
            "http://azurite:10000/devstoreaccount1/",
            storedPublicUri);

        result.AbsoluteUri.Should().Be("http://azurite:10000/devstoreaccount1/candidate-files/cv/resume.pdf");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-003")]
    public void Rewrite_WhenSasQueryPresent_ShouldPreserveSasQueryAfterRewrite()
    {
        // SAS signature is computed over the blob path + account, not the host, so it stays valid after a host swap.
        var storedPublicUri = new Uri("http://127.0.0.1:10000/devstoreaccount1/candidate-files/cv.pdf?sv=2021-08-06&sig=abc%2Bdef&se=2026-01-01T00%3A00%3A00Z");

        var result = PlatformBlobUriRewriter.Rewrite(
            "http://127.0.0.1:10000/devstoreaccount1",
            "http://azurite:10000/devstoreaccount1",
            storedPublicUri);

        result.AbsoluteUri.Should().Be("http://azurite:10000/devstoreaccount1/candidate-files/cv.pdf?sv=2021-08-06&sig=abc%2Bdef&se=2026-01-01T00%3A00%3A00Z");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Rewrite_WhenToEndpointMissing_ShouldReturnUriUnchanged(string? toEndpoint)
    {
        var blobUri = new Uri("http://127.0.0.1:10000/devstoreaccount1/container/file.png");

        var result = PlatformBlobUriRewriter.Rewrite(
            "http://127.0.0.1:10000/devstoreaccount1/",
            toEndpoint,
            blobUri);

        result.AbsoluteUri.Should().Be(blobUri.AbsoluteUri);
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Rewrite_WhenFromEndpointMissing_ShouldReturnUriUnchanged(string? fromEndpoint)
    {
        // Guards the empty-prefix trap: StartsWith("") is always true, so a missing fromEndpoint must NOT rewrite everything.
        var blobUri = new Uri("http://127.0.0.1:10000/devstoreaccount1/container/file.png");

        var result = PlatformBlobUriRewriter.Rewrite(
            fromEndpoint,
            "http://azurite:10000/devstoreaccount1/",
            blobUri);

        result.AbsoluteUri.Should().Be(blobUri.AbsoluteUri);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    public void Rewrite_WhenUriDoesNotStartWithFromEndpoint_ShouldReturnUriUnchanged()
    {
        // Defensive: a URI from an unrelated host must never be rewritten onto the target endpoint.
        var blobUri = new Uri("https://other-host.example.com/container/file.png");

        var result = PlatformBlobUriRewriter.Rewrite(
            "https://account.blob.core.windows.net/",
            "https://public.example.com/storage/",
            blobUri);

        result.AbsoluteUri.Should().Be(blobUri.AbsoluteUri);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-003")]
    public void TryRewrite_WhenUriDoesNotStartWithFromEndpoint_ShouldReturnFalse()
    {
        var blobUri = new Uri("https://other-host.example.com/container/file.png");

        var wasRewritten = PlatformBlobUriRewriter.TryRewrite(
            "https://account.blob.core.windows.net/",
            "https://public.example.com/storage/",
            blobUri,
            out var result);

        wasRewritten.Should().BeFalse();
        result.AbsoluteUri.Should().Be(blobUri.AbsoluteUri);
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    [Trait("TechnicalSpec", "TC-SUP-INF-003")]
    [InlineData("http://azurite:10000/devstoreaccount10/container/file.png")]
    [InlineData("http://azurite:10000/devstoreaccount1-sibling/container/file.png")]
    [InlineData("http://azurite:10000/devstoreaccount1x/container/file.png")]
    public void Rewrite_WhenUriOnlySharesAdjacentPrefix_ShouldReturnUriUnchanged(string uriText)
    {
        var blobUri = new Uri(uriText);

        var result = PlatformBlobUriRewriter.Rewrite(
            "http://azurite:10000/devstoreaccount1/",
            "http://127.0.0.1:10000/devstoreaccount1/",
            blobUri);

        result.AbsoluteUri.Should().Be(blobUri.AbsoluteUri);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-003")]
    public void GetBlobEndpointFromConnectionString_WhenBlobEndpointPresent_ShouldReturnConfiguredBlobEndpoint()
    {
        var connectionString =
            "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=fake;BlobEndpoint=http://azurite:10000/devstoreaccount1;QueueEndpoint=http://azurite:10001/devstoreaccount1;";

        var result = PlatformBlobUriRewriter.GetBlobEndpointFromConnectionString(connectionString);

        result.Should().Be("http://azurite:10000/devstoreaccount1");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-003")]
    public void GetBlobEndpointFromConnectionString_WhenOnlyEndpointSuffixPresent_ShouldDeriveAzureBlobEndpoint()
    {
        var connectionString = "DefaultEndpointsProtocol=https;AccountName=examplestorage;AccountKey=fake;EndpointSuffix=core.windows.net";

        var result = PlatformBlobUriRewriter.GetBlobEndpointFromConnectionString(connectionString);

        result.Should().Be("https://examplestorage.blob.core.windows.net/");
    }
}
