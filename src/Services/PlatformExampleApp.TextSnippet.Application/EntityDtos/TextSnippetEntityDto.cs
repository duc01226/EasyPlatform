using System;
using AngularDotnetPlatform.Platform.Application.Dtos;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.EntityDtos
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
