using System;
using System.Threading.Tasks;
using NoCeiling.Duc.Interview.Test.Platform.Application;
using NoCeiling.Duc.Interview.Test.Platform.Domain.UnitOfWork;
using NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Entities;
using NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Repositories;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Application
{
    public class TextSnippetApplicationDataSeeder : PlatformApplicationDataSeeder, IPlatformApplicationDataSeeder
    {
        private readonly ITextSnippetRootRepository<TextSnippetEntity> textSnippetRepository;

        public TextSnippetApplicationDataSeeder(
            IUnitOfWorkManager unitOfWorkManager,
            ITextSnippetRootRepository<TextSnippetEntity> textSnippetRepository) : base(unitOfWorkManager)
        {
            this.textSnippetRepository = textSnippetRepository;
        }

        protected override async Task InternalSeedData()
        {
            for (var i = 0; i < 20; i++)
            {
                await textSnippetRepository.CreateOrUpdate(
                    new TextSnippetEntity()
                    {
                        Id = Guid.NewGuid(),
                        SnippetText = $"Example Abc {i}",
                        FullText = $"This is full text of Example Abc {i} snippet text"
                    },
                    p => p.SnippetText == $"Example Abc {i}");
                await textSnippetRepository.CreateOrUpdate(
                    new TextSnippetEntity()
                    {
                        Id = Guid.NewGuid(),
                        SnippetText = $"Example Def {i}",
                        FullText = $"This is full text of Example Def {i} snippet text"
                    },
                    p => p.SnippetText == $"Example Def {i}");
                await textSnippetRepository.CreateOrUpdate(
                    new TextSnippetEntity()
                    {
                        Id = Guid.NewGuid(),
                        SnippetText = $"Example Ghi {i}",
                        FullText = $"This is full text of Example Ghi {i} snippet text"
                    },
                    p => p.SnippetText == $"Example Ghi {i}");
            }
        }
    }
}
