using AngularDotnetPlatform.Platform.Persistence.DataMigration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AngularDotnetPlatform.Platform.EfCore.EntityConfiguration
{
    public class PlatformApplicationDataMigrationHistoryConfiguration : IEntityTypeConfiguration<PlatformDataMigrationHistory>
    {
        public void Configure(EntityTypeBuilder<PlatformDataMigrationHistory> builder)
        {
            builder.HasKey(p => p.Name);
        }
    }
}
