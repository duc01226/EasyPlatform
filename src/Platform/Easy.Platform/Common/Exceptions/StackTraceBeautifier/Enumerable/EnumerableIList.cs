// Copyright (c) Ben A Adams. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

// ReSharper disable CheckNamespace

#pragma warning disable IDE0130 // Namespace does not match folder structure
namespace System.Collections.Generic.Enumerable;
#pragma warning restore IDE0130 // Namespace does not match folder structure

public static class EnumerableIList
{
    public static EnumerableIList<T> Create<T>(IList<T> list) => new(list);
}

public readonly struct EnumerableIList<T> : IEnumerableIList<T>, IList<T>
{
    private readonly IList<T> list = [];

    public EnumerableIList(IList<T> list)
    {
        this.list = list ?? [];
    }

    public EnumeratorIList<T> GetEnumerator() => new(list);

    public static implicit operator EnumerableIList<T>(List<T> list) => new(list);

    public static implicit operator EnumerableIList<T>(T[] array) => new(array);

    public static readonly EnumerableIList<T> Empty = default;


    // IList pass through

    /// <inheritdoc />
    public T this[int index] { get => list[index]; set => list[index] = value; }

    /// <inheritdoc />
    public int Count => list?.Count ?? 0;

    /// <inheritdoc />
    public bool IsReadOnly => list?.IsReadOnly ?? false;

    /// <inheritdoc />
    public void Add(T item) => list?.Add(item);

    /// <inheritdoc />
    public void Clear() => list?.Clear();

    /// <inheritdoc />
    public bool Contains(T item) => list?.Contains(item) ?? false;

    /// <inheritdoc />
    public void CopyTo(T[] array, int arrayIndex) => list?.CopyTo(array, arrayIndex);

    /// <inheritdoc />
    public int IndexOf(T item) => list?.IndexOf(item) ?? -1;

    /// <inheritdoc />
    public void Insert(int index, T item) => list?.Insert(index, item);

    /// <inheritdoc />
    public bool Remove(T item) => list?.Remove(item) ?? true;

    /// <inheritdoc />
    public void RemoveAt(int index) => list?.RemoveAt(index);

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();

    IEnumerator<T> IEnumerable<T>.GetEnumerator() => GetEnumerator();
}
