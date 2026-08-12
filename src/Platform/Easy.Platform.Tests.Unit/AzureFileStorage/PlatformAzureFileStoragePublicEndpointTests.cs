using Azure.Core;
using Azure.Storage.Blobs;
using Easy.Platform.AzureFileStorage;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.AzureFileStorage;

public class PlatformAzureFileStoragePublicEndpointTests : PlatformUnitTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    public void PublicBlobEndpoint_WhenOnlyLegacyBlobEndpointConfigured_ShouldReturnLegacyEndpoint()
    {
        var configuration = new PlatformAzureFileStorageConfiguration
        {
            BlobEndpoint = "https://legacy.blob.core.windows.net/"
        };

        configuration.GetPublicBlobEndpoint().Should().Be("https://legacy.blob.core.windows.net/");
        configuration.PublicBlobEndpoint.Should().Be("https://legacy.blob.core.windows.net/");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    public void BlobEndpoint_WhenOnlyPublicEndpointConfigured_ShouldReturnPublicEndpoint()
    {
        var configuration = new PlatformAzureFileStorageConfiguration
        {
            PublicBlobEndpoint = "https://public.example.com/storage/"
        };

        configuration.BlobEndpoint.Should().Be("https://public.example.com/storage/");
        configuration.GetPublicBlobEndpoint().Should().Be("https://public.example.com/storage/");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    public void BuildPublicAbsoluteUri_ShouldUsePublicEndpointRootDirectoryAndBlobPath()
    {
        var result = PlatformAzureFileStorageFileItem.BuildPublicAbsoluteUri(
            "https://public.example.com/storage/",
            "/candidate-files/",
            "/avatars/photo.png");

        result.AbsoluteUri.Should().Be("https://public.example.com/storage/candidate-files/avatars/photo.png");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    public void DirectoryAbsoluteUri_WhenPublicEndpointConfigured_ShouldUsePublicEndpointAndContainerName()
    {
        var blobContainer = new BlobContainerClient(new Uri("https://internal.blob.core.windows.net/candidate-files"));

        var directory = new PlatformAzureFileStorageDirectory(
            blobContainer,
            "avatars",
            "https://public.example.com/storage/");

        directory.DirectoryAbsoluteUri.Should().Be("https://public.example.com/storage/candidate-files");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    public void ToPublicBlobUri_WhenInternalEqualsPublic_ShouldReturnUriUnchanged()
    {
        // Deployed envs + local IDE: connection-string account host == configured public endpoint => no-op.
        var blobUri = new Uri("https://account.blob.core.windows.net/container/avatars/photo.png");

        var result = PlatformAzureFileStorageService.ToPublicBlobUri(
            "https://account.blob.core.windows.net/",
            "https://account.blob.core.windows.net/",
            blobUri);

        result.AbsoluteUri.Should().Be(blobUri.AbsoluteUri);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    public void ToPublicBlobUri_WhenInternalDiffersFromPublic_ShouldRewriteHostAndPreservePath()
    {
        // Local Docker: SDK connects via internal "azurite" host, client must receive host-visible "127.0.0.1".
        var blobUri = new Uri("http://azurite:10000/devstoreaccount1/candidate-files/avatars/photo.png");

        var result = PlatformAzureFileStorageService.ToPublicBlobUri(
            "http://azurite:10000/devstoreaccount1/",
            "http://127.0.0.1:10000/devstoreaccount1/",
            blobUri);

        result.AbsoluteUri.Should().Be("http://127.0.0.1:10000/devstoreaccount1/candidate-files/avatars/photo.png");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    public void ToPublicBlobUri_WhenSasQueryPresent_ShouldPreserveSasQueryAfterRewrite()
    {
        var blobUri = new Uri("http://azurite:10000/devstoreaccount1/candidate-files/cv.pdf?sv=2021-08-06&sig=abc%2Bdef&se=2026-01-01T00%3A00%3A00Z");

        var result = PlatformAzureFileStorageService.ToPublicBlobUri(
            "http://azurite:10000/devstoreaccount1",
            "http://127.0.0.1:10000/devstoreaccount1",
            blobUri);

        result.AbsoluteUri.Should().Be("http://127.0.0.1:10000/devstoreaccount1/candidate-files/cv.pdf?sv=2021-08-06&sig=abc%2Bdef&se=2026-01-01T00%3A00%3A00Z");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ToPublicBlobUri_WhenNoPublicEndpointConfigured_ShouldReturnUriUnchanged(string? publicBlobEndpoint)
    {
        var blobUri = new Uri("http://127.0.0.1:10000/devstoreaccount1/container/file.png");

        var result = PlatformAzureFileStorageService.ToPublicBlobUri(
            "http://127.0.0.1:10000/devstoreaccount1/",
            publicBlobEndpoint,
            blobUri);

        result.AbsoluteUri.Should().Be(blobUri.AbsoluteUri);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-001")]
    public void ToPublicBlobUri_WhenUriDoesNotStartWithInternalEndpoint_ShouldReturnUriUnchanged()
    {
        // Defensive: a URI from an unrelated host must never be rewritten onto the public endpoint.
        var blobUri = new Uri("https://other-host.example.com/container/file.png");

        var result = PlatformAzureFileStorageService.ToPublicBlobUri(
            "https://account.blob.core.windows.net/",
            "https://public.example.com/storage/",
            blobUri);

        result.AbsoluteUri.Should().Be(blobUri.AbsoluteUri);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-SUP-INF-002")]
    public void CreateBlobClientOptions_ShouldUseExplicitRetryAndTimeoutPolicy()
    {
        var options = PlatformAzureFileStorageModule.CreateBlobClientOptions();

        options.Retry.Mode.Should().Be(RetryMode.Exponential);
        options.Retry.MaxRetries.Should().Be(PlatformAzureFileStorageModule.DefaultBlobClientRetryMaxRetries);
        options.Retry.Delay.Should().Be(PlatformAzureFileStorageModule.DefaultBlobClientRetryDelay);
        options.Retry.MaxDelay.Should().Be(PlatformAzureFileStorageModule.DefaultBlobClientRetryMaxDelay);
        options.Retry.NetworkTimeout.Should().Be(PlatformAzureFileStorageModule.DefaultBlobClientNetworkTimeout);
    }
}
