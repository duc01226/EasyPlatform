using AngularDotnetPlatform.Platform.Application.EventBus;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AngularDotnetPlatform.Platform.EfCore.EntityConfiguration
{
    public abstract class PlatformInboxEventBusMessageConfiguration : PlatformEntityConfiguration<PlatformInboxEventBusMessage, string>
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

            builder.HasIndex(p => p.RoutingKey);
            builder.HasIndex(p => p.ConsumerDate);
        }
    }

    public class PlatformDefaultInboxEventBusMessageConfiguration : PlatformInboxEventBusMessageConfiguration
    {
    }
}
