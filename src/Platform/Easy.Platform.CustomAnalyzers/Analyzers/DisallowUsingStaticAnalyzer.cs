#region

using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;

#endregion

namespace Easy.Platform.CustomAnalyzers.Analyzers;

[DiagnosticAnalyzer(LanguageNames.CSharp)]
public class DisallowUsingStaticAnalyzer : DiagnosticAnalyzer
{
    public const string DiagnosticId = "EASY_PLATFORM_ANALYZERS_DISALLOW_USING_STATIC";

    private static readonly DiagnosticDescriptor Rule = new(
        DiagnosticId,
        "Disallow 'using static' directive",
        "'using static' directive is not allowed",
        CustomAnalyzersConst.Categories.Usage,
        DiagnosticSeverity.Error,
        isEnabledByDefault: true);

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics => ImmutableArray.Create(Rule);

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxNodeAction(AnalyzeUsingDirective, SyntaxKind.UsingDirective);
    }

    private static void AnalyzeUsingDirective(SyntaxNodeAnalysisContext context)
    {
        var usingDirective = (UsingDirectiveSyntax)context.Node;
        if (usingDirective.StaticKeyword != default)
        {
            var diagnostic = Diagnostic.Create(Rule, usingDirective.GetLocation());
            context.ReportDiagnostic(diagnostic);
        }
    }
}
