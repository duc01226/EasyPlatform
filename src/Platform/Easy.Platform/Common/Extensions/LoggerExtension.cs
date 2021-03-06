using Microsoft.Extensions.Logging;

namespace Easy.Platform.Common.Extensions;

public static class LoggerExtension
{
    public static void LogInformationIfEnabled(this ILogger logger, Exception exception, string message)
    {
        logger.LogIfEnabled(LogLevel.Information, exception, message);
    }

    public static void LogInformationIfEnabled(this ILogger logger, string message, params object[] args)
    {
        logger.LogIfEnabled(LogLevel.Information, message, args);
    }

    public static void LogInformationIfEnabled(
        this ILogger logger,
        EventId eventId,
        string message,
        params object[] args)
    {
        logger.LogIfEnabled(
            LogLevel.Information,
            eventId,
            message,
            args);
    }

    public static void LogIfEnabled(
        this ILogger logger,
        LogLevel logLevel,
        Exception exception,
        string message,
        params object[] args)
    {
        if (logger.IsEnabled(logLevel))
            logger.Log(
                logLevel,
                exception,
                message,
                args);
    }

    public static void LogIfEnabled(
        this ILogger logger,
        LogLevel logLevel,
        string message,
        params object[] args)
    {
        if (logger.IsEnabled(logLevel))
            logger.Log(logLevel, message, args);
    }

    public static void LogIfEnabled(
        this ILogger logger,
        LogLevel logLevel,
        EventId eventId,
        string message,
        params object[] args)
    {
        if (logger.IsEnabled(logLevel))
            logger.Log(
                logLevel,
                eventId,
                message,
                args);
    }
}
