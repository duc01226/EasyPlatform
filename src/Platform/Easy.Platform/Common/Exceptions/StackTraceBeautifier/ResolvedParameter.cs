// Copyright (c) Ben A Adams. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

#region

using System.Text;

#endregion

// ReSharper disable CheckNamespace

#pragma warning disable IDE0130 // Namespace does not match folder structure
namespace System.Diagnostics;
#pragma warning restore IDE0130 // Namespace does not match folder structure

public class ResolvedParameter
{
    public ResolvedParameter(Type resolvedType)
    {
        ResolvedType = resolvedType;
    }

    public string? Name { get; set; }

    public Type ResolvedType { get; set; }

    public string? Prefix { get; set; }
    public bool IsDynamicType { get; set; }

    public override string ToString() => Append(new StringBuilder()).ToString();

    public StringBuilder Append(StringBuilder sb)
    {
        if (ResolvedType.Assembly.ManifestModule.Name == "FSharp.Core.dll" && ResolvedType.Name == "Unit")
            return sb;

        if (!string.IsNullOrEmpty(Prefix))
        {
            sb.Append(Prefix)
                .Append(' ');
        }

        if (IsDynamicType)
            sb.Append("dynamic");
        else if (ResolvedType != null)
            AppendTypeName(sb);
        else
            sb.Append('?');

        if (!string.IsNullOrEmpty(Name))
        {
            sb.Append(' ')
                .Append(Name);
        }

        return sb;
    }

    protected virtual void AppendTypeName(StringBuilder sb)
    {
        sb.AppendTypeDisplayName(ResolvedType, fullName: false, includeGenericParameterNames: true);
    }
}
