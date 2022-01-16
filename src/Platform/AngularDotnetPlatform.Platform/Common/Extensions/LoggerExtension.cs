using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Common.Extensions
{
    public static class LoggerExtension
    {
        public static void LogInformationIfEnabled(this ILogger logger, Exception exception, string message)
        {
            logger.LogIfEnabled(LogLevel.Information, exception, message);
        }

        public static void LogInformationIfEnabled(this ILogger logger, string message)
        {
            logger.LogIfEnabled(LogLevel.Information, message);
        }

        public static void LogInformationIfEnabled(this ILogger logger, EventId eventId, string message)
        {
            logger.LogIfEnabled(LogLevel.Information, eventId, message);
        }

        public static void LogIfEnabled(this ILogger logger, LogLevel logLevel, Exception exception, string message)
        {
            if (logger.IsEnabled(logLevel))
            {
                logger.Log(logLevel, exception, message);
            }
        }

        public static void LogIfEnabled(this ILogger logger, LogLevel logLevel, string message)
        {
            if (logger.IsEnabled(logLevel))
            {
                logger.Log(logLevel, message);
            }
        }

        public static void LogIfEnabled(this ILogger logger, LogLevel logLevel, EventId eventId, string message)
        {
            if (logger.IsEnabled(logLevel))
            {
                logger.Log(logLevel, eventId, message);
            }
        }
    }
}
