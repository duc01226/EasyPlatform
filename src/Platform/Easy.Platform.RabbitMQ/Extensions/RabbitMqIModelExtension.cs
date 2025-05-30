#region

using RabbitMQ.Client;

#endregion

namespace Easy.Platform.RabbitMQ.Extensions;

public static class RabbitMqIModelExtension
{
    public static bool IsClosedPermanently(this IChannel channel, out bool isDisposed)
    {
        try
        {
            // Only if the close reason is shutdown, the server might just shutdown temporarily, so we still try to keep the channel for retry connect later
            var result = channel.IsClosed && channel.CloseReason != null && channel.CloseReason.ReplyCode != RabbitMqCloseReasonCodes.ServerShutdown;
            isDisposed = false;

            return result;
        }
        catch (ObjectDisposedException)
        {
            isDisposed = true;
            return true;
        }
    }
}
