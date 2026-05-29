using System.Collections.Concurrent;
using System.Data.Common;
using System.Threading;
using Microsoft.EntityFrameworkCore.Diagnostics;
using MongoDB.Driver.Core.Configuration;
using MongoDB.Driver.Core.Events;

namespace Easy.Platform.Benchmark.Inbox;

public sealed class InboxDbCommandCounters
{
    private static readonly AsyncLocal<ScopeState?> CurrentScope = new();
    private readonly ConcurrentDictionary<string, long> counts = new();

    public IDisposable StartStage(string stage)
    {
        var previousScope = CurrentScope.Value;
        CurrentScope.Value = new ScopeState(this, stage);
        return new ScopeLease(previousScope);
    }

    public IReadOnlyDictionary<string, long> Snapshot()
    {
        return counts.ToDictionary(p => p.Key, p => p.Value);
    }

    public long CountFor(string provider, string stage, string commandKind, string? commandName = null)
    {
        return counts.TryGetValue(BuildKey(provider, stage, commandKind, commandName), out var value) ? value : 0;
    }

    public static void CountCurrentEfCommand(string commandKind)
    {
        CountCurrent("ef", commandKind);
    }

    public static void CountCurrentMongoCommand(string commandName)
    {
        CountCurrent("mongo", "command", commandName);
    }

    private static void CountCurrent(string provider, string commandKind, string? commandName = null)
    {
        var scope = CurrentScope.Value;
        if (scope == null) return;

        scope.Counters.counts.AddOrUpdate(
            BuildKey(provider, scope.Stage, commandKind, commandName),
            1,
            (_, existingValue) => existingValue + 1);
    }

    private static string BuildKey(string provider, string stage, string commandKind, string? commandName)
    {
        return string.IsNullOrWhiteSpace(commandName)
            ? $"{provider}|{stage}|{commandKind}"
            : $"{provider}|{stage}|{commandKind}|{commandName}";
    }

    private sealed record ScopeState(InboxDbCommandCounters Counters, string Stage);

    private sealed class ScopeLease : IDisposable
    {
        private readonly ScopeState? previousScope;
        private bool disposed;

        public ScopeLease(ScopeState? previousScope)
        {
            this.previousScope = previousScope;
        }

        public void Dispose()
        {
            if (disposed) return;

            CurrentScope.Value = previousScope;
            disposed = true;
        }
    }
}

public sealed class InboxEfDbCommandCountingInterceptor : DbCommandInterceptor
{
    public override InterceptionResult<DbDataReader> ReaderExecuting(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result)
    {
        InboxDbCommandCounters.CountCurrentEfCommand("reader");
        return base.ReaderExecuting(command, eventData, result);
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default)
    {
        InboxDbCommandCounters.CountCurrentEfCommand("reader");
        return base.ReaderExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override InterceptionResult<int> NonQueryExecuting(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<int> result)
    {
        InboxDbCommandCounters.CountCurrentEfCommand("non_query");
        return base.NonQueryExecuting(command, eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        InboxDbCommandCounters.CountCurrentEfCommand("non_query");
        return base.NonQueryExecutingAsync(command, eventData, result, cancellationToken);
    }

    public override InterceptionResult<object> ScalarExecuting(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<object> result)
    {
        InboxDbCommandCounters.CountCurrentEfCommand("scalar");
        return base.ScalarExecuting(command, eventData, result);
    }

    public override ValueTask<InterceptionResult<object>> ScalarExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<object> result,
        CancellationToken cancellationToken = default)
    {
        InboxDbCommandCounters.CountCurrentEfCommand("scalar");
        return base.ScalarExecutingAsync(command, eventData, result, cancellationToken);
    }
}

public static class InboxMongoCommandCountingSubscriber
{
    public static void Subscribe(ClusterBuilder clusterBuilder)
    {
        clusterBuilder.Subscribe<CommandStartedEvent>(static commandStartedEvent =>
            InboxDbCommandCounters.CountCurrentMongoCommand(commandStartedEvent.CommandName));
    }
}
