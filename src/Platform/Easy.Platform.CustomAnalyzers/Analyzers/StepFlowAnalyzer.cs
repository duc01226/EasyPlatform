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
using Microsoft.CodeAnalysis.Text;

#endregion

namespace Easy.Platform.CustomAnalyzers.Analyzers;

/// <summary>
/// Analyzer that enforces blank line rules and step-flow dependencies between statements.
/// </summary>
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class StepFlowAnalyzer : DiagnosticAnalyzer
{
    public const string MissingBlankLineId = "EASY_PLATFORM_ANALYZERS_STEP001";
    public const string UnexpectedBlankLineId = "EASY_PLATFORM_ANALYZERS_STEP002";
    public const string MissingPrevOutputsId = "EASY_PLATFORM_ANALYZERS_STEP003";

    private static readonly Dictionary<string, DiagnosticDescriptor> Rules = new()
    {
        {
            MissingBlankLineId,
            new DiagnosticDescriptor(
                MissingBlankLineId,
                "Missing blank line between dependent steps",
                "This statement uses output from the previous statement — insert a blank line to mark a new step. "
                + "Code Step Rule: blank line = step boundary, no blank line = independent/parallel work in the same step. "
                + "If this creates too many steps, either: (1) extract a function to encapsulate sub-steps, or (2) use chaining (.Then/.Pipe/.Select) to keep sub-steps visually nested. "
                + "Review the WHOLE method holistically — restructure all steps, not just this line.",
                CustomAnalyzersConst.Categories.CodeFlow,
                DiagnosticSeverity.Warning,
                true)
        },
        {
            UnexpectedBlankLineId,
            new DiagnosticDescriptor(
                UnexpectedBlankLineId,
                "Unnecessary blank line — statements are independent (same step)",
                "These statements don't depend on each other — remove the blank line to group them as one step. "
                + "Code Step Rule: no blank line = parallel/independent work in the same step. "
                + "If these ARE logically different tasks with internal sub-steps, extract each into its own function then call them on adjacent lines (same step). "
                + "Do NOT flatten unrelated sub-tasks with blank lines between them — either group as one step or extract functions.",
                CustomAnalyzersConst.Categories.CodeFlow,
                DiagnosticSeverity.Warning,
                true)
        },
        {
            MissingPrevOutputsId,
            new DiagnosticDescriptor(
                MissingPrevOutputsId,
                "Step must consume all previous outputs",
                "This step does not use all outputs from the previous step: {0}. "
                + "Code Step Rule: every step MUST consume ALL outputs from its predecessor. "
                + "Fix options: (1) merge into the previous step (remove blank line) if they are independent, "
                + "(2) restructure so this step actually uses {0}, or "
                + "(3) extract a function that consumes {0} internally and returns what this step needs.",
                CustomAnalyzersConst.Categories.CodeFlow,
                DiagnosticSeverity.Warning,
                true)
        }
    };

    private static readonly ImmutableArray<DiagnosticDescriptor> ImmutableArrayRules = Rules.Values.ToImmutableArray();

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics
        => ImmutableArrayRules;

    /// <inheritdoc />
    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxNodeAction(AnalyzeBlock, SyntaxKind.Block);
    }

    private static void AnalyzeBlock(SyntaxNodeAnalysisContext ctx)
    {
        var block = (BlockSyntax)ctx.Node;
        var statements = block.Statements;
        if (statements.Count < 2)
            return;

        var text = block.SyntaxTree.GetText(ctx.CancellationToken);
        var model = ctx.SemanticModel;

        // Build info for each statement
        var infos = statements
            .Select(s => new Helpers.StatementInfo(
                s,
                Helpers.GetOutputSymbols(s, model),
                Helpers.GetReferencedSymbols(s, model)))
            .ToArray();

        if (!Helpers.BlockHasAnyDependency(infos))
            return;

        var lastMissing = false;
        for (var i = 1; i < infos.Length; i++)
        {
            ref var prev = ref infos[i - 1];
            ref var cur = ref infos[i];

            var dependsImmediate = prev.Outputs.Overlaps(cur.Identifiers);
            var dependsRecursive = Helpers.DependsOnPreviousStep(i - 1, i, infos, text);
            var hasBlank = Helpers.HasBlankLineBetween(prev.Syntax, cur.Syntax, text);
            var isCurTerminating = Helpers.IsTerminating(cur.Syntax);
            var isPrevTerminating = Helpers.IsTerminating(prev.Syntax);

            // Missing blank line rule
            if (dependsImmediate && !hasBlank && !lastMissing && !(isCurTerminating || isPrevTerminating))
            {
                ctx.ReportDiagnostic(Diagnostic.Create(Rules[MissingBlankLineId], cur.Syntax.GetLocation()));
                lastMissing = true;
                continue;
            }

            lastMissing = false;

            // Unexpected blank line rule
            if (!dependsRecursive && hasBlank && prev.Outputs.Any()
                && cur.Outputs.Any() && !Helpers.LaterDependsOn(prev, infos, i, text))
            {
                ctx.ReportDiagnostic(Diagnostic.Create(Rules[UnexpectedBlankLineId], cur.Syntax.GetLocation()));
                continue;
            }

            // Missing outputs consumption rule
            if (hasBlank && cur.Outputs.Any() && !(isCurTerminating || isPrevTerminating))
            {
                var prevOut = CollectStepOutputs(infos, i, text);
                var curId = CollectStepIdentifiers(infos, i, text);
                var missing = prevOut.Where(s => !curId.Contains(s)).Select(s => s.Name).ToArray();
                if (missing.Length > 0)
                    ctx.ReportDiagnostic(Diagnostic.Create(Rules[MissingPrevOutputsId], cur.Syntax.GetLocation(), string.Join(", ", missing)));
            }
        }
    }

    private static HashSet<ISymbol> CollectStepOutputs(Helpers.StatementInfo[] infos, int curIndex, SourceText text)
    {
        var set = new HashSet<ISymbol>(SymbolEqualityComparer.Default);
        for (var j = curIndex - 1; j >= 0; j--)
        {
            set.UnionWith(infos[j].Outputs);
            if (j == 0 || Helpers.HasBlankLineBetween(infos[j - 1].Syntax, infos[j].Syntax, text))
                break;
        }

        return set;
    }

    private static HashSet<ISymbol> CollectStepIdentifiers(Helpers.StatementInfo[] infos, int startIndex, SourceText text)
    {
        var set = new HashSet<ISymbol>(SymbolEqualityComparer.Default);
        for (var j = startIndex; j < infos.Length; j++)
        {
            set.UnionWith(infos[j].Identifiers);
            if (j + 1 == infos.Length || Helpers.HasBlankLineBetween(infos[j].Syntax, infos[j + 1].Syntax, text))
                break;
        }

        return set;
    }
}

/// <summary>
/// Provides code-fix implementations for StepFlowAnalyzer diagnostics.
/// </summary>
[ExportCodeFixProvider(LanguageNames.CSharp, Name = nameof(StepFlowCodeFixProvider))]
[Shared]
public sealed class StepFlowCodeFixProvider : CodeFixProvider
{
    public override ImmutableArray<string> FixableDiagnosticIds
        => ImmutableArray.Create(
            StepFlowAnalyzer.MissingBlankLineId,
            StepFlowAnalyzer.UnexpectedBlankLineId);

    public override FixAllProvider GetFixAllProvider() => WellKnownFixAllProviders.BatchFixer;

    public override async Task RegisterCodeFixesAsync(CodeFixContext context)
    {
        var root = await context.Document.GetSyntaxRootAsync(context.CancellationToken).ConfigureAwait(false);
        if (root is null) return;

        var diag = context.Diagnostics.First();
        var stmt = root.FindNode(diag.Location.SourceSpan).FirstAncestorOrSelf<StatementSyntax>();
        if (stmt is null) return;

        var title = diag.Id == StepFlowAnalyzer.MissingBlankLineId
            ? "Insert blank line before this statement"
            : "Remove blank line before this statement";

        context.RegisterCodeFix(
            CodeAction.Create(
                title,
                c => ApplyFixAsync(context.Document, stmt, diag.Id, c),
                diag.Id),
            diag);
    }

    private static async Task<Document> ApplyFixAsync(
        Document document,
        StatementSyntax stmt,
        string diagnosticId,
        CancellationToken token)
    {
        var editor = await DocumentEditor.CreateAsync(document, token).ConfigureAwait(false);
        var trivia = stmt.GetLeadingTrivia();
        var newTrivia = diagnosticId == StepFlowAnalyzer.MissingBlankLineId && !trivia.FirstOrDefault().IsKind(SyntaxKind.EndOfLineTrivia)
            ? trivia.Insert(0, SyntaxFactory.EndOfLine("\r\n"))
            : trivia.SkipWhile(t => t.IsKind(SyntaxKind.EndOfLineTrivia)).ToSyntaxTriviaList();

        editor.ReplaceNode(stmt, stmt.WithLeadingTrivia(newTrivia));
        return editor.GetChangedDocument();
    }
}
