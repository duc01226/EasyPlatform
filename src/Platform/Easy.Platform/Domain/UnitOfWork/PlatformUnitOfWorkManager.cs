#region

using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using Easy.Platform.Application;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Persistence.Domain;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Domain.UnitOfWork;

/// <summary>
/// Unit of work manager.
/// Used to begin and control a unit of work.
/// </summary>
public interface IPlatformUnitOfWorkManager : IDisposable
{
    public static readonly ActivitySource ActivitySource = new($"{nameof(IPlatformUnitOfWorkManager)}");

    /// <summary>
    /// A single separated global uow in current scoped is used by repository for read data using query, usually when need to return data
    /// as enumerable to help download data like streaming data (not load all big data into ram) <br />
    /// or any other purpose that just want to using query directly without think about uow of the query. <br />
    /// This uow is auto created once per scope when access it. <br />
    /// This won't affect the normal current uow queue list when Begin a new uow.
    /// </summary>
    public IPlatformUnitOfWork GlobalScopedUow { get; }

    /// <summary>
    /// Provides access to the CQRS (Command Query Responsibility Segregation) instance that shares the same scope as the unit of work manager.
    /// This property allows handlers and repositories to access the CQRS functionality within the same DI scope, enabling proper coordination
    /// between command/query processing and unit of work management.
    /// </summary>
    /// <remarks>
    /// The CQRS instance is lazily loaded to ensure proper dependency resolution within the current scope.
    /// This is particularly useful in application handlers that need to dispatch additional commands or queries
    /// while maintaining transactional consistency with the current unit of work context.
    /// </remarks>
    public IPlatformCqrs CurrentSameScopeCqrs { get; }

    /// <summary>
    /// Just create and return a new instance of uow without manage it. It will not affect to <see cref="HasCurrentActiveUow" /> result
    /// </summary>
    public IPlatformUnitOfWork CreateNewUow(bool isUsingOnceTransientUow);

    /// <summary>
    /// Gets last unit of work (or null if not exists).
    /// </summary>
    [return: MaybeNull]
    public IPlatformUnitOfWork CurrentUow();

    /// <summary>
    /// Gets currently latest active unit of work.
    /// <exception cref="Exception">Throw exception if there is not active unit of work.</exception>
    /// </summary>
    public IPlatformUnitOfWork CurrentActiveUow();

    public async Task TryCurrentActiveUowSaveChangesAsync()
    {
        var currentActiveUow = TryGetCurrentActiveUow();

        if (currentActiveUow != null)
            await currentActiveUow.SaveChangesAsync();
    }

    /// <summary>
    /// Gets currently latest or created active unit of work has id equal uowId.
    /// <exception cref="Exception">Throw exception if there is not active unit of work.</exception>
    /// </summary>
    public IPlatformUnitOfWork CurrentOrCreatedActiveUow(string uowId);

    /// <summary>
    /// Gets currently latest active unit of work of type <see cref="TUnitOfWork" />.
    /// <exception cref="Exception">Throw exception if there is not active unit of work.</exception>
    /// </summary>
    /// <remarks>
    /// The method is used to retrieve the latest active unit of work of a specific type from the current scope. A unit of work, in this context, represents a transactional set of operations that are either all committed or all rolled back.
    /// <br />
    /// This method is particularly useful when you have different types of units of work and you need to retrieve the current active one of a specific type. For instance, you might have different types of units of work for handling different domains or different types of database transactions.
    /// <br />
    /// The method will throw an exception if there is no active unit of work of the specified type. This ensures that the method always returns a valid, active unit of work of the specified type, or fails explicitly, preventing silent failures or unexpected behavior due to a missing or inactive unit of work.
    /// <br />
    /// In the PlatformUnitOfWorkManager class, this method is implemented by first retrieving the current unit of work and then checking if it is of the specified type and if it is active. If these conditions are not met, an exception is thrown.
    /// </remarks>
    public TUnitOfWork CurrentActiveUowOfType<TUnitOfWork>()
        where TUnitOfWork : class, IPlatformUnitOfWork;

    /// <summary>
    /// Gets currently latest active unit of work. Return null if no active uow
    /// </summary>
    [return: MaybeNull]
    public IPlatformUnitOfWork? TryGetCurrentActiveUow();

    /// <summary>
    /// Gets currently latest or created active unit of work has id equal uowId. Return null if no active uow
    /// </summary>
    [return: MaybeNull]
    public IPlatformUnitOfWork? TryGetCurrentOrCreatedActiveUow(string uowId);

    /// <summary>
    /// Gets currently latest active unit of work has id equal uowId. Return null if no active uow
    /// </summary>
    [return: MaybeNull]
    public IPlatformUnitOfWork? TryGetCurrentActiveUow(string uowId);

    /// <summary>
    /// Check that is there any currently latest active unit of work
    /// </summary>
    public bool HasCurrentActiveUow();

    /// <summary>
    /// Check that is there any currently latest or created active unit of work has id equal uowId
    /// </summary>
    public bool HasCurrentOrCreatedActiveUow(string uowId);

    /// <summary>
    /// Start a new unit of work. <br />
    /// If current active unit of work is existing, return it. <br />
    /// When suppressCurrentUow=true, new uow will be created even if current uow is existing. When false, use
    /// current active uow if possible. <br />
    /// Default is true.
    /// </summary>
    /// <param name="suppressCurrentUow">If set to true, a new unit of work will be created even if a current unit of work exists. If set to false, the current active unit of work will be used if possible. Default value is true.</param>
    /// <returns>Returns an instance of the unit of work.</returns>
    /// <remarks>
    /// The Begin method in the IUnitOfWorkManager interface is used to start a new unit of work in the context of the application. A unit of work, in this context, represents a transactional boundary for operations that need to be executed together.
    /// <br />
    /// The Begin method takes a boolean parameter suppressCurrentUow which, when set to true, forces the creation of a new unit of work even if there is an existing active unit of work. If set to false, the method will use the current active unit of work if one exists. By default, this parameter is set to true.
    /// <br />
    /// This method is used in various parts of the application where a set of operations need to be executed within a transactional boundary.
    /// <br />
    /// In these classes, the Begin method is used to start a unit of work, after which various operations are performed. Once all operations are completed, the unit of work is completed by calling the CompleteAsync method on the unit of work instance. This ensures that all operations within the unit of work are executed as a single transaction.
    /// </remarks>
    public IPlatformUnitOfWork Begin(bool suppressCurrentUow = true);

    /// <summary>
    /// Executes a task within the context of a unit of work.
    /// </summary>
    /// <param name="taskFn">The task function to execute.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// This method ensures that the provided task runs within a unit of work context:
    /// - If a current active UoW already exists, the task is executed within that context and SaveChangesAsync is called.
    /// - If no active UoW exists, a new UoW is created, the task is executed, and then the UoW is completed and disposed.
    ///
    /// This provides a clean pattern for ensuring database operations are properly wrapped in a transaction,
    /// without requiring the caller to explicitly manage the UoW lifecycle.
    /// </remarks>
    public async Task ExecuteUowTask(Func<Task> taskFn)
    {
        var currentActiveUow = TryGetCurrentActiveUow();

        if (currentActiveUow != null)
        {
            await taskFn();
            await currentActiveUow.SaveChangesAsync();
        }
        else
        {
            using (var uow = Begin())
            {
                await taskFn();
                await uow.CompleteAsync();
            }
        }
    }

    /// <summary>
    /// Executes a task that returns a result within the context of a unit of work.
    /// </summary>
    /// <typeparam name="TResult">The type of result returned by the task.</typeparam>
    /// <param name="taskFn">The task function to execute that returns a result.</param>
    /// <returns>A task representing the asynchronous operation with the result value.</returns>
    /// <remarks>
    /// This method is similar to ExecuteUowTask but works with tasks that return a result:
    /// - If a current active UoW already exists, the task is executed within that context, SaveChangesAsync is called,
    ///   and the result is returned.
    /// - If no active UoW exists, a new UoW is created, the task is executed, the UoW is completed and disposed,
    ///   and the result is returned.
    ///
    /// This provides a clean pattern for ensuring database operations are properly wrapped in a transaction,
    /// without requiring the caller to explicitly manage the UoW lifecycle.
    /// </remarks>
    public async Task<TResult> ExecuteUowTask<TResult>(Func<Task<TResult>> taskFn)
    {
        var currentActiveUow = TryGetCurrentActiveUow();

        if (currentActiveUow != null)
        {
            var result = await taskFn();
            await currentActiveUow.SaveChangesAsync();

            return result;
        }

        using (var uow = Begin())
        {
            var result = await taskFn();
            await uow.CompleteAsync();

            return result;
        }
    }

    IPlatformRootServiceProvider GetRootServiceProvider();

    IServiceProvider GetServiceProvider();

    /// <summary>
    /// Executes a method in a new scope with scrolling pagination, handling large data sets efficiently.
    /// </summary>
    /// <typeparam name="TItem">The type of items being returned in the list.</typeparam>
    /// <param name="method">The delegate method to execute.</param>
    /// <param name="maxExecutionCount">The maximum number of executions to perform.</param>
    /// <param name="manuallyParams">Optional additional parameters to pass to the method.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// This method uses dependency injection to create a new scope for each execution of the method.
    /// Each execution runs in its own unit of work, which is automatically completed when the method finishes.
    ///
    /// The method typically handles scrolling pagination, where each execution returns a list of items
    /// that can be processed before fetching the next batch. This approach is memory-efficient for large datasets.
    ///
    /// Garbage collection is triggered after each execution to help manage memory, especially important
    /// when processing large amounts of data in multiple batches.
    /// </remarks>
    public async Task ExecuteInjectScopedScrollingPagingAsync<TItem>(Delegate method, int maxExecutionCount, params object[] manuallyParams)
    {
        await GetServiceProvider()
            .ExecuteInjectScopedScrollingPagingAsync<TItem>(
                maxExecutionCount,
                async (IPlatformUnitOfWorkManager newScopeUnitOfWorkManager, IServiceProvider serviceProvider) =>
                {
                    try
                    {
                        using (var uow = newScopeUnitOfWorkManager.Begin(false))
                        {
                            var result = await serviceProvider.ExecuteInjectAsync<List<TItem>>(method, manuallyParams ?? []);

                            await uow.CompleteAsync();

                            return result;
                        }
                    }
                    finally
                    {
                        GetRootServiceProvider().GetService<IPlatformApplicationSettingContext>().ProcessAutoGarbageCollect();
                    }
                }
            );
    }

    /// <summary>
    /// Executes a method in a new scope with offset-based pagination, processing data in batches.
    /// </summary>
    /// <param name="maxItemCount">The maximum number of items to process.</param>
    /// <param name="pageSize">The number of items to process per page/batch.</param>
    /// <param name="method">The delegate method to execute for each batch.</param>
    /// <param name="manuallyParams">Optional additional parameters to pass to the method.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// This method handles traditional offset-based pagination by executing the provided method
    /// multiple times with different skip/take parameters, each in a new scope and unit of work.
    ///
    /// For each execution:
    /// 1. A new scope is created with its own unit of work
    /// 2. The method is called with skipCount and pageSize as the first two parameters
    /// 3. The unit of work is completed after the method executes
    /// 4. Garbage collection is triggered to help manage memory
    ///
    /// This approach is ideal for processing large datasets in manageable chunks while
    /// maintaining transactional integrity for each batch.
    /// </remarks>
    public async Task ExecuteInjectScopedPagingAsync(long maxItemCount, int pageSize, Delegate method, params object[] manuallyParams)
    {
        await GetServiceProvider()
            .ExecuteInjectScopedPagingAsync(
                maxItemCount,
                pageSize,
                async (int skipCount, int pageSize, IPlatformUnitOfWorkManager newScopeUnitOfWorkManager, IServiceProvider serviceProvider) =>
                {
                    try
                    {
                        using (var uow = newScopeUnitOfWorkManager.Begin(false))
                        {
                            await serviceProvider.ExecuteInjectAsync(
                                method,
                                manuallyParams: new object[] { skipCount, pageSize }
                                    .Concat(manuallyParams ?? [])
                                    .ToArray()
                            );

                            await uow.CompleteAsync();
                        }
                    }
                    finally
                    {
                        GetRootServiceProvider().GetService<IPlatformApplicationSettingContext>().ProcessAutoGarbageCollect();
                    }
                }
            );
    }

    /// <summary>
    /// Executes a method in a new scope with its own unit of work.
    /// </summary>
    /// <param name="method">The delegate method to execute.</param>
    /// <param name="manuallyParams">Optional parameters to pass to the method.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// This method creates a new service scope with its own unit of work, executes the provided method,
    /// and completes the unit of work. It's useful for operations that need to run in isolation
    /// from the current scope, with their own transaction boundary.
    ///
    /// The execution flow:
    /// 1. Create a new service scope
    /// 2. Begin a new unit of work (with suppressCurrentUow=false to use any existing UoW)
    /// 3. Execute the method with dependency injection
    /// 4. Complete the unit of work (which commits the transaction)
    /// 5. Perform garbage collection
    ///
    /// This pattern ensures proper resource management and transaction handling.
    /// </remarks>
    public async Task ExecuteInjectScopedAsync(Delegate method, params object[] manuallyParams)
    {
        await GetServiceProvider()
            .ExecuteInjectScopedAsync(
                async (IPlatformUnitOfWorkManager newScopeUnitOfWorkManager, IServiceProvider serviceProvider) =>
                {
                    try
                    {
                        using (var uow = newScopeUnitOfWorkManager.Begin(false))
                        {
                            await serviceProvider.ExecuteInjectAsync(method, manuallyParams);

                            await uow.CompleteAsync();
                        }
                    }
                    finally
                    {
                        GetRootServiceProvider().GetService<IPlatformApplicationSettingContext>().ProcessAutoGarbageCollect();
                    }
                }
            );
    }

    /// <summary>
    /// Executes a method in a new scope with its own unit of work and returns a result.
    /// </summary>
    /// <typeparam name="TResult">The type of the result returned by the method.</typeparam>
    /// <param name="method">The delegate method to execute that returns a result.</param>
    /// <param name="manuallyParams">Optional parameters to pass to the method.</param>
    /// <returns>A task representing the asynchronous operation with the result value.</returns>
    /// <remarks>
    /// This method is similar to ExecuteInjectScopedAsync but handles methods that return a result.
    /// It creates a new service scope with its own unit of work, executes the provided method,
    /// completes the unit of work, and returns the result.
    ///
    /// The execution flow:
    /// 1. Create a new service scope
    /// 2. Begin a new unit of work (with suppressCurrentUow=false to use any existing UoW)
    /// 3. Execute the method with dependency injection and capture the result
    /// 4. Complete the unit of work (which commits the transaction)
    /// 5. Perform garbage collection
    /// 6. Return the result to the caller
    ///
    /// This pattern ensures proper resource management and transaction handling while
    /// also returning the result of the executed method.
    /// </remarks>
    public async Task<TResult> ExecuteInjectScopedAsync<TResult>(Delegate method, params object[] manuallyParams)
    {
        return await GetServiceProvider()
            .ExecuteInjectScopedAsync<TResult>(
                async (IPlatformUnitOfWorkManager newScopeUnitOfWorkManager, IServiceProvider serviceProvider) =>
                {
                    try
                    {
                        using (var uow = newScopeUnitOfWorkManager.Begin(false))
                        {
                            var result = await serviceProvider.ExecuteInjectAsync<TResult>(method, manuallyParams);

                            await uow.CompleteAsync();

                            return result;
                        }
                    }
                    finally
                    {
                        GetRootServiceProvider().GetService<IPlatformApplicationSettingContext>().ProcessAutoGarbageCollect();
                    }
                }
            );
    }
}

/// <summary>
/// Abstract base implementation of the Unit of Work Manager that provides comprehensive transaction coordination
/// and lifecycle management for all Unit of Work instances within the Easy Platform architecture.
/// Manages concurrent Unit of Work operations, scope boundaries, and integration with CQRS patterns.
/// </summary>
/// <remarks>
/// This abstract class serves as the foundation for Unit of Work management across the Easy Platform:
///
/// <para><strong>Core Responsibilities:</strong></para>
/// <list type="bullet">
/// <item><description>Manages the lifecycle of Unit of Work instances (creation, tracking, completion, disposal)</description></item>
/// <item><description>Provides thread-safe concurrent access to multiple Unit of Work instances</description></item>
/// <item><description>Coordinates transaction boundaries across different persistence technologies</description></item>
/// <item><description>Integrates with CQRS pattern for event-driven architecture coordination</description></item>
/// <item><description>Manages scope-specific and global Unit of Work instances</description></item>
/// </list>
///
/// <para><strong>Architecture Integration:</strong></para>
/// <list type="bullet">
/// <item><description>Works seamlessly with dependency injection to provide proper scoping</description></item>
/// <item><description>Coordinates with PlatformRepository instances for automatic transaction management</description></item>
/// <item><description>Provides isolation between different service scopes and request contexts</description></item>
/// <item><description>Supports both eager and lazy Unit of Work creation patterns</description></item>
/// </list>
///
/// <para><strong>Concurrency and Thread Safety:</strong></para>
/// <list type="bullet">
/// <item><description>Uses ConcurrentDictionary for thread-safe Unit of Work tracking</description></item>
/// <item><description>Implements volatile caching for performance optimization</description></item>
/// <item><description>Provides safe access patterns for multi-threaded scenarios</description></item>
/// <item><description>Manages Unit of Work disposal and cleanup in concurrent environments</description></item>
/// </list>
///
/// <para><strong>Usage Patterns:</strong></para>
/// This manager is extensively used across the platform in:
/// <list type="bullet">
/// <item><description>Command and Query handlers for transaction boundary management</description></item>
/// <item><description>Background services and scheduled jobs for batch processing</description></item>
/// <item><description>Event handlers for maintaining transactional consistency</description></item>
/// <item><description>Application services for coordinating complex business operations</description></item>
/// <item><description>Repository implementations for automatic Unit of Work coordination</description></item>
/// </list>
///
/// <para><strong>Concrete Implementations:</strong></para>
/// This abstract class is implemented by specific Unit of Work managers for different persistence technologies:
/// <list type="bullet">
/// <item><description>Entity Framework Core Unit of Work Manager for relational databases</description></item>
/// <item><description>MongoDB Unit of Work Manager for document databases</description></item>
/// <item><description>In-memory Unit of Work Manager for testing and caching scenarios</description></item>
/// </list>
/// </remarks>
public abstract class PlatformUnitOfWorkManager : IPlatformUnitOfWorkManager
{
    /// <summary>
    /// Thread-safe dictionary for tracking Unit of Work instances that have been completed but not yet disposed.
    /// Used for cleanup operations and preventing memory leaks in long-running processes.
    /// </summary>
    private readonly Lazy<ConcurrentDictionary<string, IPlatformUnitOfWork>> completedUnitOfWorksDictLazy = new(() => new ConcurrentDictionary<string, IPlatformUnitOfWork>());

    /// <summary>
    /// Lazy-initialized CQRS service instance that shares the same dependency injection scope as this Unit of Work Manager.
    /// Enables coordination between Unit of Work lifecycle events and CQRS command/query/event processing.
    /// </summary>
    private readonly Lazy<IPlatformCqrs> currentSameScopeCqrsLazy;

    /// <summary>
    /// Thread-safe dictionary for tracking currently active Unit of Work instances by their unique identifiers.
    /// Provides fast lookup and coordination for concurrent Unit of Work operations.
    /// </summary>
    private readonly Lazy<ConcurrentDictionary<string, IPlatformUnitOfWork>> currentUnitOfWorksDictLazy = new(() => new ConcurrentDictionary<string, IPlatformUnitOfWork>());

    /// <summary>
    /// Thread-safe dictionary for tracking Unit of Work instances that were created independently and are not managed by the current scope.
    /// Used for temporary or transient Unit of Work instances that need cleanup.
    /// </summary>
    private readonly Lazy<ConcurrentDictionary<string, IPlatformUnitOfWork>> freeCreatedUnitOfWorksLazy = new(() => new ConcurrentDictionary<string, IPlatformUnitOfWork>());

    /// <summary>
    /// Lazy-initialized global Unit of Work instance that spans the entire scope of this manager.
    /// Used by repositories for read operations and scenarios where a persistent Unit of Work is needed.
    /// </summary>
    private readonly Lazy<IPlatformUnitOfWork> globalUowLazy;

    /// <summary>
    /// Thread-safe nested dictionary for caching Unit of Work lookup results by ID for performance optimization.
    /// The outer key is typically a scope identifier, and the inner dictionary maps Unit of Work IDs to instances.
    /// </summary>
    private readonly Lazy<ConcurrentDictionary<string, ConcurrentDictionary<string, IPlatformUnitOfWork>>> lastOrDefaultMatchedUowOfIdCachedResultDictLazy =
        new(() => new ConcurrentDictionary<string, ConcurrentDictionary<string, IPlatformUnitOfWork>>());

    /// <summary>
    /// Volatile cache for the current Unit of Work instance to optimize frequent access patterns.
    /// Using volatile ensures proper memory ordering in multi-threaded scenarios.
    /// </summary>
    private volatile IPlatformUnitOfWork? cachedCurrentUow;

    /// <summary>
    /// Flag indicating whether this Unit of Work Manager instance has been disposed.
    /// Used to prevent operations on disposed instances and ensure proper cleanup.
    /// </summary>
    private bool disposed;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformUnitOfWorkManager"/> class.
    /// </summary>
    /// <param name="cqrs">A lazy-loaded CQRS instance for the current scope.</param>
    /// <param name="rootServiceProvider">The root service provider.</param>
    /// <param name="serviceProvider">The scoped service provider.</param>
    /// <remarks>
    /// This constructor initializes the UnitOfWorkManager with service providers and lazily initialized collections:
    /// - Sets up ServiceProvider and RootServiceProvider for later service resolution
    /// - Stores a lazy reference to the CQRS service for the current scope
    /// - Creates a lazy-initialized global UoW that will be created on first access
    ///
    /// The global UoW is created with isUsingOnceTransientUow=false to indicate it's not a transient UoW
    /// and should be managed within the scope of this UnitOfWorkManager.
    /// </remarks>
    protected PlatformUnitOfWorkManager(Lazy<IPlatformCqrs> cqrs, IPlatformRootServiceProvider rootServiceProvider, IServiceProvider serviceProvider)
    {
        ServiceProvider = serviceProvider;
        RootServiceProvider = rootServiceProvider;
        currentSameScopeCqrsLazy = cqrs;
        globalUowLazy = new Lazy<IPlatformUnitOfWork>(() => CreateNewUow(false));
    }

    /// <summary>
    /// Gets the thread-safe dictionary containing Unit of Work instances that have been completed.
    /// Used by derived classes for cleanup operations and lifecycle management.
    /// </summary>
    /// <value>A concurrent dictionary mapping Unit of Work IDs to completed Unit of Work instances.</value>
    protected ConcurrentDictionary<string, IPlatformUnitOfWork> CompletedUows => completedUnitOfWorksDictLazy.Value;

    /// <summary>
    /// Gets the thread-safe dictionary containing currently active Unit of Work instances.
    /// Used by derived classes for tracking and coordinating active transactions.
    /// </summary>
    /// <value>A concurrent dictionary mapping Unit of Work IDs to active Unit of Work instances.</value>
    protected ConcurrentDictionary<string, IPlatformUnitOfWork> CurrentUnitOfWorksDict => currentUnitOfWorksDictLazy.Value;

    /// <summary>
    /// Gets the thread-safe dictionary containing independently created Unit of Work instances.
    /// Used by derived classes for managing transient or temporary Unit of Work instances.
    /// </summary>
    /// <value>A concurrent dictionary mapping Unit of Work IDs to free-created Unit of Work instances.</value>
    protected ConcurrentDictionary<string, IPlatformUnitOfWork> FreeCreatedUnitOfWorks => freeCreatedUnitOfWorksLazy.Value;

    /// <summary>
    /// Gets the root service provider that provides access to the application's root dependency injection container.
    /// Used for resolving services that require application-wide scope.
    /// </summary>
    /// <value>The root service provider instance for accessing application-level services.</value>
    protected IPlatformRootServiceProvider RootServiceProvider { get; }

    /// <summary>
    /// Gets the scoped service provider for this Unit of Work Manager instance.
    /// Used for resolving services within the current dependency injection scope.
    /// </summary>
    /// <value>The scoped service provider instance for accessing scope-specific services.</value>
    protected IServiceProvider ServiceProvider { get; }

    public IPlatformCqrs CurrentSameScopeCqrs => currentSameScopeCqrsLazy.Value;

    /// <summary>
    /// Creates a new Unit of Work instance.
    /// </summary>
    /// <param name="isUsingOnceTransientUow">
    /// Determines if the UoW is transient (used once and then disposed).
    /// When true, the UoW is tracked in FreeCreatedUnitOfWorks and moved to CompletedUows when completed.
    /// </param>
    /// <returns>A new instance of <see cref="IPlatformUnitOfWork"/>.</returns>
    /// <remarks>
    /// This method creates a new tracked service scope to ensure each UoW has its own DbContext instance.
    /// This allows UoWs to be created, used, and destroyed independently.
    /// If isUsingOnceTransientUow is true, the UoW will be automatically removed from tracking
    /// collections when completed or disposed.
    /// </remarks>
    public virtual IPlatformUnitOfWork CreateNewUow(bool isUsingOnceTransientUow)
    {
        // Doing create scope because IUnitOfWork resolve with DbContext, and DbContext lifetime is usually scoped to support resolve db context
        // to use it directly in application layer in some project or cases without using repository.
        // But we still want to support Uow create new like transient, each uow associated with new db context
        // So that we can begin/destroy uow separately
        var newScope = ServiceProvider.CreateTrackedScope();

        var uow = new PlatformAggregatedPersistenceUnitOfWork(RootServiceProvider, newScope.ServiceProvider, newScope.ServiceProvider.GetService<ILoggerFactory>()).With(p =>
        {
            p.AssociatedToDisposeWithServiceScope = newScope;
            p.IsUsingOnceTransientUow = isUsingOnceTransientUow;
            p.CreatedByUnitOfWorkManager = this;
        });

        if (isUsingOnceTransientUow)
        {
            FreeCreatedUnitOfWorks.TryAdd(uow.Id, uow);
            uow.OnUowCompletedActions.Add(
                () =>
                    Task.Run(() =>
                    {
                        FreeCreatedUnitOfWorks.TryRemove(uow.Id, out _);
                        CompletedUows.TryAdd(uow.Id, uow);
                    })
            );
            uow.OnDisposedActions.Add(
                () =>
                    Task.Run(() =>
                    {
                        FreeCreatedUnitOfWorks.TryRemove(uow.Id, out _);
                        CompletedUows.TryRemove(uow.Id, out _);
                    })
            );
        }

        return uow;
    }

    /// <summary>
    /// Gets the current unit of work. Returns null if none exists.
    /// </summary>
    /// <returns>The current unit of work, or null if no unit of work exists.</returns>
    /// <remarks>
    /// This method returns the most recently created active unit of work from the CurrentUnitOfWorksDict.
    /// If there's only one UoW, it returns that one. If multiple UoWs exist, it returns the one with highest BeginOrder.
    /// The result is cached in cachedCurrentUow for performance in subsequent calls.
    /// </remarks>
    public virtual IPlatformUnitOfWork? CurrentUow()
    {
        if (CurrentUnitOfWorksDict.IsEmpty)
            return null;
        if (cachedCurrentUow != null)
            return cachedCurrentUow;

        cachedCurrentUow = CurrentUnitOfWorksDict.Count == 1 ? CurrentUnitOfWorksDict.First().Value : CurrentUnitOfWorksDict.MaxBy(p => p.Value.BeginOrder).Value;

        return cachedCurrentUow;
    }

    /// <summary>
    /// Gets the current active unit of work.
    /// </summary>
    /// <returns>The current active unit of work.</returns>
    /// <exception cref="Exception">Throws exception if no active unit of work exists.</exception>
    /// <remarks>
    /// This method calls CurrentUow() to get the most recently created UoW,
    /// then validates that it is active before returning it.
    /// If no UoW exists or if the current UoW is not active, an exception is thrown.
    /// </remarks>
    public IPlatformUnitOfWork CurrentActiveUow()
    {
        var currentUow = CurrentUow();

        EnsureUowActive(currentUow);

        return currentUow;
    }

    /// <summary>
    /// Gets the current or created active unit of work by ID.
    /// </summary>
    /// <param name="uowId">The ID of the unit of work to retrieve.</param>
    /// <returns>The current active unit of work or one previously created with the specified ID.</returns>
    /// <exception cref="Exception">Throws exception if no active unit of work with the specified ID exists.</exception>
    /// <remarks>
    /// This method looks for an active unit of work that matches the specified ID.
    /// If found, it validates that the UoW is active before returning it.
    /// </remarks>
    public IPlatformUnitOfWork CurrentOrCreatedActiveUow(string uowId)
    {
        var currentUow = CurrentOrCreatedUow(uowId);

        EnsureUowActive(currentUow);

        return currentUow;
    }

    /// <summary>
    /// Attempts to get the current active unit of work.
    /// </summary>
    /// <returns>The current active unit of work, or null if no active unit of work exists.</returns>
    /// <remarks>
    /// Unlike CurrentActiveUow(), this method does not throw an exception if no active UoW exists.
    /// Instead, it returns null, making it useful for scenarios where the absence of an active UoW
    /// is an acceptable condition. It gets the current UoW and checks if it's active using the IsActive() method.
    /// </remarks>
    public IPlatformUnitOfWork? TryGetCurrentActiveUow()
    {
        return CurrentUow().Pipe(p => p?.IsActive() == true ? p : null);
    }

    /// <summary>
    /// Attempts to get the current or created active unit of work by ID.
    /// </summary>
    /// <param name="uowId">The ID of the unit of work to retrieve.</param>
    /// <returns>The active unit of work with the specified ID, or null if no matching active unit of work exists.</returns>
    /// <remarks>
    /// This method attempts to find a UoW by ID across all tracked collections.
    /// If the UoW is found but not active, null is returned.
    /// If uowId is null, null is returned.
    /// </remarks>
    public IPlatformUnitOfWork? TryGetCurrentOrCreatedActiveUow(string uowId)
    {
        if (uowId == null)
            return null;

        var currentOrCreatedUow = CurrentOrCreatedUow(uowId);

        return currentOrCreatedUow?.IsActive() == true ? currentOrCreatedUow : null;
    }

    /// <summary>
    /// Attempts to get the current active unit of work by ID.
    /// </summary>
    /// <param name="uowId">The ID of the unit of work to retrieve.</param>
    /// <returns>The active unit of work with the specified ID, or null if no matching active unit of work exists.</returns>
    /// <remarks>
    /// If uowId is null, this method falls back to TryGetCurrentActiveUow().
    /// Otherwise, it attempts to find a UoW by ID in the CurrentUnitOfWorksDict only.
    /// </remarks>
    public IPlatformUnitOfWork? TryGetCurrentActiveUow(string uowId)
    {
        if (uowId == null)
            return TryGetCurrentActiveUow();

        var currentUow = LastOrDefaultMatchedUowOfId(nameof(CurrentUnitOfWorksDict), CurrentUnitOfWorksDict, uowId);

        return currentUow?.IsActive() == true ? currentUow : null;
    }

    /// <summary>
    /// Checks if there is a current active unit of work.
    /// </summary>
    /// <returns>True if a current active unit of work exists; otherwise, false.</returns>
    /// <remarks>
    /// This method checks if a current UoW exists and is in an active state.
    /// It's useful for scenarios where code needs to behave differently based on
    /// whether an active transaction context is already established.
    /// </remarks>
    public bool HasCurrentActiveUow()
    {
        return CurrentUow()?.IsActive() == true;
    }

    /// <summary>
    /// Checks if there is a current or created active unit of work with the specified ID.
    /// </summary>
    /// <param name="uowId">The ID of the unit of work to check.</param>
    /// <returns>True if an active unit of work with the specified ID exists; otherwise, false.</returns>
    /// <remarks>
    /// This method checks across all tracked UoW collections to find a UoW with the specified ID.
    /// It returns true only if the UoW exists and is in an active state.
    /// </remarks>
    public bool HasCurrentOrCreatedActiveUow(string uowId)
    {
        return CurrentOrCreatedUow(uowId)?.IsActive() == true;
    }

    /// <summary>
    /// Begins a new unit of work or returns the current one.
    /// </summary>
    /// <param name="suppressCurrentUow">If true, creates a new UoW even if one exists. If false, returns the current UoW if one exists.</param>
    /// <returns>A unit of work instance.</returns>
    /// <remarks>
    /// This method is the primary entry point for starting a new transaction boundary in the application.
    /// When suppressCurrentUow is true (default), a new UoW is always created, allowing nested transaction scopes.
    /// When false, it reuses the current UoW if one exists, which is useful for ensuring operations
    /// participate in an existing transaction.
    ///
    /// The new UoW is added to CurrentUnitOfWorksDict and assigned a BeginOrder based on the current count.
    /// Event handlers are attached to manage UoW lifecycle events, ensuring proper cleanup when the UoW
    /// is completed or disposed.
    /// </remarks>
    public virtual IPlatformUnitOfWork Begin(bool suppressCurrentUow = true)
    {
        if (suppressCurrentUow || CurrentUnitOfWorksDict.IsEmpty())
        {
            var newUow = CreateNewUow(false).With(p => p.BeginOrder = CurrentUnitOfWorksDict.Count);

            CurrentUnitOfWorksDict.TryAdd(newUow.Id, newUow);
            cachedCurrentUow = newUow;

            newUow.OnUowCompletedActions.Add(
                () =>
                    Task.Run(() =>
                    {
                        cachedCurrentUow = null;
                        CurrentUnitOfWorksDict.TryRemove(newUow.Id, out _);
                        CompletedUows.TryAdd(newUow.Id, newUow);
                    })
            );
            newUow.OnDisposedActions.Add(
                () =>
                    Task.Run(() =>
                    {
                        cachedCurrentUow = null;
                        CurrentUnitOfWorksDict.TryRemove(newUow.Id, out _);
                        CompletedUows.TryRemove(newUow.Id, out _);
                    })
            );

            return newUow;
        }

        return CurrentUow();
    }

    /// <summary>
    /// Gets the root service provider associated with this UnitOfWorkManager.
    /// </summary>
    /// <returns>The root service provider that can be used to resolve services with root scope.</returns>
    /// <remarks>
    /// This method provides access to the root service provider which contains services
    /// registered with singleton lifetime. This allows access to application-wide services
    /// that persist throughout the application's lifetime.
    /// </remarks>
    public IPlatformRootServiceProvider GetRootServiceProvider()
    {
        return RootServiceProvider;
    }

    /// <summary>
    /// Explicit implementation of GetServiceProvider that returns the scoped service provider.
    /// </summary>
    /// <returns>The service provider associated with this UnitOfWorkManager's scope.</returns>
    /// <remarks>
    /// This method provides access to the scoped service provider which is used to resolve
    /// services within the current scope. It's used internally by methods that need to create
    /// or access services within the same transaction scope as the UnitOfWorkManager.
    /// </remarks>
    IServiceProvider IPlatformUnitOfWorkManager.GetServiceProvider()
    {
        return ServiceProvider;
    }

    /// <summary>
    /// Gets the current active unit of work of the specified type.
    /// </summary>
    /// <typeparam name="TUnitOfWork">The type of unit of work to retrieve.</typeparam>
    /// <returns>The current active unit of work of the specified type.</returns>
    /// <exception cref="Exception">Throws exception if no active unit of work of the specified type exists.</exception>
    /// <remarks>
    /// This method first attempts to get a UoW of the specified type from the current UoW,
    /// then validates that it exists and is active.
    /// It's particularly useful for scenarios with multiple UoW implementations where
    /// code needs to access specialized functionality on a specific UoW type.
    /// </remarks>
    public TUnitOfWork CurrentActiveUowOfType<TUnitOfWork>()
        where TUnitOfWork : class, IPlatformUnitOfWork
    {
        var uowOfType = CurrentUow()?.UowOfType<TUnitOfWork>();

        return uowOfType
            .Ensure(must: currentUow => currentUow != null, $"There's no current any uow of type {typeof(TUnitOfWork).FullName} has been begun.")
            .Ensure(must: currentUow => currentUow.IsActive(), $"Current unit of work of type {typeof(TUnitOfWork).FullName} has been completed or disposed.");
    }

    public IPlatformUnitOfWork GlobalScopedUow => globalUowLazy.Value;

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    /// <summary>
    /// Gets a unit of work by ID from any of the tracked collections.
    /// </summary>
    /// <param name="uowId">The ID of the unit of work to retrieve.</param>
    /// <returns>The unit of work with the specified ID, or null if no matching unit of work exists.</returns>
    /// <remarks>
    /// This method searches for a UoW with the specified ID in the following order:
    /// 1. Directly in CurrentUnitOfWorksDict by key
    /// 2. Directly in FreeCreatedUnitOfWorks by key
    /// 3. By iterating through CurrentUnitOfWorksDict using UowOfId
    /// 4. By iterating through FreeCreatedUnitOfWorks using UowOfId
    ///
    /// This comprehensive search ensures that a UoW can be found regardless of how it was created or tracked.
    /// </remarks>
    public virtual IPlatformUnitOfWork? CurrentOrCreatedUow(string uowId)
    {
        return CurrentUnitOfWorksDict.GetValueOrDefault(uowId)
            ?? FreeCreatedUnitOfWorks.GetValueOrDefault(uowId)
            ?? LastOrDefaultMatchedUowOfId(nameof(CurrentUnitOfWorksDict), CurrentUnitOfWorksDict, uowId)
            ?? LastOrDefaultMatchedUowOfId(nameof(FreeCreatedUnitOfWorks), FreeCreatedUnitOfWorks, uowId);
    }

    /// <summary>
    /// Finds a matching unit of work by ID within a specified collection.
    /// </summary>
    /// <param name="unitOfWorksDictCacheKey">The cache key for the collection being searched.</param>
    /// <param name="unitOfWorksDict">The dictionary of unit of works to search in.</param>
    /// <param name="uowId">The ID of the unit of work to find.</param>
    /// <returns>The matching unit of work, or null if no match is found.</returns>
    /// <remarks>
    /// This method uses a cached approach to optimize repeated lookups for the same UoW ID.
    /// It maintains a cache of search results in lastOrDefaultMatchedUowOfIdCachedResultDictLazy.
    ///
    /// When searching, it iterates through the provided collection in reverse order (newest first)
    /// and uses the UowOfId method to find a match, which can search through aggregated UoWs.
    /// </remarks>
    public IPlatformUnitOfWork LastOrDefaultMatchedUowOfId(string unitOfWorksDictCacheKey, ConcurrentDictionary<string, IPlatformUnitOfWork> unitOfWorksDict, string uowId)
    {
        return lastOrDefaultMatchedUowOfIdCachedResultDictLazy
            .Value.GetOrAdd(unitOfWorksDictCacheKey, _ => new ConcurrentDictionary<string, IPlatformUnitOfWork>())
            .GetOrAdd(
                uowId,
                uowId =>
                {
                    var unitOfWorksValues = unitOfWorksDict.Values;

                    for (var i = unitOfWorksValues.Count - 1; i >= 0; i--)
                    {
                        var matchedUow = unitOfWorksValues.ElementAtOrDefault(i)?.UowOfId(uowId);

                        if (matchedUow != null)
                            return matchedUow;
                    }

                    return null;
                }
            );
    }

    /// <summary>
    /// Ensures that a unit of work exists and is active.
    /// </summary>
    /// <param name="currentUow">The unit of work to check.</param>
    /// <exception cref="Exception">Throws exception if the unit of work doesn't exist or is not active.</exception>
    /// <remarks>
    /// This utility method validates that:
    /// 1. The provided UoW is not null (meaning a UoW exists)
    /// 2. The UoW is in an active state (not completed or disposed)
    ///
    /// It throws appropriate exception messages depending on which condition fails.
    /// This method is used internally to validate UoW state before performing operations.
    /// </remarks>
    private static void EnsureUowActive(IPlatformUnitOfWork currentUow)
    {
        currentUow
            .Ensure(must: currentUow => currentUow != null, "There's no current any uow has been begun.")
            .Ensure(must: currentUow => currentUow.IsActive(), "Current unit of work has been completed or disposed.");
    }

    /// <summary>
    /// Disposes the UnitOfWorkManager and all managed resources.
    /// </summary>
    /// <param name="disposing">True to release both managed and unmanaged resources; false to release only unmanaged resources.</param>
    /// <remarks>
    /// This method implements the Dispose pattern, cleaning up:
    /// 1. All current unit of works
    /// 2. All free created unit of works
    /// 3. The cached lookup results dictionary
    /// 4. All completed UoWs
    /// 5. The global scoped UoW if created
    ///
    /// It's designed to properly clean up all resources even if exceptions occur during normal usage.
    /// </remarks>
    protected virtual void Dispose(bool disposing)
    {
        if (!disposed)
        {
            if (disposing)
            {
                // Release managed resources

                if (currentUnitOfWorksDictLazy.IsValueCreated)
                {
                    CurrentUnitOfWorksDict.Values.ForEach(p => p?.Dispose());
                    currentUnitOfWorksDictLazy.Value.Clear();
                }

                if (freeCreatedUnitOfWorksLazy.IsValueCreated)
                {
                    FreeCreatedUnitOfWorks.Values.ForEach(p => p?.Dispose());
                    freeCreatedUnitOfWorksLazy.Value.Clear();
                }

                if (lastOrDefaultMatchedUowOfIdCachedResultDictLazy.IsValueCreated)
                    lastOrDefaultMatchedUowOfIdCachedResultDictLazy.Value.Clear();

                CompletedUows.Values.ForEach(p => p.Dispose());
                CompletedUows.Clear();

                if (globalUowLazy.IsValueCreated)
                    globalUowLazy.Value.Dispose();
            }

            // Release unmanaged resources

            disposed = true;
        }
    }
}
