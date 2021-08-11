using System;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Application
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
            if (await textSnippetRepository.AnyAsync())
                return;

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
