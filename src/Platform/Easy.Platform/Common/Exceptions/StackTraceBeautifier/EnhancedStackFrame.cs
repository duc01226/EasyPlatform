// Copyright (c) Ben A Adams. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

#region

using System.Reflection;

#endregion

// ReSharper disable CheckNamespace

#pragma warning disable IDE0130 // Namespace does not match folder structure
namespace System.Diagnostics;
#pragma warning restore IDE0130 // Namespace does not match folder structure

public class EnhancedStackFrame : StackFrame
{
    private readonly int colNumber;
    private readonly string? fileName;
    private readonly int lineNumber;

    internal EnhancedStackFrame(StackFrame stackFrame, ResolvedMethod methodInfo, string? fileName, int lineNumber, int colNumber)
        : base(fileName, lineNumber, colNumber)
    {
        StackFrame = stackFrame;
        MethodInfo = methodInfo;

        this.fileName = fileName;
        this.lineNumber = lineNumber;
        this.colNumber = colNumber;
    }

    public StackFrame StackFrame { get; }

    public bool IsRecursive
    {
        get => MethodInfo.RecurseCount > 0;
        internal set => MethodInfo.RecurseCount++;
    }

    public ResolvedMethod MethodInfo { get; }

    internal bool IsEquivalent(ResolvedMethod methodInfo, string? fileName, int lineNumber, int colNumber)
    {
        return this.lineNumber == lineNumber &&
               this.colNumber == colNumber &&
               this.fileName == fileName &&
               MethodInfo.IsSequentialEquivalent(methodInfo);
    }

    /// <summary>
    ///      Gets the column number in the file that contains the code that is executing. 
    ///      This information is typically extracted from the debugging symbols for the executable.
    /// </summary>
    /// <returns>The file column number, or 0 (zero) if the file column number cannot be determined.</returns>
    public override int GetFileColumnNumber() => colNumber;

    /// <summary>
    ///     Gets the line number in the file that contains the code that is executing. 
    ///     This information is typically extracted from the debugging symbols for the executable.
    /// </summary>
    /// <returns>The file line number, or 0 (zero) if the file line number cannot be determined.</returns>
    public override int GetFileLineNumber() => lineNumber;

    /// <summary>
    ///     Gets the file name that contains the code that is executing. 
    ///     This information is typically extracted from the debugging symbols for the executable.
    /// </summary>
    /// <returns>The file name, or null if the file name cannot be determined.</returns>
    public override string? GetFileName() => fileName;

    /// <summary>
    ///    Gets the offset from the start of the Microsoft intermediate language (MSIL)
    ///    code for the method that is executing. This offset might be an approximation
    ///    depending on whether or not the just-in-time (JIT) compiler is generating debugging
    ///    code. The generation of this debugging information is controlled by the System.Diagnostics.DebuggableAttribute.
    /// </summary>
    /// <returns>The offset from the start of the MSIL code for the method that is executing.</returns>
    public override int GetILOffset() => StackFrame.GetILOffset();

    /// <summary>
    ///     Gets the method in which the frame is executing.
    /// </summary>
    /// <returns>The method in which the frame is executing.</returns>
    public override MethodBase? GetMethod() => StackFrame.GetMethod();

    /// <summary>
    ///     Gets the offset from the start of the native just-in-time (JIT)-compiled code
    ///     for the method that is being executed. The generation of this debugging information
    ///     is controlled by the System.Diagnostics.DebuggableAttribute class.
    /// </summary>
    /// <returns>The offset from the start of the JIT-compiled code for the method that is being executed.</returns>
    public override int GetNativeOffset() => StackFrame.GetNativeOffset();

    /// <summary>
    ///     Builds a readable representation of the stack trace.
    /// </summary>
    /// <returns>A readable representation of the stack trace.</returns>
    public override string ToString() => MethodInfo.ToString();
}
