/**
 * Interface that defines the basic contract for all platform data models in the domain layer.
 *
 * @description
 * The `IPlatformDataModel` serves as the fundamental interface that all data entities and models
 * in the platform must implement. It establishes a common identity pattern across the entire
 * domain model hierarchy, ensuring consistent entity identification and enabling polymorphic
 * operations on data models.
 *
 * **Core Principles:**
 * - **Universal Identity**: Provides a standardized way to identify entities across the platform
 * - **Type Safety**: Enables strongly-typed generic operations on any platform data model
 * - **Polymorphism**: Allows collections and operations to work with any platform data model
 * - **Serialization**: Ensures all platform models can be consistently serialized/deserialized
 *
 * **Usage Patterns:**
 * This interface is implemented by:
 * - Domain entities and aggregate roots
 * - Data transfer objects (DTOs)
 * - View models and API response models
 * - Cache models and temporary data structures
 *
 * @example
 * **Basic entity implementation:**
 * ```typescript
 * export class User implements IPlatformDataModel {
 *   public id?: string | null;
 *   public name: string = '';
 *   public email: string = '';
 *   public createdDate: Date = new Date();
 * }
 * ```
 *
 * @example
 * **Domain model with business logic:**
 * ```typescript
 * export class Order implements IPlatformDataModel {
 *   public id?: string | null;
 *   public customerId: string = '';
 *   public items: OrderItem[] = [];
 *   public status: OrderStatus = OrderStatus.Draft;
 *   public totalAmount: number = 0;
 *
 *   public calculateTotal(): number {
 *     return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
 *   }
 * }
 * ```
 *
 * @example
 * **Polymorphic operations:**
 * ```typescript
 * // Generic function that works with any platform data model
 * function trackEntity<T extends IPlatformDataModel>(entity: T): void {
 *   console.log(`Tracking entity with ID: ${entity.id}`);
 *   // Send to analytics service, audit log, etc.
 * }
 *
 * // Usage with different model types
 * trackEntity(new User({ id: 'user-123' }));
 * trackEntity(new Order({ id: 'order-456' }));
 * trackEntity(new Product({ id: 'product-789' }));
 * ```
 *
 * @see {@link PlatformDataModel} - Abstract base class that implements this interface
 * @see {@link PlatformPagedResultDto} - Generic result container for data model collections
 * @see {@link PlatformRepository} - Repository pattern implementation for data models
 *
 * @since 1.0.0
 * @version 1.0.0
 */
export interface IPlatformDataModel {
    /**
     * The unique identifier for the data model entity.
     *
     * @description
     * This property serves as the primary key for entity identification throughout the platform.
     * It supports both string-based and null values to accommodate different identification
     * patterns and entity lifecycle states.
     *
     * **Value Patterns:**
     * - **String IDs**: UUIDs, GUIDs, or custom string identifiers for persistent entities
     * - **Null values**: For new entities that haven't been persisted yet
     * - **Undefined**: For transient objects or temporary data structures
     *
     * **Lifecycle States:**
     * - `undefined`: Entity is new and hasn't been assigned an ID yet
     * - `null`: Entity is being prepared for persistence but ID hasn't been generated
     * - `string`: Entity has been persisted and has a permanent identifier
     *
     * @example
     * ```typescript
     * // New entity (not yet persisted)
     * const newUser: User = { id: undefined, name: 'John Doe' };
     *
     * // Entity prepared for persistence
     * const preparedUser: User = { id: null, name: 'John Doe' };
     *
     * // Persisted entity with ID
     * const savedUser: User = { id: 'user-12345', name: 'John Doe' };
     * ```
     *
     * @example
     * **ID generation patterns:**
     * ```typescript
     * // UUID-based IDs (common pattern)
     * const orderId = 'ord_550e8400-e29b-41d4-a716-446655440000';
     *
     * // Timestamp-based IDs
     * const sessionId = 'session_1640995200000_abc123';
     *
     * // Sequential IDs (less common for distributed systems)
     * const ticketId = 'ticket-001234';
     * ```
     *
     * @see {@link PlatformDataModel.constructor} - Base class constructor that initializes this property
     */
    id?: string | null;
}

/**
 * Abstract base class that implements the IPlatformDataModel interface and provides common
 * functionality for all platform data models.
 *
 * @description
 * The `PlatformDataModel` serves as the foundational base class for all domain entities,
 * DTOs, and data structures within the platform. It provides a standardized constructor
 * pattern and property initialization to ensure consistent behavior across all data models.
 *
 * **Key Features:**
 * - **Standardized Construction**: Provides a common constructor pattern for all data models
 * - **Partial Data Support**: Allows initialization with partial data objects for flexibility
 * - **Type Safety**: Ensures all derived classes maintain the IPlatformDataModel contract
 * - **Extension Point**: Provides a place to add common functionality for all data models
 *
 * **Design Patterns:**
 * - **Template Method**: Provides base structure that derived classes can extend
 * - **Data Transfer Object**: Optimized for data transport and serialization
 * - **Domain Model**: Can be extended to include business logic and validation
 *
 * @example
 * **Simple entity extension:**
 * ```typescript
 * export class Customer extends PlatformDataModel {
 *   public name: string = '';
 *   public email: string = '';
 *   public isActive: boolean = true;
 *
 *   constructor(data?: Partial<Customer>) {
 *     super(data);
 *     if (data) {
 *       this.name = data.name ?? this.name;
 *       this.email = data.email ?? this.email;
 *       this.isActive = data.isActive ?? this.isActive;
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * **Complex domain model with business logic:**
 * ```typescript
 * export class Invoice extends PlatformDataModel {
 *   public customerId: string = '';
 *   public items: InvoiceItem[] = [];
 *   public status: InvoiceStatus = InvoiceStatus.Draft;
 *   public issueDate: Date = new Date();
 *   public dueDate: Date = new Date();
 *   public subtotal: number = 0;
 *   public taxAmount: number = 0;
 *   public totalAmount: number = 0;
 *
 *   constructor(data?: Partial<Invoice>) {
 *     super(data);
 *     if (data) {
 *       Object.assign(this, data);
 *       this.calculateTotals();
 *     }
 *   }
 *
 *   public addItem(item: InvoiceItem): void {
 *     this.items.push(item);
 *     this.calculateTotals();
 *   }
 *
 *   public calculateTotals(): void {
 *     this.subtotal = this.items.reduce((sum, item) =>
 *       sum + (item.unitPrice * item.quantity), 0);
 *     this.taxAmount = this.subtotal * 0.1; // 10% tax
 *     this.totalAmount = this.subtotal + this.taxAmount;
 *   }
 *
 *   public canEdit(): boolean {
 *     return this.status === InvoiceStatus.Draft;
 *   }
 * }
 * ```
 *
 * @example
 * **API response model:**
 * ```typescript
 * export class ApiResponse<T extends IPlatformDataModel> extends PlatformDataModel {
 *   public success: boolean = true;
 *   public message: string = '';
 *   public data?: T;
 *   public errors: string[] = [];
 *   public timestamp: Date = new Date();
 *
 *   constructor(data?: Partial<ApiResponse<T>>) {
 *     super(data);
 *     if (data) {
 *       this.success = data.success ?? this.success;
 *       this.message = data.message ?? this.message;
 *       this.data = data.data;
 *       this.errors = data.errors ?? this.errors;
 *       this.timestamp = data.timestamp ?? this.timestamp;
 *     }
 *   }
 *
 *   public static success<T extends IPlatformDataModel>(
 *     data: T,
 *     message: string = 'Operation completed successfully'
 *   ): ApiResponse<T> {
 *     return new ApiResponse<T>({
 *       success: true,
 *       message,
 *       data,
 *       errors: []
 *     });
 *   }
 *
 *   public static error<T extends IPlatformDataModel>(
 *     errors: string[],
 *     message: string = 'Operation failed'
 *   ): ApiResponse<T> {
 *     return new ApiResponse<T>({
 *       success: false,
 *       message,
 *       errors
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * **Usage in repositories and services:**
 * ```typescript
 * // Repository method signature
 * async getUsers(): Promise<PlatformPagedResultDto<User>> {
 *   const users = await this.userRepository.findAll();
 *   return new PlatformPagedResultDto<User>({
 *     data: { items: users, totalCount: users.length }
 *   });
 * }
 *
 * // Service method with data transformation
 * async createUserProfile(userData: Partial<User>): Promise<User> {
 *   const user = new User(userData);
 *
 *   // Validate required fields
 *   if (!user.email) {
 *     throw new Error('Email is required');
 *   }
 *
 *   // Set default values
 *   user.id = this.generateUserId();
 *   user.createdDate = new Date();
 *
 *   return await this.userRepository.save(user);
 * }
 * ```
 *
 * @see {@link IPlatformDataModel} - The interface this class implements
 * @see {@link PlatformPagedResultDto} - Container for collections of data models
 * @see {@link PlatformRepository} - Repository pattern for data model persistence
 *
 * @since 1.0.0
 * @version 1.0.0
 */
export abstract class PlatformDataModel implements IPlatformDataModel {
    /**
     * Creates a new instance of PlatformDataModel with optional initialization data.
     *
     * @description
     * This constructor provides a standardized way to initialize platform data models
     * with partial data objects. It supports flexible object creation patterns commonly
     * used in modern TypeScript applications.
     *
     * **Initialization Patterns:**
     * - **Empty Constructor**: Creates instance with default values
     * - **Partial Data**: Initializes only the provided properties
     * - **Full Data**: Initializes with complete object data
     * - **Null Safety**: Handles undefined/null data gracefully
     *
     * **Constructor Chaining:**
     * Derived classes should call `super(data)` first, then initialize their own properties
     * using the same data object or additional logic.
     *
     * @param data - Optional partial data object to initialize the instance.
     *               Can contain any subset of the IPlatformDataModel properties.
     *               If undefined or null, the instance will be created with default values.
     *
     * @example
     * **Basic usage:**
     * ```typescript
     * // Create empty instance
     * const emptyModel = new UserModel();
     * console.log(emptyModel.id); // undefined
     *
     * // Create with partial data
     * const partialModel = new UserModel({ id: 'user-123' });
     * console.log(partialModel.id); // 'user-123'
     *
     * // Create with null data (safe)
     * const nullModel = new UserModel(null);
     * console.log(nullModel.id); // undefined
     * ```
     *
     * @example
     * **In derived class constructor:**
     * ```typescript
     * export class Employee extends PlatformDataModel {
     *   public firstName: string = '';
     *   public lastName: string = '';
     *   public department: string = '';
     *
     *   constructor(data?: Partial<Employee>) {
     *     // Always call super first
     *     super(data);
     *
     *     // Initialize derived class properties
     *     if (data) {
     *       this.firstName = data.firstName ?? this.firstName;
     *       this.lastName = data.lastName ?? this.lastName;
     *       this.department = data.department ?? this.department;
     *     }
     *   }
     * }
     * ```
     *
     * @example
     * **Factory method pattern:**
     * ```typescript
     * export class Product extends PlatformDataModel {
     *   public name: string = '';
     *   public price: number = 0;
     *   public category: string = '';
     *
     *   constructor(data?: Partial<Product>) {
     *     super(data);
     *     if (data) {
     *       Object.assign(this, data);
     *     }
     *   }
     *
     *   // Factory methods for common creation patterns
     *   static createNew(name: string, price: number, category: string): Product {
     *     return new Product({
     *       id: null, // Will be assigned when saved
     *       name,
     *       price,
     *       category
     *     });
     *   }
     *
     *   static fromApiResponse(apiData: any): Product {
     *     return new Product({
     *       id: apiData.productId,
     *       name: apiData.productName,
     *       price: parseFloat(apiData.price),
     *       category: apiData.categoryName
     *     });
     *   }
     * }
     * ```
     *
     * @see {@link IPlatformDataModel} - Interface defining the data contract
     * @see {@link id} - The ID property initialized by this constructor
     */
    public constructor(data?: Partial<IPlatformDataModel>) {
        /**
         * Initialize the ID property from the provided data object.
         * Uses optional chaining to safely access the id property,
         * defaulting to undefined if data is null/undefined or doesn't contain an id.
         */
        this.id = data?.id;
    }

    /**
     * The unique identifier for this data model instance.
     *
     * @description
     * This property inherits from IPlatformDataModel and serves as the primary
     * identifier for the entity. It is initialized through the constructor and
     * can be modified throughout the entity's lifecycle.
     *
     * **Implementation Notes:**
     * - Automatically initialized from constructor data parameter
     * - Can be undefined for new entities not yet persisted
     * - Can be null for entities prepared for persistence
     * - Should be a string for persisted entities
     *
     * @see {@link IPlatformDataModel.id} - Interface property documentation
     */
    public id?: string | null;
}
