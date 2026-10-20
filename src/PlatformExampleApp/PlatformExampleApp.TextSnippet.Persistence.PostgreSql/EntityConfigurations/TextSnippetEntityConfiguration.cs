using Easy.Platform.EfCore.EntityConfiguration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Persistence.PostgreSql.EntityConfigurations;

internal sealed class TextSnippetEntityConfiguration : PlatformAuditedEntityConfiguration<TextSnippetEntity, string, string>
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

        builder.Property(p => p.Addresses).HasColumnType("jsonb");
        builder.Property(p => p.Address).HasColumnType("jsonb");
        builder.Property(p => p.AddressStrings);

        // New properties for enhanced patterns
        builder.Property(p => p.Status)
            .HasDefaultValue(SnippetStatus.Draft);
        builder.Property(p => p.Tags)
            .HasColumnType("jsonb");
        builder.Property(p => p.ViewCount)
            .HasDefaultValue(0);
        builder.Property(p => p.IsDeleted)
            .HasDefaultValue(false);
        builder.Property(p => p.FullTextSearch)
            .HasMaxLength(4000);

        // Category relationship
        builder.HasOne(p => p.SnippetCategory)
            .WithMany(c => c.Snippets)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        // Note that column for full-text search must be not null to ensure it works
        // If null => index created will be "(to_tsvector('english'::regconfig, COALESCE("FullName", ''::text)))" => with COALESCE it doesn't work
        // Correct must be "(to_tsvector('english'::regconfig, "FullName"))"
        builder
            .HasIndex(p => new { p.SnippetText }, "IX_TextSnippet_SnippetText_FullTextSearch")
            .HasOperators("gin_trgm_ops") // gin_trgm_ops support search start_with ILIKE
            .HasMethod("GIN")
            .IsTsVectorExpressionIndex("english");

        // Note that column for full-text search must be not null to ensure it works
        builder
            .HasIndex(p => new { p.FullText }, "IX_TextSnippet_FullText_FullTextSearch")
            .HasMethod("GIN")
            .IsTsVectorExpressionIndex("english");

        builder
            .HasIndex(p => p.Addresses)
            .HasMethod("GIN");
        builder
            .HasIndex(p => p.AddressStrings)
            .HasMethod("GIN");
        builder
            .HasIndex(p => p.Address)
            .HasMethod("GIN");

        // Additional indexes for new properties
        builder.HasIndex(p => p.CategoryId);
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.IsDeleted);
    }
}
