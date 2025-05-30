#region

using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Text;

#endregion

namespace Easy.Platform.CustomAnalyzers;

/// <summary>
/// Provides various helper methods for analyzing statement dependencies and formatting.
/// </summary>
internal static class Helpers
{
    private static readonly SymbolEqualityComparer SymbolComparer = SymbolEqualityComparer.Default;

    /// <summary>
    /// Determines whether any two statements in the block share dependencies.
    /// </summary>
    public static bool BlockHasAnyDependency(StatementInfo[] infos)
    {
        var seen = new HashSet<ISymbol>(SymbolComparer);
        foreach (var info in infos)
        {
            // If any identifier in current appears in seen outputs
            if (seen.Overlaps(info.Identifiers))
                return true;

            // Add this statement's outputs
            seen.UnionWith(info.Outputs);
        }

        return false;
    }

    /// <summary>
    /// Checks for a blank line between two statements using the provided source text.
    /// </summary>
    public static bool HasBlankLineBetween(in StatementSyntax prev, in StatementSyntax cur, SourceText text)
    {
        var prevLine = prev.GetLocation().GetLineSpan().EndLinePosition.Line;
        var curLine = cur.GetLocation().GetLineSpan().StartLinePosition.Line;

        for (var i = prevLine + 1; i < curLine; i++)
        {
            if (string.IsNullOrWhiteSpace(text.Lines[i].ToString()))
                return true;
        }

        return false;
    }

    /// <summary>
    /// Recursively checks if a previous statement feeds the current across blank lines.
    /// </summary>
    public static bool DependsOnPreviousStep(int prevIdx, int curIdx, StatementInfo[] infos, SourceText text)
    {
        var overlap = infos[prevIdx].Outputs.Overlaps(infos[curIdx].Identifiers);
        if (!overlap && prevIdx > 0 && !HasBlankLineBetween(infos[prevIdx - 1].Syntax, infos[prevIdx].Syntax, text))
            return DependsOnPreviousStep(prevIdx - 1, curIdx, infos, text);

        return overlap;
    }

    /// <summary>
    /// Checks if a later statement in the same step depends on outputs of the given statement.
    /// </summary>
    public static bool LaterDependsOn(in StatementInfo prev, StatementInfo[] all, int curIndex, SourceText text)
    {
        for (var j = curIndex + 1; j < all.Length; j++)
        {
            if (HasBlankLineBetween(all[j - 1].Syntax, all[j].Syntax, text))
                break;
            if (prev.Outputs.Overlaps(all[j].Identifiers))
                return true;
        }

        return false;
    }

    /// <summary>
    /// Checks if a statement is a terminating control flow (return, throw, break, continue) or simple if wrapper.
    /// </summary>
    public static bool IsTerminating(StatementSyntax stmt)
    {
        return stmt switch
        {
            ReturnStatementSyntax or ThrowStatementSyntax or BreakStatementSyntax or ContinueStatementSyntax => true,
            BlockSyntax block => block.Statements.Count > 0 && IsTerminating(block.Statements.Last()),
            IfStatementSyntax ifStmt => IsIfTerminating(ifStmt),
            _ => false
        };
    }

    private static bool IsIfTerminating(IfStatementSyntax ifStmt)
    {
        if (ifStmt.Else == null)
            return IsTerminating(ifStmt.Statement);

        return IsTerminating(ifStmt.Statement) && IsTerminating(ifStmt.Else.Statement);
    }

    /// <summary>
    /// Extracts declared or assigned local symbols from a statement.
    /// </summary>
    public static HashSet<ISymbol> GetOutputSymbols(StatementSyntax stmt, SemanticModel model)
    {
        var set = new HashSet<ISymbol>(SymbolComparer);
        if (stmt is LocalDeclarationStatementSyntax decl)
        {
            foreach (var v in decl.Declaration.Variables)
            {
                if (model.GetDeclaredSymbol(v) is { } sym)
                    set.Add(sym);
            }
        }
        else if (stmt is ExpressionStatementSyntax es
                 && es.Expression is AssignmentExpressionSyntax assign
                 && assign.Left is IdentifierNameSyntax id)
        {
            if (model.GetSymbolInfo(id).Symbol is { Kind: SymbolKind.Local } sym)
                set.Add(sym);
        }

        return set;
    }

    /// <summary>
    /// Gets all referenced symbols in a statement.
    /// </summary>
    public static ImmutableHashSet<ISymbol> GetReferencedSymbols(StatementSyntax stmt, SemanticModel model)
        => stmt.DescendantNodes()
            .OfType<IdentifierNameSyntax>()
            .Select(id => model.GetSymbolInfo(id).Symbol)
            .Where(p => p != null)
            .ToImmutableHashSet(SymbolComparer)!;

    /// <summary>
    /// Checks if any comment trivia appears immediately before the statement.
    /// </summary>
    public static bool HasCommentBefore(StatementSyntax stmt)
        => stmt.GetLeadingTrivia()
            .Any(t =>
                t.IsKind(SyntaxKind.SingleLineCommentTrivia) ||
                t.IsKind(SyntaxKind.MultiLineCommentTrivia));

    public static bool IsHashSet(ITypeSymbol type)
    {
        return type.OriginalDefinition is INamedTypeSymbol namedType &&
               namedType.ConstructedFrom?.ToDisplayString() == "System.Collections.Generic.HashSet<T>";
    }

    /// <summary>
    /// Wraps statement info with its syntax node, output symbols, and referenced identifiers.
    /// </summary>
    public readonly struct StatementInfo
    {
        public StatementSyntax Syntax { get; }
        public HashSet<ISymbol> Outputs { get; }
        public ImmutableHashSet<ISymbol> Identifiers { get; }

        public StatementInfo(StatementSyntax syntax, HashSet<ISymbol> outputs, ImmutableHashSet<ISymbol> identifiers)
        {
            Syntax = syntax;
            Outputs = outputs;
            Identifiers = identifiers;
        }
    }
}
