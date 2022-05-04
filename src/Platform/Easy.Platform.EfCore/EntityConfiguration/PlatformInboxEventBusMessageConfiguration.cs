using Easy.Platform.Application.EventBus;
using Easy.Platform.Application.EventBus.InboxPattern;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Easy.Platform.EfCore.EntityConfiguration
{
    public class PlatformInboxEventBusMessageConfiguration : PlatformEntityConfiguration<PlatformInboxEventBusMessage, string>
    {
        public override void Configure(EntityTypeBuilder<PlatformInboxEventBusMessage> builder)
        {
            base.Configure(builder);
            builder.Property(p => p.Id).HasMaxLength(PlatformInboxEventBusMessage.IdMaxLength);
            builder.Property(p => p.MessageTypeFullName)
                .HasMaxLength(PlatformInboxEventBusMessage.MessageTypeFullNameMaxLength)
                .IsRequired();
            builder.Property(p => p.RoutingKey)
                .HasMaxLength(PlatformInboxEventBusMessage.RoutingKeyMaxLength)
                .IsRequired();
            builder.Property(p => p.ConsumeStatus).HasConversion(new EnumToStringConverter<PlatformInboxEventBusMessage.ConsumeStatuses>());

            builder.HasIndex(p => p.RoutingKey);
            builder.HasIndex(p => new { p.ConsumeStatus, p.LastConsumeDate });
            builder.HasIndex(p => new { p.ConsumeStatus, p.CreatedDate });
            builder.HasIndex(p => p.LastConsumeDate);
            builder.HasIndex(p => p.CreatedDate);
        }
    }
}
