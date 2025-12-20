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

#endregion

namespace Easy.Platform.CustomAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class LinqInLoopAnalyzer : DiagnosticAnalyzer
{
    public const string LinqInLoopId = "EASY_PLATFORM_ANALYZERS_PERF001";
    public const string AwaitInLoopId = "EASY_PLATFORM_ANALYZERS_PERF002";

    private static readonly DiagnosticDescriptor[] Rules =
    [
        new(
            id: LinqInLoopId,
            title: "Avoid O(n) LINQ inside loops",
            messageFormat: "Calling '{0}' inside a loop can lead to O(n²) performance",
            category: CustomAnalyzersConst.Categories.Performance,
            defaultSeverity: DiagnosticSeverity.Warning,
            isEnabledByDefault: true),

        new(
            id: AwaitInLoopId,
            title: "Avoid 'await' inside loops",
            messageFormat: "Awaiting '{0}' inside a loop can serialize iterations and harm throughput",
            category: CustomAnalyzersConst.Categories.Performance,
            defaultSeverity: DiagnosticSeverity.Warning,
            isEnabledByDefault: true)
    ];

    private static readonly HashSet<string> SinglePredicateMethods =
    [
        "Where", "First", "FirstOrDefault", "Single", "SingleOrDefault",
        "Last", "LastOrDefault", "Any", "Count", "All"
    ];

    private static readonly HashSet<string> LoopInvocationNames =
    [
        "ForEach"
    ];

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => Rules.ToImmutableArray();

    public static DiagnosticDescriptor LinqInLoopRule => Rules[0];
    public static DiagnosticDescriptor AwaitInLoopRule => Rules[1];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();

        context.RegisterSyntaxNodeAction(AnalyzeInvocation, SyntaxKind.InvocationExpression);
        context.RegisterSyntaxNodeAction(AnalyzeAwait, SyntaxKind.AwaitExpression);
    }

    private static void AnalyzeInvocation(SyntaxNodeAnalysisContext ctx)
    {
        var invocation = (InvocationExpressionSyntax)ctx.Node;

        // 1) Must be in a real loop (for/foreach) or inside a ForEachAsync body
        if (!IsInsideLoop(invocation))
            return;

        // 2) Get the symbol; bail if not a method
        if (ctx.SemanticModel.GetSymbolInfo(invocation).Symbol is not IMethodSymbol symbolInfo)
            return;

        // 3) Determine what kind of call this is
        var methodName = symbolInfo.Name;
        var args = invocation.ArgumentList.Arguments;

        var isSinglePredicateLinq =
            symbolInfo.IsExtensionMethod &&
            symbolInfo.ContainingNamespace?.ToDisplayString() == "System.Linq" &&
            SinglePredicateMethods.Contains(methodName) &&
            args.Count == 1 &&
            args[0].Expression is SimpleLambdaExpressionSyntax;

        var isLoopExtension =
            LoopInvocationNames.Contains(methodName) &&
            invocation.Expression is MemberAccessExpressionSyntax;

        var isContains =
            methodName == "Contains" &&
            ImplementsIEnumerableOfT(symbolInfo.ContainingType) &&
            !Helpers.IsHashSet(symbolInfo.ContainingType) &&
            symbolInfo.ContainingType.SpecialType != SpecialType.System_String;

        var shouldReport = false;

        // 4) If it's a single-predicate LINQ call...
        if (isSinglePredicateLinq)
        {
            var lambda = (SimpleLambdaExpressionSyntax)args[0].Expression;

            // 4a) If it's nested inside a ForEach or ForEachAsync lambda, skip it
            var enclosingForEachExt = invocation.FirstAncestorOrSelf<InvocationExpressionSyntax>(inv =>
                inv.Expression is MemberAccessExpressionSyntax m
                && LoopInvocationNames.Contains(m.Name.Identifier.ValueText)
                && inv.ArgumentList.Arguments.Count == 1
                && inv.ArgumentList.Arguments[0].Expression is SimpleLambdaExpressionSyntax extLambda
                && extLambda.Body.FullSpan.Contains(invocation.FullSpan));

            if (enclosingForEachExt != null)
            {
                // it's part of your extension ForEach(...) or ForEachAsync(...), so do NOT report
                shouldReport = false;
            }
            else
            {
                // 4b) If we're in a foreach statement, only report if the predicate uses that loop var
                var foreachAncestor = invocation.FirstAncestorOrSelf<ForEachStatementSyntax>();
                if (foreachAncestor != null)
                {
                    var loopVar = foreachAncestor.Identifier.ValueText;
                    var usesLoopVar = lambda.Body
                        .DescendantNodes()
                        .OfType<IdentifierNameSyntax>()
                        .Any(id => id.Identifier.ValueText == loopVar);

                    if (usesLoopVar)
                        shouldReport = true;
                }
                else
                {
                    // 4c) In a for-loop or ForEachAsync body, always report
                    shouldReport = true;
                }
            }
        }
        // 5) Other patterns (List.ForEach, ForEachAsync, Contains): always report
        else if (isLoopExtension || isContains) shouldReport = true;

        // 6) Emit if flagged
        if (shouldReport)
        {
            ctx.ReportDiagnostic(
                Diagnostic.Create(
                    LinqInLoopRule,
                    invocation.Expression.GetLocation(),
                    methodName == "Contains" ? $"{methodName} (except Contains of HashSet)" : methodName));
        }
    }


    private static void AnalyzeAwait(SyntaxNodeAnalysisContext ctx)
    {
        var awaitExpr = (AwaitExpressionSyntax)ctx.Node;
        if (!IsInsideLoop(awaitExpr, exceptsInLoops: "ForEachAsync"))
            return;

        // Try to pull out the invocation or member‐access being awaited
        SyntaxNode targetNode = awaitExpr.Expression switch
        {
            InvocationExpressionSyntax inv => inv.Expression, // e.g. FooAsync(...)
            MemberAccessExpressionSyntax mem => mem, // e.g. foo.BarAsync
            _ => awaitExpr // fallback to the await keyword
        };

        // Get a friendly text for the message
        var invokedName = targetNode is MemberAccessExpressionSyntax m
            ? m.Name.Identifier.Text
            : targetNode.ToString();

        // Report *on* the actual call/member, not on the 'await' keyword
        ctx.ReportDiagnostic(
            Diagnostic.Create(
                AwaitInLoopRule,
                targetNode.GetLocation(),
                invokedName));
    }

    // Walk ancestors to detect for/foreach or calls to ForEach/ForEachAsync
    private static bool IsInsideLoop(SyntaxNode node, params string[] exceptsInLoops)
    {
        // Only perform this check if the node is an InvocationExpressionSyntax
        if (node is InvocationExpressionSyntax invocation)
        {
            // If this LINQ call is *immediately* chained into ForEach or ForEachAsync, skip it.
            if (invocation.Parent is MemberAccessExpressionSyntax invocationParentMember
                && LoopInvocationNames.Contains(invocationParentMember.Name.Identifier.ValueText)
                && invocationParentMember.Expression == invocation)
                return false;
        }

        for (var parent = node.Parent; parent != null; parent = parent.Parent)
        {
            // 1) real C# for/foreach — but only if we're in the BODY, not the header
            switch (parent)
            {
                case ForStatementSyntax forStmt:
                    // any part of the body counts
                    if (forStmt.Statement != null &&
                        forStmt.Statement.FullSpan.Contains(node.FullSpan))
                        return true;
                    break;

                case ForEachStatementSyntax foreachStmt:
                    // only if inside the { ... } block, not the "in <expr>" part
                    if (foreachStmt.Statement.FullSpan.Contains(node.FullSpan))
                        return true;
                    break;
            }

            // 2) your async ForEach extension *inside* a ForEachAsync(...) body
            // inv.ArgumentList.Arguments.Count > 0 => invocation body is the lambda argument, so make sure our node is inside that block
            if (parent is InvocationExpressionSyntax { Expression: MemberAccessExpressionSyntax member } inv
                && member.Name.Identifier.ValueText == "ForEachAsync"
                && inv.ArgumentList.Arguments.Count > 0
                && inv.ArgumentList.Arguments[0].Expression is SimpleLambdaExpressionSyntax lambda
                && lambda.Body.FullSpan.Contains(node.FullSpan)
                && !exceptsInLoops.Contains("ForEachAsync"))
                return true;
        }

        return false;
    }

    // Efficiently checks if a type implements IEnumerable<T>
    private static bool ImplementsIEnumerableOfT(ITypeSymbol type)
    {
        foreach (var i in type.AllInterfaces)
        {
            if (i.OriginalDefinition.SpecialType == SpecialType.System_Collections_Generic_IEnumerable_T)
                return true;
        }

        return false;
    }
}

[ExportCodeFixProvider(LanguageNames.CSharp, Name = nameof(LinqInLoopCodeFixProvider))]
[Shared]
public sealed class LinqInLoopCodeFixProvider : CodeFixProvider
{
    public override ImmutableArray<string> FixableDiagnosticIds
        => ImmutableArray.Create(
            LinqInLoopAnalyzer.LinqInLoopId,
            LinqInLoopAnalyzer.AwaitInLoopId);

    public override FixAllProvider GetFixAllProvider() =>
        WellKnownFixAllProviders.BatchFixer;

    public override async Task RegisterCodeFixesAsync(CodeFixContext context)
    {
        var root = await context.Document
            .GetSyntaxRootAsync(context.CancellationToken)
            .ConfigureAwait(false);
        if (root is null) return;

        foreach (var diag in context.Diagnostics)
        {
            // find the location of the diagnostic
            var node = root.FindNode(diag.Location.SourceSpan);

            // find the nearest for/foreach—if none, fall back to the containing statement
            var loopOrStmt = node
                                 .FirstAncestorOrSelf<StatementSyntax>(n =>
                                     n is ForStatementSyntax || n is ForEachStatementSyntax)
                             ?? node.FirstAncestorOrSelf<StatementSyntax>();

            if (loopOrStmt is null)
                continue;

            var title = $"Suppress {diag.Id} on this loop";

            context.RegisterCodeFix(
                CodeAction.Create(
                    title,
                    ct => SuppressWithPragmaAsync(context.Document, loopOrStmt, diag.Id, ct),
                    diag.Id),
                diag);
        }
    }

    private static async Task<Document> SuppressWithPragmaAsync(
        Document document,
        StatementSyntax statement,
        string diagnosticId,
        CancellationToken cancellationToken)
    {
        var editor = await DocumentEditor
            .CreateAsync(document, cancellationToken)
            .ConfigureAwait(false);

        // Build the disable / restore trivia
        var disableDirective = SyntaxFactory.Trivia(
            SyntaxFactory.PragmaWarningDirectiveTrivia(
                SyntaxFactory.Token(SyntaxKind.DisableKeyword),
                SyntaxFactory.SingletonSeparatedList<ExpressionSyntax>(
                    SyntaxFactory.IdentifierName(diagnosticId)),
                true));

        var restoreDirective = SyntaxFactory.Trivia(
            SyntaxFactory.PragmaWarningDirectiveTrivia(
                SyntaxFactory.Token(SyntaxKind.RestoreKeyword),
                SyntaxFactory.SingletonSeparatedList<ExpressionSyntax>(
                    SyntaxFactory.IdentifierName(diagnosticId)),
                true));

        // 1) Prepend the disable directive right before the statement
        var newLeading = SyntaxFactory.TriviaList(SyntaxFactory.ElasticCarriageReturnLineFeed)
            .Add(SyntaxFactory.ElasticCarriageReturnLineFeed)
            .Add(disableDirective)
            .Add(SyntaxFactory.ElasticCarriageReturnLineFeed)
            .AddRange(statement.GetLeadingTrivia().SkipWhile(t => t.IsKind(SyntaxKind.EndOfLineTrivia)));

        // Append blank line + restore after the loop/statement
        var newTrailing = statement.GetTrailingTrivia()
            .Add(SyntaxFactory.ElasticCarriageReturnLineFeed)
            .Add(restoreDirective)
            .Add(SyntaxFactory.ElasticCarriageReturnLineFeed);

        var newStatement = statement
            .WithLeadingTrivia(newLeading)
            .WithTrailingTrivia(newTrailing);

        editor.ReplaceNode(statement, newStatement);

        return editor.GetChangedDocument();
    }
}
