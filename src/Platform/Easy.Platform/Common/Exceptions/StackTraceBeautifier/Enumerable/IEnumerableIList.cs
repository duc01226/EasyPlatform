// Copyright (c) Ben A Adams. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

// ReSharper disable CheckNamespace

#pragma warning disable IDE0130 // Namespace does not match folder structure
namespace System.Collections.Generic.Enumerable;
#pragma warning restore IDE30 // Namespace does not match folder structure

internal interface IEnumerableIList<T> : IEnumerable<T>
{
    new EnumeratorIList<T> GetEnumerator();
}
