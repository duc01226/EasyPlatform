#region

using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;

#endregion

namespace Easy.Platform.CustomAnalyzers.Analyzers;

/// <summary>
/// Analyzer that detects when .With() or .WithIf() method calls have their return value discarded.
/// These methods return a modified object and are intended for fluent chaining or assignment.
/// Calling them without using the return value is a bug since the modification is lost.
/// </summary>
/// <example>
/// Allowed:
/// <code>
/// var a = x.With(p => p.Name = "test");           // Assigned to variable
/// x = x.With(p => p.Name = "test");               // Reassigned to same variable
/// return x.With(p => p.Name = "test");            // Returned from method
/// items.Select(x => x.With(p => p.Name = "test")); // Used in LINQ expression
/// </code>
///
/// Not allowed:
/// <code>
/// x.With(p => p.Name = "test");  // Return value discarded - this is a bug!
/// x.WithIf(condition, p => p.Name = "test");  // Return value discarded - this is a bug!
/// </code>
/// </example>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class UnusedWithReturnAnalyzer : DiagnosticAnalyzer
{
    public const string DiagnosticId = "EASY_PLATFORM_ANALYZERS_USAGE001";

    private const string Title = "Return value of With/WithIf must be used";
    private const string MessageFormat = "The return value of '{0}' is discarded; assign it to a variable, return it, or use it in an expression";
    private const string Description = "The .With() and .WithIf() methods return the modified object and do not modify the original in-place. Discarding the return value means the modification is lost. Either assign the result to a variable, return it, or use it in a LINQ expression.";

    private static readonly DiagnosticDescriptor Rule = new(
        DiagnosticId,
        Title,
        MessageFormat,
        CustomAnalyzersConst.Categories.Usage,
        DiagnosticSeverity.Error,
        isEnabledByDefault: true,
        description: Description);

    private static readonly HashSet<string> TargetMethodNames = ["With", "WithIf"];

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics => ImmutableArray.Create(Rule);

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxNodeAction(AnalyzeInvocation, SyntaxKind.InvocationExpression);
    }

    private static void AnalyzeInvocation(SyntaxNodeAnalysisContext context)
    {
        var invocation = (InvocationExpressionSyntax)context.Node;

        // Check if this is a .With() or .WithIf() call
        if (!IsTargetMethodCall(invocation, out var methodName))
            return;

        // Check if the return value is being used
        if (IsReturnValueUsed(invocation))
            return;

        // Report diagnostic - return value is discarded
        context.ReportDiagnostic(
            Diagnostic.Create(
                Rule,
                invocation.GetLocation(),
                methodName));
    }

    /// <summary>
    /// Checks if the invocation is a call to .With() or .WithIf() method.
    /// </summary>
    private static bool IsTargetMethodCall(InvocationExpressionSyntax invocation, out string methodName)
    {
        methodName = string.Empty;

        // Must be a member access expression (e.g., x.With(...))
        if (invocation.Expression is not MemberAccessExpressionSyntax memberAccess)
            return false;

        var name = memberAccess.Name.Identifier.ValueText;
        if (!TargetMethodNames.Contains(name))
            return false;

        methodName = name;
        return true;
    }

    /// <summary>
    /// Determines if the return value of the invocation is being used.
    /// </summary>
    private static bool IsReturnValueUsed(InvocationExpressionSyntax invocation)
    {
        var parent = invocation.Parent;

        // Walk up through parentheses
        while (parent is ParenthesizedExpressionSyntax)
            parent = parent.Parent;

        return parent switch
        {
            // var x = obj.With(...) or x = obj.With(...)
            EqualsValueClauseSyntax => true,

            // x = obj.With(...)
            AssignmentExpressionSyntax => true,

            // return obj.With(...)
            ReturnStatementSyntax => true,

            // yield return obj.With(...)
            YieldStatementSyntax => true,

            // => obj.With(...) (expression-bodied member)
            ArrowExpressionClauseSyntax => true,

            // Used as argument: SomeMethod(obj.With(...))
            ArgumentSyntax => true,

            // obj.With(...).SomeOtherMethod() - chained call
            MemberAccessExpressionSyntax => true,

            // Used in conditional: obj.With(...) ? a : b or condition ? obj.With(...) : other
            ConditionalExpressionSyntax => true,

            // Used in null-coalescing: obj.With(...) ?? other
            BinaryExpressionSyntax binary when binary.IsKind(SyntaxKind.CoalesceExpression) => true,

            // Used in lambda body: x => x.With(...)
            LambdaExpressionSyntax => true,

            // await obj.With(...) - though With typically isn't async, handle it
            AwaitExpressionSyntax => true,

            // Used in initializer: new List<T> { obj.With(...) }
            InitializerExpressionSyntax => true,

            // Used in interpolation: $"{obj.With(...)}"
            InterpolationSyntax => true,

            // Used in cast: (SomeType)obj.With(...)
            CastExpressionSyntax => true,

            // Used in 'is' pattern: obj.With(...) is SomeType
            IsPatternExpressionSyntax => true,

            // Used in 'as' expression: obj.With(...) as SomeType
            BinaryExpressionSyntax binary when binary.IsKind(SyntaxKind.AsExpression) => true,

            // Used in switch expression: obj.With(...) switch { ... }
            SwitchExpressionSyntax => true,

            // Used as switch arm result: pattern => obj.With(...)
            SwitchExpressionArmSyntax => true,

            // Used in range/index: collection[obj.With(...)]
            BracketedArgumentListSyntax => true,

            // Used in element access: array[obj.With(...)]
            ElementAccessExpressionSyntax => true,

            // Used in tuple: (obj.With(...), other)
            TupleExpressionSyntax => true,

            // obj.With(...); as a statement - NOT used (this is the bad case)
            ExpressionStatementSyntax => false,

            // Default: assume it might be used in some other valid context
            _ => true
        };
    }
}
