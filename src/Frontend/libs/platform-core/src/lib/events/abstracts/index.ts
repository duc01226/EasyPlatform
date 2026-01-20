/**
 * @fileoverview Platform Event System Abstractions
 *
 * This module defines the core abstractions for the platform's event-driven architecture,
 * providing a foundation for loosely-coupled communication between different parts of the application.
 *
 * Event Architecture Overview:
 * - Event Manager: Central hub for publishing and routing events
 * - Events: Data structures representing domain events or state changes
 * - Event Handlers: Services that respond to specific event types
 * - Subscription Map: Registry connecting events to their handlers
 *
 * Benefits of Event-Driven Architecture:
 * - Decoupling: Components don't need direct references to each other
 * - Scalability: Easy to add new event handlers without modifying existing code
 * - Testability: Event handlers can be tested independently
 * - Maintainability: Clear separation of concerns and responsibilities
 *
 * @example
 * Creating a custom event:
 * ```typescript
 * export class UserRegisteredEvent extends PlatformEvent {
 *   constructor(
 *     public readonly userId: string,
 *     public readonly email: string,
 *     public readonly registrationDate: Date
 *   ) {
 *     super('UserRegistered');
 *   }
 * }
 * ```
 *
 * @example
 * Creating an event handler:
 * ```typescript
 * @Injectable()
 * export class UserRegisteredEventHandler extends PlatformEventHandler<UserRegisteredEvent> {
 *   constructor(
 *     private emailService: EmailService,
 *     private analyticsService: AnalyticsService
 *   ) {
 *     super();
 *   }
 *
 *   public handle(event: UserRegisteredEvent): void {
 *     // Send welcome email
 *     this.emailService.sendWelcomeEmail(event.email);
 *
 *     // Track registration event
 *     this.analyticsService.track('user_registered', {
 *       userId: event.userId,
 *       registrationDate: event.registrationDate
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * Publishing events:
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(private eventManager: PlatformEventManager) {}
 *
 *   async registerUser(userData: UserRegistrationData): Promise<User> {
 *     const user = await this.createUser(userData);
 *
 *     // Publish event to notify other parts of the system
 *     this.eventManager.publish(new UserRegisteredEvent(
 *       user.id,
 *       user.email,
 *       new Date()
 *     ));
 *
 *     return user;
 *   }
 * }
 * ```
 *
 * @see {@link PlatformEventManager} - Central event management service
 * @see {@link PlatformEvent} - Base class for all platform events
 * @see {@link PlatformEventHandler} - Base class for event handlers
 *
 * @since Platform Core v1.0.0
 * @author Platform Team
 */

/**
 * Interface defining the contract for platform event management.
 *
 * This interface ensures that any event manager implementation provides
 * the core functionality needed for event publishing and handling.
 *
 * @example
 * ```typescript
 * // Implementation must provide publish method
 * @Injectable()
 * export class CustomEventManager implements IPlatformEventManager {
 *   public publish<TEvent extends PlatformEvent>(event: TEvent): void {
 *     // Custom event publishing logic
 *   }
 * }
 * ```
 */
export interface IPlatformEventManager {
    /**
     * Publishes an event to all registered handlers.
     *
     * @param event - The event instance to publish
     * @template TEvent - The specific event type being published
     */
    publish<TEvent extends PlatformEvent>(event: TEvent): void;
}

/**
 * Abstract base class for all platform events.
 *
 * This class provides the foundation for creating domain events that represent
 * meaningful business occurrences or state changes within the application.
 * All custom events should extend this class to ensure consistency and compatibility.
 *
 * Design Principles:
 * - Events are immutable data structures
 * - Events represent facts about what happened
 * - Events should contain all relevant context data
 * - Event names should be in past tense (e.g., "UserRegistered", "OrderPlaced")
 *
 * @example
 * Simple event with primitive data:
 * ```typescript
 * export class UserLoggedInEvent extends PlatformEvent {
 *   constructor(
 *     public readonly userId: string,
 *     public readonly loginTime: Date
 *   ) {
 *     super('UserLoggedIn');
 *   }
 * }
 * ```
 *
 * @example
 * Complex event with rich data:
 * ```typescript
 * export class OrderPlacedEvent extends PlatformEvent {
 *   constructor(
 *     public readonly orderId: string,
 *     public readonly customerId: string,
 *     public readonly items: OrderItem[],
 *     public readonly totalAmount: number,
 *     public readonly currency: string,
 *     public readonly placedAt: Date
 *   ) {
 *     super('OrderPlaced');
 *   }
 * }
 * ```
 */
export abstract class PlatformEvent {
    /**
     * Creates a new platform event instance.
     *
     * @param name - Unique identifier for the event type (should be descriptive and in past tense)
     *
     * @example
     * ```typescript
     * export class ProductCreatedEvent extends PlatformEvent {
     *   constructor(public readonly productId: string) {
     *     super('ProductCreated'); // Clear, descriptive name
     *   }
     * }
     * ```
     */
    public constructor(public name: string) {}
}

/**
 * Abstract base class for handling platform events.
 *
 * Event handlers are services that respond to specific event types by performing
 * side effects such as updating data, sending notifications, or triggering workflows.
 * Each handler should focus on a single responsibility and be independently testable.
 *
 * Handler Design Principles:
 * - Single Responsibility: Each handler should have one clear purpose
 * - Idempotent: Handlers should be safe to run multiple times
 * - Error Handling: Handlers should gracefully handle failures
 * - Performance: Handlers should be efficient and non-blocking when possible
 *
 * @template TEvent - The specific event type this handler processes
 *
 * @example
 * Email notification handler:
 * ```typescript
 * @Injectable()
 * export class UserRegisteredEmailHandler extends PlatformEventHandler<UserRegisteredEvent> {
 *   constructor(private emailService: EmailService) {
 *     super();
 *   }
 *
 *   public handle(event: UserRegisteredEvent): void {
 *     this.emailService.sendWelcomeEmail({
 *       to: event.email,
 *       userName: event.userName,
 *       registrationDate: event.registrationDate
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * Analytics tracking handler:
 * ```typescript
 * @Injectable()
 * export class UserRegisteredAnalyticsHandler extends PlatformEventHandler<UserRegisteredEvent> {
 *   constructor(private analytics: AnalyticsService) {
 *     super();
 *   }
 *
 *   public handle(event: UserRegisteredEvent): void {
 *     this.analytics.track('user_registration', {
 *       userId: event.userId,
 *       source: event.registrationSource,
 *       timestamp: event.registrationDate.toISOString()
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * Async operation handler:
 * ```typescript
 * @Injectable()
 * export class OrderPlacedInventoryHandler extends PlatformEventHandler<OrderPlacedEvent> {
 *   constructor(private inventoryService: InventoryService) {
 *     super();
 *   }
 *
 *   public handle(event: OrderPlacedEvent): void {
 *     // For async operations, consider using task queues or message buses
 *     this.inventoryService.reserveItems(event.items)
 *       .catch(error => {
 *         console.error('Failed to reserve inventory:', error);
 *         // Could publish compensation event or retry logic
 *       });
 *   }
 * }
 * ```
 */
export abstract class PlatformEventHandler<TEvent extends PlatformEvent> {
    /**
     * Handles the specified event by performing the appropriate side effects.
     *
     * This method is called by the event manager when an event of the specified
     * type is published. Implementations should be efficient and handle errors gracefully.
     *
     * @param event - The event instance to handle
     *
     * Best Practices:
     * - Keep processing fast and lightweight
     * - Handle errors gracefully without throwing
     * - Log important information for debugging
     * - Consider async operations carefully
     *
     * @example
     * ```typescript
     * public handle(event: UserRegisteredEvent): void {
     *   try {
     *     // Perform the handler's specific responsibility
     *     this.processUserRegistration(event);
     *   } catch (error) {
     *     // Log error but don't throw to avoid breaking other handlers
     *     console.error(`Failed to handle ${event.name}:`, error);
     *   }
     * }
     * ```
     */
    public abstract handle(event: TEvent): void;
}
