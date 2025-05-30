#region

using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Infrastructures.Caching;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PlatformExampleApp.TextSnippet.Application.RequestContext;
using PlatformExampleApp.TextSnippet.Domain;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.TextSnippet.Application;

public class TextSnippetApplicationModule : PlatformApplicationModule
{
    public TextSnippetApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration)
    {
    }

    /// <summary>
    /// Override this to true to auto register default caching module, which include default memory caching repository.
    /// <br></br>
    /// Don't need to auto register if you have register a caching module manually
    /// </summary>
    protected override bool EnableDefaultCachingModule => false;

    public override List<Func<IConfiguration, Type>> GetDependentModuleTypes()
    {
        var result = new List<Func<IConfiguration, Type>> { p => typeof(TextSnippetDomainModule) };
        return result;
    }

    // Your application can either override factory method DefaultApplicationSettingContextFactory to register default PlatformApplicationSettingContext
    // or just declare a class implement IPlatformApplicationSettingContext in project to use. It will be automatically registered.
    // Example that the class TextSnippetApplicationSettingContext has replace the default application setting
    protected override PlatformApplicationSettingContext DefaultApplicationSettingContextFactory(IServiceProvider serviceProvider)
    {
        return new PlatformApplicationSettingContext(serviceProvider)
        {
            ApplicationName = TextSnippetApplicationConstants.ApplicationName,
            ApplicationAssembly = Assembly,
            IsDebugInformationMode =
                serviceProvider.GetRequiredService<IConfiguration>().GetValue<bool?>(PlatformApplicationSettingContext.DefaultIsDebugInformationModeConfigurationKey) ==
                true
        };
    }

    // Example Override this to set the whole application default JsonSerializerOptions for PlatformJsonSerializer.CurrentOptions
    // The platform use PlatformJsonSerializer.CurrentOptions for every Json Serialization Tasks
    //protected override JsonSerializerOptions ProvideCustomJsonSerializerOptions()
    //{
    //    return PlatformJsonSerializer.BuildDefaultOptions(
    //        useCamelCaseNaming: false,
    //        useJsonStringEnumConverter: false,
    //        customConverters: new List<JsonConverter>()
    //        {
    //            /* Your custom converters if existed*/
    //        });
    //}

    // Demo override to config inbox/outbox config
    protected override PlatformInboxConfig InboxConfigProvider(IServiceProvider serviceProvider)
    {
        return base.InboxConfigProvider(serviceProvider).With(c => c.MaxStoreProcessedMessageCount = 100);
    }

    // Demo override to config inbox/outbox config
    protected override PlatformOutboxConfig OutboxConfigProvider(IServiceProvider serviceProvider)
    {
        return base.OutboxConfigProvider(serviceProvider).With(c => c.MaxStoreProcessedMessageCount = 100);
    }

    protected override Dictionary<string, Func<IServiceProvider, IPlatformApplicationRequestContextAccessor, Task<object?>>>
        LazyLoadRequestContextAccessorRegistersFactory()
    {
        return new Dictionary<string, Func<IServiceProvider, IPlatformApplicationRequestContextAccessor, Task<object?>>>
        {
            { ApplicationCustomRequestContextKeys.CurrentUserKey, GetCurrentUser }
        };
    }

    /// <summary>
    /// Factory method to lazily load the current user from the database with caching.
    /// This demonstrates the LazyLoadRequestContextAccessorRegistersFactory pattern:
    /// 1. Executes only when first accessed during the request
    /// 2. Caches the result for subsequent access within the same request
    /// 3. Uses distributed cache for performance optimization
    /// 4. Supports tag-based cache invalidation
    /// </summary>
    private static async Task<object?> GetCurrentUser(IServiceProvider provider, IPlatformApplicationRequestContextAccessor accessor)
    {
        return await provider.ExecuteInjectScopedAsync<UserEntity?>(async (
                ITextSnippetRootRepository<UserEntity> userRepository,
                IPlatformCacheRepositoryProvider cacheRepositoryProvider) =>
            {
                var requestContext = accessor.Current;

                // Get user ID from request context (this would typically come from JWT token or session)
                var currentUserId = requestContext.GetValue<string>("UserId");
                if (string.IsNullOrEmpty(currentUserId))
                {
                    // For demo purposes, return a mock user if no user ID is found
                    return new UserEntity
                    {
                        Id = "demo-user-123",
                        FirstName = "Demo",
                        LastName = "User",
                        Email = "demo.user@example.com",
                        DepartmentId = "IT",
                        DepartmentName = "Information Technology",
                        IsActive = true
                    };
                } // Use CacheRequestAsync for elegant cache-or-fetch pattern

                return await cacheRepositoryProvider
                    .Get()
                    .CacheRequestAsync(
                        () => userRepository.FirstOrDefaultAsync(predicate: u => u.Id == currentUserId && u.IsActive, cancellationToken: CancellationToken.None),
                        ApplicationCustomRequestContextKeys.CurrentUserCacheKey(currentUserId),
                        (PlatformCacheEntryOptions?)null,
                        tags: ApplicationCustomRequestContextKeys.CurrentUserCacheTags(currentUserId)
                    );
            }
        );
    }
}
