using System;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NoCeiling.Duc.Interview.Test.Platform.EfCore.EntityConfiguration;
using NoCeiling.Duc.Interview.Test.TextSnippet.Domain.Entities;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Persistence.EntityConfigurations
{
    internal class TextSnippetEntityConfiguration : PlatformAuditedEntityConfiguration<TextSnippetEntity, Guid>
    {
        public override void Configure(EntityTypeBuilder<TextSnippetEntity> builder)
        {
            base.Configure(builder);

            builder.Property(p => p.SnippetText)
                .HasMaxLength(TextSnippetEntity.SnippetTextMaxLength)
                .IsRequired();
            builder.Property(p => p.FullText)
                .HasMaxLength(TextSnippetEntity.FullTextMaxLength)
                .IsRequired();

            builder.HasIndex(p => new { p.SnippetText }).IsUnique();
        }
    }
}
