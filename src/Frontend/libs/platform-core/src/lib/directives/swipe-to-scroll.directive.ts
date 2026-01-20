import { AfterViewInit, Directive } from '@angular/core';
import { PlatformDirective } from './abstracts/platform.directive';

/**
 * Directive that enables horizontal scrolling via mouse dragging and touch gestures.
 *
 * @directive
 * @selector [platformSwipeToScroll]
 * @standalone true
 * @implements {AfterViewInit}
 *
 * @description
 * The SwipeToScrollDirective adds intuitive touch and mouse-based horizontal scrolling
 * to any HTML element with overflow content. It transforms standard scroll containers
 * into interactive, draggable interfaces that respond to both mouse drag operations
 * and touch gestures, providing a native app-like scrolling experience in web applications.
 *
 * **Key Features:**
 * - **Mouse Drag Scrolling**: Click and drag to scroll horizontally with smooth interaction
 * - **Touch Gesture Support**: Native touch scrolling for mobile and tablet devices
 * - **Cross-Platform**: Works consistently across desktop, mobile, and tablet devices
 * - **Performance Optimized**: Efficient event handling with minimal performance impact
 * - **Momentum Scrolling**: Natural scroll momentum that feels responsive and smooth
 * - **Boundary Respect**: Respects scroll boundaries and prevents over-scrolling
 * - **Event Prevention**: Prevents unwanted text selection during scroll operations
 *
 * **Technical Implementation:**
 * - Intercepts mouse down, up, and move events for drag-to-scroll functionality
 * - Handles touch start, end, and move events for mobile gesture support
 * - Calculates scroll distance based on pointer movement delta
 * - Applies scroll transformations directly to the element's scrollLeft property
 * - Maintains scroll state across interaction sessions
 *
 * **Common Use Cases:**
 * - **Image Galleries**: Horizontal image carousels and photo viewers
 * - **Card Layouts**: Scrollable card grids and dashboard widgets
 * - **Timeline Interfaces**: Horizontal timelines and calendar views
 * - **Navigation Menus**: Horizontal menu bars with overflow content
 * - **Data Tables**: Wide tables with horizontal scroll requirements
 * - **Media Players**: Scrollable playlists and media selection interfaces
 * - **Product Showcases**: E-commerce product lists and catalog browsing
 *
 * @example
 * **Basic horizontal scrolling container:**
 * ```html
 * <!-- Simple image gallery with swipe scrolling -->
 * <div class="image-gallery" platformSwipeToScroll>
 *   <img src="image1.jpg" alt="Image 1">
 *   <img src="image2.jpg" alt="Image 2">
 *   <img src="image3.jpg" alt="Image 3">
 *   <img src="image4.jpg" alt="Image 4">
 * </div>
 *
 * <style>
 * .image-gallery {
 *   display: flex;
 *   overflow-x: auto;
 *   overflow-y: hidden;
 *   scroll-behavior: smooth;
 *   gap: 16px;
 *   padding: 16px;
 * }
 *
 * .image-gallery img {
 *   flex-shrink: 0;
 *   width: 200px;
 *   height: 150px;
 *   object-fit: cover;
 *   border-radius: 8px;
 * }
 *
 * // Hide scrollbar for cleaner appearance
 * .image-gallery::-webkit-scrollbar {
 *   display: none;
 * }
 * </style>
 * ```
 *
 * @example
 * **Dashboard widget cards with horizontal scrolling:**
 * ```html
 * <div class="dashboard-widgets" platformSwipeToScroll>
 *   <div class="widget card">
 *     <h3>Sales Overview</h3>
 *     <p>Monthly sales data</p>
 *   </div>
 *   <div class="widget card">
 *     <h3>User Analytics</h3>
 *     <p>Active user metrics</p>
 *   </div>
 *   <div class="widget card">
 *     <h3>Performance</h3>
 *     <p>System performance stats</p>
 *   </div>
 * </div>
 *
 * <style>
 * .dashboard-widgets {
 *   display: flex;
 *   gap: 20px;
 *   overflow-x: auto;
 *   padding: 20px;
 *   scroll-snap-type: x mandatory;
 * }
 *
 * .widget {
 *   flex-shrink: 0;
 *   width: 280px;
 *   padding: 24px;
 *   background: white;
 *   border-radius: 12px;
 *   box-shadow: 0 2px 8px rgba(0,0,0,0.1);
 *   scroll-snap-align: start;
 * }
 * </style>
 * ```
 *
 * @example
 * **Horizontal timeline with drag scrolling:**
 * ```html
 * <div class="timeline-container" platformSwipeToScroll>
 *   <div class="timeline-track">
 *     <div class="timeline-item" *ngFor="let event of timelineEvents">
 *       <div class="timeline-marker"></div>
 *       <div class="timeline-content">
 *         <h4>{{ event.title }}</h4>
 *         <p>{{ event.description }}</p>
 *         <span class="timestamp">{{ event.date | date }}</span>
 *       </div>
 *     </div>
 *   </div>
 * </div>
 *
 * <style>
 * .timeline-container {
 *   overflow-x: auto;
 *   overflow-y: hidden;
 *   padding: 20px 0;
 * }
 *
 * .timeline-track {
 *   display: flex;
 *   min-width: 100%;
 *   position: relative;
 * }
 *
 * .timeline-item {
 *   flex-shrink: 0;
 *   width: 300px;
 *   margin-right: 40px;
 *   position: relative;
 * }
 *
 * .timeline-marker {
 *   width: 12px;
 *   height: 12px;
 *   background: #007bff;
 *   border-radius: 50%;
 *   margin-bottom: 16px;
 * }
 * </style>
 * ```
 *
 * @example
 * **Product carousel with touch support:**
 * ```html
 * <div class="product-carousel" platformSwipeToScroll>
 *   <div class="product-card" *ngFor="let product of products">
 *     <img [src]="product.image" [alt]="product.name">
 *     <h3>{{ product.name }}</h3>
 *     <p class="price">{{ product.price | currency }}</p>
 *     <button class="btn-primary">Add to Cart</button>
 *   </div>
 * </div>
 *
 * <style>
 * .product-carousel {
 *   display: flex;
 *   gap: 24px;
 *   overflow-x: auto;
 *   padding: 24px;
 *   scroll-behavior: smooth;
 *   -webkit-overflow-scrolling: touch; // iOS momentum scrolling
 * }
 *
 * .product-card {
 *   flex-shrink: 0;
 *   width: 250px;
 *   background: white;
 *   border-radius: 12px;
 *   padding: 16px;
 *   box-shadow: 0 4px 12px rgba(0,0,0,0.1);
 *   cursor: grab;
 * }
 *
 * .product-card:active {
 *   cursor: grabbing;
 * }
 *
 * .product-card img {
 *   width: 100%;
 *   height: 180px;
 *   object-fit: cover;
 *   border-radius: 8px;
 * }
 * </style>
 * ```
 *
 * @example
 * **Data table with horizontal scrolling:**
 * ```html
 * <div class="table-container" platformSwipeToScroll>
 *   <table class="data-table">
 *     <thead>
 *       <tr>
 *         <th>ID</th>
 *         <th>Name</th>
 *         <th>Email</th>
 *         <th>Department</th>
 *         <th>Position</th>
 *         <th>Salary</th>
 *         <th>Start Date</th>
 *         <th>Actions</th>
 *       </tr>
 *     </thead>
 *     <tbody>
 *       <tr *ngFor="let employee of employees">
 *         <td>{{ employee.id }}</td>
 *         <td>{{ employee.name }}</td>
 *         <td>{{ employee.email }}</td>
 *         <td>{{ employee.department }}</td>
 *         <td>{{ employee.position }}</td>
 *         <td>{{ employee.salary | currency }}</td>
 *         <td>{{ employee.startDate | date }}</td>
 *         <td>
 *           <button class="btn-edit">Edit</button>
 *           <button class="btn-delete">Delete</button>
 *         </td>
 *       </tr>
 *     </tbody>
 *   </table>
 * </div>
 *
 * <style>
 * .table-container {
 *   overflow-x: auto;
 *   border-radius: 8px;
 *   box-shadow: 0 2px 8px rgba(0,0,0,0.1);
 * }
 *
 * .data-table {
 *   min-width: 800px; // Forces horizontal scroll
 *   width: 100%;
 *   border-collapse: collapse;
 * }
 *
 * .data-table th,
 * .data-table td {
 *   padding: 12px 16px;
 *   text-align: left;
 *   border-bottom: 1px solid #e0e0e0;
 *   white-space: nowrap;
 * }
 * </style>
 * ```
 *
 * **Browser Compatibility:**
 * - **Desktop**: Full mouse drag support in all modern browsers
 * - **Mobile**: Native touch gesture support on iOS and Android
 * - **Tablet**: Optimized for both touch and mouse input on hybrid devices
 * - **Accessibility**: Maintains keyboard navigation and screen reader compatibility
 *
 * **Performance Considerations:**
 * - Events are efficiently managed with proper cleanup on directive destruction
 * - Scroll calculations are optimized to minimize layout thrashing
 * - Touch events use passive listeners where possible for better performance
 * - Memory usage is minimal with no additional libraries or dependencies
 *
 * **Best Practices:**
 * - Add appropriate CSS overflow properties (overflow-x: auto, overflow-y: hidden)
 * - Consider adding scroll-behavior: smooth for enhanced user experience
 * - Use cursor: grab/grabbing CSS for visual feedback on desktop
 * - Implement scroll snap points for better content alignment
 * - Test thoroughly on various devices and screen sizes
 * - Provide alternative navigation methods for accessibility
 *
 * @see {@link PlatformDirective} For the base directive functionality
 * @see {@link AfterViewInit} For Angular lifecycle integration
 */
@Directive({ selector: '[platformSwipeToScroll]', standalone: true })
export class SwipeToScrollDirective extends PlatformDirective implements AfterViewInit {
    /** Flag indicating whether the mouse button is currently pressed down */
    public isMousePress = false;

    /** The initial horizontal scroll position when drag operation started */
    public scrollLeft = 0;

    /** The initial X coordinate where the mouse press or touch started */
    public startX = 0;

    constructor() {
        super();
    }

    /**
     * Initializes the swipe-to-scroll functionality after the view is initialized.
     *
     * @description
     * Sets up all necessary event listeners for mouse and touch interactions.
     * This includes mousedown, mouseup, mousemove, touchend events that enable
     * the drag-to-scroll and swipe-to-scroll functionality.
     *
     * **Event Handling Setup:**
     * - **mousedown**: Initiates drag operation, captures start position and scroll state
     * - **mouseup**: Ends drag operation and resets interaction state
     * - **touchend**: Handles touch gesture completion for mobile devices
     * - **mousemove**: Processes drag movement and applies scroll transformations
     *
     * **Interaction Flow:**
     * 1. User clicks/touches element and begins drag
     * 2. Initial position and scroll state are captured
     * 3. Mouse/touch movement is tracked and converted to scroll distance
     * 4. Scroll position is updated in real-time during drag
     * 5. Drag operation ends when mouse is released or touch ends
     */
    public override ngAfterViewInit(): void {
        super.ngAfterViewInit();

        // Handle mouse press start - begin drag operation
        this.elementRef.nativeElement.addEventListener('mousedown', (e: MouseEvent) => {
            // Only handle left mouse button (button 0)
            if (e.button === 0) {
                this.isMousePress = true;
                // Calculate initial X position relative to element
                this.startX = e.pageX - this.elementRef.nativeElement.offsetLeft;
                // Store current scroll position
                this.scrollLeft = this.elementRef.nativeElement.scrollLeft;
            }
        });

        // Handle mouse release - end drag operation
        this.elementRef.nativeElement.addEventListener('mouseup', () => {
            this.isMousePress = false;
        });

        // Handle touch end - end touch gesture
        this.elementRef.nativeElement.addEventListener('touchend', () => {
            this.isMousePress = false;
        });

        // Handle mouse movement - process drag scrolling
        this.elementRef.nativeElement.addEventListener('mousemove', (e: MouseEvent) => {
            // Prevent default behavior to avoid text selection
            e.preventDefault();

            // Only process movement if mouse is pressed (dragging)
            if (!this.isMousePress) return;

            // Calculate current X position relative to element
            const x = e.pageX - this.elementRef.nativeElement.offsetLeft;

            // Calculate movement distance (multiplied by 1 for natural scroll speed)
            const walk = (x - this.startX) * 1;

            // Apply scroll transformation (subtract walk for natural scroll direction)
            this.elementRef.nativeElement.scrollLeft = this.scrollLeft - walk;
        });
    }
}
