/**
 * Base interface for webhook events
 */
export interface WebhookEvent {
  id: string;
  type: string;
  data: { object: unknown };
}

/**
 * Default event map that accepts any string event type
 */
export type DefaultEventMap = Record<string, WebhookEvent>;

/**
 * Event handler function type
 */
export type EventHandler<T extends WebhookEvent> = (event: T) => Promise<void>;

/**
 * Middleware function type
 */
export type Middleware<T extends WebhookEvent = WebhookEvent> = (
  event: T,
  next: () => Promise<void>
) => Promise<void>;

/**
 * Webhook verification result
 */
export interface VerifyResult<T extends WebhookEvent = WebhookEvent> {
  /** The verified webhook event */
  event: T;
}

/**
 * Webhook verifier function type
 *
 * A verifier is responsible for:
 * 1. Validating the webhook signature/authenticity
 * 2. Parsing the payload into a typed event object
 *
 * @param payload - Raw request body (string or Buffer)
 * @param headers - Request headers for signature verification
 * @returns The verified event wrapped in a VerifyResult
 * @throws Error if verification fails
 *
 * @example
 * ```typescript
 * // Stripe verifier
 * const verifier: Verifier = (payload, headers) => {
 *   const signature = headers['stripe-signature'];
 *   const event = stripe.webhooks.constructEvent(payload, signature, secret);
 *   return { event };
 * };
 *
 * // GitHub verifier
 * const verifier: Verifier = (payload, headers) => {
 *   const signature = headers['x-hub-signature-256'];
 *   // Verify HMAC signature...
 *   return { event: JSON.parse(payload) };
 * };
 * ```
 */
export type Verifier<T extends WebhookEvent = WebhookEvent> = (
  payload: string | Buffer,
  headers: Record<string, string | undefined>
) => VerifyResult<T> | Promise<VerifyResult<T>>;

/**
 * Fanout strategy options
 */
export type FanoutStrategy = 'all-or-nothing' | 'best-effort';

/**
 * Fanout options
 */
export interface FanoutOptions {
  /** Strategy for handling errors */
  strategy?: FanoutStrategy;
  /** Error handler for best-effort strategy */
  onError?: (error: Error) => void;
}

/**
 * WebhookRouter - A type-safe event router for webhook events
 *
 * @typeParam TEventMap - A mapping of event type strings to their event types
 */
export class WebhookRouter<
  TEventMap extends Record<string, WebhookEvent> = DefaultEventMap,
> {
  private handlers: Map<string, EventHandler<WebhookEvent>[]> = new Map();
  private middlewares: Middleware[] = [];

  /**
   * Register a handler for a specific event type
   *
   * @param event - The event type to handle
   * @param handler - The handler function
   * @returns this for chaining
   */
  on<T extends keyof TEventMap & string>(
    event: T,
    handler: EventHandler<TEventMap[T]>
  ): this;

  /**
   * Register a handler for multiple event types
   *
   * @param events - Array of event types to handle
   * @param handler - The handler function
   * @returns this for chaining
   */
  on<T extends keyof TEventMap & string>(
    events: T[],
    handler: EventHandler<TEventMap[T]>
  ): this;

  on<T extends keyof TEventMap & string>(
    eventOrEvents: T | T[],
    handler: EventHandler<TEventMap[T]>
  ): this {
    const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];

    // Warn if empty array is passed
    if (Array.isArray(eventOrEvents) && eventOrEvents.length === 0) {
      console.warn('WebhookRouter.on(): Empty event array passed. No handlers registered.');
      return this;
    }

    for (const event of events) {
      // Reject empty string event types
      if (typeof event === 'string' && event.trim() === '') {
        throw new Error('Event type cannot be an empty string or whitespace');
      }
      const existing = this.handlers.get(event) ?? [];
      existing.push(handler as EventHandler<WebhookEvent>);
      this.handlers.set(event, existing);
    }
    return this;
  }

  /**
   * Register a middleware function
   *
   * @param middleware - The middleware function
   * @returns this for chaining
   */
  use(middleware: Middleware<TEventMap[keyof TEventMap]>): this {
    this.middlewares.push(middleware as Middleware);
    return this;
  }

  /**
   * Mount a nested router with a prefix
   *
   * @param prefix - The event type prefix (e.g., 'customer.subscription')
   * @param router - The nested WebhookRouter instance
   * @returns this for chaining
   */
  route(prefix: string, router: WebhookRouter): this {
    // Reject empty prefix
    if (prefix.trim() === '') {
      throw new Error('Route prefix cannot be an empty string or whitespace');
    }

    // Copy handlers from nested router with prefixed event types
    for (const [eventType, handlers] of router.handlers) {
      const fullEventType = `${prefix}.${eventType}`;
      const existing = this.handlers.get(fullEventType) ?? [];
      existing.push(...handlers);
      this.handlers.set(fullEventType, existing);
    }
    return this;
  }

  /**
   * Create a group of handlers with a common prefix
   *
   * @param prefix - The event type prefix (e.g., 'payment_intent')
   * @param callback - Function that receives a prefixed router
   * @returns this for chaining
   */
  group(prefix: string, callback: (router: PrefixedRouter) => void): this {
    // Reject empty prefix
    if (prefix.trim() === '') {
      throw new Error('Group prefix cannot be an empty string or whitespace');
    }

    const prefixedRouter = new PrefixedRouter(
      prefix,
      this as unknown as WebhookRouter<Record<string, WebhookEvent>>
    );
    callback(prefixedRouter);
    return this;
  }

  /**
   * Register multiple handlers to be executed in parallel (fanout pattern)
   *
   * @param event - The event type to handle
   * @param handlers - Array of handler functions to execute in parallel
   * @param options - Fanout options
   * @returns this for chaining
   */
  fanout<T extends keyof TEventMap & string>(
    event: T,
    handlers: Array<EventHandler<TEventMap[T]>>,
    options: FanoutOptions = {}
  ): this {
    const { strategy = 'all-or-nothing', onError } = options;

    const fanoutHandler: EventHandler<WebhookEvent> = async (evt) => {
      if (strategy === 'all-or-nothing') {
        // All-or-nothing: all handlers must succeed, or the entire operation fails
        const promises = handlers.map((handler) =>
          (handler as EventHandler<WebhookEvent>)(evt)
        );
        await Promise.all(promises);
      } else {
        // Best-effort: continue even if some handlers fail
        const promises = handlers.map((handler) =>
          (handler as EventHandler<WebhookEvent>)(evt).catch((error: unknown) => {
            if (onError) {
              onError(error instanceof Error ? error : new Error(String(error)));
            }
            return undefined;
          })
        );
        await Promise.allSettled(promises);
      }
    };

    const existing = this.handlers.get(event) ?? [];
    existing.push(fanoutHandler);
    this.handlers.set(event, existing);
    return this;
  }

  /**
   * Dispatch an event to registered handlers
   *
   * @param event - The event to dispatch
   */
  async dispatch(event: TEventMap[keyof TEventMap] | WebhookEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];

    // Build the handler chain
    const runHandlers = async (): Promise<void> => {
      for (const handler of handlers) {
        await handler(event as WebhookEvent);
      }
    };

    // Build the middleware chain (reverse order for proper nesting)
    let chain = runHandlers;
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i];
      const next = chain;
      chain = async () => {
        if (middleware) {
          let nextCalled = false;
          const wrappedNext = async () => {
            if (nextCalled) {
              throw new Error('Middleware next() function called multiple times');
            }
            nextCalled = true;
            return await next();
          };
          await middleware(event as WebhookEvent, wrappedNext);
        }
      };
    }

    await chain();
  }
}

/**
 * Helper class for group() syntax that adds prefix to event types
 */
class PrefixedRouter {
  constructor(
    private prefix: string,
    private parent: WebhookRouter<Record<string, WebhookEvent>>
  ) {}

  /**
   * Register a handler for a single event type (with prefix)
   */
  on(event: string, handler: EventHandler<WebhookEvent>): this;

  /**
   * Register a handler for multiple event types (with prefix)
   */
  on(events: string[], handler: EventHandler<WebhookEvent>): this;

  on(
    eventOrEvents: string | string[],
    handler: EventHandler<WebhookEvent>
  ): this {
    const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];

    // Warn if empty array is passed
    if (Array.isArray(eventOrEvents) && eventOrEvents.length === 0) {
      console.warn('PrefixedRouter.on(): Empty event array passed. No handlers registered.');
      return this;
    }

    for (const event of events) {
      // Reject empty string event types
      if (typeof event === 'string' && event.trim() === '') {
        throw new Error('Event type cannot be an empty string or whitespace');
      }
      const fullEventType = `${this.prefix}.${event}`;
      this.parent.on(fullEventType, handler);
    }
    return this;
  }

  /**
   * Register a middleware function for this group
   */
  use(middleware: Middleware): this {
    // For simplicity, middleware in groups is applied to the parent router
    // A more advanced implementation could scope middleware to the group
    this.parent.use(middleware);
    return this;
  }
}
