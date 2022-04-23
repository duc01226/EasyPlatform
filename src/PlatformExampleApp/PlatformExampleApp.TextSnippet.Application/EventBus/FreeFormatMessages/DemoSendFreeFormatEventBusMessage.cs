using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easy.Platform.Infrastructures.EventBus;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.FreeFormatMessages
{
    public class DemoSendFreeFormatEventBusMessage : PlatformEventBusFreeFormatMessage
    {
        public string Property1 { get; set; }
        public int Property2 { get; set; }
    }
}
