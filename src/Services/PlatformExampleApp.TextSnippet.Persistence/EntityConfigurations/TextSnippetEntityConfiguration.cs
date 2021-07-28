using System;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using AngularDotnetPlatform.Platform.EfCore.EntityConfiguration;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Persistence.EntityConfigurations
{
    internal class TextSnippetEntityConfiguration : PlatformAuditedEntityConfiguration<TextSnippetEntity, Guid, Guid?>
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
