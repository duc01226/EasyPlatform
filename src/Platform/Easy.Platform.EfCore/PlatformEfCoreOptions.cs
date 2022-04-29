using Easy.Platform.EfCore.EntityConfiguration;
using Easy.Platform.Persistence;

namespace Easy.Platform.EfCore
{
    public class PlatformEfCoreOptions
    {
        /// <summary>
        /// If this value is true, <see cref="PlatformDefaultInboxEventBusMessageConfiguration"/> will be ApplyConfiguration in <see cref="PlatformEfCoreDbContext{TDbContext}"/>
        /// automatically.
        /// This will be automatically set to true if <see cref="PlatformPersistenceModule{TDbContext}.EnableInboxEventBusMessageRepository"/> return true and
        /// there is no custom inherit class from PlatformInboxEventBusMessageConfiguration in persistence assembly.
        /// </summary>
        public bool? EnableDefaultInboxEventBusMessageEntityConfiguration { get; set; }
    }
}
