using Easy.Platform.EfCore.EntityConfiguration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Persistence.PostgreSql.EntityConfigurations;

internal sealed class TextSnippetCategoryEntityConfiguration : PlatformAuditedEntityConfiguration<TextSnippetCategory, string, string>
{
    public override void Configure(EntityTypeBuilder<TextSnippetCategory> builder)
    {
        base.Configure(builder);

        // Core properties
        builder.Property(p => p.Name)
            .HasMaxLength(TextSnippetCategory.NameMaxLength)
            .IsRequired();
        builder.Property(p => p.Description)
            .HasMaxLength(TextSnippetCategory.DescriptionMaxLength);
        builder.Property(p => p.SortOrder)
            .HasDefaultValue(0);
        builder.Property(p => p.IsActive)
            .HasDefaultValue(true);
        builder.Property(p => p.IconName)
            .HasMaxLength(100);
        builder.Property(p => p.ColorCode)
            .HasMaxLength(20);

        // Self-referencing hierarchy (parent-child)
        builder.HasOne(p => p.ParentCategory)
            .WithMany(p => p.ChildCategories)
            .HasForeignKey(p => p.ParentCategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(p => p.ParentCategoryId);
        builder.HasIndex(p => p.IsActive);
        builder.HasIndex(p => new { p.ParentCategoryId, p.Name }).IsUnique();
    }
}
