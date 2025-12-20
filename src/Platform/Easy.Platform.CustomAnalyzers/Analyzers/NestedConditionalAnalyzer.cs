#region

using System.Collections.Immutable;
using System.Composition;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CodeActions;
using Microsoft.CodeAnalysis.CodeFixes;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.CodeAnalysis.Editing;
using Microsoft.CodeAnalysis.Simplification;

#endregion

namespace Easy.Platform.CustomAnalyzers.Analyzers;

/// <summary>
/// An analyzer to detect nested conditional (ternary) expressions.
/// Nested conditional expressions can be difficult to read and are often better
/// represented as switch expressions, as shown in the good practice example.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class NestedConditionalAnalyzer : DiagnosticAnalyzer
{
    /// <summary>
    /// The diagnostic ID for nested conditional expressions.
    /// </summary>
    public const string DiagnosticId = "EASY_PLATFORM_ANALYZERS_CODESTYLE001";

    private const string Title = "Nested conditional expression can be simplified";
    private const string MessageFormat = "Nested conditional expression should be refactored into a switch expression for better readability";

    private const string Description = @"Nested conditional expressions are hard to read and maintain. Consider refactoring to a switch expression.

For example, this code (bad practice):
var discount = isMember
    ? (purchaseAmount > 100 ? 0.20 : 0.10)
    : (purchaseAmount > 100 ? 0.05 : 0.0);

Can be improved like this (good practice):
var discount = (isMember, purchaseAmount > 100) switch
{
    (true, true)    => 0.20, // Member with large purchase
    (true, false)   => 0.10, // Member with small purchase
    (false, true)   => 0.05, // Non-member with large purchase
    (false, false)  => 0.0   // Non-member with small purchase
};
or
var discount = true switch
{
    _ when isMember && purchaseAmount > 100  => 0.20, // Member with large purchase
    _ when isMember && purchaseAmount <= 100 => 0.10, // Member with small purchase
    _ when !isMember && purchaseAmount > 100 => 0.05, // Non-member with large purchase
    _ when !isMember && purchaseAmount <= 100  => 0.0 // Non-member with small purchase
};";


#pragma warning disable RS1033
    private static readonly DiagnosticDescriptor Rule = new(
        DiagnosticId,
        Title,
        MessageFormat,
        CustomAnalyzersConst.Categories.CodeStyle,
        DiagnosticSeverity.Warning,
        isEnabledByDefault: true,
        description: Description);
#pragma warning restore RS1033

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics => ImmutableArray.Create(Rule);

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterSyntaxNodeAction(AnalyzeConditionalExpression, SyntaxKind.ConditionalExpression);
    }

    /// <summary>
    /// Analyzes a ConditionalExpressionSyntax node to check for nesting.
    /// The diagnostic is reported on the outermost conditional expression that contains nested ones.
    /// </summary>
    private static void AnalyzeConditionalExpression(SyntaxNodeAnalysisContext context)
    {
        var conditionalExpression = (ConditionalExpressionSyntax)context.Node;

        // We only want to analyze the top-level expression.
        // If the parent is also a conditional expression, it will be analyzed instead, so we return.
        if (conditionalExpression.Parent is ConditionalExpressionSyntax) return;

        // Check if the expression is inside a LINQ Expression Tree.
        // Switch expressions are not supported in expression trees and would cause a runtime error.
        var containingLambda = conditionalExpression.FirstAncestorOrSelf<LambdaExpressionSyntax>();
        if (containingLambda != null)
        {
            var typeInfo = context.SemanticModel.GetTypeInfo(containingLambda, context.CancellationToken);
            if (typeInfo.ConvertedType is INamedTypeSymbol { Name: "Expression", ContainingNamespace.Name: "Expressions" })
            {
                // This lambda is converted to an Expression<T>, so we should ignore it.
                return;
            }
        }

        // Check if any of its direct children are conditional expressions.
        var hasNestedConditional = conditionalExpression.WhenTrue is ConditionalExpressionSyntax ||
                                   conditionalExpression.WhenFalse is ConditionalExpressionSyntax;

        if (hasNestedConditional) context.ReportDiagnostic(Diagnostic.Create(Rule, conditionalExpression.GetLocation()));
    }
}

[ExportCodeFixProvider(LanguageNames.CSharp, Name = nameof(NestedConditionalCodeFixProvider))]
[Shared]
public sealed class NestedConditionalCodeFixProvider : CodeFixProvider
{
    public override ImmutableArray<string> FixableDiagnosticIds => ImmutableArray.Create(NestedConditionalAnalyzer.DiagnosticId);

    public override FixAllProvider GetFixAllProvider() => WellKnownFixAllProviders.BatchFixer;

    public override async Task RegisterCodeFixesAsync(CodeFixContext context)
    {
        var root = await context.Document.GetSyntaxRootAsync(context.CancellationToken).ConfigureAwait(false);
        if (root == null) return;

        var diagnostic = context.Diagnostics.First();
        var diagnosticSpan = diagnostic.Location.SourceSpan;

        // Find the conditional expression identified by the diagnostic.
        var conditionalExpression = root.FindToken(diagnosticSpan.Start).Parent?.FirstAncestorOrSelf<ConditionalExpressionSyntax>();
        if (conditionalExpression == null) return;

        // Offer the primary fix using pattern matching on variable or `true switch` with `when` clauses.
        context.RegisterCodeFix(
            CodeAction.Create(
                title: "Refactor to switch expression",
                createChangedDocument: c => RefactorToTrueWhenSwitchAsync(context.Document, conditionalExpression, c),
                equivalenceKey: "RefactorToTrueWhenSwitch"),
            diagnostic);

        // Offer the secondary fix using pattern matching (on variable or tuple).
        context.RegisterCodeFix(
            CodeAction.Create(
                title: "Refactor to switch expression using pattern matching (on variable or tuple)",
                createChangedDocument: c => RefactorToPatternMatchingSwitchAsync(context.Document, conditionalExpression, c),
                equivalenceKey: "RefactorToPatternSwitch"),
            diagnostic);
    }

    private static async Task<Document> RefactorToPatternMatchingSwitchAsync(
        Document document,
        ConditionalExpressionSyntax outerConditional,
        CancellationToken cancellationToken)
    {
        var editor = await DocumentEditor.CreateAsync(document, cancellationToken);

        // First, try to refactor as a switch on a common variable (e.g., variable == 1 ? ... : variable == 2 ? ...)
        var switchOnVariable = TryCreateSwitchOnVariable(outerConditional);
        if (switchOnVariable != null)
        {
            editor.ReplaceNode(outerConditional, switchOnVariable.WithAdditionalAnnotations(Simplifier.Annotation));
            return editor.GetChangedDocument();
        }

        // If the first pattern fails, fall back to creating a switch on a tuple of boolean conditions
        var switchOnTuple = TryCreateSwitchOnTuple(outerConditional);
        if (switchOnTuple != null)
        {
            editor.ReplaceNode(outerConditional, switchOnTuple.WithAdditionalAnnotations(Simplifier.Annotation));
            return editor.GetChangedDocument();
        }

        // Return original document if no supported pattern was matched
        return document;
    }

    private static async Task<Document> RefactorToTrueWhenSwitchAsync(
        Document document,
        ConditionalExpressionSyntax outerConditional,
        CancellationToken cancellationToken)
    {
        var editor = await DocumentEditor.CreateAsync(document, cancellationToken);
        var arms = new List<SwitchExpressionArmSyntax>();

        var innerTrue = outerConditional.WhenTrue as ConditionalExpressionSyntax;
        var innerFalse = outerConditional.WhenFalse as ConditionalExpressionSyntax;

        // Pattern for fully nested expression: c1 ? (c2 ? r1 : r2) : (c3 ? r3 : r4)
        if (innerTrue != null && innerFalse != null)
        {
            var c1 = outerConditional.Condition;
            // Create a negated version of the first condition for clarity in the 'else' path.
            var notC1 = SyntaxFactory.PrefixUnaryExpression(SyntaxKind.LogicalNotExpression, SyntaxFactory.ParenthesizedExpression(c1));

            // when c1 && c2
            arms.Add(
                CreateWhenArm(
                    SyntaxFactory.BinaryExpression(SyntaxKind.LogicalAndExpression, c1.WithoutTrivia(), innerTrue.Condition),
                    innerTrue.WhenTrue));

            // when c1 (handles the 'else' of the inner c2 condition)
            arms.Add(
                CreateWhenArm(
                    c1.WithoutTrivia(),
                    innerTrue.WhenFalse));

            // when !c1 && c3
            arms.Add(
                CreateWhenArm(
                    SyntaxFactory.BinaryExpression(SyntaxKind.LogicalAndExpression, notC1, innerFalse.Condition),
                    innerFalse.WhenTrue));

            // default (handles the 'else' of both c1 and c3)
            arms.Add(CreateDefaultArm(innerFalse.WhenFalse));
        }
        // Pattern for nesting on true branch: c1 ? (c2 ? r1 : r2) : r3
        else if (innerTrue != null)
        {
            // when c1 && c2 => r1
            arms.Add(
                CreateWhenArm(
                    SyntaxFactory.BinaryExpression(SyntaxKind.LogicalAndExpression, outerConditional.Condition, innerTrue.Condition),
                    innerTrue.WhenTrue));

            // when c1 => r2
            arms.Add(CreateWhenArm(outerConditional.Condition, innerTrue.WhenFalse));

            // _ => r3 (default)
            arms.Add(CreateDefaultArm(outerConditional.WhenFalse));
        }
        // Pattern for nesting on false branch (if-else-if chain): c1 ? r1 : (c2 ? r2 : ...)
        else if (innerFalse != null)
        {
            var (conditions, results, finalElse) = DeconstructChain(outerConditional);
            if (!conditions.Any() || finalElse == null) return document;

            for (var i = 0; i < conditions.Count; i++) arms.Add(CreateWhenArm(conditions[i], results[i]));
            arms.Add(CreateDefaultArm(finalElse));
        }
        else
        {
            // Not a nested conditional, should not be handled by this fixer.
            return document;
        }

        var switchExpression = SyntaxFactory.SwitchExpression(
                SyntaxFactory.LiteralExpression(SyntaxKind.TrueLiteralExpression),
                SyntaxFactory.SeparatedList(arms)
            )
            .WithAdditionalAnnotations(Simplifier.Annotation);

        editor.ReplaceNode(outerConditional, switchExpression);
        return editor.GetChangedDocument();
    }

    // Helper to create a switch arm with a 'when' clause.
    private static SwitchExpressionArmSyntax CreateWhenArm(ExpressionSyntax condition, ExpressionSyntax result) =>
        SyntaxFactory.SwitchExpressionArm(
            SyntaxFactory.DiscardPattern(),
            SyntaxFactory.WhenClause(condition),
            result);

    // Helper to create a default switch arm.
    private static SwitchExpressionArmSyntax CreateDefaultArm(ExpressionSyntax result) =>
        SyntaxFactory.SwitchExpressionArm(
            SyntaxFactory.DiscardPattern(),
            result);

    private static SwitchExpressionSyntax? TryCreateSwitchOnVariable(ConditionalExpressionSyntax outer)
    {
        var (conditions, results, finalElse) = DeconstructChain(outer);
        if (!conditions.Any() || finalElse == null) return null;

        // Try to find a common variable that is being checked for equality.
        if (!IsEqualityCheck(conditions[0], out var variableToSwitchOn, out var firstValue)) return null;

        var values = new List<ExpressionSyntax> { firstValue! };
        for (var i = 1; i < conditions.Count; i++)
        {
            if (!IsEqualityCheck(conditions[i], out var currentVar, out var currentValue)) return null;
            if (!SyntaxFactory.AreEquivalent(variableToSwitchOn, currentVar)) return null;
            values.Add(currentValue!);
        }

        // If all conditions check the same variable, build the switch on that variable.
        var arms = new List<SwitchExpressionArmSyntax>();
        for (var i = 0; i < results.Count; i++) arms.Add(SyntaxFactory.SwitchExpressionArm(SyntaxFactory.ConstantPattern(values[i]), results[i]));
        arms.Add(SyntaxFactory.SwitchExpressionArm(SyntaxFactory.DiscardPattern(), finalElse));

        return SyntaxFactory.SwitchExpression(variableToSwitchOn!, SyntaxFactory.SeparatedList(arms));
    }

    private static SwitchExpressionSyntax? TryCreateSwitchOnTuple(ConditionalExpressionSyntax outer)
    {
        var c1 = outer.Condition;
        var innerWhenTrue = outer.WhenTrue as ConditionalExpressionSyntax;
        var innerWhenFalse = outer.WhenFalse as ConditionalExpressionSyntax;

        // Pattern 1: Symmetric nesting -> c1 ? (c2 ? r1 : r2) : (c2 ? r3 : r4)
        if (innerWhenTrue != null && innerWhenFalse != null && SyntaxFactory.AreEquivalent(innerWhenTrue.Condition, innerWhenFalse.Condition))
        {
            var c2 = innerWhenTrue.Condition;
            var switchGoverningExpression = SyntaxFactory.TupleExpression(SyntaxFactory.SeparatedList([SyntaxFactory.Argument(c1), SyntaxFactory.Argument(c2)]));
            var arms = new[]
            {
                CreateTupleArm(true, true, innerWhenTrue.WhenTrue),
                CreateTupleArm(true, false, innerWhenTrue.WhenFalse),
                CreateTupleArm(false, true, innerWhenFalse.WhenTrue),
                CreateTupleArm(false, false, innerWhenFalse.WhenFalse)
            };
            return SyntaxFactory.SwitchExpression(switchGoverningExpression, SyntaxFactory.SeparatedList(arms));
        }

        // Pattern 2: Nesting on the 'false' branch -> c1 ? r1 : (c2 ? r2 : r3)
        if (innerWhenTrue == null && innerWhenFalse != null)
        {
            var c2 = innerWhenFalse.Condition;
            var switchGoverningExpression = SyntaxFactory.TupleExpression(SyntaxFactory.SeparatedList([SyntaxFactory.Argument(c1), SyntaxFactory.Argument(c2)]));
            var arms = new[]
            {
                CreateTupleArm(true, null, outer.WhenTrue), // (true, _)
                CreateTupleArm(false, true, innerWhenFalse.WhenTrue),
                CreateTupleArm(false, false, innerWhenFalse.WhenFalse)
            };
            return SyntaxFactory.SwitchExpression(switchGoverningExpression, SyntaxFactory.SeparatedList(arms));
        }

        // Pattern 3: Nesting on the 'true' branch -> c1 ? (c2 ? r2 : r3) : r4
        if (innerWhenTrue != null && innerWhenFalse == null)
        {
            var c2 = innerWhenTrue.Condition;
            var switchGoverningExpression = SyntaxFactory.TupleExpression(SyntaxFactory.SeparatedList([SyntaxFactory.Argument(c1), SyntaxFactory.Argument(c2)]));
            var arms = new[]
            {
                CreateTupleArm(true, true, innerWhenTrue.WhenTrue),
                CreateTupleArm(true, false, innerWhenTrue.WhenFalse),
                CreateTupleArm(false, null, outer.WhenFalse) // (false, _)
            };
            return SyntaxFactory.SwitchExpression(switchGoverningExpression, SyntaxFactory.SeparatedList(arms));
        }

        return null;
    }

    // Deconstructs a chain of ternaries like c1 ? r1 : c2 ? r2 : r3 into parts.
    private static (List<ExpressionSyntax> conditions, List<ExpressionSyntax> results, ExpressionSyntax? finalElse) DeconstructChain(ConditionalExpressionSyntax? outer)
    {
        var conditions = new List<ExpressionSyntax>();
        var results = new List<ExpressionSyntax>();
        var current = outer;

        while (current != null)
        {
            conditions.Add(current.Condition);
            results.Add(current.WhenTrue);
            if (current.WhenFalse is ConditionalExpressionSyntax next)
                current = next;
            else
                return (conditions, results, current.WhenFalse);
        }

        // This line should theoretically not be reached if the input is a valid conditional expression chain.
        return (conditions, results, null);
    }

    // Checks if an expression is in the form 'var == value' or 'value == var'.
    private static bool IsEqualityCheck(ExpressionSyntax expression, out ExpressionSyntax? variable, out ExpressionSyntax? value)
    {
        variable = null;
        value = null;
        if (expression is not BinaryExpressionSyntax binaryExpr || binaryExpr.Kind() != SyntaxKind.EqualsExpression) return false;

        // Assuming one side is the variable and the other is the constant value to check against.
        variable = binaryExpr.Left;
        value = binaryExpr.Right;
        return true;
    }

    // Creates a switch arm for a tuple-based switch. A null value for val1 or val2 creates a discard pattern '_'.
    private static SwitchExpressionArmSyntax CreateTupleArm(bool? val1, bool? val2, ExpressionSyntax result)
    {
        static PatternSyntax CreatePattern(bool? value) =>
            value.HasValue
                ? SyntaxFactory.ConstantPattern(SyntaxFactory.LiteralExpression(value.Value ? SyntaxKind.TrueLiteralExpression : SyntaxKind.FalseLiteralExpression))
                : SyntaxFactory.DiscardPattern();

        var pattern = SyntaxFactory.RecursivePattern()
            .WithPositionalPatternClause(
                SyntaxFactory.PositionalPatternClause(
                    SyntaxFactory.SeparatedList(
                    [
                        SyntaxFactory.Subpattern(CreatePattern(val1)),
                        SyntaxFactory.Subpattern(CreatePattern(val2))
                    ])
                )
            );
        return SyntaxFactory.SwitchExpressionArm(pattern, result);
    }
}
