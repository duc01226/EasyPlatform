namespace Easy.Platform.Infrastructures.MessageBus;

/// <summary>
/// Defines a marker interface for platform message types that can be sent through the message bus system.
/// This interface serves as the base contract for all message types in the platform's messaging infrastructure,
/// allowing for type-safe message handling and processing.
///
/// Implementing this interface enables a class to be recognized by the platform's message bus system
/// as a valid message that can be produced and consumed.
/// </summary>
public interface IPlatformMessage { }
