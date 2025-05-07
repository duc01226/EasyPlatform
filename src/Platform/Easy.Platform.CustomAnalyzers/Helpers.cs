#region

using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;

#endregion

namespace Easy.Platform.CustomAnalyzers;

internal static class Helpers
{
    public static bool BlockHasAnyDependency(StatementInfo[] infos)
    {
        var seen = new HashSet<ISymbol>(SymbolEqualityComparer.Default);
        foreach (var info in infos)
        {
            if (seen.Overlaps(info.Identifiers))
                return true;
            seen.UnionWith(info.Outputs);
        }

        return false;
    }

    public static bool HasBlankLineBetween(StatementSyntax prev, StatementSyntax cur)
    {
        // Grab the source text for this tree
        var text = prev.SyntaxTree.GetText();

        // End line of the previous stmt, start line of the current stmt
        var prevEnd = prev.GetLocation().GetLineSpan().EndLinePosition.Line;
        var curStart = cur.GetLocation().GetLineSpan().StartLinePosition.Line;

        // Scan each intervening line
        for (var line = prevEnd + 1; line < curStart; line++)
        {
            var lineText = text.Lines[line].ToString();
            // True if *exactly* blank (no spaces, no comments)
            if (string.IsNullOrWhiteSpace(lineText))
                return true;
        }

        return false;
    }

    public static bool LaterDependsOn(
        in StatementInfo prev,
        StatementInfo[] all,
        int curIndex)
    {
        for (var j = curIndex + 1; j < all.Length; j++)
        {
            if (HasBlankLineBetween(all[j - 1].Syntax, all[j].Syntax))
                break;
            if (prev.Outputs.Overlaps(all[j].Identifiers))
                return true;
        }

        return false;
    }

    public static bool IsReturn(StatementSyntax s)
        => s is ReturnStatementSyntax;

    public static bool IsIfWithReturn(StatementSyntax s)
        => s is IfStatementSyntax ifs
           && ifs.Else == null
           && (ifs.Statement is ReturnStatementSyntax
               || (ifs.Statement is BlockSyntax blk
                   && blk.Statements.OfType<ReturnStatementSyntax>().Any()));

    public static bool IsIfWithThrow(StatementSyntax s)
        => s is IfStatementSyntax ifs
           && ifs.Else == null
           && (ifs.Statement is ThrowStatementSyntax
               || (ifs.Statement is BlockSyntax blk
                   && blk.Statements.OfType<ThrowStatementSyntax>().Any()));

    public static HashSet<ISymbol> GetOutputSymbols(
        StatementSyntax stmt,
        SemanticModel model)
    {
        var set = new HashSet<ISymbol>(SymbolEqualityComparer.Default);

        if (stmt is LocalDeclarationStatementSyntax decl)
        {
            foreach (var v in decl.Declaration.Variables)
            {
                var sym = model.GetDeclaredSymbol(v);
                if (sym != null)
                    set.Add(sym);
            }
        }
        else if (stmt is ExpressionStatementSyntax es
                 && es.Expression is AssignmentExpressionSyntax assign
                 && assign.Left is IdentifierNameSyntax idName)
        {
            var sym = model.GetSymbolInfo(idName).Symbol;
            if (sym != null && sym.Kind == SymbolKind.Local)
                set.Add(sym);
        }

        return set;
    }

    public static ImmutableHashSet<ISymbol> GetReferencedSymbols(
        StatementSyntax stmt,
        SemanticModel model)
    {
        return stmt
            .DescendantNodes()
            .OfType<IdentifierNameSyntax>()
            .Select(id => model.GetSymbolInfo(id).Symbol)
            .Where(s => s != null)
            .ToImmutableHashSet(SymbolEqualityComparer.Default)!;
    }

    public static bool HasCommentBefore(StatementSyntax stmt)
    {
        // any single- or multi-line comment immediately preceding the statement
        var trivia = stmt
            .GetLeadingTrivia()
            .Where(t => t.IsKind(SyntaxKind.SingleLineCommentTrivia)
                        || t.IsKind(SyntaxKind.MultiLineCommentTrivia));
        return trivia.Any();
    }

    public static bool IsIfWithBreakOrContinue(StatementSyntax s)
    {
        return s is IfStatementSyntax ifs &&
               (ifs.Statement.IsKind(SyntaxKind.BreakStatement) || ifs.Statement.IsKind(SyntaxKind.ContinueStatement) ||
                (ifs.Statement is BlockSyntax blk
                 && blk.Statements.Any(st =>
                     st.IsKind(SyntaxKind.BreakStatement) ||
                     st.IsKind(SyntaxKind.ContinueStatement))));
    }

    public readonly struct StatementInfo
    {
        public StatementSyntax Syntax { get; }
        public HashSet<ISymbol> Outputs { get; }
        public ImmutableHashSet<ISymbol> Identifiers { get; }

        public StatementInfo(
            StatementSyntax syntax,
            HashSet<ISymbol> outputs,
            ImmutableHashSet<ISymbol> identifiers)
        {
            Syntax = syntax;
            Outputs = outputs;
            Identifiers = identifiers;
        }
    }
}
