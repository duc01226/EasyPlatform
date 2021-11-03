using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.Application.InfrastructureServices
{
    /// <summary>
    /// This interface is used for conventional register class mapping via PlatformApplicationModule.InternalRegister
    /// <br/>
    /// InfrastructureService is used to serve some infrastructure/third-party services, not related to domain, likes: EmailService, FileStorageService, etc...
    /// <br/>
    /// InfrastructureService is used by Queries/Commands.
    /// </summary>
    public interface IPlatformInfrastructureService
    {
    }
}
