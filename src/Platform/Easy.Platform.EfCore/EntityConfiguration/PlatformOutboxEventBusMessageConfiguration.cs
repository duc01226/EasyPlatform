using Easy.Platform.Application.EventBus;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Application.EventBus.OutboxPattern;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Easy.Platform.EfCore.EntityConfiguration
{
    public class PlatformOutboxEventBusMessageConfiguration : PlatformEntityConfiguration<PlatformOutboxEventBusMessage, string>
    {
        public override void Configure(EntityTypeBuilder<PlatformOutboxEventBusMessage> builder)
        {
            base.Configure(builder);
            builder.Property(p => p.Id).HasMaxLength(PlatformOutboxEventBusMessage.IdMaxLength);
            builder.Property(p => p.MessageTypeFullName)
                .HasMaxLength(PlatformOutboxEventBusMessage.MessageTypeFullNameMaxLength)
                .IsRequired();
            builder.Property(p => p.RoutingKey)
                .HasMaxLength(PlatformOutboxEventBusMessage.RoutingKeyMaxLength)
                .IsRequired();
            builder.Property(p => p.SendStatus).HasConversion(new EnumToStringConverter<PlatformOutboxEventBusMessage.SendStatuses>());

            builder.HasIndex(p => p.RoutingKey);
            builder.HasIndex(p => new { p.SendStatus, p.LastSendDate });
            builder.HasIndex(p => new { p.SendStatus, p.CreatedDate });
            builder.HasIndex(p => p.LastSendDate);
            builder.HasIndex(p => p.CreatedDate);
        }
    }
}
