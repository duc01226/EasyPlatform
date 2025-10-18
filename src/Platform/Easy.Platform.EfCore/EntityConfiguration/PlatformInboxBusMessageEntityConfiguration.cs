#region

using Easy.Platform.Application.MessageBus.InboxPattern;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

#endregion

namespace Easy.Platform.EfCore.EntityConfiguration;

public class PlatformInboxBusMessageEntityConfiguration : PlatformEntityConfiguration<PlatformInboxBusMessage, string>
{
    public const string PlatformInboxBusMessageTableName = "PlatformInboxEventBusMessage";

    public override void Configure(EntityTypeBuilder<PlatformInboxBusMessage> builder)
    {
        base.Configure(builder);
        builder.ToTable(PlatformInboxBusMessageTableName);
        builder.Property(p => p.Id).HasMaxLength(PlatformInboxBusMessage.IdMaxLength);
        builder.Property(p => p.MessageTypeFullName)
            .HasMaxLength(PlatformInboxBusMessage.MessageTypeFullNameMaxLength)
            .IsRequired();
        builder.Property(p => p.RoutingKey)
            .HasMaxLength(PlatformInboxBusMessage.RoutingKeyMaxLength)
            .IsRequired();
        builder.Property(p => p.ConsumeStatus)
            .HasConversion(new EnumToStringConverter<PlatformInboxBusMessage.ConsumeStatuses>());

        builder.HasIndex(p => new
        {
            p.Id,
            p.ConsumeStatus,
            p.CreatedDate
        });
        builder.HasIndex(p => new
        {
            p.ConsumeStatus,
            p.CreatedDate
        });
        builder.HasIndex(p => new
        {
            p.ConsumeStatus,
            p.ForApplicationName,
            p.CreatedDate
        });
        builder.HasIndex(p => new
        {
            p.ConsumeStatus,
            p.ForApplicationName,
            p.CreatedDate,
            p.NextRetryProcessAfter
        });
        builder.HasIndex(p => new
        {
            p.ConsumeStatus,
            p.ForApplicationName,
            p.CreatedDate,
            p.LastConsumeDate
        });
        builder.HasIndex(p => new
        {
            p.ConsumeStatus,
            p.ForApplicationName,
            p.CreatedDate,
            p.LastProcessingPingDate
        });
    }
}
