/**
 * @fileoverview Platform Events Module
 *
 * This module provides a comprehensive event-driven architecture for the platform,
 * enabling loose coupling between components through event publication and handling.
 *
 * Key Components:
 * - Event Manager: Central service for event publishing and routing
 * - Event Abstractions: Base classes and interfaces for events and handlers
 * - Registration System: Automatic discovery and registration of event handlers
 *
 * Event Flow:
 * 1. Domain events are published through PlatformEventManager
 * 2. Event manager locates all registered handlers for the event type
 * 3. Each handler is invoked with the event data
 * 4. Handlers perform their specific responsibilities (logging, notifications, etc.)
 *
 * Benefits:
 * - Decoupled Architecture: Components communicate without direct dependencies
 * - Extensibility: New handlers can be added without modifying existing code
 * - Testability: Individual handlers can be tested in isolation
 * - Scalability: Event processing can be optimized independently
 *
 * @example
 * Complete event implementation:
 * ```typescript
 * // 1. Define the event
 * export class UserActivatedEvent extends PlatformEvent {
 *   constructor(
 *     public readonly userId: string,
 *     public readonly activatedAt: Date
 *   ) {
 *     super('UserActivated');
 *   }
 * }
 *
 * // 2. Create event handlers
 * @Injectable()
 * export class UserActivatedNotificationHandler extends PlatformEventHandler<UserActivatedEvent> {
 *   constructor(private notificationService: NotificationService) {
 *     super();
 *   }
 *
 *   public handle(event: UserActivatedEvent): void {
 *     this.notificationService.sendAccountActivationConfirmation(event.userId);
 *   }
 * }
 *
 * // 3. Register handlers in module
 * @NgModule({
 *   providers: [
 *     UserActivatedNotificationHandler,
 *     // ... other handlers
 *   ]
 * })
 * export class UserModule {}
 *
 * // 4. Publish events in services
 * @Injectable()
 * export class UserService {
 *   constructor(private eventManager: PlatformEventManager) {}
 *
 *   async activateUser(userId: string): Promise<void> {
 *     await this.updateUserStatus(userId, 'active');
 *
 *     this.eventManager.publish(new UserActivatedEvent(
 *       userId,
 *       new Date()
 *     ));
 *   }
 * }
 * ```
 *
 * @see {@link PlatformEventManager} - Central event management service
 * @see {@link PlatformEvent} - Base class for domain events
 * @see {@link PlatformEventHandler} - Base class for event handlers
 *
 * @since Platform Core v1.0.0
 * @author Platform Team
 */

// Event abstractions and interfaces
export * from './abstracts';

// Event manager implementation
export * from './platform.event-manager';
