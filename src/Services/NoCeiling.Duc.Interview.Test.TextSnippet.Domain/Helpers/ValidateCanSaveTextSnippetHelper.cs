using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation.Results;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Helpers;
using NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Entities;
using NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Repositories;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Helpers
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
                return new ValidationResult(new List<ValidationFailure>() { new ValidationFailure(nameof(TextSnippetEntity.SnippetText), "SnippetText must be unique") });
            }

            return new ValidationResult();
        }
    }
}
