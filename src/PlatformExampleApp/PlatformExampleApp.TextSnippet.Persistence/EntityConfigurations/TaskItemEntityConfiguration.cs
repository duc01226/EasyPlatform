using Easy.Platform.EfCore.EntityConfiguration;
using Easy.Platform.EfCore.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Persistence.EntityConfigurations;

internal sealed class TaskItemEntityConfiguration : PlatformAuditedEntityConfiguration<TaskItemEntity, string, string>
{
    public override void Configure(EntityTypeBuilder<TaskItemEntity> builder)
    {
        base.Configure(builder);

        // Core properties
        builder.Property(p => p.Title)
            .HasMaxLength(TaskItemEntity.TitleMaxLength)
            .IsRequired();

        builder.Property(p => p.Description)
            .HasMaxLength(TaskItemEntity.DescriptionMaxLength);

        builder.Property(p => p.Status)
            .HasDefaultValue(TaskItemStatus.Todo);

        builder.Property(p => p.Priority)
            .HasDefaultValue(TaskItemPriority.Medium);

        // JSON collections
        builder.Property(p => p.Tags)
            .HasJsonConversion();

        builder.Property(p => p.SubTasks)
            .HasJsonConversion();

        // Soft delete defaults
        builder.Property(p => p.IsDeleted)
            .HasDefaultValue(false);

        // Relationship with TextSnippetEntity
        builder.HasOne(p => p.RelatedSnippet)
            .WithMany()
            .HasForeignKey(p => p.RelatedSnippetId)
            .OnDelete(DeleteBehavior.SetNull);

        // Indexes for common query patterns
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.Priority);
        builder.HasIndex(p => p.AssigneeId);
        builder.HasIndex(p => p.DueDate);
        builder.HasIndex(p => p.IsDeleted);
        builder.HasIndex(p => p.RelatedSnippetId);
    }
}
