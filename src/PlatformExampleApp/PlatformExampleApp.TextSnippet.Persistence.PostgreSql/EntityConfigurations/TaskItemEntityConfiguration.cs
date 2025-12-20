using Easy.Platform.EfCore.EntityConfiguration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Persistence.PostgreSql.EntityConfigurations;

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

        // JSON collections - PostgreSQL uses jsonb
        builder.Property(p => p.Tags)
            .HasColumnType("jsonb");

        builder.Property(p => p.SubTasks)
            .HasColumnType("jsonb");

        // Soft delete defaults
        builder.Property(p => p.IsDeleted)
            .HasDefaultValue(false);

        // Relationship with TextSnippetEntity
        builder.HasOne(p => p.RelatedSnippet)
            .WithMany()
            .HasForeignKey(p => p.RelatedSnippetId)
            .OnDelete(DeleteBehavior.SetNull);

        // Full-text search indexes for Title and Description
        builder
            .HasIndex(p => new { p.Title }, "IX_TaskItem_Title_FullTextSearch")
            .HasOperators("gin_trgm_ops")
            .HasMethod("GIN")
            .IsTsVectorExpressionIndex("english");
        builder
            .HasIndex(p => new { p.Description }, "IX_TaskItem_Description_FullTextSearch")
            .HasOperators("gin_trgm_ops")
            .HasMethod("GIN")
            .IsTsVectorExpressionIndex("english");

        // Indexes for common query patterns
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.Priority);
        builder.HasIndex(p => p.AssigneeId);
        builder.HasIndex(p => p.DueDate);
        builder.HasIndex(p => p.IsDeleted);
        builder.HasIndex(p => p.RelatedSnippetId);

        // JSON indexes
        builder.HasIndex(p => p.Tags).HasMethod("GIN");
        builder.HasIndex(p => p.SubTasks).HasMethod("GIN");
    }
}
