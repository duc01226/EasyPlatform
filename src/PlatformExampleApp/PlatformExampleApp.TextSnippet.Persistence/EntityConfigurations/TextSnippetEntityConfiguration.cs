using Easy.Platform.EfCore.EntityConfiguration;
using Easy.Platform.EfCore.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Persistence.EntityConfigurations;

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
        builder.OwnsOne(p => p.Address);
        builder.Property(p => p.Addresses).HasJsonConversion();
        builder.Property(p => p.TimeOnly)
            .HasConversion(
                v => v.ToString(),
                v => TimeOnly.Parse(v));
        builder.Property(p => p.AddressStrings).HasJsonConversion();

        // New properties for enhanced patterns
        builder.Property(p => p.Status)
            .HasDefaultValue(SnippetStatus.Draft);
        builder.Property(p => p.Tags)
            .HasJsonConversion();
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

        // Indexes
        builder.HasIndex(p => p.SnippetText).IsUnique();
        builder.HasIndex(p => p.CategoryId);
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.IsDeleted);
    }
}
