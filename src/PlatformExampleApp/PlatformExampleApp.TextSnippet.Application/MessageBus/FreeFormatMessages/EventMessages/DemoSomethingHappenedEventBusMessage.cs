using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easy.Platform.Infrastructures.MessageBus;

namespace PlatformExampleApp.TextSnippet.Application.MessageBus.FreeFormatMessages.EventMessages
{
    /// <summary>
    /// When a service support other service as a third party or common service, for example EmailService.
    /// Other feature services can ask this common service to do something, then the bus message act like a request
    /// The request receiver is the LEADER, control the request schema and logic.
    /// Other services just use them
    ///
    /// The naming convention rule is: [LEADER-SERVICE-NAME (The producer service produce event)] + XXX + EventBusMessage
    ///
    /// Example: AccountServiceUserCreatedEventBusMessage
    /// </summary>
    public class DemoSomethingHappenedEventBusMessage : PlatformBusFreeFormatMessage
    {
    }
}
