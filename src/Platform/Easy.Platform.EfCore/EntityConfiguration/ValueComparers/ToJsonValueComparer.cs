using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Easy.Platform.EfCore.EntityConfiguration.ValueComparers;

public class ToJsonValueComparer<T> : ValueComparer<T>
{
    protected ToJsonValueComparer(bool favorStructuralComparisons) : base(favorStructuralComparisons)
    {
    }

    protected ToJsonValueComparer(Expression<Func<T, T, bool>> equalsExpression, Expression<Func<T, int>> hashCodeExpression) : base(equalsExpression, hashCodeExpression)
    {
    }

    protected ToJsonValueComparer(
        Expression<Func<T, T, bool>> equalsExpression,
        Expression<Func<T, int>> hashCodeExpression,
        Expression<Func<T, T>> snapshotExpression) : base(
        equalsExpression,
        hashCodeExpression,
        snapshotExpression)
    {
    }

    /// <summary>
    /// The SNAPSHOT expression is mandatory here, not optional. EF Core's contract for a value comparer over a MUTABLE
    /// reference type requires a deep-copy snapshot: change detection compares the current value against the original-value
    /// snapshot taken when the entity was tracked. Without an explicit snapshot EF falls back to the identity function — a
    /// REFERENCE copy — so the snapshot ALIASES the very object the caller then mutates, current and original can never
    /// differ, and an in-place mutation (<c>list.Add(...)</c>, a field written on a nested object) is silently invisible to
    /// SaveChanges. The column is simply never written: no exception, no log line, just lost data.
    ///
    /// <para>The clone is a JSON round-trip (<see cref="ObjectGeneralExtension.DeepClone{TObject}" />) DELIBERATELY, because
    /// that is exactly how <c>HasJsonConversion</c> persists and re-reads the value. Snapshotting through the same
    /// serializer the converter uses means the snapshot can never carry information the stored column would have dropped,
    /// so change detection cannot report a difference that does not survive a save. <c>DeepClone</c> also returns immutable
    /// values and nulls as-is, so nothing is copied where a copy would be pointless.</para>
    ///
    /// <para>Cost: the snapshot runs only when an entity is TRACKED — <c>AsNoTracking</c> reads take no snapshot at all —
    /// and it is the price of correct change detection on a mutable JSON column. Removing it to save that cost re-opens
    /// silent data loss on every in-place mutation.</para>
    /// </summary>
    public ToJsonValueComparer() : base((c1, c2) => c1.IsValuesEqual(c2), c => c.GetHashCode(), c => SnapshotClone(c))
    {
    }

    /// <summary>
    /// Indirection so the snapshot lambda stays a legal expression tree: an expression tree may not omit optional
    /// arguments (CS0854), and <see cref="ObjectGeneralExtension.DeepClone{TObject}" /> has five. Calling it from an
    /// ordinary method body keeps the defaults resolved by the compiler here rather than spelled out positionally at the
    /// call site, so a future change to its signature cannot silently alter the snapshot's semantics.
    /// </summary>
    private static T SnapshotClone(T value)
    {
        return value.DeepClone();
    }
}
