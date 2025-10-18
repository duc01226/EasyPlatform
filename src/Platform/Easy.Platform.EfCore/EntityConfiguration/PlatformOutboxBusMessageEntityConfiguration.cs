#region

using Easy.Platform.Application.MessageBus.OutboxPattern;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

#endregion

namespace Easy.Platform.EfCore.EntityConfiguration;

public class PlatformOutboxBusMessageEntityConfiguration : PlatformEntityConfiguration<PlatformOutboxBusMessage, string>
{
    public const string PlatformOutboxBusMessageTableName = "PlatformOutboxEventBusMessage";

    public override void Configure(EntityTypeBuilder<PlatformOutboxBusMessage> builder)
    {
        base.Configure(builder);
        builder.ToTable(PlatformOutboxBusMessageTableName);
        builder.Property(p => p.Id).HasMaxLength(PlatformOutboxBusMessage.IdMaxLength);
        builder.Property(p => p.MessageTypeFullName)
            .HasMaxLength(PlatformOutboxBusMessage.MessageTypeFullNameMaxLength)
            .IsRequired();
        builder.Property(p => p.RoutingKey)
            .HasMaxLength(PlatformOutboxBusMessage.RoutingKeyMaxLength)
            .IsRequired();
        builder.Property(p => p.SendStatus)
            .HasConversion(new EnumToStringConverter<PlatformOutboxBusMessage.SendStatuses>());

        builder.HasIndex(p => new
        {
            p.Id,
            p.SendStatus,
            p.CreatedDate
        });
        builder.HasIndex(p => new
        {
            p.SendStatus,
            p.CreatedDate
        });
        builder.HasIndex(p => new
        {
            p.SendStatus,
            p.CreatedDate,
            p.NextRetryProcessAfter
        });
        builder.HasIndex(p => new
        {
            p.SendStatus,
            p.CreatedDate,
            p.LastSendDate
        });
        builder.HasIndex(p => new
        {
            p.SendStatus,
            p.CreatedDate,
            p.LastProcessingPingDate
        });
    }
}
