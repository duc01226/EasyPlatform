using System.Linq.Expressions;
using BenchmarkDotNet.Attributes;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Domain.Entities;

namespace Easy.Platform.Benchmark;

[MemoryDiagnoser(false)]
public class BulkUpsertMatcherBenchmarkExecutor
{
    private static readonly List<CompositeEntity> ToUpsertEntities = Enumerable
        .Range(0, 100)
        .Select(p => new CompositeEntity { Id = $"incoming-{p}", CompanyId = "company-1", Code = $"code-{p}" })
        .ToList();

    private static readonly List<CompositeEntity> ExistingEntities = Enumerable
        .Range(0, 100)
        .Select(p => new CompositeEntity { Id = $"existing-{p}", CompanyId = "company-1", Code = $"code-{p}" })
        .ToList();

    [Benchmark(Baseline = true)]
    public int RepeatedCompileCompositePredicate()
    {
        var matchedCount = 0;

        foreach (var toUpsertEntity in ToUpsertEntities)
        {
            if (ExistingEntities.FirstOrDefault(existingEntity => toUpsertEntity.FindByUniqueCompositeIdExpr().Compile()(existingEntity)) != null)
                matchedCount++;
        }

        return matchedCount;
    }

    [Benchmark]
    public int OptimizedCompositeMatcher()
    {
        return PlatformBulkUpsertMatchingHelper
            .MatchToExistingEntities<CompositeEntity, string>(ToUpsertEntities, ExistingEntities, null)
            .Count(p => p.MatchedExistingEntity != null);
    }

    public sealed class CompositeEntity : Entity<CompositeEntity, string>
    {
        public string CompanyId { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;

        public override string UniqueCompositeId()
        {
            return $"{CompanyId}|{Code}";
        }

        public override Expression<Func<CompositeEntity, bool>> FindByUniqueCompositeIdExpr()
        {
            var companyId = CompanyId;
            var code = Code;

            return p => p.CompanyId == companyId && p.Code == code;
        }
    }
}
