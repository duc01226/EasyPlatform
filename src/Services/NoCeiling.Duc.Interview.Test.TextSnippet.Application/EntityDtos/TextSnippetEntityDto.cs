using System;
using NoCeiling.Duc.Interview.Test.Platform.Application.Dtos;
using NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Entities;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Application.EntityDtos
{
    public class TextSnippetEntityDto : PlatformEntityDto<TextSnippetEntity, Guid>
    {
        public TextSnippetEntityDto() { }

        public TextSnippetEntityDto(TextSnippetEntity entity) : base(entity)
        {
            SnippetText = entity.SnippetText;
            FullText = entity.FullText;
        }

        public string SnippetText { get; set; }

        public string FullText { get; set; }

        public override TextSnippetEntity MapToEntity()
        {
            return new TextSnippetEntity()
            {
                Id = Id == Guid.Empty ? Guid.NewGuid() : Id,
                SnippetText = SnippetText,
                FullText = FullText
            };
        }
    }
}
