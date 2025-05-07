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
public class StepFlowAnalyzer : DiagnosticAnalyzer
{
    public const string MissingBlankLineId = "CUSTOM_ANALYZERS_STEP001";
    public const string UnexpectedBlankLineId = "CUSTOM_ANALYZERS_STEP002";
    public const string MissingPrevOutputsId = "CUSTOM_ANALYZERS_STEP003";

    private static readonly DiagnosticDescriptor MissingBlankLineRule = new(
        MissingBlankLineId,
        "Missing blank line between dependent statements",
        "A blank line is required when a statement depends on any statement's output in the previous step",
        CustomAnalyzersConst.Categories.CodeFlow,
        DiagnosticSeverity.Warning,
        isEnabledByDefault: true);

    private static readonly DiagnosticDescriptor UnexpectedBlankLineRule = new(
        UnexpectedBlankLineId,
        "Unexpected blank line within a step",
        "Blank line is unnecessary as the statement does not depend on any statement's output in the previous step",
        CustomAnalyzersConst.Categories.CodeFlow,
        DiagnosticSeverity.Warning,
        isEnabledByDefault: true);

    private static readonly DiagnosticDescriptor MissingPrevOutputsRule = new(
        MissingPrevOutputsId,
        "Step must consume all previous outputs",
        "This step must consume all outputs from the previous step: {0}",
        CustomAnalyzersConst.Categories.CodeFlow,
        DiagnosticSeverity.Warning,
        isEnabledByDefault: true);

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => ImmutableArray.Create(
            MissingBlankLineRule,
            UnexpectedBlankLineRule,
            MissingPrevOutputsRule);

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxNodeAction(AnalyzeBlock, SyntaxKind.Block);
    }

    private static void AnalyzeBlock(SyntaxNodeAnalysisContext ctx)
    {
        var block = (BlockSyntax)ctx.Node;
        var stmts = block.Statements;
        if (stmts.Count < 2)
            return;

        var semanticModel = ctx.SemanticModel;

        // 1) Build symbol‐based info for each statement
        var infos = stmts
            .Select(s => new Helpers.StatementInfo(
                syntax: s,
                outputs: Helpers.GetOutputSymbols(s, semanticModel),
                identifiers: Helpers.GetReferencedSymbols(s, semanticModel)))
            .ToArray();

        // 2) Skip blocks with no inter‐statement deps
        if (!Helpers.BlockHasAnyDependency(infos))
            return;

        var lastMissingReported = false;

        // 3) Pairwise blank/dependency checks
        for (var i = 1; i < infos.Length; i++)
        {
            ref var prev = ref infos[i - 1];
            ref var cur = ref infos[i];

            // direct (non‐recursive) dependence
            var dependsOnImmediatePrev = prev.Outputs.Overlaps(cur.Identifiers);
            // original recursive check for other rules
            var dependsOnPrev = DependsOnPreviousStep(i - 1, i, infos);
            var hasBlank = Helpers.HasBlankLineBetween(prev.Syntax, cur.Syntax);

            // Missing blank?
            if (dependsOnImmediatePrev
                && !hasBlank
                && !lastMissingReported
                && !Helpers.IsReturn(cur.Syntax)
                && !Helpers.IsIfWithReturn(cur.Syntax)
                && !Helpers.IsIfWithThrow(cur.Syntax)
                && cur.Syntax is not ThrowStatementSyntax
                && cur.Syntax is not ReturnStatementSyntax
                && !Helpers.IsIfWithBreakOrContinue(cur.Syntax))
            {
                ctx.ReportDiagnostic(
                    Diagnostic.Create(
                        MissingBlankLineRule,
                        cur.Syntax.GetLocation()));

                lastMissingReported = true;
                continue;
            }
            else
            {
                // reset for the next iteration
                lastMissingReported = false;
            }

            // Unexpected blank?
            if (!dependsOnPrev
                && hasBlank
                && prev.Outputs.Any()
                && cur.Outputs.Any()
                && !Helpers.IsReturn(cur.Syntax)
                && !Helpers.IsIfWithReturn(prev.Syntax)
                && !Helpers.IsIfWithThrow(prev.Syntax)
                && cur.Syntax is not ThrowStatementSyntax
                && cur.Syntax is not ReturnStatementSyntax
                && !Helpers.LaterDependsOn(prev, infos, i))
            {
                ctx.ReportDiagnostic(
                    Diagnostic.Create(
                        UnexpectedBlankLineRule,
                        cur.Syntax.GetLocation()));
                continue;
            }

            // 4) New: when *this* statement starts a new step
            if (hasBlank
                && cur.Outputs.Any()
                && !Helpers.IsIfWithReturn(cur.Syntax)
                && !Helpers.IsIfWithThrow(cur.Syntax)
                && cur.Syntax is not ThrowStatementSyntax
                && cur.Syntax is not ReturnStatementSyntax
                && prev.Syntax is not ThrowStatementSyntax
                && prev.Syntax is not ReturnStatementSyntax
                && !Helpers.IsIfWithReturn(prev.Syntax)
                && !Helpers.IsIfWithThrow(prev.Syntax))
            {
                // Gather previous step outputs:
                var prevStepOutputs = new HashSet<ISymbol>(SymbolEqualityComparer.Default);
                // walk backward until we hit a blank or start of block
                for (var j = i - 1; j >= 0; j--)
                {
                    prevStepOutputs.UnionWith(infos[j].Outputs);
                    if (j == 0 || Helpers.HasBlankLineBetween(infos[j - 1].Syntax, infos[j].Syntax))
                        break;
                }

                // Gather current step identifiers:
                var curStepIdents = new HashSet<ISymbol>(SymbolEqualityComparer.Default);
                // walk forward until next blank or end
                for (var j = i; j < infos.Length; j++)
                {
                    curStepIdents.UnionWith(infos[j].Identifiers);
                    if (j + 1 == infos.Length || Helpers.HasBlankLineBetween(infos[j].Syntax, infos[j + 1].Syntax))
                        break;
                }

                // Check that *all* prevStepOutputs appear in curStepIdents
                var missing = prevStepOutputs
                    .Where(sym => !curStepIdents.Contains(sym))
                    .Select(sym => sym.Name)
                    .ToArray();

                if (missing.Length > 0)
                {
                    ctx.ReportDiagnostic(
                        Diagnostic.Create(
                            MissingPrevOutputsRule,
                            cur.Syntax.GetLocation(),
                            string.Join(", ", missing)));
                }
            }
        }
    }

    private static bool DependsOnPreviousStep(
        int prevIdx,
        int curIdx,
        Helpers.StatementInfo[] infos)
    {
        var overlap = infos[prevIdx].Outputs.Overlaps(infos[curIdx].Identifiers);

        if (!overlap
            && prevIdx > 0
            && !Helpers.HasBlankLineBetween(infos[prevIdx - 1].Syntax, infos[prevIdx].Syntax))
        {
            // recurse to see if an earlier step feeds this one
            return DependsOnPreviousStep(prevIdx - 1, curIdx, infos);
        }

        return overlap;
    }
}

[ExportCodeFixProvider(LanguageNames.CSharp, Name = nameof(StepFlowCodeFixProvider))]
[Shared]
public class StepFlowCodeFixProvider : CodeFixProvider
{
    public override ImmutableArray<string> FixableDiagnosticIds
        => ImmutableArray.Create(
            StepFlowAnalyzer.MissingBlankLineId,
            StepFlowAnalyzer.UnexpectedBlankLineId);

    public override FixAllProvider GetFixAllProvider()
        => WellKnownFixAllProviders.BatchFixer;

    public override async Task RegisterCodeFixesAsync(CodeFixContext context)
    {
        var root = await context.Document.GetSyntaxRootAsync(context.CancellationToken).ConfigureAwait(false);
        if (root == null) return;

        var diag = context.Diagnostics.First();
        var span = diag.Location.SourceSpan;

        // find the statement node the diagnostic was reported on
        var stmt = root.FindToken(span.Start)
            .Parent?
            .AncestorsAndSelf()
            .OfType<StatementSyntax>()
            .FirstOrDefault();

        if (stmt is null)
            return;

        switch (diag.Id)
        {
            case StepFlowAnalyzer.MissingBlankLineId:
                context.RegisterCodeFix(
                    CodeAction.Create(
                        title: "Insert blank line before this statement",
                        createChangedDocument: c => InsertBlankLineAsync(context.Document, stmt, c),
                        equivalenceKey: StepFlowAnalyzer.MissingBlankLineId),
                    diag);
                break;

            case StepFlowAnalyzer.UnexpectedBlankLineId:
                context.RegisterCodeFix(
                    CodeAction.Create(
                        title: "Remove blank line before this statement",
                        createChangedDocument: c => RemoveBlankLineAsync(context.Document, stmt, c),
                        equivalenceKey: StepFlowAnalyzer.UnexpectedBlankLineId),
                    diag);
                break;
        }
    }

    private static async Task<Document> InsertBlankLineAsync(
        Document document,
        StatementSyntax stmt,
        CancellationToken cancellationToken)
    {
        var editor = await DocumentEditor.CreateAsync(document, cancellationToken).ConfigureAwait(false);

        // Prepend one end-of-line trivia before existing leading trivia
        var oldTrivia = stmt.GetLeadingTrivia();
        var eol = SyntaxFactory.EndOfLine("\r\n");
        var newTrivia = oldTrivia.Insert(0, eol);

        var newStmt = stmt.WithLeadingTrivia(newTrivia);
        editor.ReplaceNode(stmt, newStmt);

        return editor.GetChangedDocument();
    }

    private static async Task<Document> RemoveBlankLineAsync(
        Document document,
        StatementSyntax stmt,
        CancellationToken cancellationToken)
    {
        var editor = await DocumentEditor.CreateAsync(document, cancellationToken).ConfigureAwait(false);

        var oldTrivia = stmt.GetLeadingTrivia();

        // If the first trivia is an end-of-line, drop it.
        // This removes one blank line between the previous token and our statement.
        var newTrivia = oldTrivia;
        if (oldTrivia.Count >= 1 && oldTrivia.First().IsKind(SyntaxKind.EndOfLineTrivia))
            newTrivia = oldTrivia.RemoveAt(0);

        var newStmt = stmt.WithLeadingTrivia(newTrivia);
        editor.ReplaceNode(stmt, newStmt);

        return editor.GetChangedDocument();
    }
}
