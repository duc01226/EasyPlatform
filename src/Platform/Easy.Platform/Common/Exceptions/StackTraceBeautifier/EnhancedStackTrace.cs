// Copyright (c) Ben A Adams. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

using System.Collections;
using System.Collections.Generic;
using System.Collections.Generic.Enumerable;
using System.IO;
using System.Text;

// ReSharper disable CheckNamespace

namespace System.Diagnostics;

public partial class EnhancedStackTrace : StackTrace, IEnumerable<EnhancedStackFrame>
{
    public static EnhancedStackTrace Current() => new(new StackTrace(1 /* skip this one frame */, true));

    private readonly List<EnhancedStackFrame> frames;

    // Summary:
    //     Initializes a new instance of the System.Diagnostics.StackTrace class using the
    //     provided exception object.
    //
    // Parameters:
    //   e:
    //     The exception object from which to construct the stack trace.
    //
    // Exceptions:
    //   T:System.ArgumentNullException:
    //     The parameter e is null.
    public EnhancedStackTrace(Exception e)
    {
        ArgumentNullException.ThrowIfNull(e);

        frames = GetFrames(e);
    }


    public EnhancedStackTrace(StackTrace stackTrace)
    {
        ArgumentNullException.ThrowIfNull(stackTrace);

        frames = GetFrames(stackTrace);
    }

    /// <summary>
    /// Gets the number of frames in the stack trace.
    /// </summary>
    /// <returns>The number of frames in the stack trace.</returns>
    public override int FrameCount => frames.Count;

    /// <summary>
    /// Gets the specified stack frame.
    /// </summary>
    /// <param name="index">The index of the stack frame requested.</param>
    /// <returns>The specified stack frame.</returns>
    public override StackFrame GetFrame(int index) => frames[index];

    /// <summary>
    ///     Returns a copy of all stack frames in the current stack trace.
    /// </summary>
    /// <returns>
    ///     An array of type System.Diagnostics.StackFrame representing the function calls
    ///     in the stack trace.
    /// </returns>
    public override StackFrame[] GetFrames() => frames.ToArray();

    /// <summary>
    /// Builds a readable representation of the stack trace.
    /// </summary>
    /// <returns>A readable representation of the stack trace.</returns>
    public override string ToString()
    {
        if (frames == null || frames.Count == 0) return "";

        var sb = new StringBuilder();

        Append(sb);

        return sb.ToString();
    }


    internal void Append(StringBuilder sb)
    {
        var count = frames.Count;

        for (var i = 0; i < count; i++)
        {
            if (i > 0) sb.Append(Environment.NewLine);

            var frame = frames[i];

            var fileName = frame.GetFileName();

            sb.Append("   at ");
            frame.MethodInfo.Append(sb, false, includeParametersInfo: string.IsNullOrEmpty(fileName));

            if (!string.IsNullOrEmpty(fileName))
            {
                sb.Append(" in ");
                sb.Append(TryGetFullPath(fileName));
            }

            var lineNo = frame.GetFileLineNumber();
            if (lineNo != 0)
            {
                sb.Append(":LINE ");
                sb.Append(lineNo);
            }
        }
    }

    IEnumerator<EnhancedStackFrame> IEnumerable<EnhancedStackFrame>.GetEnumerator() => frames.GetEnumerator();
    IEnumerator IEnumerable.GetEnumerator() => frames.GetEnumerator();

    /// <summary>
    /// Tries to convert a given <paramref name="filePath"/> to a full path.
    /// Returns original value if the conversion isn't possible or a given path is relative.
    /// </summary>
    public static string TryGetFullPath(string filePath)
    {
        if (Uri.TryCreate(filePath, UriKind.Absolute, out var uri) && uri.IsFile) return Uri.UnescapeDataString(uri.AbsolutePath);

        return filePath;
    }
}
