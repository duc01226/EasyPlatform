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

        public override TextSnippetEntity UpdateToEntity(TextSnippetEntity toBeUpdatedEntity)
        {
            if (toBeUpdatedEntity.Id == Guid.Empty)
                toBeUpdatedEntity.Id = Id == Guid.Empty || Id == null ? Guid.NewGuid() : Id.Value;
            toBeUpdatedEntity.SnippetText = SnippetText;
            toBeUpdatedEntity.FullText = FullText;

            return toBeUpdatedEntity;
        }
    }
}
