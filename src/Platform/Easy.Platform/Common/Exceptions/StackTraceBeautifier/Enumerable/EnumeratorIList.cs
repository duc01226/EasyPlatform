// Copyright (c) Ben A Adams. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

// ReSharper disable CheckNamespace

#pragma warning disable IDE0130 // Namespace does not match folder structure
namespace System.Collections.Generic.Enumerable;
#pragma warning restore IDE0130 // Namespace does not match folder structure

public struct EnumeratorIList<T> : IEnumerator<T>
{
    private readonly IList<T> list;
    private int index;

    public EnumeratorIList(IList<T> list)
    {
        index = -1;
        this.list = list;
    }

    public T Current => list[index];

    public bool MoveNext()
    {
        index++;

        return index < (list?.Count ?? 0);
    }

    public void Dispose() { }
    object? IEnumerator.Current => Current;
    public void Reset() => index = -1;
}
