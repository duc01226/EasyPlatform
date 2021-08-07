using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.MongoDB.Mapping;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo.Mapping
{
    public class TextSnippetEntityMongoClassMapping : PlatformMongoBaseAuditedEntityClassMapping<TextSnippetEntity, Guid, Guid?>
    {
    }
}
