using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.Application
{
    public interface IPlatformApplicationSettingContext
    {
        public string ApplicationName { get; }
    }

    public class PlatformApplicationSettingContext : IPlatformApplicationSettingContext
    {
        public string ApplicationName { get; init; }
    }
}
