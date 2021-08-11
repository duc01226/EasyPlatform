using System.Threading;
using System.Threading.Tasks;
using FluentValidation.Results;
using AngularDotnetPlatform.Platform.Domain.Helpers;
using AngularDotnetPlatform.Platform.Validators;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Domain.Helpers
{
    public class ValidateCanSaveTextSnippetHelper : IDomainHelper
    {
        private readonly ITextSnippetRepository<TextSnippetEntity> textSnippetRepository;

        public ValidateCanSaveTextSnippetHelper(ITextSnippetRepository<TextSnippetEntity> textSnippetRepository)
        {
            this.textSnippetRepository = textSnippetRepository;
        }

        public async Task<ValidationResult> ValidateCanSaveTextSnippet(TextSnippetEntity item, CancellationToken cancellationToken = default)
        {
            if (await textSnippetRepository.AnyAsync(p => p.SnippetText == item.SnippetText && p.Id != item.Id, cancellationToken))
            {
                return PlatformValidator<TextSnippetEntity>.Invalid(nameof(TextSnippetEntity.SnippetText), "SnippetText must be unique");
            }

            return new ValidationResult();
        }
    }
}
