// Copyright (c) Ben A Adams. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

// ReSharper disable CheckNamespace

namespace System.Collections.Generic.Enumerable;

internal interface IEnumerableIList<T> : IEnumerable<T>
{
    new EnumeratorIList<T> GetEnumerator();
}
